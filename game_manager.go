package main

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"sync"
)

type GameManager struct {
	mu             sync.Mutex
	games          map[GameID]*Game
	validationFunc func(pkt Packet) error
}

func NopValidationFunc(pkt Packet) error {
	return nil
}

func GenerateGameId() GameID {
	mx := big.NewInt(900000)
	n, err := rand.Int(rand.Reader, mx)
	if err != nil {
		// TODO handle this somehow
		panic(err)
	}
	return GameID(fmt.Sprintf("%d", n.Int64()+100000))
}

func NewGameManager() GameManager {
	return GameManager{
		mu:             sync.Mutex{},
		games:          make(map[GameID]*Game),
		validationFunc: NopValidationFunc,
	}
}

func (m *GameManager) CreateNewGame(c *Client) error {
	if len(c.gameID) != 0 {
		log.Printf("Client with ID %s attempted to create a game while already in a game", c.clientID)
		return ERROR_INVALID_CREATE_GAME_ATTEMPT
	}

	game := NewGame(c, m.validationFunc)

	m.mu.Lock()
	m.games[game.id] = game
	m.mu.Unlock()

	go game.readLoop()

	msg := []byte(fmt.Sprintf("%s", game.id))

	c.Write(ConstructPacket(EncString, PacketCreateGameSuccess, msg).data)

	c.gameID = game.id
	c.gamePump = game.ch

	return nil
}

func (m *GameManager) JoinGame(c *Client, id GameID) error {
	if len(c.gameID) != 0 {
		log.Printf("Client with ID %s attempted to join game while currently in game", c.clientID)
		return ERROR_INVALID_GAME_JOIN_ATTEMPT
	}

	// TODO find a way to parse this based on encoding
	if len(id) != 6 {
		return ERROR_INVALID_GAME_ID
	}

	game, ok := m.games[id]
	if !ok {
		log.Printf("Game of id %s does not exist!", id)
		return ERROR_INVALID_GAME_ID
	}

	msg := []byte(fmt.Sprintf("%s", game.id))
	game.clients = append(game.clients, c)
	c.Write(ConstructPacket(EncString, PacketJoinGameSuccess, msg).data)

	c.gameID = game.id
	c.gamePump = game.ch

	return nil
}

func (m *GameManager) Disconnect(c *Client) error {
	if len(c.gameID) == 0 {
		return ERROR_CLIENT_NOT_IN_GAME
	}

	game, ok := m.games[c.gameID]
	if !ok {
		// this would be so weird
		log.Printf("Client %s attempted to disconnect from game that didn't exist", c.Id())
		return ERROR_INVALID_GAME_DISCONNECT
	}

	game.clients = removeClient(game.clients, c)
	c.gameID = ""

	c.Write(ConstructPacket(EncString, PacketLeaveGameSuccess, []byte("")).data)

	return nil
}

func removeClient(clients []*Client, target *Client) []*Client {
	for i, client := range clients {
		if client == target {
			return append(clients[:i], clients[i+1:]...)
		}
	}
	return clients
}

func (m *GameManager) StartGame(c *Client, id GameID) error {
	_, ok := m.games[id]
	if !ok {
		log.Printf("Game of id %s does not exist!", id)
		return ERROR_INVALID_GAME_ID
	}

	return nil
}
