# atl-fetch

[![CI](https://github.com/semba-yui/atl-fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/semba-yui/atl-fetch/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/atl-fetch.svg)](https://www.npmjs.com/package/atl-fetch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=semba-yui_atl-fetch\&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=semba-yui_atl-fetch)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/semba-yui/atl-fetch?utm_source=oss\&utm_medium=github\&utm_campaign=semba-yui%2Fatl-fetch\&labelColor=171717\&color=FF570A\&link=https%3A%2F%2Fcoderabbit.ai\&label=CodeRabbit+Reviews)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-semba--yui%2Fatl--fetch-blue.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==)](https://deepwiki.com/semba-yui/atl-fetch)

Atlassian Cloud（Jira / Confluence）から情報を取得する Node.js CLI ツール兼ライブラリです。

## 主な機能

- **Jira Issue 取得**: タイトル、説明、コメント、変更履歴、添付ファイル
- **Confluence ページ取得**: タイトル、本文、バージョン履歴、添付ファイル
- **複数出力形式**: JSON / Markdown / YAML
- **差分表示**: バージョン間の Unified diff 形式表示
- **添付ファイルダウンロード**: 指定ディレクトリへの保存
- **親切なエラーメッセージ**: エラーコード、原因、解決策を表示
- **進捗表示**: スピナーによる処理状況の可視化
- **認証チェック**: `atl-fetch auth check` で設定状態を確認

## 動作要件

- Node.js 22.0.0 以上
- pnpm（推奨）または npm

## インストール

```bash
# npm
npm install -g atl-fetch

# pnpm
pnpm add -g atl-fetch
```

## クイックスタート

### 1. 環境変数の設定

```bash
export ATLASSIAN_EMAIL="your-email@example.com"
export ATLASSIAN_API_TOKEN="your-api-token"
```

API トークンは [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens) から取得できます。

### 2. 基本的な使用方法

```bash
# Jira Issue を取得
atl-fetch https://your-domain.atlassian.net/browse/PROJECT-123

# Confluence ページを取得
atl-fetch https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title

# Markdown 形式で出力
atl-fetch https://your-domain.atlassian.net/browse/PROJECT-123 --format markdown

# 添付ファイルをダウンロード
atl-fetch https://your-domain.atlassian.net/browse/PROJECT-123 --download --dir ./output

# ファイルに保存（リダイレクト）
atl-fetch https://your-domain.atlassian.net/browse/PROJECT-123 > result.json
```

## CLI オプション

| オプション        | 短縮形  | 説明                           | デフォルト |
| ------------ | ---- | ---------------------------- | ----- |
| `--format`   | `-f` | 出力形式（json / markdown / yaml） | json  |
| `--download` | `-d` | 添付ファイルをダウンロード                | false |
| `--dir`      | `-o` | 保存先ディレクトリ                    | -     |
| `--diff`     |      | 差分のみを出力                      | false |
| `--color`    |      | カラー出力を有効化                    | true  |
| `--verbose`  | `-v` | 詳細出力を有効化                     | false |
| `--debug`    |      | デバッグ出力を有効化（開発者向け）            | false |
| `--help`     | `-h` | ヘルプを表示                       | -     |
| `--version`  | `-V` | バージョンを表示                     | -     |

**注意**: `--dir` は `--download` と一緒に使用する必要があります。

## サブコマンド

### `atl-fetch auth check`

認証情報の設定状態を確認します。

```bash
atl-fetch auth check
```

出力例（設定済み）:
```
認証情報チェック
────────────────────────────────────────

✓ 認証情報が正しく設定されています

  設定状態:
    ATLASSIAN_EMAIL:     user@example.com
    ATLASSIAN_API_TOKEN: ***abcd
```

## エラーコード

問題が発生した場合、以下のエラーコードと解決策が表示されます。

| コード          | 説明                 | 主な原因                    |
| ------------ | ------------------ | ----------------------- |
| `ATL-URL-001`  | URL の形式が不正         | サポートされていない URL 形式       |
| `ATL-AUTH-001` | 認証失敗               | API トークンが無効または期限切れ     |
| `ATL-404-001`  | リソースが見つからない        | URL が間違っている、または削除済み    |
| `ATL-403-001`  | アクセス権限なし           | 該当リソースへの権限がない          |
| `ATL-NET-001`  | ネットワークエラー          | インターネット接続の問題           |

## ライセンス

[MIT](LICENSE)

## 貢献

[CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。
