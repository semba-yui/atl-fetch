# Jira Issue 取得の使用例

atl-fetch を使用して Jira Issue を取得するさまざまな使用例を紹介します。

## 基本的な取得

### Issue 情報を JSON で取得

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123
```

**出力例**:

```json
{
  "key": "PROJ-123",
  "summary": "ログイン機能の改善",
  "description": "ログイン画面のUXを改善する",
  "comments": [...],
  "changelog": [...],
  "attachments": [...]
}
```

### Issue 情報を Markdown で取得

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --format markdown
```

**出力例**:

```markdown
# PROJ-123: ログイン機能の改善

## 説明

ログイン画面のUXを改善する

## コメント

### 山田太郎 (2024-01-15)

修正方針を検討中です

...
```

## 変更履歴の確認

### 差分のみを表示

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --diff
```

**出力例**:

```text
変更履歴 (5件)

[2024-01-15 10:30:00] 山田太郎
  Status: Open → In Progress

[2024-01-16 14:20:00] 鈴木花子
  Assignee: 山田太郎 → 鈴木花子

[2024-01-17 09:15:00] 鈴木花子
  Priority: Medium → High
  Labels: (なし) → urgent, critical
```

### カラー出力を無効化

CI/CD パイプラインやログファイルへの出力時に便利です。

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --diff --no-color
```

## 添付ファイルの取得

### 添付ファイルをダウンロード

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --download --dir ./jira-backup
```

**生成されるディレクトリ構造**:

```text
./jira-backup/
└── jira/
    └── PROJ-123/
        ├── manifest.json          # 取得メタデータ
        ├── issue.json             # Issue 全データ
        ├── description.txt        # 説明文（プレーンテキスト）
        ├── content.md             # Markdown 形式
        ├── changelog.json         # 変更履歴
        ├── comments.json          # コメント一覧
        ├── attachments.json       # 添付ファイルメタデータ
        └── attachments/           # 添付ファイル実体
            ├── 30001_screenshot.png
            └── 30002_specification.pdf
```

## 他ツールとの連携

### jq でコメント一覧を抽出

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 | jq '.comments[].body'
```

### jq で担当者を取得

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 | jq '.assignee'
```

### YAML で出力して yq で処理

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --format yaml | yq '.summary'
```

## スクリプトでの活用

### 複数 Issue の一括取得

```bash
#!/bin/bash

ISSUES="PROJ-101 PROJ-102 PROJ-103"
OUTPUT_DIR="./backup"

for issue in $ISSUES; do
  echo "Fetching $issue..."
  atl-fetch "https://mycompany.atlassian.net/browse/$issue" \
    --download \
    --dir "$OUTPUT_DIR"
done
```

### Issue 情報をファイルに保存

```bash
# JSON ファイルに出力
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 > issue.json

# Markdown ファイルに出力
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --format markdown > issue.md
```

### 条件分岐付きスクリプト

```bash
#!/bin/bash

URL="https://mycompany.atlassian.net/browse/PROJ-123"

if atl-fetch "$URL" > /dev/null 2>&1; then
  echo "Issue found"
  atl-fetch "$URL" --download --dir ./output
else
  echo "Issue not found or access denied"
  exit 1
fi
```

## ボード URL からの取得

Jira ボード画面の URL からも取得できます。

```bash
# ボード上で選択された Issue の URL
atl-fetch "https://mycompany.atlassian.net/jira/software/projects/PROJ/boards/1?selectedIssue=PROJ-123"
```

## エラーハンドリング

### Issue が存在しない場合

```bash
$ atl-fetch https://mycompany.atlassian.net/browse/PROJ-999
Error: Issue が見つかりません: PROJ-999
```

### アクセス権がない場合

```bash
$ atl-fetch https://mycompany.atlassian.net/browse/SECRET-123
Error: リソースへのアクセス権がありません
```

## 関連ドキュメント

- [Confluence 使用例](./confluence-examples.md)
- [コマンドリファレンス](../cli-reference.md)
- [出力形式](../output-formats.md)
