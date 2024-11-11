package main

import (
	"bytes"
	"net"
	"testing"
	"time"
)

func TestTransport(t *testing.T) {
  tcptransport := NewTCPTransport(":3000")

  tests := []struct {
      data []byte
      len  int
  }{
      {
          data: []byte("Hello, TCP Server!"),
          len:  17, 
      },
      {
          data: []byte("Another test case"),
          len:  17, 
      },
      {
          data: []byte(" "),
          len:  0, 
      },
      {
          data: []byte("Short"),
          len:  5, 
      },
      {
          data: []byte("A much longer test case to check buffer handling and server response for larger payloads."),
          len:  79, 
      },
  }

  if err := tcptransport.Start(); err != nil {
    t.Fatalf("Error starting tcptransport")
  }

  time.Sleep(time.Millisecond * 300)

  conn, err := net.Dial("tcp", "127.0.0.1:3000")
  if err != nil {
    t.Fatalf("Error connecting to server %s", err)
  }

  for i, p := range tests {
    conn.Write(p.data)
    t.Log(i)
    packet := <- tcptransport.Consume()
    t.Log(string(packet.data))
    if !bytes.Equal(p.data, packet.data) {
      t.Errorf("Packet data mismatch sent %s got %s", string(p.data), string(packet.data))
    }
  }

  tcptransport.Close()
}
