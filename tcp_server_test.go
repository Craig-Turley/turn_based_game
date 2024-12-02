package main

import (
	"errors"
	"fmt"
	"net"
	"sync"
	"testing"
)

const LOCAL_ADDR = "127.0.0.1:3000"

func TestCreateGame(t *testing.T) {
	conn, err := net.Dial("tcp", LOCAL_ADDR)
	if err != nil {
		t.Fatalf(err.Error())
	}

	client := NewClient(conn)
	pkt := ConstructPacket(EncString, PacketCreateGame, []byte{})

	wg := new(sync.WaitGroup)
	errch := make(chan error, 1)

	wg.Add(1)
	go func() {
		defer wg.Done()
		buf := make([]byte, PACKET_MAX_SIZE)
		n, err := client.conn.Read(buf)
		if err != nil {
			panic(err)
		}

		res := NewPacket(buf[:n])
		id := res.Data()
		enc := res.Encoding()
		t := res.Type()

		if len(id) != 6 {
			errch <- errors.New(fmt.Sprintf("ID mismatch. Got %d want 0", len(id)))
			return
		}

		if enc != EncString {
			errch <- errors.New(fmt.Sprintf("Packet enc mismatch. Got %s want %s", EncToString(enc), EncToString(EncString)))
			return
		}

		if t != PacketGameCreated {
			errch <- errors.New(fmt.Sprintf("Packet type mismatch. Got %s want %s", TypeToString(t), TypeToString(PacketCreateGame)))
			return
		}

		errch <- nil
	}()

	client.Write(pkt.data)

	wg.Wait()

	err = <-errch
	if err != nil {
		t.Fatalf("%v", err)
	}
}
