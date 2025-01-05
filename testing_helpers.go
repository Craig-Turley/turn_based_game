package main

import (
	"bytes"
	"encoding/binary"
)

// const (
// 	PacketAuth PacketType = iota // outbound
// 	PacketHealthCheckReq
// 	PacketHealthCheckRes // outbound
// 	PacketError
// 	PacketCreateGame
// 	PacketGameCreated // outbound
// 	PacketJoinGame
// 	PacketJoinGameSuccess // outbound
// 	PacketJoinGameFailure // outbound
// )

type PacketTestInfo struct {
	p       Packet
	enc     Encoding
	pktType PacketType
	data    []byte
	length  int
}

var Packets = []PacketTestInfo{
	newTestPacket(EncString, PacketHealthCheckRes, []byte("Im alive :D")),
	newTestPacket(EncString, PacketAuth, []byte("012345")),
	newTestPacket(EncString, PacketCreateGameSuccess, []byte("012345")),
	newTestPacket(EncString, PacketJoinGameSuccess, []byte("012345")),
	newTestPacket(EncString, PacketJoinGameFailure, []byte(ERROR_INVALID_GAME_ID.Error())),
	newTestPacket(EncString, PacketHealthCheckRes, []byte("Im alive :D")),
	newTestPacket(EncString, PacketAuth, []byte("012345")),
	newTestPacket(EncString, PacketCreateGameSuccess, []byte("012345")),
	newTestPacket(EncString, PacketJoinGameSuccess, []byte("012345")),
	newTestPacket(EncString, PacketJoinGameFailure, []byte(ERROR_INVALID_GAME_ID.Error())),
}

// helper functions to send data in correct encoding

func bitPack(enc Encoding, packetType PacketType) uint8 {
	return uint8((enc&0x3)<<6) | uint8(packetType&0x3F)
}

// test packet wraps a packet and all its expected output: enc, type, data, and full length (data len + header size)
func newTestPacket(enc Encoding, pktType PacketType, data []byte) PacketTestInfo {
	return PacketTestInfo{
		p:       ConstructPacket(enc, pktType, data),
		enc:     enc,
		pktType: pktType,
		data:    data,
		length:  len(data) + 4,
	}
}

func newEncodedString(message string) []byte {
	buf := new(bytes.Buffer)
	version := VERSION
	encType := bitPack(EncString, PacketHealthCheckReq)
	length := uint16(len(message))

	binary.Write(buf, binary.BigEndian, version)
	binary.Write(buf, binary.BigEndian, encType)
	binary.Write(buf, binary.BigEndian, length)

	buf.Write([]byte(message))

	return buf.Bytes()
}
