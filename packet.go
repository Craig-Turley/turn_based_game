package main

import (
	"bytes"
	"encoding/binary"
	"io"
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
	PacketTypeUnused1 PacketType = iota
	PacketTypeUnused2
	PacketCreateGame
	PacketGameCreated // outbound
)

type PacketFramer struct {
	buf []byte
	idx int
	C   chan *Packet
}

func NewPacketFramer() *PacketFramer {
	return &PacketFramer{
		buf: make([]byte, PACKET_MAX_SIZE, PACKET_MAX_SIZE),
		C:   make(chan *Packet, 10),
	}
}

func FrameWithReader(framer *PacketFramer, reader io.Reader) error {
	data := make([]byte, 100, 100)
	for {
		n, err := reader.Read(data)
		if err != nil {
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

func TypeToString(t PacketType) string {
	switch t {
	case PacketTypeUnused1:
		return "PacketTypeUnused1"
	case PacketTypeUnused2:
		return "PacketTypeUnused2"
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
	buf := new(bytes.Buffer)
	encType := bitPack(enc, pktType)
	length := uint16(len(data))

	binary.Write(buf, binary.BigEndian, VERSION)
	binary.Write(buf, binary.BigEndian, encType)
	binary.Write(buf, binary.BigEndian, length)
	binary.Write(buf, binary.BigEndian, data)

	return NewPacket(buf.Bytes())
}

func getPacketLength(data []byte) uint16 {
	return binary.BigEndian.Uint16(data[HEADER_LENGTH_OFFSET:])
}
