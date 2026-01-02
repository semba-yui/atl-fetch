# Implementation Plan

## Task 1. プロジェクト基盤セットアップ

- [x] 1.1 (P) 依存ライブラリをインストールする
  - yargs, got, zod, @t3-oss/env-core, diff, yaml, fast-check を追加
  - pnpm catalog でバージョンを一元管理
  - _Requirements: 7.1_

- [x] 1.2 (P) Result 型ライブラリを導入する
  - neverthrow ライブラリを採用（型安全な Result 型）
  - `Result<T, E>` 型で成功/失敗を表現
  - メソッドチェーン対応（map, andThen, match 等）
  - _Requirements: 7.1_

## Task 2. URL パーサー

- [x] 2.1 Jira Issue URL の解析機能を実装する
  - `/browse/{key}` 形式をパースして組織名、プロジェクトキー、Issue キーを抽出
  - `/jira/software/projects/.../boards/...?selectedIssue={key}` 形式も対応
  - 不正な URL に対して明確なエラーを返す
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 2.2 Confluence ページ URL の解析機能を実装する
  - `/wiki/spaces/{space}/pages/{id}/{title}` 形式をパース
  - 組織名、スペースキー、ページ ID を抽出
  - Atlassian Cloud 以外の URL を拒否
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 2.3 URL パーサーのプロパティベーステストを実装する
  - fast-check で任意の文字列入力に対する堅牢性を検証
  - エッジケース（空文字、特殊文字、長大 URL）を網羅
  - Given When Then パターンでテストを記述
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Task 3. 環境変数バリデーション（AuthService）

- [x] 3.1 @t3-oss/env-core と zod で環境変数をバリデーションする
  - `ATLASSIAN_EMAIL` はメールアドレス形式を検証
  - `ATLASSIAN_API_TOKEN` は空文字列を拒否
  - 未設定時に明確なエラーメッセージを返す
  - _Requirements: 2.1, 2.2_

- [x] 3.2 Basic Auth ヘッダー生成機能を実装する
  - `Authorization: Basic <base64>` 形式でヘッダーを生成
  - email:token を base64 エンコード
  - 認証エラーの詳細を返す
  - _Requirements: 2.1, 2.3_

## Task 4. HTTP ポート

- [x] 4.1 got ライブラリを使用した HTTP クライアントを実装する
  - GET リクエストに認証ヘッダーを付与
  - リトライとタイムアウトを設定
  - HTTP エラー（4xx, 5xx）を Result 型で返す
  - _Requirements: 3.6, 3.7, 4.6, 4.7_

- [x] 4.2 ファイルダウンロード（ストリーム）機能を実装する
  - 添付ファイルをストリームでダウンロード
  - ネットワークエラー、タイムアウトをハンドリング
  - ダウンロード進捗を標準エラー出力に表示
  - _Requirements: 3.5, 4.5, 6.5_

## Task 5. ファイルポート

- [x] 5.1 (P) node:fs/promises を使用したファイル操作を実装する
  - ファイル書き込み（テキスト）
  - ストリーム書き込み
  - ディレクトリ作成（再帰的）
  - ファイル存在確認
  - エラーを Result 型で返す
  - _Requirements: 6.4_

## Task 6. Jira サービス

- [x] 6.1 Jira Issue の基本情報取得機能を実装する
  - Issue のタイトル、説明を取得
  - コメント一覧を取得
  - 404 エラー時に適切なメッセージを返す
  - 403 エラー時に権限エラーメッセージを返す
  - _Requirements: 3.1, 3.2, 3.6, 3.7_

- [x] 6.2 Jira Issue の変更履歴取得機能を実装する
  - changelog（変更履歴）を取得
  - expand パラメータで必要なフィールドを展開
  - zod で API レスポンスをバリデーション
  - _Requirements: 3.3_

- [x] 6.3 Jira 添付ファイル一覧とダウンロード機能を実装する
  - 添付ファイル一覧を取得
  - 添付ファイルを指定ディレクトリにダウンロード
  - ダウンロードオプションが有効な場合のみ実行
  - _Requirements: 3.4, 3.5_

## Task 7. Confluence サービス

