package main

import (
	"errors"
	"net"
)

const VERSION = 1
const PACKET_MAX_SIZE = 1024
const PACKET_HEADER_SIZE = 4
const HEADER_LENGTH_OFFSET = 2

var ERROR_VERSION_MISMATCH = errors.New("Version mismatch error")
var ERROR_PACKET_LENGTH_MISMATCH = errors.New("Packet length mismatch error") 

// Client is a wrapper for the underlying connection
type Client struct {
  conn   net.Conn
  framer PacketFramer
}

func NewClient(conn net.Conn) *Client {
  return &Client {
    conn:   conn,
    framer: NewPacketFramer(),
  } 
}

type Packet struct {
  data []byte
  len  int
}

func NewPacket(data []byte) Packet {
  return Packet {
    data: data,
    len : len(data),
  }
}

// Transport is responsible for sending and recieving data
// and sends packets to a read only channel which can be
// read from the server. Each each network is responsible
// for implementing its own protocol for constructing a 
// packet that can be read by a server
type Transport interface {
  Start()              error
  Consume()            <- chan Packet
  Close()              error  
} 

