package web

import (
	"database/sql"
	"net/http"

	"os"
	"time"

	"github.com/gin-gonic/gin"
)

type userData struct {
	Username      string
	UserID        string
	IconPath      sql.NullString
	BIO           sql.NullString
	StatusMessage sql.NullString
	CreatedAt     time.Time
}

type ResponseUserData struct {
	Username      string
	UserID        string
	IconPath      *string
	BIO           *string
	StatusMessage *string
	CreatedAt     time.Time
}

func TimelineHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "timeline.html", gin.H{
		"apiUrl":   os.Getenv("API_URL"),
		"image_url": os.Getenv("IMAGE_URL"),
	})
}

func UserHandle(c *gin.Context) {
	userID := c.Param("id")
	c.HTML(http.StatusOK, "user.html", gin.H{
		"userID":    userID,
		"image_url": os.Getenv("IMAGE_URL"),
		"apiUrl":    os.Getenv("API_URL"),
	})
}

func CarrotHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "carrot.html", gin.H{
		"carrotID": c.Param("id"),
		"apiUrl":   os.Getenv("API_URL"),
		"image_url": os.Getenv("IMAGE_URL"),
	})
}

func NightHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "night.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}

func PostCarrotHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "postcarrot.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}
