package main

// Server is an interface that uses
// a transport object to handle incoming
// messages/packets via transport network
// and handles messages as indicated
type Server interface {
	Start() error
	Close()
}
