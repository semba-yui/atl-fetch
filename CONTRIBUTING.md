# 貢献ガイド

atl-fetch への貢献に興味を持っていただきありがとうございます。

## 貢献方法

- **バグ報告**: [GitHub Issues](https://github.com/semba-yui/atl-fetch/issues) で報告
- **機能提案**: Issue で提案後、議論
- **プルリクエスト**: フォーク → ブランチ作成 → PR 提出

## 開発環境セットアップ

### 必要なツール

- Node.js 22.0.0 以上
- pnpm 10.27.0 以上
- [mise](https://mise.jdx.dev/)（推奨）

### セットアップ手順

```bash
# リポジトリをクローン
git clone https://github.com/semba-yui/atl-fetch.git
cd atl-fetch

# mise でツールをインストール（推奨）
mise install

# 依存関係をインストール
pnpm install

# ビルド
pnpm run build

# テスト実行
pnpm run test
```

## プロジェクト構造

```text
src/
├── index.ts           # エントリーポイント
├── cli/               # CLI 定義（yargs）
├── services/          # ビジネスロジック
│   ├── auth/          # 認証
│   ├── confluence/    # Confluence API
│   ├── diff/          # 差分計算
│   ├── fetch/         # 統合サービス
│   ├── jira/          # Jira API
│   ├── output/        # 出力フォーマット
│   ├── storage/       # ストレージ（ファイル保存）
│   ├── text-converter/# テキスト変換
│   └── url-parser/    # URL パーサー
├── ports/             # 外部依存の抽象化
│   ├── http/          # HTTP クライアント
│   └── file/          # ファイルシステム
└── types/             # 型定義
```

## コーディング規約

### TypeScript

- **strict mode** を使用
- **ESM** モジュール形式
- `import type` を型のインポートに使用
- ファイル名は **kebab-case**
- クラス・インターフェースは **PascalCase**
- 関数・変数は **camelCase**

### フォーマット（Biome）

- インデント: 2 スペース
- 行幅: 120 文字
- クォート: シングルクォート
- セミコロン: なし
- トレイリングカンマ: あり

```bash
# Lint チェック
pnpm run lint

# 自動修正
pnpm run lint:fix
```

## コミット規約

[Conventional Commits](https://www.conventionalcommits.org/ja/) に従います。

```
<type>(<scope>): <subject>

<body>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト
- `chore`: ビルド・CI 設定

### 例

```
feat(jira): コメント取得機能を追加

Jira Issue のコメントを取得できるようになりました。
--include-comments オプションで有効化できます。
```

## テスト

### ユニットテスト（Vitest）

```bash
# テスト実行
pnpm run test

# ウォッチモード
pnpm run test:watch

# カバレッジ
pnpm run test:coverage
```

**カバレッジ閾値**: 90%（lines, branches, functions, statements）

### ミューテーションテスト（Stryker）

```bash
pnpm run test:mutation
```

**ミューテーションスコア閾値**: 80%

### テストの書き方

- **Given-When-Then** パターンを使用
- テストの目的をコメントで記述
- t-wada の TDD に従う

```typescript
describe('UrlParser', () => {
  describe('parseUrl', () => {
    // Jira Issue URL を正しくパースできること
    it('should parse Jira issue URL', () => {
      // Given
      const url = 'https://example.atlassian.net/browse/PROJECT-123';

      // When
      const result = parseUrl(url);

      // Then
      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual({
        type: 'jira',
        domain: 'example.atlassian.net',
        projectKey: 'PROJECT',
        issueKey: 'PROJECT-123',
      });
    });
  });
});
```

## プルリクエスト

### ブランチ戦略

- `main`: リリース可能な状態
- `feature/*`: 新機能
- `fix/*`: バグ修正
- `docs/*`: ドキュメント

### PR チェックリスト

- [ ] テストが通る（`pnpm run test`）
- [ ] Lint が通る（`pnpm run lint`）
- [ ] 型チェックが通る（`pnpm run typecheck`）
- [ ] カバレッジ閾値を満たす
- [ ] Conventional Commits に従っている
- [ ] 必要に応じてドキュメントを更新

### レビュープロセス

1. PR を作成
2. CI が自動実行
3. レビュアーがレビュー
4. フィードバックに対応
5. 承認後マージ

## Issue 報告

### バグ報告に含める情報

- 再現手順
- 期待される動作
- 実際の動作
- 環境情報（OS, Node.js バージョン）
- エラーメッセージ（あれば）

### 機能提案に含める情報

- ユースケース
- 期待される動作
- 代替案（検討した場合）

## 質問

不明点があれば [GitHub Issues](https://github.com/semba-yui/atl-fetch/issues) でお気軽にご質問ください。
