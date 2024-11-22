package main

import (
	"bytes"
	"testing"
)

func TestFramer(t *testing.T) {
	framer := NewPacketFramer()
	for i, p := range encStringTests {
		framer.push(p.data)
		res := <-framer.C
		if !bytes.Equal(res.data, p.data) {
			t.Errorf("Data mismatch on test idx %d. Got %v want %v", i, res.data, p.data)
		}
	}
}

func TestPacketFunctions(t *testing.T) {
	for i, p := range encStringTests {
		packet := NewPacket(p.data)
		if packet.Encoding() != EncString {
			t.Errorf("Enc mismatch on idx %d. Got %s want %s", i, EncToString(packet.Encoding()), EncToString(EncString))
		}

		if packet.Type() != PacketTypeUnused1 {
			t.Errorf("Type mismatch on idx %d. Got %s want %s", i, TypeToString(packet.Type()), TypeToString(PacketTypeUnused1))
		}

		if !bytes.Equal(packet.Data(), p.data[PACKET_HEADER_SIZE:]) {
			t.Errorf("Data mismatch on idx %d", i)
		}
	}
}
