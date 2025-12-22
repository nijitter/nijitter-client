package web

import (
	"database/sql"
	"net/http"
	"nijitter-client/database"

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
	c.HTML(http.StatusOK, "timeline.html", nil)
}

func UserHandle(c *gin.Context) {
	userID := c.Param("id")

	row := database.DB.QueryRow(`SELECT username, user_id, bio, status_message, created_at FROM users WHERE user_id = ?`, userID)

	var u userData
	err := row.Scan(
		&u.Username,
		&u.UserID,
		&u.BIO,
		&u.StatusMessage,
		&u.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "サーバー側でエラーが発生しました",
		})
		return
	}

	var iconPath *string
	if u.IconPath.Valid {
		iconPath = &u.IconPath.String
	}
	var bio *string
	if u.BIO.Valid {
		bio = &u.BIO.String
	}
	var statusMessage *string
	if u.StatusMessage.Valid {
		statusMessage = &u.StatusMessage.String
	}

	createdAt := u.CreatedAt.Format("2006年1月")

	c.HTML(http.StatusOK, "user.html", gin.H{
		"username":       u.Username,
		"userID":         u.UserID,
		"image_url":      os.Getenv("IMAGE_URL"),
		"icon_path":      iconPath,
		"bio":            bio,
		"status_message": statusMessage,
		"created_at":     createdAt,
	})
}

func CarrotHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "carrot.html", gin.H{
		"carrotID": c.Param("id"),
	})
}

func NightHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "night.html", nil)
}

func PostCarrotHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "postcarrot.html", nil)
}
