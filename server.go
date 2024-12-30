package main

import (
	"errors"
	"net"
)

const (
	VERSION              = uint8(1)
	PACKET_MAX_SIZE      = 1024
	PACKET_HEADER_SIZE   = 4
	HEADER_LENGTH_OFFSET = 2
	ENC_TYPE_OFFSET      = uint8(1)
	MAX_DATA_SIZE        = PACKET_MAX_SIZE - PACKET_HEADER_SIZE
)

var (
	ERROR_VERSION_MISMATCH       = errors.New("Version mismatch error")
	ERROR_PACKET_LENGTH_MISMATCH = errors.New("Packet length mismatch error")
	ERROR_CLIENT_ID_GENERATION   = errors.New("Error generating random ID for client")
)

// Client is for a connected client
// contains connection and packet framer
// for formatting byte stream
type Client struct {
	conn     net.Conn
	gameID   GameID
	gamePump chan<- Packet
}

// NewClient creates a client given a connection
// and generates a new PacketFramer for use
func NewClient(conn net.Conn) *Client {
	return &Client{
		conn: conn,
	}
}

// Implements client as a writer
func (c *Client) Write(data []byte) (int, error) {
	return c.conn.Write(data)
}

func (c *Client) Addr() net.Addr {
	return c.conn.RemoteAddr()
}

func (c *Client) Disconnect() {
	c.conn.Close()
}

// Packet is the way of interpreting data from our
// clients. data contains a header field of
// length PACKET_HEADER_SIZE
type Packet struct {
	data []byte
	len  int
}

// Constructor that returns a packet
// with the data and appropriate length
// field
func NewPacket(data []byte) Packet {
	return Packet{
		data: data,
		len:  len(data),
	}
}

// Encoding grabs the encoding that is bit packed
// in the second byte (idx 1) of the header portion
// of packet data
func (p *Packet) Encoding() Encoding {
	return Encoding((p.data[ENC_TYPE_OFFSET] >> 6) & 0x3)
}

// Type grabs the encoding that is bit packed
// in the second byte (idx 1) of the header portion
// of packet data
func (p *Packet) Type() PacketType {
	return PacketType(p.data[ENC_TYPE_OFFSET] & 0x3F)
}

// Method to grab just the data from the packet
func (p *Packet) Data() []byte {
	return p.data[PACKET_HEADER_SIZE:]
}

// Transport is responsible for sending and recieving data
// and sends packets to a read only channel which can be
// read from the server. Each each network is responsible
// for implementing its own protocol for constructing a
// packet that can be read by a server
type Server interface {
	Start() error
	Close() error
}
