package main

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net"
	"sync"
	"time"
)

type (
	HandlerFunc func(p *Packet, c *Client) error
	ClientID    string
	GameID      string
	GameState   uint8
)

// TODO consider making these into codes
// this will make for easier parsing on both
// server and client side
// ex PacketError -> Code 404

type TCPServer struct {
	addr     string
	ln       net.Listener
	handlers map[PacketType]HandlerFunc
	quitch   chan interface{}
	gamemgr  GameManager

	mu      sync.Mutex
	clients map[net.Addr]*Client
}

func NewTCPServer(addr string) *TCPServer {
	return &TCPServer{
		addr:     addr,
		handlers: make(map[PacketType]HandlerFunc),
		quitch:   make(chan interface{}),
		gamemgr:  NewGameManager(),

		mu:      sync.Mutex{},
		clients: make(map[net.Addr]*Client),
	}
}

func GenerateGameId() GameID {
	mx := big.NewInt(900000)
	n, err := rand.Int(rand.Reader, mx)
	if err != nil {
		// TODO handle this somehow
		panic(err)
	}
	return GameID(fmt.Sprintf("%d", n.Int64()+100000))
}

func GenerateClientId() ClientID {
	mx := big.NewInt(90000000)
	n, err := rand.Int(rand.Reader, mx)
	if err != nil {
		panic(err)
	}
	return ClientID(fmt.Sprintf("%08d", n.Int64()+10000000))
}

type GameManager struct {
	mu    sync.Mutex
	games map[GameID]*Game
}

func NewGameManager() GameManager {
	return GameManager{
		mu:    sync.Mutex{},
		games: make(map[GameID]*Game),
	}
}

func (m *GameManager) CreateNewGame(c *Client) error {
	if len(c.gameID) != 0 {
		log.Printf("Client with ID %s attempted to create a game while already in a game", c.clientID)
		return ERROR_INVALID_CREATE_GAME_ATTEMPT
	}

	game := NewGame(c)

	m.mu.Lock()
	m.games[game.id] = game
	m.mu.Unlock()

	go game.readLoop()

	msg := []byte(fmt.Sprintf("%s", game.id))

	c.Write(ConstructPacket(EncString, PacketCreateGameSuccess, msg).data)

	c.gameID = game.id
	c.gamePump = game.ch

	return nil
}

func (m *GameManager) JoinGame(c *Client, id GameID) error {
	if len(c.gameID) != 0 {
		log.Printf("Client with ID %s attempted to join game while currently in game", c.clientID)
		return ERROR_INVALID_GAME_JOIN_ATTEMPT
	}

	// TODO find a way to parse this based on encoding
	if len(id) != 6 {
		return ERROR_INVALID_GAME_ID
	}

	game, ok := m.games[id]
	if !ok {
		log.Printf("Game of id %s does not exist!", id)
		return ERROR_INVALID_GAME_ID
	}

	msg := []byte(fmt.Sprintf("%s", game.id))
	game.clients = append(game.clients, c)
	c.Write(ConstructPacket(EncString, PacketJoinGameSuccess, msg).data)

	c.gameID = game.id
	c.gamePump = game.ch

	return nil
}

func (m *GameManager) Disconnect(c *Client) error {
	if len(c.gameID) == 0 {
		return ERROR_CLIENT_NOT_IN_GAME
	}

	game, ok := m.games[c.gameID]
	if !ok {
		// this would be so weird
		log.Printf("Client %s attempted to disconnect from game that didn't exist", c.Id())
		return ERROR_INVALID_GAME_DISCONNECT
	}

	game.clients = removeClient(game.clients, c)
	c.gameID = ""

	c.Write(ConstructPacket(EncString, PacketLeaveGameSuccess, []byte("")).data)

	return nil
}

func removeClient(clients []*Client, target *Client) []*Client {
	for i, client := range clients {
		if client == target {
			return append(clients[:i], clients[i+1:]...)
		}
	}
	return clients
}

func (m *GameManager) StartGame(c *Client, id GameID) error {
	_, ok := m.games[id]
	if !ok {
		log.Printf("Game of id %s does not exist!", id)
		return ERROR_INVALID_GAME_ID
	}

	return nil
}

