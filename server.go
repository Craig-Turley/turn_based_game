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
	// Packet
	ERROR_VERSION_MISMATCH       = errors.New("Version mismatch error")
	ERROR_PACKET_LENGTH_MISMATCH = errors.New("Packet length mismatch error")
	ERROR_CLIENT_ID_GENERATION   = errors.New("Error generating random ID for client")
	// server
	ERROR_NO_HANDLER_REGISTERED = errors.New("No handler registered for current packet type")
	ERROR_SERVER_TIMEOUT        = errors.New("Error server timed out while attempting to complete request")
	// auth
	ERROR_INVALID_AUTH_PKT = errors.New("Invalid authentication packet")
	ERROR_INVALID_AUTH_ID  = errors.New("Invalid authentication attempt")
	ERROR_AUTH_TIMEOUT     = errors.New("Authentication attempt timed out")
	// game
	ERROR_INVALID_GAME_ID             = errors.New("GameID is invalid")
	ERROR_INVALID_GAME_JOIN_ATTEMPT   = errors.New("Cannot join game while currently in game")
	ERROR_INVALID_GAME_DISCONNECT     = errors.New("Client attempted to disconnect from game that didn't exist")
	ERROR_CLIENT_NOT_IN_GAME          = errors.New("Client not registered with game")
	ERROR_INVALID_CREATE_GAME_ATTEMPT = errors.New("Cannot create game while currently in game")
	ERROR_INVALID_GAME_STATE          = errors.New("Client game state is invalid")
	// test
	ERROR_INVALID_HQ_RES = errors.New("Invalid health check response") // testing
)

// Client is for a connected client
// contains connection and packet framer
// for formatting byte stream
type Client struct {
	conn     net.Conn
	clientID ClientID
	gameID   GameID
	gamePump chan<- *Packet
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

func (c *Client) Id() string {
	return string(c.clientID)
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

// Error is the struct containing all
// necessary fields to create a JSON
// error response
type Error struct {
	Code    int    `json:"code"`
	Err     string `json:"error"`
	Message string `json:"message"`
}

func NewError(err error) Error {
	return Error{
		Code:    errorToStatusCode(err),
		Err:     errorToString(err),
		Message: err.Error(),
	}
}

func errorToString(err error) string {
	switch err {
	// packet errors
	case ERROR_VERSION_MISMATCH:
		return "Version mismatch"
	case ERROR_PACKET_LENGTH_MISMATCH:
		return "Packet length mismatch"
	case ERROR_CLIENT_ID_GENERATION:
		return "Failed to generate random ID for client"
	// server errors
	case ERROR_NO_HANDLER_REGISTERED:
		return "No handler registered for current packet type"
	case ERROR_SERVER_TIMEOUT:
		return "Server timed out while attempting to complete request"
	// auth errors
	case ERROR_INVALID_AUTH_PKT:
		return "Invalid authentication packet"
	case ERROR_INVALID_AUTH_ID:
		return "Invalid authentication attempt"
	case ERROR_AUTH_TIMEOUT:
		return "Authentication attempt timed out"
	// game errors
	case ERROR_INVALID_GAME_ID:
		return "Invalid game ID"
	case ERROR_INVALID_GAME_JOIN_ATTEMPT:
		return "Cannot join game while currently in another game"
	case ERROR_INVALID_GAME_DISCONNECT:
		return "Attempted to disconnect from a game that doesn't exist"
	case ERROR_CLIENT_NOT_IN_GAME:
		return "Client is not registered with any game"
	case ERROR_INVALID_CREATE_GAME_ATTEMPT:
		return "Cannot create a new game while already in one"
	case ERROR_INVALID_GAME_STATE:
		return "Client's game state is invalid"
	// test errors
	case ERROR_INVALID_HQ_RES:
		return "Invalid health check response"
	// default case
	default:
		return "Unknown error"
	}
}

func errorToStatusCode(err error) int {
	switch err {
	// packet errors
	case ERROR_VERSION_MISMATCH:
		return 400
	case ERROR_PACKET_LENGTH_MISMATCH:
		return 400
	case ERROR_CLIENT_ID_GENERATION:
		return 500
	// server errors
	case ERROR_NO_HANDLER_REGISTERED:
		return 404
	case ERROR_SERVER_TIMEOUT:
		return 504
	// auth errors
	case ERROR_INVALID_AUTH_PKT:
		return 401
	case ERROR_INVALID_AUTH_ID:
		return 403
	case ERROR_AUTH_TIMEOUT:
		return 408
	// game errors
	case ERROR_INVALID_GAME_ID:
		return 400
	case ERROR_INVALID_GAME_JOIN_ATTEMPT:
		return 403
	case ERROR_INVALID_GAME_DISCONNECT:
		return 400
	case ERROR_CLIENT_NOT_IN_GAME:
		return 403
	case ERROR_INVALID_CREATE_GAME_ATTEMPT:
		return 403
	case ERROR_INVALID_GAME_STATE:
		return 400
	// test errors
	case ERROR_INVALID_HQ_RES:
		return 500
	// Default case
	default:
		return 0 // No matching error
	}
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
