package main

import (
	"log"
	"net"
	"sync"
)

type HandlerFunc func(p *Packet) error

type TCPServer struct {
	transport Transport
	quitch    chan struct{}
	handlers  map[PacketType]HandlerFunc

	mu      sync.Mutex
	clients map[net.Addr]*Client
}

func NewTCPServer(addr string) *TCPServer {
	transport := NewTCPTransport(":3000")
	server := &TCPServer{
		transport: transport,
		quitch:    make(chan struct{}),
		handlers:  make(map[PacketType]HandlerFunc),

		mu:      sync.Mutex{},
		clients: make(map[net.Addr]*Client),
	}

	transport.onPeer = server.OnPeer

	return server
}

func (s *TCPServer) Start() error {
	if err := s.transport.Start(); err != nil {
		return err
	}

	s.registerHandlers()

	go s.read()

	return nil
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

func (s *TCPServer) read() {
	defer func() {
		log.Println("Server closing...")
		s.transport.Close()
	}()

	for {
		select {
		case p := <-s.transport.Consume():
			log.Printf("%v\n", p.data)

			go s.handleMessage(p)

		case <-s.quitch:
			return
		}
	}
}

func (s *TCPServer) handleMessage(p *Packet) {
	msgType := p.Type()
	handlerFunc, ok := s.handlers[msgType]
	if !ok {
		log.Printf("Handler Func not registered for Packet Type %d", msgType)
		return
	}

	handlerFunc(p)
}

func (s *TCPServer) OnPeer(client *Client) error {
	s.mu.Lock()
	s.clients[client.conn.RemoteAddr()] = client
	s.mu.Unlock()

	return nil
}

func (s *TCPServer) Close() {
	close(s.quitch)
}

func main() {
	server := NewTCPServer(":3000")

	if err := server.Start(); err != nil {
		log.Fatalf(err.Error())
	}

	select {}
}
