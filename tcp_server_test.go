package main

import (
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"net"
	"os"
	"path/filepath"
	"regexp"
	"sync"
	"testing"
	"time"
)

type req func(C chan *Packet, c *Client) error

var requests = []req{
	sendHealthCheck,
	sendPacketCreateGame,
	sendInvalidPacketJoinGame,
	sendTwoCreateGameRequests,
}

type TestLogger struct {
	logger   *log.Logger
	errcnt   int
	hqReq    int
	cgReq    int
	twocgReq int
	invjgReq int
}

func (tl *TestLogger) Println(v ...interface{}) {
	tl.logger.Println(v...)
}

func (tl *TestLogger) Printf(format string, v ...interface{}) {
	tl.logger.Printf(format, v...)
}

func (tl *TestLogger) PrintErr(err error) {
	tl.errcnt++
	tl.logger.Printf("Error - %v", err)
}

func (tl *TestLogger) IncHQReq() {
	tl.hqReq++
}

func (tl *TestLogger) IncCGReq() {
	tl.cgReq++
}

func (tl *TestLogger) IncTwoCGReq() {
	tl.twocgReq++
}

func (tl *TestLogger) IncInvJGReq() {
	tl.invjgReq++
}

func (tl *TestLogger) LogResults() {
	tl.Printf("Health Check requests sent: %d", tl.hqReq)
	tl.Printf("Create Game requests sent: %d", tl.cgReq)
	tl.Printf("Double Creaqte Game requests sent: %d", tl.cgReq)
	tl.Printf("Invalid Join Game requests sent: %d", tl.invjgReq)
	tl.Printf("Error count: %d", tl.errcnt)
}

var TestLog TestLogger

func initLogger(t *testing.T) {
	absPath, err := filepath.Abs("./log")
	if err != nil {
		t.Fatalf("Failed to init logger: %v", err)
	}

	testLog, err := os.OpenFile(absPath+"/test-log.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0o666)
	if err != nil {
		t.Fatalf("Failed to init logger: %v", err)
	}

	TestLog.logger = log.New(testLog, "[Test Log] ", log.Ldate|log.Ltime|log.Lshortfile)
}

const (
	LOCAL_ADDR = "127.0.0.1:3000"
)

func TestServer(t *testing.T) {
	initLogger(t)

	server := NewTCPServer(LOCAL_ADDR)
	if err := server.Start(); err != nil {
		t.Fatal(err.Error())
	}

	errch := make(chan error)
	defer close(errch)
	go func() {
		for err := range errch {
			if err != nil {
				TestLog.PrintErr(err)
				t.Error(err.Error())
			}
		}
	}()

	wg := new(sync.WaitGroup)
	clients := []*Client{}
	for i := 0; i < 10; i++ {
		conn, err := net.Dial("tcp", LOCAL_ADDR)
		if err != nil {
			t.Fatal(err)
		}
		client := NewClient(conn)
		clients = append(clients, client)

		// TODO find a way to get a request that fails auth
		framer := NewPacketFramer()
		go FrameWithReader(framer, client.conn)
		if err := authenticate(framer.C, client); err != nil {
			errch <- err
		}

		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := randomRequests(framer.C, client); err != nil {
				errch <- err
			}
		}()

	}

	wg.Wait()
	for _, c := range clients {
		c.Disconnect()
	}

	server.Close()
	TestLog.LogResults()
}

func randomI(max, min int) int {
	return rand.IntN(max-min) + min
}

func randomRequests(C chan *Packet, c *Client) error {
	req := requests[randomI(len(requests), 0)]
	if err := req(C, c); err != nil {
		return err
	}
	return nil
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

func sendHealthCheck(C chan *Packet, c *Client) error {
	c.Write(ConstructPacket(EncString, PacketHealthCheckReq, []byte{}).data)
	defer c.Disconnect()
	TestLog.IncHQReq()

	select {
	case pkt := <-C:
		if pkt.Type() != PacketHealthCheckRes {
			return ERROR_INVALID_HQ_RES
		}
	case <-time.After(time.Second * 5):
		return ERROR_AUTH_TIMEOUT
	}

	return nil
}

func sendPacketCreateGame(C chan *Packet, c *Client) error {
	c.Write(ConstructPacket(EncString, PacketCreateGame, []byte{}).data)
	defer c.Disconnect()
	TestLog.IncCGReq()

	select {
	case pkt := <-C:
		if pkt.Type() != PacketCreateGameSuccess {
			return ERROR_INVALID_CREATE_GAME_ATTEMPT
		}

		if !isValidID(string(pkt.Data())) {
			return constructError("Invalid game id of val %s", string(pkt.Data()))
		}
	case <-time.After(time.Second * 5):
		return ERROR_SERVER_TIMEOUT
	}

	return nil
}

func sendTwoCreateGameRequests(C chan *Packet, c *Client) error {
	c.Write(ConstructPacket(EncString, PacketCreateGame, []byte{}).data)
	defer c.Disconnect()
	TestLog.IncTwoCGReq()

	select {
	case pkt := <-C:
		if pkt.Type() != PacketCreateGameSuccess {
			return ERROR_INVALID_CREATE_GAME_ATTEMPT
		}

		if !isValidID(string(pkt.Data())) {
			return constructError("Invalid game id of val %s", string(pkt.Data()))
		}
	case <-time.After(time.Second * 5):
		return ERROR_SERVER_TIMEOUT
	}

	c.Write(ConstructPacket(EncString, PacketCreateGame, []byte{}).data)
	select {
	case pkt := <-C:
		if pkt.Type() != PacketError {
			return constructError("Expected PacketError. Got %s", TypeToString(pkt.Type()))
		}
	case <-time.After(time.Second * 5):
		return ERROR_SERVER_TIMEOUT
	}
	return nil
}

func sendInvalidPacketJoinGame(C chan *Packet, c *Client) error {
	c.Write(ConstructPacket(EncBytes, PacketJoinGame, []byte("12345678")).data)
	defer c.Disconnect()
	TestLog.IncInvJGReq()

	select {
	case pkt := <-C:
		if pkt.Type() == PacketCreateGameSuccess {
			return ERROR_INVALID_CREATE_GAME_ATTEMPT
		}

		if pkt.Type() != PacketError {
			return constructError("Wanted PacketJoinGameFailure. Got %v", TypeToString(pkt.Type()))
		}

	case <-time.After(time.Second * 5):
		return ERROR_SERVER_TIMEOUT
	}

	return nil
}

func isValidID(id string) bool {
	re := regexp.MustCompile(`^\d{6}$`)
	return re.MatchString(id)
}

func constructError(err string, v ...interface{}) error {
	str := fmt.Sprintf(err, v...)
	return errors.New(str)
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
