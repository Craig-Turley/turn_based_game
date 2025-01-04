package main

import (
	"encoding/binary"
	"io"
	"log"
)

// Available encoding
type Encoding uint8

const (
	EncCustom Encoding = iota
	EncJSON
	EncString
	EncUnused2
)

// Available packet types
type PacketType uint8

const (
	PacketAuth PacketType = iota // outbound
	PacketHealthCheckReq
	PacketHealthCheckRes // outbound
	PacketError          // outbound
	PacketCreateGame
	PacketGameCreated       // outbound
	PacketCreateGameFailure // outbound
	PacketJoinGame
	PacketJoinGameSuccess // outbound
	PacketJoinGameFailure // outbound
	PacketStartGame
	PacketGameState
	PacketDisconnect
	PacketGameStateError
)

type PacketFramer struct {
	buf   []byte
	idx   int
	C     chan *Packet
	errch chan error
}

func NewPacketFramer() *PacketFramer {
	return &PacketFramer{
		buf:   make([]byte, PACKET_MAX_SIZE, PACKET_MAX_SIZE),
		C:     make(chan *Packet, 10),
		errch: make(chan error, 1), // I have a feeling this will bite me in the butt... update it did!! :'D
	}
}

func FrameWithReader(framer *PacketFramer, reader io.Reader) error {
	data := make([]byte, 100, 100)
	for {
		log.Printf("Waiting to read from connection...")
		n, err := reader.Read(data)
		if err != nil {
			log.Printf("Error reading from connection %v", err)
			framer.errch <- err
			return err
		}

		framer.push(data[:n])
	}
}

func (p *PacketFramer) push(data []byte) error {
	n := copy(p.buf[p.idx:], data)

	if n < len(data) {
		p.buf = append(p.buf, data[n:]...)
	}

	p.idx += n

	for {
		packet, err := p.pull()
		if err != nil || packet == nil {
			// this line will cause the server to lock up no joke. unbuffered channels baby smh
			// def a skill issue on my part ngl
			// p.errch <- err
			return err
		}

		p.C <- packet
	}
}

func (p *PacketFramer) pull() (*Packet, error) {
	if p.idx < PACKET_HEADER_SIZE {
		return nil, nil
	}

	if p.buf[0] != VERSION {
		return nil, ERROR_VERSION_MISMATCH
	}

	pktLen := getPacketLength(p.buf)
	fullLen := pktLen + PACKET_HEADER_SIZE
	if fullLen >= PACKET_MAX_SIZE {
		return nil, ERROR_PACKET_LENGTH_MISMATCH
	}

	if fullLen <= uint16(p.idx) {
		out := make([]byte, fullLen, fullLen)
		copy(out, p.buf[:fullLen])
		copy(p.buf, p.buf[fullLen:])
		p.idx -= int(fullLen)

		pkt := NewPacket(out)
		return &pkt, nil
	}

	return nil, nil
}

// PacketGameStateError
func TypeToString(t PacketType) string {
	switch t {
	case PacketAuth:
		return "PacketAuth"
	case PacketHealthCheckReq:
		return "PacketHealthCheckReq"
	case PacketHealthCheckRes:
		return "PacketHealthCheckRes"
	case PacketError:
		return "PacketError"
	case PacketCreateGame:
		return "PacketCreateGame"
	case PacketGameCreated:
		return "PacketGameCreated"
	case PacketCreateGameFailure:
		return "PacketCreateGameFailure"
	case PacketJoinGame:
		return "PacketJoinGame"
	case PacketJoinGameSuccess:
		return "PacketJoinGameSuccess"
	case PacketJoinGameFailure:
		return "PacketJoinGameFailure"
	case PacketStartGame:
		return "PacketStartGame"
	case PacketGameState:
		return "PacketGameState"
	case PacketDisconnect:
		return "PacketDisconnect"
	case PacketGameStateError:
		return "PacketGameStateError"
	}
	return ""
}

func EncToString(e Encoding) string {
	switch e {
	case EncCustom:
		return "EncCustom"
	case EncJSON:
		return "EncJSON"
	case EncString:
		return "EncString"
	case EncUnused2:
		return "EncUnused2"
	}
	return ""
}

func ConstructPacket(enc Encoding, pktType PacketType, data []byte) Packet {
	header := []byte{VERSION, bitPack(enc, pktType), 0, 0}
	binary.BigEndian.PutUint16(header[HEADER_LENGTH_OFFSET:], uint16(len(data)))

	buf := append(header, data...)

	return NewPacket(buf)
}

func getPacketLength(data []byte) uint16 {
	return binary.BigEndian.Uint16(data[HEADER_LENGTH_OFFSET:])
}
