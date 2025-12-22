package web

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
)

type ResponseData struct {
	AuthedUser struct {
		ID string `json:"id"`
	} `json:"authed_user"`
	Team struct {
		ID string `json:"id"`
	} `json:"team"`
}

func GetAccessToken(code string) error {
	//endpointにアクセスしアクセストークンを取得
	endpoint := "https://slack.com/api/oauth.v2.access"

	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", os.Getenv("CLIENT_ID"))
	data.Set("client_secret", os.Getenv("CLIENT_SECRET"))
	data.Set("redirect_uri", os.Getenv("REDIRECT_URL"))

	resp, err := http.PostForm(endpoint, data)
	if err != nil {
		panic(err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	var responseData ResponseData
	if err := json.Unmarshal(body, &responseData); err != nil {
		panic(err)
	}

	if responseData.Team.ID != os.Getenv("TEAM_ID") {
		return errors.New("Filed_Team_id")
	}
	defer resp.Body.Close()
	return nil
}
