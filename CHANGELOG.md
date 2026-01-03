# 変更履歴

このプロジェクトのすべての重要な変更はこのファイルに記録されます。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に基づいています。
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従っています。

## [Unreleased]

## [1.1.0] - 2026-01-03

### Added

- スピナーによる処理進捗表示（ora 使用）
- カラー出力（picocolors 使用）
- エラーコード体系（ATL-URL-001, ATL-AUTH-001 等）
- エラーメッセージに原因と解決策を表示
- `--verbose` オプション: 詳細出力を有効化
- `--debug` オプション: デバッグ出力を有効化
- `atl-fetch auth check` サブコマンド: 認証情報の設定状態を確認
- ヘルプに使用例・環境変数説明・エラーコード一覧を追加

### Changed

- CLI 出力の視覚的改善（成功/エラーメッセージのカラー化）

## [1.0.0] - 2025-01-02

### Added

- Jira Issue 取得機能（タイトル、説明、コメント、変更履歴、添付ファイル）
- Confluence ページ取得機能（タイトル、本文、バージョン履歴、添付ファイル）
- 複数出力形式サポート（JSON / Markdown / YAML）
- バージョン間差分表示（Unified diff 形式）
- 添付ファイルダウンロード機能
- CLI インターフェース（yargs ベース）
- ライブラリとしての使用をサポート
- TypeScript 型定義同梱

[Unreleased]: https://github.com/semba-yui/atl-fetch/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/semba-yui/atl-fetch/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/semba-yui/atl-fetch/releases/tag/v1.0.0
