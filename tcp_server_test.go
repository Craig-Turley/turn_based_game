package main

import (
	"net"
	"testing"
	"time"
)

const (
	LOCAL_ADDR = "127.0.0.1:3000"
)

func TestServer(t *testing.T) {
	server := NewTCPServer(LOCAL_ADDR)
	if err := server.Start(); err != nil {
		t.Fatal(err.Error())
	}

	errch := make(chan error)
	defer close(errch)
	go func() {
		for err := range errch {
			if err != nil {
				t.Error(err.Error())
			}
		}
	}()

	clients := []*Client{}
	for i := 0; i < 10; i++ {
		conn, err := net.Dial("tcp", LOCAL_ADDR)
		if err != nil {
			t.Fatal(err)
		}
		client := NewClient(conn)
		clients = append(clients, client)

		framer := NewPacketFramer()
		go FrameWithReader(framer, client.conn)
		if err := authenticate(framer.C, client); err != nil {
			errch <- err
		}

		go func() {
			if err := read(framer.C); err != nil {
				errch <- err
			}
		}()
	}

	for _, c := range clients {
		c.Disconnect()
	}

	server.Close()
}

func authenticate(C chan *Packet, c *Client) error {
	select {
	case pkt := <-C:
		c.Write(ConstructPacket(EncString, PacketAuth, pkt.Data()).data)
	case <-time.After(time.Second * 5):
		return ERROR_AUTH_TIMEOUT
	}

	return nil
}

func read(C chan *Packet) error {
	for {
		select {
		case pkt := <-C:
			switch pkt.Type() {
			case PacketAuth:
				if len(pkt.Data()) != 8 {
					return ERROR_INVALID_AUTH_PKT
				}
			}
		}
	}
}

// const (
// 	PacketAuth PacketType = iota // outbound
// 	PacketHealthCheckReq
// 	PacketHealthCheckRes // outbound
// 	PacketError          // outbound
// 	PacketCreateGame
// 	PacketGameCreated       // outbound
// 	PacketCreateGameFailure // outbound
// 	PacketJoinGame
// 	PacketJoinGameSuccess // outbound
// 	PacketJoinGameFailure // outbound
// 	PacketStartGame
// 	PacketGameState
// 	PacketDisconnect // outbound
// 	PacketGameStateError
// )

func sendPacketAuth(c *Client) error {
	return nil
}
