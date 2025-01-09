package main

import "log"

// |  Version  |  Type   |  ClientID  | Data...
//	1 byte     1 byte       8 bytes     Packet max size - game header size - header size

const (
	GSVERSION = uint8(1)
)

const (
	GS_VERSION_OFFSET   = uint8(0)
	GS_TYPE_OFFSET      = uint8(1)
	GS_CLIENT_ID_OFFSET = uint8(2)
	GS_DATA_OFFSET      = uint8(10)
)

func gameState(data []byte) GameState {
	return GameState(data[GS_TYPE_OFFSET])
}

func gameStateClientID(data []byte) ClientID {
	return ClientID(data[GS_CLIENT_ID_OFFSET : GS_CLIENT_ID_OFFSET+8])
}

func gameStateData(data []byte) []byte {
	return data[GS_DATA_OFFSET:]
}

type Game struct {
	clients        []*Client
	id             GameID
	state          GameState
	ch             chan *Packet
	quitch         chan interface{}
	validationFunc func(pkt *Packet) error
}

// TODO rename this to something more appropriate
// i guess readLoop works
func (g *Game) readLoop() {
	for {
		select {
		case pkt := <-g.ch:
			log.Printf("Gamestate of type %s with data %s", GameStateToString(gameState(pkt.Data())), gameStateData(pkt.Data()))
			err := g.broadCast(pkt)
			if err != nil {
				// TODO find a way to pipe this error back to the client
				// can probably just use clientID and sent back to client
				log.Println("There was a packet validation/broadcast error")
			}
		case <-g.quitch:
			log.Printf("Game with ID %s finished", g.id)
			return
		}
	}
}

func (g *Game) broadCast(pkt *Packet) error {
	err := g.validationFunc(pkt)
	if err != nil {
		return err
	}

	log.Println("Data:", gameStateData(pkt.Data()))

	for _, c := range g.clients {
		if c.clientID == gameStateClientID(pkt.Data()) {
			continue
		}
		c.Write(pkt.data)
	}
	log.Println("Done broadcasting")

	return nil
}

func NewGame(c *Client, vf func(pkt *Packet) error) *Game {
	return &Game{
		clients:        []*Client{c},
		id:             GenerateGameId(),
		ch:             make(chan *Packet, 10),
		quitch:         make(chan interface{}),
		validationFunc: vf,
	}
}
