package main

import (
	"encoding/binary"
	"errors"
	"io"
	"log"
	"net"
)

type OnPeer func(client *Client) error

type TCPTransport struct {
	addr     string
	ln       net.Listener
	onPeer   OnPeer
	packetch chan Packet
}

func NewTCPTransport(addr string) *TCPTransport {
	return &TCPTransport{
		addr:     addr,
		packetch: make(chan Packet),
	}
}

type PacketFramer struct {
	buf []byte
	idx int
	C   chan *Packet
}

func NewPacketFramer() PacketFramer {
	return PacketFramer{
		buf: make([]byte, PACKET_MAX_SIZE, PACKET_MAX_SIZE),
		C:   make(chan *Packet, 10),
	}
}

func getPacketLength(data []byte) uint16 {
	return binary.BigEndian.Uint16(data[HEADER_LENGTH_OFFSET:])
}

func (p *PacketFramer) push(data []byte, out chan Packet) error {
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

		out <- *packet
	}
}

func (p *PacketFramer) pull() (*Packet, error) {
	if p.idx < PACKET_HEADER_SIZE {
		return nil, nil
	}

	if p.buf[0] != VERSION {
		return nil, ERROR_VERSION_MISMATCH
	}

	// check the friggin encoding and type at some point
	pktLen := getPacketLength(p.buf)
	fullLen := pktLen + PACKET_HEADER_SIZE
	if fullLen >= PACKET_MAX_SIZE {
		return nil, ERROR_PACKET_LENGTH_MISMATCH
	}

	if fullLen <= uint16(p.idx) {
		// start the fuggin process of making da packet
		out := make([]byte, fullLen, fullLen)
		copy(out, p.buf[:fullLen])
		copy(p.buf, p.buf[fullLen:])
		p.idx -= int(fullLen)

		pkt := NewPacket(out)
		return &pkt, nil
	}

	return nil, nil
}

func (t *TCPTransport) Start() error {
	ln, err := net.Listen("tcp", t.addr)
	if err != nil {
		return err
	}

	t.ln = ln

	go t.Accept()

	return nil
}

func (t *TCPTransport) Accept() {
	for {
		conn, err := t.ln.Accept()
		if errors.Is(err, net.ErrClosed) {
			return
		}

		if err != nil {
			log.Printf("TCP accept error: %s\n", err)
		}

		client := NewClient(conn)
		t.onPeer(client)

		go t.Read(client)
	}
}

func (t *TCPTransport) Read(client *Client) {
	defer func() {
		log.Println("Dropping connection...")
		client.conn.Close()
	}()

	for {
		buf := make([]byte, PACKET_MAX_SIZE)
		n, err := client.conn.Read(buf)
		if errors.Is(err, io.EOF) { // EOF is returned when connection is closed unless im actually stupid
			return
		}

		if err != nil {
			log.Println(err)
			continue
		}

		client.framer.push(buf[:n], t.packetch)
	}
}

func (t *TCPTransport) Consume() <-chan Packet {
	return t.packetch
}

func (t *TCPTransport) Close() error {
	return t.ln.Close()
}