- [x] 7.1 Confluence ページの基本情報取得機能を実装する
  - ページのタイトル、本文を取得
  - 404 エラー時に適切なメッセージを返す
  - 403 エラー時に権限エラーメッセージを返す
  - _Requirements: 4.1, 4.6, 4.7_

- [x] 7.2 Confluence ページのバージョン履歴取得機能を実装する
  - バージョン一覧を取得
  - 各バージョンの本文内容を取得
  - zod で API レスポンスをバリデーション
  - _Requirements: 4.2, 4.3_

- [x] 7.3 Confluence 添付ファイル一覧とダウンロード機能を実装する
  - 添付ファイル一覧を取得
  - 添付ファイルを指定ディレクトリにダウンロード
  - ダウンロードオプションが有効な場合のみ実行
  - _Requirements: 4.4, 4.5_

## Task 8. 差分サービス

- [x] 8.1 (P) テキスト間の差分計算機能を実装する
  - unified diff 形式で差分を出力
  - diff ライブラリを使用
  - 差分統計（追加/削除行数）を計算
  - _Requirements: 5.4_

- [x] 8.2 Jira changelog の差分表示機能を実装する
  - 各変更のフィールド名、変更前の値、変更後の値を表示
  - カラー出力（追加=緑、削除=赤）に対応
  - --no-color オプションでカラー無効化
  - _Requirements: 5.1, 5.5_

- [x] 8.3 Confluence バージョン間差分表示機能を実装する
  - バージョン間の本文差分を計算
  - diff オプション指定時に差分のみを出力
  - カラー出力に対応
  - _Requirements: 5.2, 5.3, 5.5_

## Task 9. 出力サービス

- [x] 9.1 JSON 形式での出力機能を実装する
  - 取得した本文を JSON 形式で標準出力に出力（デフォルト）
  - 有効な JSON 文字列を出力
  - _Requirements: 6.1_

- [x] 9.2 Markdown 形式での出力機能を実装する
  - 取得した本文を Markdown 形式で出力
  - --format markdown オプションで切り替え
  - _Requirements: 6.2_

- [x] 9.3 YAML 形式での出力機能を実装する
  - 取得した本文を YAML 形式で出力
  - yaml ライブラリを使用
  - --format yaml オプションで切り替え
  - _Requirements: 6.3_

- [x] 9.4 ファイル出力機能を実装する
  - 出力を指定ファイルに書き込み
  - ファイル出力オプションで切り替え
  - _Requirements: 6.4_

- [x] 9.5 ダウンロード進捗表示機能を実装する
  - 添付ファイルダウンロード時に進捗を標準エラー出力に表示
  - _Requirements: 6.5_

## Task 10. ディレクトリ構造保存機能

- [x] 10.1 Jira Issue のディレクトリ構造保存を実装する
  - `jira/{ISSUE-KEY}/` 構造で保存
  - manifest.json を生成
  - description.txt（プレーンテキスト）を生成
  - changelog.json, comments.json, attachments.json を生成
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.4_

- [x] 10.2 Confluence ページのディレクトリ構造保存を実装する
  - `confluence/{PAGE-ID}/` 構造で保存
  - manifest.json を生成
  - content.txt（プレーンテキスト）を生成
  - versions.json, attachments.json を生成
  - _Requirements: 4.1, 4.2, 4.4, 6.4_

- [x] 10.3 Confluence バージョン別保存と差分生成を実装する
  - `versions/v{N}/` 構造で各バージョンを保存
  - content.json, content.txt を生成
  - v2 以降に diff.txt（unified diff）と diff.json を生成
  - _Requirements: 4.2, 4.3, 5.2, 5.3, 5.4_

- [x] 10.4 ADF/Storage Format からプレーンテキストへの変換を実装する
  - Jira Issue の説明文（ADF）をプレーンテキストに変換
  - Confluence ページの本文（Storage Format）をプレーンテキストに変換
  - _Requirements: 3.1, 4.1_

## Task 11. CLI エントリーポイント

- [x] 11.1 yargs を使用した基本 CLI を実装する
  - `atl-fetch <URL>` 形式でコマンドを受け付け
  - --help オプションでヘルプを表示
  - --version オプションでバージョンを表示
  - 必須引数不足時に使用方法を表示
  - package.json の bin フィールドを設定
  - _Requirements: 7.1, 7.7, 7.8, 7.9_

