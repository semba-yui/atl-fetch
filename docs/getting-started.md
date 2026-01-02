# クイックスタートガイド

atl-fetch は、Atlassian Cloud（Jira / Confluence）から情報を取得するための CLI ツールです。

## 前提条件

- Node.js 22.0.0 以上
- npm または pnpm
- Atlassian Cloud アカウント
- API トークン（取得方法は[認証設定](./authentication.md)を参照）

## インストール

### npm からインストール

```bash
npm install -g atl-fetch
```

### pnpm からインストール

```bash
pnpm add -g atl-fetch
```

## 環境変数の設定

atl-fetch を使用する前に、Atlassian API への認証情報を環境変数に設定してください。

```bash
export ATLASSIAN_EMAIL="your-email@example.com"
export ATLASSIAN_API_TOKEN="your-api-token"
```

詳細な設定方法については[認証設定ガイド](./authentication.md)を参照してください。

## 基本的な使い方

### Jira Issue の取得

```bash
# Jira Issue の情報を JSON 形式で取得
atl-fetch https://your-org.atlassian.net/browse/PROJ-123
```

### Confluence ページの取得

```bash
# Confluence ページの情報を JSON 形式で取得
atl-fetch https://your-org.atlassian.net/wiki/spaces/DOCS/pages/123456789/Page-Title
```

### 出力形式の変更

```bash
# Markdown 形式で出力
atl-fetch https://your-org.atlassian.net/browse/PROJ-123 --format markdown

# YAML 形式で出力
atl-fetch https://your-org.atlassian.net/browse/PROJ-123 --format yaml
```

### 添付ファイルのダウンロード

```bash
# 添付ファイルをダウンロードしてディレクトリに保存
atl-fetch https://your-org.atlassian.net/browse/PROJ-123 --download --dir ./output
```

### 差分のみを表示

```bash
# 変更履歴の差分のみを表示
atl-fetch https://your-org.atlassian.net/browse/PROJ-123 --diff
```

## 次のステップ

- [認証設定](./authentication.md) - API トークンの取得と設定方法
- [コマンドリファレンス](./cli-reference.md) - 全オプションの詳細
- [使用例](./examples/) - 具体的なユースケース
