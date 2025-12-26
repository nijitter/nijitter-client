package route

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

const staticDir = "./static"

func noCacheStaticFile(c *gin.Context) {
	// no-store ヘッダ
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	// ユーザー入力
	reqPath := c.Param("filepath")

	// staticDir と結合
	joined := filepath.Join(staticDir, reqPath)

	// 絶対パス化
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

	// staticDir の中にあるか検証
	rel, err := filepath.Rel(absStatic, absJoined)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		c.Status(http.StatusBadRequest)
		return
	}

	// 配信
	c.File(absJoined)
}