- [x] 11.2 出力形式オプションを実装する
  - --format オプション（json/markdown/yaml）
  - デフォルトは json
  - _Requirements: 7.2_

- [x] 11.3 添付ファイルダウンロードオプションを実装する
  - --download オプションで添付ファイルダウンロードを有効化
  - --dir オプションで保存先ディレクトリを指定
  - _Requirements: 7.3, 7.4_

- [x] 11.4 差分・カラーオプションを実装する
  - --diff オプションで差分のみを出力
  - --no-color オプションでカラー出力を無効化
  - _Requirements: 7.5, 7.6_

## Task 12. FetchService（統合サービス）

- [x] 12.1 URL からリソースタイプを判別して適切なサービスを呼び出す
  - Jira URL に対して JiraService を呼び出す
  - Confluence URL に対して ConfluenceService を呼び出す
  - _Requirements: 1.1, 1.2_

- [x] 12.2 出力オプションに応じて OutputService を呼び出す
  - 出力形式（JSON/Markdown/YAML）を切り替え
  - ファイル出力またはファイル出力を選択
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 12.3 ダウンロードオプションに応じて StorageService を呼び出す
  - ディレクトリ構造で保存
  - 添付ファイルをダウンロード
  - エラーを適切にハンドリング
  - _Requirements: 3.5, 4.5, 6.4_

## Task 13. 統合テスト

- [x] 13.1 Jira Issue 取得フローの E2E テストを実装する
  - モック API を使用した統合テスト
  - 認証エラー（403）のテスト
  - リソース未検出（404）のテスト
  - Given When Then パターンで記述
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 13.2 Confluence ページ取得フローの E2E テストを実装する
  - モック API を使用した統合テスト
  - 認証エラー（403）のテスト
  - リソース未検出（404）のテスト
  - Given When Then パターンで記述
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 13.3 各出力形式とファイル保存のテストを実装する
  - JSON/Markdown/YAML 出力のテスト
  - ディレクトリ構造保存のテスト
  - カバレッジ閾値（90%）を確認
  - ミューテーションテスト閾値を確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

## Task 14. ドキュメント整備

- [x] 14.1 (P) クイックスタートガイドと認証設定ドキュメントを作成する
  - docs/getting-started.md を作成
  - docs/authentication.md を作成
  - 環境変数の設定手順を説明
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 14.2 (P) コマンドリファレンスを作成する
  - docs/cli-reference.md を作成
  - 全コマンドオプションを説明
  - _Requirements: 8.3_

- [x] 14.3 (P) 使用例ドキュメントを作成する
  - docs/examples/jira-examples.md を作成
  - docs/examples/confluence-examples.md を作成
  - Jira Issue 取得、Confluence ページ取得の使用例を含める
  - _Requirements: 8.6, 8.7_

- [x] 14.4 (P) 出力形式サンプルとトラブルシューティングを作成する
  - docs/output-formats.md を作成
  - docs/troubleshooting.md を作成
  - 各出力形式のサンプル出力を含める
  - _Requirements: 8.8, 8.9_

- [x] 14.5 (P) アーキテクチャドキュメントを作成する
  - docs/architecture.md を作成
  - Mermaid 図でデータフローとアーキテクチャを説明
  - _Requirements: 8.5_

---

