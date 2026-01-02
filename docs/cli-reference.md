# コマンドリファレンス

atl-fetch CLI の全オプションについて説明します。

## 基本構文

```bash
atl-fetch <url> [options]
```

## 必須引数

### `<url>`

Atlassian Cloud の URL。Jira Issue または Confluence ページの URL を指定します。

**対応 URL 形式**:

| タイプ              | URL パターン                                                                                | 例                                                                             |
| ---------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Jira Issue       | `https://{org}.atlassian.net/browse/{KEY}`                                              | `https://mycompany.atlassian.net/browse/PROJ-123`                             |
| Jira Issue (ボード) | `https://{org}.atlassian.net/jira/software/projects/.../boards/...?selectedIssue={KEY}` | -                                                                             |
| Confluence ページ   | `https://{org}.atlassian.net/wiki/spaces/{SPACE}/pages/{ID}/{TITLE}`                    | `https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Page-Title` |

## オプション

### 出力形式

#### `--format`, `-f`

出力形式を指定します。

| 値          | 説明             |
| ---------- | -------------- |
| `json`     | JSON 形式（デフォルト） |
| `markdown` | Markdown 形式    |
| `yaml`     | YAML 形式        |

**使用例**:

```bash
# JSON 形式で出力（デフォルト）
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123

# Markdown 形式で出力
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --format markdown
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 -f markdown

# YAML 形式で出力
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --format yaml
```

### ダウンロード

#### `--download`, `-d`

添付ファイルをダウンロードしてディレクトリ構造で保存します。

**デフォルト**: `false`

**使用例**:

```bash
# 添付ファイルをダウンロード（カレントディレクトリに保存）
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --download
```

#### `--dir`, `-o`

添付ファイルの保存先ディレクトリを指定します。

**注意**: `--download` オプションと一緒に指定する必要があります。

**使用例**:

```bash
# 指定ディレクトリに保存
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --download --dir ./output
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 -d -o ./output
```

### 差分表示

#### `--diff`

変更履歴の差分のみを出力します。

- **Jira**: changelog の各変更項目の差分を表示
- **Confluence**: バージョン間の本文差分を表示

**デフォルト**: `false`

**使用例**:

```bash
# 差分のみを表示
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --diff
```

### 表示オプション

#### `--color` / `--no-color`

カラー出力を有効または無効にします。

**デフォルト**: `true`（カラー有効）

**使用例**:

```bash
# カラー出力を無効化
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --no-color

# カラー出力を有効化（明示的）
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --color
```

### ヘルプ・バージョン

#### `--help`, `-h`

ヘルプメッセージを表示します。

```bash
atl-fetch --help
atl-fetch -h
```

#### `--version`, `-V`

バージョン情報を表示します。

```bash
atl-fetch --version
atl-fetch -V
```

## 環境変数

| 環境変数名                 | 説明                      | 必須 |
| --------------------- | ----------------------- | -- |
| `ATLASSIAN_EMAIL`     | Atlassian アカウントのメールアドレス | はい |
| `ATLASSIAN_API_TOKEN` | Atlassian API トークン      | はい |

詳細は[認証設定ガイド](./authentication.md)を参照してください。

## 終了コード

| コード | 説明                       |
| --- | ------------------------ |
| 0   | 成功                       |
| 1   | エラー（引数不正、認証失敗、リソース未検出など） |

## オプションの組み合わせ例

### Jira Issue を Markdown で保存

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 \
  --format markdown \
  --download \
  --dir ./jira-backup
```

### Confluence ページの差分を確認

```bash
atl-fetch https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789 \
  --diff \
  --no-color
```

### YAML 形式で出力をパイプ

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 --format yaml | yq '.summary'
```

### JSON 形式で jq と組み合わせ

```bash
atl-fetch https://mycompany.atlassian.net/browse/PROJ-123 | jq '.comments[].body'
```

## 関連ドキュメント

- [クイックスタート](./getting-started.md)
- [認証設定](./authentication.md)
- [Jira 使用例](./examples/jira-examples.md)
- [Confluence 使用例](./examples/confluence-examples.md)
- [出力形式](./output-formats.md)
