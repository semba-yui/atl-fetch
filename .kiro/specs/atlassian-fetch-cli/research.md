# Research & Design Decisions

## Summary

- **Feature**: atlassian-fetch-cli
- **Discovery Scope**: New Feature
- **Key Findings**:
  - Atlassian Cloud REST API v3（Jira）と v1/v2（Confluence）を使用して要件を満たせる
  - 認証は Basic Auth + API Token が推奨（OAuth は CLI ツールには複雑すぎる）
  - Jira changelog は expand パラメータで取得可能、Confluence バージョン履歴は専用エンドポイントが必要

## Research Log

### Jira Cloud REST API v3 調査

- **Context**: Jira Issue の本文、コメント、変更履歴（changelog）、添付ファイルを取得する方法の調査
- **Sources Consulted**:
  - [Jira Cloud REST API v3 Issues](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)
  - [Jira REST API v3 Attachments](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/)
  - [Atlassian Support - Changelog Analysis](https://support.atlassian.com/jira/kb/how-to-analyze-the-history-or-changelog-of-an-issue-in-jira/)
- **Findings**:
  - `GET /rest/api/3/issue/{issueIdOrKey}` で Issue 情報を取得
  - `expand` パラメータで `changelog`, `renderedFields`, `names`, `schema` を展開可能
  - 例: `GET /rest/api/3/issue/PROJ-123?expand=changelog,renderedFields`
  - コメントは `fields.comment.comments` に含まれる
  - 添付ファイルは `fields.attachment` に含まれる
  - 添付ファイルのダウンロードは `GET /rest/api/3/attachment/content/{id}` を使用
- **Implications**:
  - 単一の API コールで Issue 本文、コメント、changelog、添付ファイル一覧を取得可能
  - 添付ファイルのバイナリダウンロードは別途 API コールが必要

### Confluence Cloud REST API 調査

- **Context**: Confluence ページの本文、バージョン履歴、各バージョンの内容を取得する方法の調査
- **Sources Consulted**:
  - [Confluence Cloud REST API v1 Content Versions](https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content-versions/)
  - [Atlassian Support - Retrieve Previous Versions](https://support.atlassian.com/confluence/kb/how-to-retrieve-all-previous-versions-of-content-using-the-rest-api/)
  - [Atlassian Community - Historical Versions](https://community.atlassian.com/forums/Confluence-questions/Confluence-API-get-page-content-from-historical-versions/qaq-p/1398857)
- **Findings**:
  - 最新ページ取得: `GET /wiki/rest/api/content/{id}?expand=body.storage,version`
  - バージョン一覧取得: `GET /wiki/rest/api/content/{id}/version`
  - 特定バージョン内容取得: `GET /wiki/rest/api/content/{id}/version/{versionNumber}?expand=content.body.storage`
  - 添付ファイル一覧: `GET /wiki/rest/api/content/{id}/child/attachment`
  - `history` エンドポイントは最新・前バージョン情報のみ返す（全履歴は `version` エンドポイント使用）
- **Implications**:
  - バージョン一覧と各バージョン内容取得には複数の API コールが必要
  - diff 生成のためにバージョン間の body.storage を比較する必要がある

### 認証方式調査

- **Context**: Atlassian Cloud API への認証方法の選定
- **Sources Consulted**:
  - [Atlassian Support - Manage API Tokens](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
  - [Basic Auth for REST APIs](https://developer.atlassian.com/cloud/jira/software/basic-auth-for-rest-apis/)
  - [OAuth 2.0 (3LO) Apps](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- **Findings**:
  - Basic Auth + API Token が CLI ツールに最適（セットアップが簡単）
  - 形式: `Authorization: Basic base64(email:api_token)`
  - 2025年3月以降、API トークンに有効期限が設定される（最長1年）
  - OAuth 2.0 は対話的な認証フローが必要で CLI ツールには不向き
  - API トークンは Jira Cloud、Confluence Cloud 両方で使用可能
- **Implications**:
  - 環境変数 `ATLASSIAN_EMAIL` と `ATLASSIAN_API_TOKEN` を使用
  - トークン有効期限に関する警告をドキュメントに記載

### URL パース調査

- **Context**: Jira/Confluence URL から必要な情報を抽出する方法
- **Sources Consulted**: 実際の URL パターンの分析
- **Findings**:
  - Jira Issue URL パターン: `https://{org}.atlassian.net/browse/{issueKey}` または `https://{org}.atlassian.net/jira/software/projects/{projectKey}/boards/{boardId}?selectedIssue={issueKey}`
  - Confluence ページ URL パターン: `https://{org}.atlassian.net/wiki/spaces/{spaceKey}/pages/{pageId}/{pageTitle}`
  - 組織名は URL のサブドメインから抽出
- **Implications**:
  - 正規表現による URL パース実装が必要
  - 複数の URL 形式に対応する必要がある

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Layered Architecture | CLI → Service → API Client → HTTP の階層構造 | 既存プロジェクト構造と整合、テスト容易 | 単純なCLIには過剰な可能性 | Steering の structure.md と整合 |
| Hexagonal (Ports & Adapters) | Core domain を中心に ports で外部依存を抽象化 | API クライアントの差し替え容易、テスト容易 | 初期実装コストが高い | Steering で推奨されている |

**選定**: Layered Architecture + Ports パターン（既存の structure.md に従う）

## Design Decisions

### Decision: HTTP クライアントの選定

- **Context**: Atlassian Cloud API への HTTP リクエストを行うクライアントライブラリの選定
- **Alternatives Considered**:
  1. Node.js 組み込み `fetch` — 追加依存なし、シンプル
  2. `axios` — 広く使用されている、豊富な機能
  3. `got` — モダン、Promise ベース、TypeScript サポート良好
- **Selected Approach**: `got` ライブラリ
- **Rationale**: TypeScript サポートが優秀、リトライ・タイムアウト・フック機能が組み込み、ストリームダウンロード対応
- **Trade-offs**: 追加依存が増える
- **Follow-up**: なし

### Decision: 差分計算ライブラリの選定

- **Context**: Confluence バージョン間の差分および Jira changelog の表示方法
- **Alternatives Considered**:
  1. `diff` (npm: diff) — 複数の diff アルゴリズム、文字/単語/行レベル、型定義同梱
  2. `fast-diff` — 高速だが機能限定
  3. 自前実装 — 完全なカスタマイズ可能
- **Selected Approach**: `diff` ライブラリ（v8.x）
- **Rationale**: 文字・単語・行レベルの diff を柔軟に選択可能、パッチ形式出力対応、v8 から型定義同梱
- **Trade-offs**: なし
- **Follow-up**: カラー出力は別途実装（ANSI エスケープコード）

### Decision: YAML 出力ライブラリの選定

- **Context**: YAML 形式での出力に使用するライブラリ
- **Alternatives Considered**:
  1. `yaml` — 最新の YAML 1.2 準拠、TypeScript サポート良好
  2. `js-yaml` — 広く使用されている、安定
- **Selected Approach**: `yaml` ライブラリ
- **Rationale**: TypeScript 型定義が充実、YAML 1.2 準拠で将来性あり
- **Trade-offs**: js-yaml より若干サイズが大きい
- **Follow-up**: なし

### Decision: CLI フレームワークの選定

- **Context**: CLI インターフェースの構築フレームワーク
- **Alternatives Considered**:
  1. `commander` — Steering の tech.md で既に採用
  2. `yargs` — 豊富な機能、自動ヘルプ生成、サブコマンド対応、ESM first
  3. `clipanion` — TypeScript ネイティブ、型安全
- **Selected Approach**: `yargs`（v18.x）
- **Rationale**: 豊富な機能（サブコマンド、自動補完、詳細なヘルプ生成）、ESM first、TypeScript 型定義が充実
- **Trade-offs**: Steering の tech.md で採用している commander とは異なる
- **Follow-up**: tech.md の更新を検討

### Decision: バリデーションライブラリの選定

- **Context**: 環境変数、API レスポンス、CLI 引数、出力データのバリデーション方法
- **Alternatives Considered**:
  1. `zod` のみ — 汎用的、すべてのバリデーションを統一
  2. `envalid` + `zod` — 環境変数専用 + 汎用バリデーション
  3. `@t3-oss/env-core` + `zod` — zod ベースの環境変数バリデーション + 汎用バリデーション
  4. `valibot` — 軽量な zod 代替
- **Selected Approach**: `@t3-oss/env-core`（v0.x）+ `zod`（v4.x）
- **Rationale**:
  - 環境変数は `@t3-oss/env-core` で型安全に管理（zod スキーマを内部で使用）
  - API レスポンス、CLI 引数、出力データは `zod` で統一的にバリデーション
  - TypeScript 型推論と実行時バリデーションを一元化
  - zod v4 は高速化・軽量化され、長年の機能要望に対応
- **Trade-offs**: 依存関係が増える
- **Follow-up**: なし

## Risks & Mitigations

- **API レート制限** — 2026年2月から新レート制限適用予定。大量リクエスト時のリトライロジック実装で対応
- **API トークン有効期限** — 2025年3月以降、トークンに有効期限あり。ドキュメントで警告、エラーメッセージで案内
- **Confluence バージョン数** — 多数のバージョンがある場合、API コール数が増加。ページネーション対応と並列リクエストで対応
- **HTML/ADF 形式の差分** — Confluence は Storage Format（XHTML-like）、Jira v3 は ADF 形式。テキスト抽出後に diff を実行

## References

- [Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/) — Jira API 公式ドキュメント
- [Confluence Cloud REST API](https://developer.atlassian.com/cloud/confluence/rest/v1/intro/) — Confluence API 公式ドキュメント
- [Manage API Tokens](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/) — API トークン管理
- [Basic Auth for REST APIs](https://developer.atlassian.com/cloud/jira/software/basic-auth-for-rest-apis/) — 認証方式
