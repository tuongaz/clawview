package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/tuongaz/clawhawk/web"
)

func main() {
	addr := flag.String("addr", ":3333", "listen address")
	flag.Parse()

	http.HandleFunc("/ws", web.HandleWebSocket)
	http.Handle("/", web.StaticHandler())

	fmt.Printf("clawhawk dashboard: http://localhost%s\n", *addr)
	log.Fatal(http.ListenAndServe(*addr, nil))
}
