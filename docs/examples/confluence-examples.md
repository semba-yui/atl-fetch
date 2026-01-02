# Confluence ページ取得の使用例

atl-fetch を使用して Confluence ページを取得するさまざまな使用例を紹介します。

## 基本的な取得

### ページ情報を JSON で取得

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Getting-Started
```

**出力例**:

```json
{
  "id": "123456789",
  "title": "Getting Started",
  "spaceKey": "DOCS",
  "body": "<p>このドキュメントは...</p>",
  "currentVersion": 5,
  "versions": [...],
  "attachments": [...]
}
```

### ページ情報を Markdown で取得

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 --format markdown
```

**出力例**:

```markdown
# Getting Started

**スペース**: DOCS
**バージョン**: 5

## 本文

このドキュメントは...

## バージョン履歴

| バージョン | 更新者 | 更新日時 |
|-----------|--------|----------|
| 5 | 山田太郎 | 2024-01-17 |
| 4 | 鈴木花子 | 2024-01-15 |
...
```

## バージョン履歴と差分

### 差分のみを表示

バージョン間の変更内容を確認できます。

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 --diff
```

**出力例**:

```diff
バージョン 4 → 5

@@ -10,7 +10,9 @@
 ## インストール方法

-npm install my-package
+npm install my-package@latest
+
+または pnpm を使用:
+
+pnpm add my-package

 ## 基本的な使い方
```

### カラー出力を無効化

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 --diff --no-color
```

## 添付ファイルの取得

### ページと添付ファイルをダウンロード

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 \
  --download \
  --dir ./confluence-backup
```

**生成されるディレクトリ構造**:

```text
./confluence-backup/
└── confluence/
    └── 123456789/
        ├── manifest.json          # 取得メタデータ
        ├── page.json              # ページ全データ
        ├── content.txt            # 本文（プレーンテキスト）
        ├── versions.json          # バージョン一覧メタデータ
        ├── versions/              # 各バージョンの内容
        │   ├── v1/
        │   │   ├── content.json
        │   │   └── content.txt
        │   ├── v2/
        │   │   ├── content.json
        │   │   ├── content.txt
        │   │   ├── diff.txt       # v1 → v2 の差分
        │   │   └── diff.json
        │   └── v3/
        │       ├── content.json
        │       ├── content.txt
        │       ├── diff.txt       # v2 → v3 の差分
        │       └── diff.json
        ├── attachments.json       # 添付ファイルメタデータ
        └── attachments/
            └── architecture.png
```

## 他ツールとの連携

### jq でタイトルを抽出

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 | jq '.title'
```

### jq でバージョン一覧を取得

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 | jq '.versions'
```

### YAML で出力して yq で処理

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 --format yaml | yq '.spaceKey'
```

### 本文をプレーンテキストとして取得

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 \
  --download \
  --dir ./output

# プレーンテキストを表示
cat ./output/confluence/123456789/content.txt
```

## スクリプトでの活用

### スペース内の複数ページを一括取得

```bash
#!/bin/bash

PAGES="123456789 234567890 345678901"
OUTPUT_DIR="./confluence-backup"

for page_id in $PAGES; do
  echo "Fetching page $page_id..."
  atl-fetch "https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/$page_id" \
    --download \
    --dir "$OUTPUT_DIR"
done
```

### ページ情報をファイルに保存

```bash
# JSON ファイルに出力
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 > page.json

# Markdown ファイルに出力
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 --format markdown > page.md
```

### 定期バックアップスクリプト

```bash
#!/bin/bash

DATE=$(date +%Y%m%d)
BACKUP_DIR="./backups/$DATE"

# 重要ページのバックアップ
PAGES=(
  "https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789"
  "https://mycompany.atlassian.net/wiki/spaces/TEAM/pages/234567890"
)

mkdir -p "$BACKUP_DIR"

for url in "${PAGES[@]}"; do
  echo "Backing up: $url"
  atl-fetch "$url" --download --dir "$BACKUP_DIR"
done

echo "Backup completed: $BACKUP_DIR"
```

## 短縮 URL からの取得

ページ ID のみを含む URL からも取得できます。

```bash
# ページ ID のみの URL
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789
```

## エラーハンドリング

### ページが存在しない場合

```bash
$ atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/999999999
Error: ページが見つかりません: 999999999
```

### アクセス権がない場合

```bash
$ atl-fetch https://mycompany.atlassian.net/wiki/spaces/SECRET/pages/111111111
Error: リソースへのアクセス権がありません
```

## 差分の活用

### バージョン間の変更を確認

```bash
# 差分を表示
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 --diff

# 差分をファイルに保存
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 --diff --no-color > changes.diff
```

### ダウンロードした差分ファイルを確認

```bash
# 各バージョンの差分を確認
cat ./output/confluence/123456789/versions/v3/diff.txt
```

## 関連ドキュメント

- [Jira 使用例](./jira-examples.md)
- [コマンドリファレンス](../cli-reference.md)
- [出力形式](../output-formats.md)
