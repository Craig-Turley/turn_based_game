package main

import (
	"bytes"
	"encoding/binary"
	"testing"
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

func TestFramer(t *testing.T) {
	framer := NewPacketFramer()
	for i, p := range tests {
		framer.push(p.data)
		res := <-framer.C
		if !bytes.Equal(res.data, p.data) {
			t.Errorf("Data mismatch on test idx %d. Got %v want %v", i, res.data, p.data)
		}
	}
}

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
