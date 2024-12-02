package main

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net"
	"sync"
)

type (
	HandlerFunc func(p *Packet, c *Client) error
	GameID      string
)

var (
	ERROR_NO_HANDLER_REGISTERED = errors.New("No handler registered for current packet type")
	ERROR_INVALID_GAME_ID       = errors.New("GameID is invalid")
)

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

func (m *GameManager) CreateNewGame(c *Client) {
	game := NewGame(c)

	m.mu.Lock()
	m.games[game.id] = game
	m.mu.Unlock()

	msg := []byte(fmt.Sprintf("%s", game.id))

	c.Write(ConstructPacket(EncString, PacketGameCreated, msg).data)
}

func (m *GameManager) JoinGame(c *Client, id GameID) error {
	game, ok := m.games[id]
	if !ok {
		log.Printf("Game of id %s does not exist!", id)
		c.Write(ConstructPacket(EncString, PacketError, []byte(ERROR_INVALID_GAME_ID.Error())).data)
		return ERROR_INVALID_GAME_ID
	}

	msg := []byte(fmt.Sprintf("%s", game.id))
	game.clients = append(game.clients, c)
	c.Write(ConstructPacket(EncString, PacketJoinGameSuccess, msg).data)

	return nil
}

func (m *GameManager) StartGame(c *Client, id GameID) error {
	_, ok := m.games[id]
	if !ok {
		log.Printf("Game of id %s does not exist!", id)
		c.Write(ConstructPacket(EncString, PacketError, []byte(ERROR_INVALID_GAME_ID.Error())).data)
		return ERROR_INVALID_GAME_ID
	}

	return nil
}

type Game struct {
	clients []*Client
	id      GameID
}

func NewGame(c *Client) *Game {
	return &Game{
		clients: []*Client{c},
		id:      GenerateGameId(),
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

		ok := t.authenticate(client)
		if !ok {
			log.Printf("Failed to authenticate conn %s", client.Addr())
			// directly call client.Disconnect here since theyre not registered
			client.Disconnect()
			return
		}

		go t.handleConnection(client)
	}
}

func (t *TCPServer) authenticate(client *Client) bool {
	// TODO implement actual authenticateion method
	return len(client.Addr().String()) != 0
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
	go FrameWithReader(framer, client.conn)

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
				continue
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
	t.handlers[PacketCreateGame] = t.CreateGameHandler
	t.handlers[PacketJoinGame] = t.JoinGameHandler
}

func (t *TCPServer) disconnect(c *Client) {
	t.mu.Lock()
	delete(t.clients, c.Addr())
	t.mu.Unlock()

	c.Disconnect()
}

func (t *TCPServer) healthCheckReqHandler(p *Packet, c *Client) error {
	log.Printf("Health check request from client: %s", c.Addr())

	pkt := ConstructPacket(EncString, PacketHealthCheckRes, []byte("Im alive :D"))

	c.Write(pkt.data)

	return nil
}

func (t *TCPServer) CreateGameHandler(p *Packet, c *Client) error {
	log.Println("Create game request from client: ", c.Addr())

	t.gamemgr.CreateNewGame(c)

	return nil
}

func (t *TCPServer) JoinGameHandler(p *Packet, c *Client) error {
	log.Printf("Join game request from client %s for game %s", c.Addr(), p.Data())

	if err := t.gamemgr.JoinGame(c, GameID(p.Data())); err != nil {
		return err
	}

	return nil
}

func (t *TCPServer) Close() error {
	close(t.quitch)
	return t.ln.Close()
}
