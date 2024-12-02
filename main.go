package main

import "log"

func main() {
	server := NewTCPServer("0.0.0.0:3000")

	if err := server.Start(); err != nil {
		log.Fatal(err.Error())
	}

	select {}
}
