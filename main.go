package main

import "log"

func main() {
	server := NewTCPServer(":3000")

	if err := server.Start(); err != nil {
		log.Fatal(err.Error())
	}

	select {}
}
