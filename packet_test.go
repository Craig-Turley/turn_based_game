package main

import (
	"bytes"
	"testing"
)

func TestFramer(t *testing.T) {
	framer := NewPacketFramer()
	for i, pt := range Packets {
		p := pt.p
		framer.push(p.data)
		res := <-framer.C
		if !bytes.Equal(res.data, p.data) {
			t.Errorf("Data mismatch on test idx %d. Got %v want %v", i, res.data, p.data)
		}
	}
}

func TestPacketFunctions(t *testing.T) {
	for i, p := range Packets {
		if p.enc != p.p.Encoding() {
			t.Errorf("Enc mismatch on idx %d. Got %s want %s", i, EncToString(p.p.Encoding()), EncToString(p.enc))
		}

		if p.pktType != p.p.Type() {
			t.Errorf("Type mismatch on idx %d. Got %s want %s", i, TypeToString(p.p.Type()), TypeToString(p.pktType))
		}

		if !bytes.Equal(p.p.Data(), p.data) {
			t.Errorf("Data mismatch on idx %d", i)
		}
	}
}
