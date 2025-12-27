package route

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

const staticDir = "./static"

func staticHandler(c *gin.Context) {
	reqPath := c.Param("filepath")

	// --- キャッシュ制御 ---
	if strings.HasSuffix(reqPath, ".js") || strings.HasSuffix(reqPath, ".css") {
		// JS / CSS はキャッシュさせない
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
	} else {
		// 画像・フォントなどは通常キャッシュ
		c.Header("Cache-Control", "public, max-age=86400")
	}

	// --- パストラバーサル対策 ---
	joined := filepath.Join(staticDir, reqPath)

	absJoined, err := filepath.Abs(joined)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	absStatic, err := filepath.Abs(staticDir)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	if absJoined != absStatic &&
		!strings.HasPrefix(absJoined, absStatic+string(filepath.Separator)) {
		c.Status(http.StatusBadRequest)
		return
	}

	// --- 配信 ---
	c.File(absJoined)
}
