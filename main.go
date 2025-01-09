package main

import "log"

const (
	ATTACK GameState = iota
	DEFENSE
)

func GameStateToString(gs GameState) string {
	switch gs {
	case ATTACK:
		return "Attack"
	case DEFENSE:
		return "Defense"
	}

	return "Invalid"
}

func validateGamePkt(pkt *Packet) error {
	switch gameState(pkt.Data()) {
	case ATTACK:
		return nil
	case DEFENSE:
		return nil
	}
	return nil
}

func main() {
	server := NewTCPServer("0.0.0.0:3000")

	server.SetGameStateValidationFunc(validateGamePkt)

	if err := server.Start(); err != nil {
		log.Fatal(err.Error())
	}

	<-server.quitch
}
