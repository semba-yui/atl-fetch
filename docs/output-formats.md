# 出力形式

atl-fetch は JSON、Markdown、YAML の3つの出力形式をサポートしています。

## JSON 形式（デフォルト）

`--format json` または形式を指定しない場合に使用されます。

### Jira Issue の JSON 出力例

```json
{
  "key": "PROJ-123",
  "summary": "ログイン機能の改善",
  "description": "ログイン画面のUXを改善する\n\n## 要件\n- パスワードリセット機能\n- ソーシャルログイン",
  "comments": [
    {
      "id": "10001",
      "author": "山田太郎",
      "body": "修正方針を検討中です",
      "created": "2024-01-15T10:30:00.000Z",
      "updated": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "10002",
      "author": "鈴木花子",
      "body": "レビューお願いします",
      "created": "2024-01-16T14:20:00.000Z",
      "updated": "2024-01-16T14:20:00.000Z"
    }
  ],
  "changelog": [
    {
      "id": "20001",
      "author": "山田太郎",
      "created": "2024-01-15T10:00:00.000Z",
      "items": [
        {
          "field": "Status",
          "fromString": "Open",
          "toString": "In Progress"
        }
      ]
    }
  ],
  "attachments": [
    {
      "id": "30001",
      "filename": "screenshot.png",
      "mimeType": "image/png",
      "size": 102400,
      "contentUrl": "https://mycompany.atlassian.net/..."
    }
  ]
}
```

### Confluence ページの JSON 出力例

```json
{
  "id": "123456789",
  "title": "Getting Started",
  "spaceKey": "DOCS",
  "body": "<p>このドキュメントでは...</p>",
  "currentVersion": 5,
  "versions": [
    {
      "number": 5,
      "by": "山田太郎",
      "when": "2024-01-17T09:00:00.000Z",
      "message": "セクションを追加"
    },
    {
      "number": 4,
      "by": "鈴木花子",
      "when": "2024-01-15T14:30:00.000Z",
      "message": "誤字修正"
    }
  ],
  "attachments": [
    {
      "id": "40001",
      "title": "architecture.png",
      "mediaType": "image/png",
      "fileSize": 204800,
      "downloadUrl": "https://mycompany.atlassian.net/..."
    }
  ]
}
```

## Markdown 形式

`--format markdown` で使用します。人間が読みやすい形式です。

### Jira Issue の Markdown 出力例

```markdown
# PROJ-123: ログイン機能の改善

## 説明

ログイン画面のUXを改善する

## 要件
- パスワードリセット機能
- ソーシャルログイン

---

## コメント

### 山田太郎
**投稿日時**: 2024-01-15 10:30

修正方針を検討中です

---

### 鈴木花子
**投稿日時**: 2024-01-16 14:20

レビューお願いします

---

## 変更履歴

| 日時 | 変更者 | フィールド | 変更前 | 変更後 |
|------|--------|-----------|--------|--------|
| 2024-01-15 10:00 | 山田太郎 | Status | Open | In Progress |

---

## 添付ファイル

| ファイル名 | サイズ | タイプ |
|-----------|--------|--------|
| screenshot.png | 100 KB | image/png |
```

### Confluence ページの Markdown 出力例

```markdown
# Getting Started

**スペース**: DOCS
**バージョン**: 5
**最終更新**: 2024-01-17 09:00 (山田太郎)

---

## 本文

このドキュメントでは...

---

## バージョン履歴

| バージョン | 更新者 | 更新日時 | コメント |
|-----------|--------|----------|----------|
| 5 | 山田太郎 | 2024-01-17 09:00 | セクションを追加 |
| 4 | 鈴木花子 | 2024-01-15 14:30 | 誤字修正 |

---

## 添付ファイル

| ファイル名 | サイズ | タイプ |
|-----------|--------|--------|
| architecture.png | 200 KB | image/png |
```

## YAML 形式

