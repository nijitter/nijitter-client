package web

import (
	"database/sql"
	"errors"
	"net/http"
	"nijitter-client/database"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func SlackHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "slack.html", nil)
}

func SignupHandle(c *gin.Context) {
	// Slackにアクセス後リダイレクトされるhandler
	state := c.Query("state")
	code := c.Query("code")

	if state == "" || code == "" {
		c.HTML(http.StatusForbidden, "error.html", nil)
		return
	}
	err := verifySlackToken(state)
	if err != nil {
		deleteSlackVerification(state)
		c.HTML(http.StatusForbidden, "error.html", nil)
		return
	}
	deleteSlackVerification(state)

	err = GetAccessToken(code)
	if err != nil {
		c.HTML(http.StatusForbidden, "error.html", nil)
		return
	}
	c.SetCookie(
		"slack_verified",
		"1",
		300,  // MaxAge（秒）
		"/",  // Path
		"",   // Domain（空でOK）
		true, // Secure（https前提）
		true, // HttpOnly
	)
	c.HTML(http.StatusOK, "signup.html", nil)
}

func VerifyHandle(c *gin.Context) {
	token := c.Query("token")
	c.SetCookie(
		"email_verification_token",
		token,
		300,  // MaxAge（秒）
		"/",  // Path
		"",   // Domain（空でOK）
		true, // Secure（https前提）
		true, // HttpOnly
	)
	c.HTML(http.StatusOK, "verify.html", nil)
}

// loginフォームを返す
func LoginHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "login.html", nil)
}

func ErrorHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "error.html", nil)
}

// Slack認証のクエリにstateを付与
func StateHandle(c *gin.Context) {
	state, _ := MakeRandomStr(10)

	expires := time.Now().UTC().Add(15 * time.Minute)
	_, err := database.DB.Exec(
		`INSERT INTO slack_verifications (token, expires_at)
         VALUES (?, ?)`,
		state, expires,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーでエラーが発生しました"})
		return // 挿入時にエラーがあれば終了
	}
	c.Redirect(http.StatusSeeOther, os.Getenv("SLACK_URL")+state)
}

func SuccessHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "success.html", nil)
}

func verifySlackToken(state string) error {
	var expires time.Time

	err := database.DB.QueryRow(
		`SELECT expires_at FROM slack_verifications WHERE token = ?`,
		state,
	).Scan(&expires)

	if err == sql.ErrNoRows {
		return errors.New("invalid token")
	}

	if err != nil {
		return err
	}

	if time.Now().UTC().After(expires) {
		return errors.New("token expired")
	}

	return nil
}

func deleteSlackVerification(state string) error {
	_, err := database.DB.Exec(
		`DELETE FROM slack_verifications WHERE token = ?`,
		state,
	)
	return err
}
