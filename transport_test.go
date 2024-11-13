package main

import (
	"bytes"
	"encoding/binary"
	"net"
	"testing"
	"time"
)

const (
	NETWORK       = "tcp"
	LOCAL_ADDRESS = "127.0.0.1:3000"
)

var tests = []struct {
	data []byte
	len  int
}{
	{
		data: newEncodedString("Hello, TCP Server!"),
		len:  17,
	},
	{
		data: newEncodedString("Another test case"),
		len:  17,
	},
	{
		data: newEncodedString(""),
		len:  0,
	},
	{
		data: newEncodedString("Short"),
		len:  5,
	},
	{
		data: newEncodedString("A much longer test case to check buffer handling and server response for larger payloads."),
		len:  79,
	},
}

func TestTransport(t *testing.T) {
	tcptransport := NewTCPTransport(":3000")

	if err := tcptransport.Start(); err != nil {
		t.Fatalf("Error starting tcptransport")
	}

	time.Sleep(time.Millisecond * 300)

	conn, err := net.Dial(NETWORK, LOCAL_ADDRESS)
	if err != nil {
		t.Fatalf("Error connecting to server %s", err)
	}
	defer conn.Close()

	for _, p := range tests {
		conn.Write(p.data)
		packet := <-tcptransport.Consume()
		if !bytes.Equal(p.data, packet.data) {
			t.Errorf("Packet data mismatch sent %s got %s", string(p.data), string(packet.data))
		}
	}

	tcptransport.Close()
}

func TestEncodingType(t *testing.T) {
	for i, p := range tests {
		packet := NewPacket(newEncodedString(string(p.data)))
		if p.data[ENC_TYPE_OFFSET] != packet.data[1] {
			t.Errorf("Bits at offset %d not equal", 1)
		}

		if packet.Type() != PacketTypeUnused1 {
			t.Errorf("Packet Type mismatch on test idx %d. Got %d want  %d", i, packet.Type(), PacketTypeUnused1)
		}

		if packet.Encoding() != EncString {
			t.Errorf("Packet Encoding mismatch on test idx %d. Got %d want  %d", i, packet.Encoding(), EncString)
		}
	}
}

func TestPacket(t *testing.T) {
	tcpTransport := NewTCPTransport(":3000")

	if err := tcpTransport.Start(); err != nil {
		t.Fatalf(err.Error())
	}

	time.Sleep(time.Millisecond * 300)

	conn, err := net.Dial(NETWORK, LOCAL_ADDRESS)
	if err != nil {
		t.Fatalf(err.Error())
	}
	defer conn.Close()

	for i, p := range tests {
		if _, err := conn.Write(p.data); err != nil {
			t.Fatalf("Failed to write data: %v", err)
		}
		packet := <-tcpTransport.Consume()
		if packet.Type() != PacketTypeUnused1 {
			t.Errorf("Packet Type mismatch on idx %d. Got %d want %d", i, packet.Type(), PacketTypeUnused1)
		}

		if packet.Encoding() != EncString {
			t.Errorf("Packet Enc mismatch on idx %d. Got %d want %d", i, packet.Encoding(), EncString)
		}
	}

	tcpTransport.Close()
}

/* func TestTCPOnPeer(t *testing.T) {
	server := NewTCPServer(":3000")

	if err := server.Start(); err != nil {
		t.Fatalf(err.Error())
	}

	time.Sleep(time.Millisecond * 300)

	conn, err := net.Dial(NETWORK, LOCAL_ADDRESS)
	if err != nil {
		t.Fatalf(err.Error())
	}

	t.Log(conn.LocalAddr())

	if _, ok := server.clients[conn.LocalAddr()]; !ok {
		t.Fatalf("Conn not found in server client map")
	}
} */

// helper functions to send data in correct encoding

func bitPack(enc Encoding, packetType PacketType) uint8 {
	return uint8((enc&0x3)<<6) | uint8(packetType&0x3F)
}

func newEncodedString(message string) []byte {
	buf := new(bytes.Buffer)
	version := VERSION
	encType := bitPack(EncString, PacketTypeUnused1)
	length := uint16(len(message))

	binary.Write(buf, binary.BigEndian, version)
	binary.Write(buf, binary.BigEndian, encType)
	binary.Write(buf, binary.BigEndian, length)

	buf.Write([]byte(message))

	return buf.Bytes()
}