// |  Version  |  Type   |  ClientID  |
//	1 byte     1 byte     8 bytes

const (
	GSVERSION = uint8(1)
)

const (
	ATTACK GameState = iota
	DEFENSE
)

func GameStateToString(gs GameState) string {
	switch gs {
	case ATTACK:
		return "Attack"
	case DEFENSE:
		return "Defense"
	}

	return "Invalid"
}

func (g *Game) validateGamePkt(pkt Packet) error {
	switch gameState(pkt.Data()) {
	case ATTACK:
		return nil
	case DEFENSE:
		return nil
	}
	return nil
}

const (
	GSVERSIONOFFSET  = uint8(0)
	GSTYPEOFFSET     = uint8(1)
	GSCLIENTIDOFFSET = uint8(2)
	GSDATAOFFSET     = uint8(10)
)

func gameState(data []byte) GameState {
	return GameState(data[GSTYPEOFFSET])
}

func gameStateClientID(data []byte) ClientID {
	return ClientID(data[GSCLIENTIDOFFSET : GSCLIENTIDOFFSET+8])
}

func gameStateData(data []byte) []byte {
	return data[GSDATAOFFSET:]
}

type Game struct {
	clients []*Client
	id      GameID
	state   GameState
	ch      chan Packet
	quitch  chan interface{}
}

// TODO rename this to something more appropriate
func (g *Game) readLoop() {
	for {
		select {
		case pkt := <-g.ch:
			log.Printf("Gamestate of type %s with data %s", GameStateToString(gameState(pkt.Data())), gameStateData(pkt.Data()))
			err := g.broadCast(pkt)
			if err != nil {
				// TODO find a way to pipe this error back to the client
				// can probably just use clientID and sent back to client
				log.Println("There was a packet validation/broadcast error")
			}
		case <-g.quitch:
			log.Printf("Game with ID %s finished", g.id)
			return
		}
	}
}

func (g *Game) broadCast(pkt Packet) error {
	err := g.validateGamePkt(pkt)
	if err != nil {
		return err
	}

	log.Println("Data:", gameStateData(pkt.Data()))

	for _, c := range g.clients {
		if c.clientID == gameStateClientID(pkt.Data()) {
			continue
		}
		c.Write(pkt.data)
	}
	log.Println("Done broadcasting")

	return nil
}

func NewGame(c *Client) *Game {
	return &Game{
		clients: []*Client{c},
		id:      GenerateGameId(),
		ch:      make(chan Packet, 10),
		quitch:  make(chan interface{}),
	}
}

func (t *TCPServer) Start() error {
	ln, err := net.Listen("tcp", t.addr)
	if err != nil {
		return err
	}

	t.registerHandlers()

	t.ln = ln
	go t.accept()

	log.Printf("Server listening on %s", t.addr)

	return nil
}

func (t *TCPServer) accept() {
	for {
		conn, err := t.ln.Accept()
		if err != nil {
			// return if server is shut down
			// continue if not
			if errors.Is(err, net.ErrClosed) {
				log.Println("Server has shutdown")
				return
			}
			log.Printf("TCP accept error: %s\n", err)
			continue
		}

		client := NewClient(conn)
		go t.handleConnection(client)
	}
}

// yeah, this is probably the most secure authentication youve ever seen
// dont be too amazed now
func (t *TCPServer) authenticate(framer *PacketFramer, client *Client) error {
	id := GenerateClientId()
	client.Write(ConstructPacket(EncBytes, PacketAuth, []byte(id)).data)

	select {
	case authp := <-framer.C:
		if authp.Type() != PacketAuth {
			return ERROR_INVALID_AUTH_PKT
		}

		if ClientID(authp.Data()) != id {
			return ERROR_INVALID_AUTH_ID
		}
	case <-time.After(time.Second * 5):
		return ERROR_AUTH_TIMEOUT
	}

	client.clientID = id
	log.Printf("Successful authentication of conn %s with ClientID %s", client.Addr(), id)

	return nil
}

func (t *TCPServer) registerClient(client *Client) {
	t.mu.Lock()
	t.clients[client.Addr()] = client
	t.mu.Unlock()
}