`--format yaml` で使用します。設定ファイルや他ツールとの連携に便利です。

### Jira Issue の YAML 出力例

```yaml
key: PROJ-123
summary: ログイン機能の改善
description: |
  ログイン画面のUXを改善する

  ## 要件
  - パスワードリセット機能
  - ソーシャルログイン
comments:
  - id: "10001"
    author: 山田太郎
    body: 修正方針を検討中です
    created: "2024-01-15T10:30:00.000Z"
    updated: "2024-01-15T10:30:00.000Z"
  - id: "10002"
    author: 鈴木花子
    body: レビューお願いします
    created: "2024-01-16T14:20:00.000Z"
    updated: "2024-01-16T14:20:00.000Z"
changelog:
  - id: "20001"
    author: 山田太郎
    created: "2024-01-15T10:00:00.000Z"
    items:
      - field: Status
        fromString: Open
        toString: In Progress
attachments:
  - id: "30001"
    filename: screenshot.png
    mimeType: image/png
    size: 102400
```

### Confluence ページの YAML 出力例

```yaml
id: "123456789"
title: Getting Started
spaceKey: DOCS
body: "<p>このドキュメントでは...</p>"
currentVersion: 5
versions:
  - number: 5
    by: 山田太郎
    when: "2024-01-17T09:00:00.000Z"
    message: セクションを追加
  - number: 4
    by: 鈴木花子
    when: "2024-01-15T14:30:00.000Z"
    message: 誤字修正
attachments:
  - id: "40001"
    title: architecture.png
    mediaType: image/png
    fileSize: 204800
```

## 差分出力（`--diff` オプション）

`--diff` オプションを使用すると、変更履歴の差分のみを出力します。

### Jira changelog の差分出力例

```text
変更履歴 (3件)

[2024-01-15 10:00:00] 山田太郎
  Status: Open → In Progress

[2024-01-16 09:30:00] 山田太郎
  Priority: Medium → High

[2024-01-17 14:00:00] 鈴木花子
  Assignee: 山田太郎 → 鈴木花子
  Labels: (なし) → urgent
```

### Confluence バージョン間差分出力例

````diff
バージョン 4 → 5 (山田太郎, 2024-01-17)

@@ -15,6 +15,12 @@
 ## インストール

 npm install my-package

+## 設定
+
+設定ファイルを作成してください：
+
+```json
+{ "debug": false }
+```

 ## 使い方
````

## ディレクトリ構造保存（`--download` オプション）

`--download` オプションを使用すると、以下のファイルが生成されます。

### manifest.json

取得メタデータを記録します。

```json
{
  "resourceType": "jiraIssue",
  "sourceUrl": "https://mycompany.atlassian.net/browse/PROJ-123",
  "fetchedAt": "2024-01-17T12:00:00.000Z",
  "cliVersion": "1.0.0",
  "summary": {
    "success": true,
    "resourceId": "PROJ-123",
    "title": "ログイン機能の改善"
  },
  "issues": [],
  "attachments": [
    {
      "id": "30001",
      "filename": "screenshot.png",
      "mimeType": "image/png",
      "size": 102400,
      "status": "success",
      "savedPath": "attachments/screenshot.png"
    }
  ]
}
```

### プレーンテキストファイル

- `description.txt` (Jira): 説明文をプレーンテキストに変換
- `content.txt` (Confluence): 本文をプレーンテキストに変換

## 形式の選び方

| 用途            | 推奨形式               |
| ------------- | ------------------ |
| プログラムでの処理     | JSON               |
| 人間が読む・ドキュメント化 | Markdown           |
| 設定ファイルとして保存   | YAML               |
| 変更内容の確認       | `--diff` オプション     |
| バックアップ・アーカイブ  | `--download` オプション |

## 関連ドキュメント

- [コマンドリファレンス](./cli-reference.md)
- [Jira 使用例](./examples/jira-examples.md)
- [Confluence 使用例](./examples/confluence-examples.md)
