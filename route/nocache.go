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

	// ベースディレクトリを絶対パスかつ正規化した形で取得
	absStatic, err := filepath.Abs(staticDir)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	absStatic = filepath.Clean(absStatic)

	// ユーザー入力を使ってパスを構築し、正規化
	joined = filepath.Join(absStatic, reqPath)
	absJoined = filepath.Clean(joined)

	// セキュリティチェック：結果パスがベースディレクトリ内であることを確認
	// 1. 正確にベースディレクトリと一致するか
	// 2. またはベースディレクトリ + セパレータで始まるか
	if absJoined != absStatic && !strings.HasPrefix(absJoined, absStatic+string(filepath.Separator)) {
		c.Status(http.StatusBadRequest)
		return
	}

	// 配信
	c.File(absJoined)
}
