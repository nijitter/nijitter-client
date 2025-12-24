package main

import (
	"nijitter-client/route"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	route.Router()
}
