package main

import (
	"errors"
	"log"
	"net"
	"sync"
)

type HandlerFunc func(p *Packet) error

type TCPServer struct {
	addr     string
	ln       net.Listener
	handlers map[PacketType]HandlerFunc
	quitch   chan interface{}

	mu      sync.Mutex
	clients map[net.Addr]*Client
}

func NewTCPServer(addr string) *TCPServer {
	return &TCPServer{
		addr:     addr,
		handlers: make(map[PacketType]HandlerFunc),
		quitch:   make(chan interface{}),

		mu:      sync.Mutex{},
		clients: make(map[net.Addr]*Client),
	}
}

func (t *TCPServer) Start() error {
	ln, err := net.Listen("tcp", t.addr)
	if err != nil {
		return err
	}

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
			handler, ok := t.handlers[p.Type()]
			if !ok {
				log.Printf("HandlerFunc not found for type %s", TypeToString(p.Type()))
			}

			handler(p)
		case <-t.quitch:
			return
		}
	}
}

func (s *TCPServer) registerHandlers() {
	s.handlers[PacketTypeUnused1] = PacketTypeUnused1Handler
	s.handlers[PacketTypeUnused2] = PacketTypeUnused2Handler
}

func PacketTypeUnused1Handler(p *Packet) error {
	log.Println("PacketType1 being handled here")
	return nil
}

func PacketTypeUnused2Handler(p *Packet) error {
	log.Println("PacketType2 being handled here")
	return nil
}

func (t *TCPServer) Close() error {
	close(t.quitch)
	return t.ln.Close()
}
