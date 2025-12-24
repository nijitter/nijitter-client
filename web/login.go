package web

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func SlackHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "slack.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}

func SignupHandle(c *gin.Context) {
	// Slackにアクセス後リダイレクトされるhandler
	c.HTML(http.StatusOK, "signup.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}

func VerifyHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "verify.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}

// loginフォームを返す
func LoginHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "login.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}

func ErrorHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "error.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}

// Slack認証のクエリにstateを付与
func StateHandle(c *gin.Context) {
	resp, err := http.Get(os.Getenv("API_URL") + "/api/auth/state")
	if err != nil {
		c.JSON(500, gin.H{"error": "api error"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		c.JSON(500, gin.H{"error": "api error"})
		return
	}

	var result struct {
		RedirectURL string `json:"redirect_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(500, gin.H{"error": "decode error"})
		return
	}

	c.Redirect(http.StatusSeeOther, result.RedirectURL)
}

func SuccessHandle(c *gin.Context) {
	c.HTML(http.StatusOK, "success.html", gin.H{
		"apiUrl": os.Getenv("API_URL"),
	})
}
