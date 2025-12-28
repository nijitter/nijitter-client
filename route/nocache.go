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

	// --- パストトラバーサル対策 ---
	// ベースディレクトリを絶対パスに正規化
	absStatic, err := filepath.Abs(staticDir)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	// ユーザー入力を使ってパスを構築し、正規化
	joined := filepath.Join(absStatic, reqPath)
	absJoined := filepath.Clean(joined)

	// セキュリティチェック：結果パスがベースディレクトリ内であることを確認
	// 1. 正確にベースディレクトリと一致するか
	// 2. またはベースディレクトリ + セパレータで始まるか
	if absJoined != absStatic && !strings.HasPrefix(absJoined, absStatic+string(filepath.Separator)) {
		c.Status(http.StatusBadRequest)
		return
	}

	// --- 配信 ---
	c.File(absJoined)
}
