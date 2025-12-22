package main

import (
	"nijitter-client/database"
	"nijitter-client/route"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	database.InitDB()
	route.Router()
}
