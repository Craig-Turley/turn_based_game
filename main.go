package main

import (
	"log"
	"net"
	"sync"
)

type Server interface {
	Start() error
	Read()
	Close()
}

type DecodeFunc func(from net.Addr, data []byte, len int) (Packet, error)

type TCPServer struct {
	transport Transport
	quitch    chan struct{}

	mu      sync.Mutex
	clients map[net.Addr]*Client
}

func NewTCPServer(addr string) *TCPServer {
	transport := NewTCPTransport(":3000")
	server := &TCPServer{
		transport: transport,
		quitch:    make(chan struct{}),

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

	go s.Read()

	return nil
}

func (s *TCPServer) Read() {
	defer func() {
		log.Println("Server closing...")
		s.transport.Close()
	}()

	for {
		select {
		case p := <-s.transport.Consume():
			log.Printf("%v\n", p.data)

		case <-s.quitch:
			return
		}
	}
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
