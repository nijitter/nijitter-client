package database

import (
	"database/sql"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() {
	for i := 0; i < 10; i++ {
		DB, err := sql.Open("mysql", os.Getenv("DBUSER")+":"+os.Getenv("DBPASS")+"@tcp("+os.Getenv("DBHOST")+":3306)/"+os.Getenv("DBNAME")+"?parseTime=true")
		if err == nil && DB.Ping() == nil {
			break
		}
	}
	time.Sleep(2 * time.Second)
}
