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

func (t *TCPServer) SetGameStateValidationFunc(vf func(pkt *Packet) error) {
	t.gamemgr.validationFunc = vf
}

func GenerateClientId() ClientID {
	mx := big.NewInt(90000000)
	n, err := rand.Int(rand.Reader, mx)
	if err != nil {
		panic(err)
	}
	return ClientID(fmt.Sprintf("%08d", n.Int64()+10000000))
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

	c.gamePump <- p

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
