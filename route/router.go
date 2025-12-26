package route

import (
	"nijitter-client/web"

	"github.com/gin-gonic/gin"
)

func Router() {
	gin.SetMode(gin.ReleaseMode)

	route := gin.Default()
	route.LoadHTMLGlob("template/*")
	// JS をキャッシュさせない
	route.GET("/static/*.js", noCacheStaticFile)

	// CSS をキャッシュさせない
	route.GET("/static/*.css", noCacheStaticFile)

	// 画像・フォントなどは通常配信
	route.Static("/static", "./static")

	route.GET("/slack", web.SlackHandle)
	route.GET("/signup", web.SignupHandle)
	route.GET("/verify", web.VerifyHandle)
	route.GET("/login", web.LoginHandle)
	route.GET("/error", web.ErrorHandle)
	route.GET("/state", web.StateHandle)
	route.GET("/success", web.SuccessHandle)
	route.GET("/", web.TimelineHandle)
	route.GET("/user/:id", web.UserHandle)
	route.GET("/carrot/:id", web.CarrotHandle)
	route.GET("/night", web.NightHandle)
	route.GET("/postcarrot", web.PostCarrotHandle) // DOMでやりたいからテスト用

	route.Run()
}