## Requirements Coverage Matrix

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 2.1, 2.3, 12.1 |
| 1.2 | 2.2, 2.3, 12.1 |
| 1.3 | 2.1, 2.2, 2.3 |
| 1.4 | 2.1, 2.2, 2.3 |
| 2.1 | 3.1, 3.2 |
| 2.2 | 3.1 |
| 2.3 | 3.2 |
| 3.1 | 6.1, 10.1, 10.4, 13.1 |
| 3.2 | 6.1, 10.1, 13.1 |
| 3.3 | 6.2, 10.1, 13.1 |
| 3.4 | 6.3, 10.1, 13.1 |
| 3.5 | 4.2, 6.3, 12.3, 13.1 |
| 3.6 | 4.1, 6.1, 13.1 |
| 3.7 | 4.1, 6.1, 13.1 |
| 4.1 | 7.1, 10.2, 10.4, 13.2 |
| 4.2 | 7.2, 10.2, 10.3, 13.2 |
| 4.3 | 7.2, 10.3, 13.2 |
| 4.4 | 7.3, 10.2, 13.2 |
| 4.5 | 4.2, 7.3, 12.3, 13.2 |
| 4.6 | 4.1, 7.1, 13.2 |
| 4.7 | 4.1, 7.1, 13.2 |
| 5.1 | 8.2 |
| 5.2 | 8.3, 10.3 |
| 5.3 | 8.3, 10.3 |
| 5.4 | 8.1, 10.3 |
| 5.5 | 8.2, 8.3 |
| 6.1 | 9.1, 12.2, 13.3 |
| 6.2 | 9.2, 12.2, 13.3 |
| 6.3 | 9.3, 12.2, 13.3 |
| 6.4 | 5.1, 9.4, 10.1, 10.2, 12.2, 12.3, 13.3 |
| 6.5 | 4.2, 9.5, 13.3 |
| 7.1 | 1.1, 1.2, 11.1 |
| 7.2 | 11.2 |
| 7.3 | 11.3 |
| 7.4 | 11.3 |
| 7.5 | 11.4 |
| 7.6 | 11.4 |
| 7.7 | 11.1 |
| 7.8 | 11.1 |
| 7.9 | 11.1 |
| 8.1 | 14.1 |
| 8.2 | 14.1 |
| 8.3 | 14.2 |
| 8.4 | 14.1 |
| 8.5 | 14.5 |
| 8.6 | 14.3 |
| 8.7 | 14.3 |
| 8.8 | 14.4 |
| 8.9 | 14.4 |

---

## Parallel Execution Analysis

```text
Phase 1 (並列実行可能):
├── Task 1.1 (P) 依存ライブラリインストール
└── Task 1.2 (P) Result 型定義

Phase 2 (Task 1 完了後、並列実行可能):
├── Task 2.1-2.3 UrlParser
├── Task 3.1-3.2 AuthService
├── Task 5.1 (P) FilePort
└── Task 8.1 (P) DiffService（テキスト差分）

Phase 3 (Task 3 完了後):
├── Task 4.1-4.2 HttpPort

Phase 4 (Task 4, 5 完了後、並列実行可能):
├── Task 6.1-6.3 JiraService
└── Task 7.1-7.3 ConfluenceService

Phase 5 (Task 8.1 完了後):
├── Task 8.2-8.3 DiffService（Jira/Confluence）
├── Task 9.1-9.5 OutputService

Phase 6 (Task 5, 6, 7, 8, 9 完了後):
├── Task 10.1-10.4 StorageService

Phase 7 (Task 2, 6, 7, 9, 10 完了後):
├── Task 11.1-11.4 CLI
└── Task 12.1-12.3 FetchService

Phase 8 (Task 11, 12 完了後):
├── Task 13.1-13.3 統合テスト

Phase 9 (Task 13 完了後、並列実行可能):
├── Task 14.1 (P) クイックスタート・認証
├── Task 14.2 (P) コマンドリファレンス
├── Task 14.3 (P) 使用例
├── Task 14.4 (P) 出力形式・トラブルシューティング
└── Task 14.5 (P) アーキテクチャ
```

---

## Summary

| Task | Sub-tasks | Dependencies | Phase |
|------|-----------|--------------|-------|
| 1. プロジェクト基盤 | 2 | なし | 1 |
| 2. UrlParser | 3 | 1 | 2 |
| 3. AuthService | 2 | 1 | 2 |
| 4. HttpPort | 2 | 1, 3 | 3 |
| 5. FilePort | 1 | 1 | 2 |
| 6. JiraService | 3 | 3, 4, 5 | 4 |
| 7. ConfluenceService | 3 | 3, 4, 5 | 4 |
| 8. DiffService | 3 | 1 | 2, 5 |
| 9. OutputService | 5 | 5, 8 | 5 |
| 10. StorageService | 4 | 5, 6, 7, 8, 9 | 6 |
| 11. CLI | 4 | 2, 6, 7, 9, 10 | 7 |
| 12. FetchService | 3 | 2, 6, 7, 9, 10 | 7 |
| 13. 統合テスト | 3 | 11, 12 | 8 |
| 14. ドキュメント | 5 | 11, 12, 13 | 9 |
