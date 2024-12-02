package main

import (
	"fmt"
	"os"
	"testing"
)

const (
	NETWORK     = "tcp"
	LISTEN_ADDR = "127.0.0.1:3000"
)

func TestMain(m *testing.M) {
	server, err := setup()
	if err != nil {
		panic(fmt.Sprintf("Server error: %s", err.Error()))
	}

	code := m.Run()

	teardown(server)

	os.Exit(code)
}

func setup() (Server, error) {
	server := NewTCPServer(LISTEN_ADDR)

	if err := server.Start(); err != nil {
		return nil, err
	}

	return server, nil
}

func teardown(server Server) {
	server.Close()
}
