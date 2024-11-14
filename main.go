package main

import "log"

func main() {
	transport := NewTCPTransport(":3000")

	if err := transport.Start(); err != nil {
		log.Fatal(err.Error())
	}

	select {}
}
