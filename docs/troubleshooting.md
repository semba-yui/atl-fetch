# トラブルシューティング

atl-fetch の使用中に発生する可能性のある問題とその解決方法を説明します。

## 認証エラー

### 環境変数が設定されていない

**エラーメッセージ**:

```text
Error: ATLASSIAN_EMAIL は必須です
```

または

```text
Error: ATLASSIAN_API_TOKEN は必須です
```

**原因**: 必要な環境変数が設定されていません。

**解決方法**:

```bash
export ATLASSIAN_EMAIL="your-email@example.com"
export ATLASSIAN_API_TOKEN="your-api-token"
```

詳細は[認証設定ガイド](./authentication.md)を参照してください。

### メールアドレスの形式が不正

**エラーメッセージ**:

```text
Error: 有効なメールアドレスを指定してください
```

**原因**: `ATLASSIAN_EMAIL` に無効なメールアドレス形式が設定されています。

**解決方法**: 正しいメールアドレス形式を設定してください。

### API トークンが無効

**エラーメッセージ**:

```text
Error: 認証に失敗しました。メールアドレスと API トークンを確認してください。
```

**原因**:

- API トークンが間違っている
- API トークンが削除されている
- API トークンの有効期限が切れている

**解決方法**:

1. [Atlassian API トークン管理画面](https://id.atlassian.com/manage-profile/security/api-tokens)にアクセス
2. 既存のトークンを確認または新しいトークンを生成
3. 環境変数を更新

## URL 関連エラー

### URL 形式が不正

**エラーメッセージ**:

```text
Error: サポートされていない URL 形式です
```

**原因**: 入力した URL が Atlassian Cloud の URL として認識されません。

**解決方法**: 正しい URL 形式を使用してください。

**対応 URL 形式**:

- Jira: `https://{org}.atlassian.net/browse/{ISSUE-KEY}`
- Confluence: `https://{org}.atlassian.net/wiki/spaces/{SPACE}/pages/{PAGE-ID}`

### Atlassian Cloud 以外の URL

**エラーメッセージ**:

```text
Error: Atlassian Cloud 以外の URL はサポートされていません
```

**原因**: Atlassian Server/Data Center の URL または Atlassian 以外の URL が入力されました。

**解決方法**: Atlassian Cloud（`.atlassian.net` ドメイン）の URL を使用してください。

## リソースアクセスエラー

### リソースが見つからない（404）

**エラーメッセージ**:

```text
Error: Issue が見つかりません: PROJ-123
```

または

```text
Error: ページが見つかりません: 123456789
```

**原因**:

- Issue またはページが存在しない
- Issue キーまたはページ ID が間違っている
- Issue またはページが削除された

**解決方法**:

1. URL が正しいか確認
2. ブラウザで URL にアクセスして存在を確認

### アクセス権がない（403）

**エラーメッセージ**:

```text
Error: リソースへのアクセス権がありません
```

**原因**:

- Jira プロジェクトへのアクセス権がない
- Confluence スペースへのアクセス権がない
- プライベートな Issue/ページへの権限がない

**解決方法**:

1. プロジェクト/スペースへのアクセス権があるか確認
2. 組織の管理者に権限付与を依頼

## ネットワークエラー

### 接続タイムアウト

**エラーメッセージ**:

```text
Error: リクエストがタイムアウトしました
```

**原因**:

- ネットワーク接続が不安定
- Atlassian Cloud サービスが遅延している
- ファイアウォールによるブロック

**解決方法**:

1. インターネット接続を確認
2. しばらく待ってから再試行
3. プロキシ設定を確認

### DNS 解決エラー

**エラーメッセージ**:

```text
Error: ホスト名を解決できません
```

**原因**:

- DNS 設定の問題
- 組織名（サブドメイン）が間違っている

**解決方法**:

1. URL の組織名部分が正しいか確認
2. DNS サーバーの設定を確認

## ファイル操作エラー

### 書き込み権限がない

**エラーメッセージ**:

```text
Error: ファイルの書き込みに失敗しました: permission denied
```

**原因**: 指定したディレクトリへの書き込み権限がありません。

**解決方法**:

```bash
# ディレクトリの権限を確認
ls -la ./output

# 書き込み可能なディレクトリを指定
atl-fetch <url> --download --dir ~/Downloads/atl-fetch-output
```

### ディスク容量不足

**エラーメッセージ**:

```text
Error: ディスク容量が不足しています
```

**原因**: 添付ファイルのダウンロードに十分なディスク容量がありません。

**解決方法**:

1. ディスク容量を確認
2. 不要なファイルを削除
3. 別のディスクを指定

## CLI オプションエラー

### --dir を --download なしで使用

**エラーメッセージ**:

```text
Error: --dir オプションは --download オプションと一緒に指定してください
```

**原因**: `--dir` オプションは `--download` オプションと併用する必要があります。

**解決方法**:

```bash
# 正しい使用方法
atl-fetch <url> --download --dir ./output

# --download なしの場合は標準出力に出力
atl-fetch <url>
```

### 不明なオプション

**エラーメッセージ**:

```text
Unknown argument: --unknown-option
```

**原因**: 存在しないオプションを指定しました。

**解決方法**:

```bash
# 利用可能なオプションを確認
atl-fetch --help
```

## デバッグ方法

### 詳細なエラー情報を確認

```bash
# 環境変数の設定状況を確認
echo "ATLASSIAN_EMAIL: ${ATLASSIAN_EMAIL:+set}"
echo "ATLASSIAN_API_TOKEN: ${ATLASSIAN_API_TOKEN:+set}"
```

### 接続テスト

```bash
# curl で直接 API を確認（Jira）
curl -u "$ATLASSIAN_EMAIL:$ATLASSIAN_API_TOKEN" \
  "https://your-org.atlassian.net/rest/api/3/myself"

# curl で直接 API を確認（Confluence）
curl -u "$ATLASSIAN_EMAIL:$ATLASSIAN_API_TOKEN" \
  "https://your-org.atlassian.net/wiki/rest/api/user/current"
```

### バージョン確認

```bash
# atl-fetch のバージョンを確認
atl-fetch --version

# Node.js のバージョンを確認
node --version
```

## よくある質問

### Q: Atlassian Server/Data Center はサポートされていますか？

**A**: いいえ、atl-fetch は Atlassian Cloud（`.atlassian.net`）のみをサポートしています。

### Q: 複数の組織に接続できますか？

**A**: はい、URL を変更するだけで異なる組織にアクセスできます。ただし、認証情報は環境変数に設定したアカウントのみが使用されます。複数のアカウントを使い分ける場合は、スクリプトで環境変数を切り替えてください。

### Q: API レート制限に引っかかりますか？

**A**: Atlassian Cloud API にはレート制限があります。大量のリソースを短時間で取得する場合は、リクエスト間に遅延を入れることを推奨します。

### Q: プロキシ経由で使用できますか？

**A**: Node.js の標準的なプロキシ環境変数（`HTTP_PROXY`, `HTTPS_PROXY`）を設定してください。

## サポート

問題が解決しない場合は、[GitHub Issues](https://github.com/semba-yui/atl-fetch/issues) で報告してください。

報告時には以下の情報を含めてください:

- atl-fetch のバージョン（`atl-fetch --version`）
- Node.js のバージョン（`node --version`）
- 実行したコマンド（認証情報は除く）
- エラーメッセージ全文
- 期待される動作
