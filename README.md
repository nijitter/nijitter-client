# nijitter-client

Nijitterのフロントエンドクライアント

---

## 依存関係

- Go 1.25+
- Node.js 18+ (TypeScriptビルド用)
- [nijitter-server](https://github.com/nijitter/nijitter-server) (バックエンド)
- [nijitter-image-server](https://github.com/nijitter/nijitter-image-server) (画像サーバー)

---

## セットアップ

### 1. 環境変数の設定

`.env.example`を`.env`にコピーして必要な値を設定:

```bash
cp .env.example .env
```

必須項目:
- `API_URL` - nijitter-serverのURL (例: `http://localhost:8080`)
- `IMAGE_URL` - nijitter-image-serverのURL (例: `http://localhost:5000`)
- `MAIN_URL` - このクライアントのURL (例: `http://localhost:3000`)
- `PORT` - このサーバーのポート (デフォルト: `3000`)

### 2. TypeScriptのセットアップ

```bash
npm install
```

### 3. TypeScriptのビルド

```bash
npm run build:ts
```

または開発時は自動ビルド:

```bash
npm run watch:ts
```

### 4. サーバーの起動

```bash
go mod download
go run cmd/nijitter-client/main.go
```

またはVS Codeのタスク「Run nijitter-client」を実行

---

## 開発

### TypeScriptファイルの編集

`static/js/*.ts`ファイルを編集後、以下のいずれかを実行:

- `npm run build:ts` - 1回ビルド
- `npm run watch:ts` - 変更を監視して自動ビルド
- VS Codeタスク「Watch TypeScript」

### ディレクトリ構成

```
├── cmd/nijitter-client/  # エントリーポイント
├── route/                # ルーティング
├── web/                  # ハンドラー
├── template/             # HTMLテンプレート
└── static/
    ├── css/              # スタイルシート
    └── js/               # TypeScript/JavaScript
```

---

## VS Codeタスク

- `Run nijitter-client` - サーバー起動
- `Build TypeScript` - TypeScriptをビルド
- `Watch TypeScript` - TypeScriptを監視
- `Run All Services` - 全サービスを起動