func (t *TCPServer) handleConnection(client *Client) {
	defer t.disconnect(client)
	t.registerClient(client)

	framer := NewPacketFramer()
	go FrameWithReader(framer, client.conn, client.Addr())

	autherr := t.authenticate(framer, client)
	if autherr != nil {
		log.Printf("Failed to authenticate conn %s with err %s", client.Addr(), autherr.Error())
		client.Disconnect()
		return
	}

	for {
		select {
		case p := <-framer.C:
			handler, ok := t.handlers[p.Type()]
			if !ok {
				log.Printf("%s: %s", ERROR_NO_HANDLER_REGISTERED.Error(), TypeToString(p.Type()))
				continue
			}

			err := handler(p, client)
			if err != nil {
				log.Println(err)
				// TODO figure out some way to handle possible json marshall error
				data, _ := ConstructErrorData(err)
				pkt := ConstructPacket(EncString, PacketError, data)
				client.Write(pkt.data)
			}
		case err := <-framer.errch:
			log.Printf("Error reading packet from client %s. Shutting down connection due to error %s", client.Addr(), err.Error())
			return
		case <-t.quitch:
			return
		}
	}
}

func (t *TCPServer) registerHandlers() {
	t.handlers[PacketHealthCheckReq] = t.healthCheckReqHandler
	t.handlers[PacketCreateGame] = t.createGameHandler
	t.handlers[PacketJoinGame] = t.joinGameHandler
	t.handlers[PacketStartGame] = t.startGameHandler
	t.handlers[PacketGameState] = t.gameStateHandler
	t.handlers[PacketLeaveGame] = t.leaveGameHandler
	t.handlers[PacketDisconnect] = t.disconnectHandler
}

func (t *TCPServer) disconnect(c *Client) {
	t.mu.Lock()
	delete(t.clients, c.Addr())
	t.mu.Unlock()

	t.gamemgr.Disconnect(c)

	log.Printf("Disconnecting client %s", c.Id())
	c.Disconnect()
}

func (t *TCPServer) healthCheckReqHandler(p *Packet, c *Client) error {
	log.Printf("Health check request from client: %s", c.Id())

	pkt := ConstructPacket(EncString, PacketHealthCheckRes, []byte("Im alive :D"))

	c.Write(pkt.data)

	return nil
}

func (t *TCPServer) createGameHandler(p *Packet, c *Client) error {
	log.Println("Create game request from client: ", c.Id())

	if err := t.gamemgr.CreateNewGame(c); err != nil {
		return err
	}

	return nil
}

func (t *TCPServer) joinGameHandler(p *Packet, c *Client) error {
	log.Printf("Join game request from client %s for game %s", c.Id(), p.Data())

	if err := t.gamemgr.JoinGame(c, GameID(p.Data())); err != nil {
		return err
	}

	return nil
}

func (t *TCPServer) startGameHandler(p *Packet, c *Client) error {
	log.Printf("Start game request from client %s for game %s", c.Id(), p.Data())

	if err := t.gamemgr.StartGame(c, GameID(p.Data())); err != nil {
		return err
	}

	return nil
}

func (t *TCPServer) gameStateHandler(p *Packet, c *Client) error {
	log.Printf("Game state packet sent from client %s.", c.Id())

	if c.clientID != gameStateClientID(p.Data()) {
		log.Println(c.clientID, gameStateClientID(p.Data()))
		return ERROR_INVALID_AUTH_ID
	}

	c.gamePump <- *p
	log.Println("Sent to game")

	return nil
}

func (t *TCPServer) leaveGameHandler(p *Packet, c *Client) error {
	log.Printf("Leave game packet sent from client %s.", c.Id())

	if err := t.gamemgr.Disconnect(c); err != nil {
		return err
	}

	return nil
}

func (t *TCPServer) disconnectHandler(p *Packet, c *Client) error {
	log.Printf("Disconnect request from client %s", c.Id())

	t.disconnect(c)

	return nil
}

func (t *TCPServer) Close() error {
	close(t.quitch)
	return t.ln.Close()
}
