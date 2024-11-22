package main

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"net"
	"sync"
)

type (
	HandlerFunc func(p *Packet, c *Client) error
	GameID      string
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
	bytes := make([]byte, 10)
	rand.Read(bytes)
	return GameID(base64.URLEncoding.EncodeToString(bytes)[:10])
}

type GameManager struct {
	games map[GameID]*Game
}

func NewGameManager() GameManager {
	return GameManager{
		games: make(map[GameID]*Game),
	}
}

func (m *GameManager) CreateNewGame(c *Client) {
	game := NewGame(c)
	m.games[game.id] = game

	msg := []byte(fmt.Sprintf("Game created with ID: %s", game.id))
	c.Write(ConstructPacket(EncString, PacketGameCreated, msg).data)
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

	// t.registerHandlers()

	t.ln = ln
	go t.accept()

	return nil
}

func (t *TCPServer) accept() {
	for {
		conn, err := t.ln.Accept()
		if errors.Is(err, net.ErrClosed) {
			return
		}

		if err != nil {
			log.Printf("TCP accept error: %s\n", err)
			continue
		}

		client := NewClient(conn)

		t.handleConnection(client)
	}
}

func (t *TCPServer) registerClient(client *Client) {
	t.mu.Lock()
	t.clients[client.conn.RemoteAddr()] = client
	t.mu.Unlock()
}

func (t *TCPServer) handleConnection(client *Client) {
	t.registerClient(client)

	framer := NewPacketFramer()
	go FrameWithReader(framer, client.conn)

	for {
		select {
		case p := <-framer.C:
			t.handleMessage(p, client)
		case <-t.quitch:
			return
		}
	}
}

// func (s *TCPServer) registerHandlers() {
// 	s.handlers[PacketTypeUnused1] = PacketTypeUnused1Handler
// 	s.handlers[PacketTypeUnused2] = PacketTypeUnused2Handler
// 	s.handlers[PacketCreateGame] = CreateGameHandler
// }

func (t *TCPServer) handleMessage(p *Packet, c *Client) {
	switch p.Type() {
	case PacketTypeUnused1:
		t.PacketTypeUnused1Handler(p, c)
	case PacketTypeUnused2:
		t.PacketTypeUnused2Handler(p, c)
	case PacketCreateGame:
		t.CreateGameHandler(p, c)
	}
}

func (t *TCPServer) PacketTypeUnused1Handler(p *Packet, c *Client) error {
	log.Println("PacketType1 being handled here")
	return nil
}

func (t *TCPServer) PacketTypeUnused2Handler(p *Packet, c *Client) error {
	log.Println("PacketType2 being handled here")
	return nil
}

func (t *TCPServer) CreateGameHandler(p *Packet, c *Client) error {
	log.Println("Join game request from client: ", c.conn.LocalAddr())

	t.gamemgr.CreateNewGame(c)

	return nil
}

func (t *TCPServer) Close() error {
	close(t.quitch)
	return t.ln.Close()
}
