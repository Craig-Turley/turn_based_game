package main

import (
	// "bytes"
	"net"
	"testing"
	"time"
)

func TestServer(t *testing.T) {
	server, conn := serverTestSetup(t)

	defer func() {
		server.Close()
		conn.Close()
	}()

	time.Sleep(time.Millisecond * 300)

	for _, p := range tests {
		conn.Write(p.data)
	}
}

func serverTestSetup(t *testing.T) (*TCPServer, net.Conn) {
	server := NewTCPServer(":3000")

	if err := server.Start(); err != nil {
		t.Fatalf(err.Error())
	}

	conn, err := net.Dial(NETWORK, LOCAL_ADDRESS)
	if err != nil {
		t.Fatalf(err.Error())
	}

	return server, conn
}
