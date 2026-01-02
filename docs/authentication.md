# 認証設定ガイド

atl-fetch は Atlassian Cloud API にアクセスするため、API トークンによる Basic 認証を使用します。

## API トークンの取得

### 手順

1. [Atlassian アカウント設定](https://id.atlassian.com/manage-profile/security/api-tokens)にアクセス
2. **API トークンを作成**をクリック
3. トークンに分かりやすいラベルを付ける（例: `atl-fetch CLI`）
4. **作成**をクリック
5. 表示されたトークンをコピーして安全な場所に保存

> **注意**: トークンは作成時に一度だけ表示されます。紛失した場合は新しいトークンを作成してください。

## 環境変数の設定

atl-fetch は以下の2つの環境変数を使用します。

| 環境変数名                 | 説明                      | 必須 |
| --------------------- | ----------------------- | -- |
| `ATLASSIAN_EMAIL`     | Atlassian アカウントのメールアドレス | はい |
| `ATLASSIAN_API_TOKEN` | 取得した API トークン           | はい |

### Linux / macOS

#### 一時的な設定

```bash
export ATLASSIAN_EMAIL="your-email@example.com"
export ATLASSIAN_API_TOKEN="your-api-token"
```

#### 永続的な設定

シェル設定ファイル（`~/.bashrc`, `~/.zshrc` など）に追加:

```bash
# atl-fetch 設定
export ATLASSIAN_EMAIL="your-email@example.com"
export ATLASSIAN_API_TOKEN="your-api-token"
```

変更を反映:

```bash
source ~/.zshrc  # または ~/.bashrc
```

### Windows

#### PowerShell（一時的）

```powershell
$env:ATLASSIAN_EMAIL = "your-email@example.com"
$env:ATLASSIAN_API_TOKEN = "your-api-token"
```

#### システム環境変数（永続的）

1. **システムのプロパティ** > **環境変数**を開く
2. ユーザー環境変数に以下を追加:
   - `ATLASSIAN_EMAIL`: <your-email@example.com>
   - `ATLASSIAN_API_TOKEN`: your-api-token

## 設定の確認

環境変数が正しく設定されているか確認:

```bash
# 設定されていることを確認（値は表示しない）
echo "ATLASSIAN_EMAIL is set: ${ATLASSIAN_EMAIL:+yes}"
echo "ATLASSIAN_API_TOKEN is set: ${ATLASSIAN_API_TOKEN:+yes}"
```

## セキュリティに関する注意事項

### API トークンの保護

- API トークンはパスワードと同等の機密情報です
- Git リポジトリにコミットしないでください
- `.env` ファイルを使用する場合は `.gitignore` に追加してください

### 推奨されるプラクティス

1. **最小権限の原則**: 必要最小限のアクセス権限を持つトークンを使用
2. **定期的なローテーション**: 定期的に新しいトークンに更新
3. **使用していないトークンの削除**: 不要になったトークンは即座に削除

### `.env` ファイルを使用する場合

`.env` ファイルで環境変数を管理する場合:

```bash
# .env ファイルの例
ATLASSIAN_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-api-token
```

**重要**: `.gitignore` に `.env` を追加してください。

```gitignore
# .gitignore
.env
.env.local
```

## エラーメッセージ

### 認証情報が設定されていない場合

```text
Error: ATLASSIAN_EMAIL は必須です
```

または

```text
Error: ATLASSIAN_API_TOKEN は必須です
```

**対処法**: 環境変数を正しく設定してください。

### 認証に失敗した場合

```text
Error: 認証に失敗しました。メールアドレスと API トークンを確認してください。
```

**対処法**:

1. メールアドレスが正しいか確認
2. API トークンが有効か確認（期限切れや削除されていないか）
3. [API トークン管理画面](https://id.atlassian.com/manage-profile/security/api-tokens)で新しいトークンを生成

### アクセス権がない場合

```text
Error: リソースへのアクセス権がありません
```

**対処法**:

- Jira プロジェクトまたは Confluence スペースへのアクセス権があるか確認
- 組織の管理者に権限付与を依頼

## トラブルシューティング

認証に関する問題が解決しない場合は、[トラブルシューティングガイド](./troubleshooting.md)を参照してください。
