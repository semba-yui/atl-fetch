# Requirements Document

## Introduction

本ドキュメントでは、Atlassian Cloud（Jira/Confluence）の URL から本文および添付ファイルを取得する CLI ツール「atl-fetch」の要件を定義する。本ツールは、既存の atl-fetch プロジェクトの機能拡張として、Atlassian Cloud API との連携機能を提供する。

## Requirements

### Requirement 1: URL 解析

**Objective:** As a ユーザー, I want Atlassian Cloud の URL を入力として渡す, so that Jira Issue または Confluence ページの情報を取得できる

#### Acceptance Criteria 1

1. When ユーザーが Jira Issue URL を入力する, the CLI shall URL を解析して組織名、プロジェクトキー、Issue キーを抽出する
2. When ユーザーが Confluence ページ URL を入力する, the CLI shall URL を解析して組織名、スペースキー、ページ ID を抽出する
3. If サポートされていない URL 形式が入力される, then the CLI shall エラーメッセージを表示してコマンドを終了する
4. If Atlassian Cloud 以外の URL が入力される, then the CLI shall エラーメッセージを表示してコマンドを終了する

### Requirement 2: 認証

**Objective:** As a ユーザー, I want Atlassian Cloud API への認証情報を設定する, so that プライベートなコンテンツにアクセスできる

#### Acceptance Criteria 2

1. The CLI shall 環境変数から API トークンとメールアドレスを読み取る
2. When 認証情報が設定されていない, the CLI shall エラーメッセージを表示してコマンドを終了する
3. If API 認証に失敗する, then the CLI shall 認証エラーの詳細を表示してコマンドを終了する

### Requirement 3: Jira Issue 取得

**Objective:** As a ユーザー, I want Jira Issue の本文、変更履歴、コメント、添付ファイルを取得する, so that Issue の内容と履歴をローカルで利用できる

#### Acceptance Criteria 3

1. When 有効な Jira Issue URL が指定される, the CLI shall Issue のタイトル、説明を取得する
2. When 有効な Jira Issue URL が指定される, the CLI shall Issue のコメント一覧を取得する
3. When 有効な Jira Issue URL が指定される, the CLI shall Issue の changelog（変更履歴）を取得する
4. When 有効な Jira Issue URL が指定される, the CLI shall Issue に添付されたファイル一覧を取得する
5. Where 添付ファイルのダウンロードオプションが有効, the CLI shall 添付ファイルを指定ディレクトリにダウンロードする
6. If Issue が存在しない, then the CLI shall 404 エラーメッセージを表示してコマンドを終了する
7. If Issue へのアクセス権がない, then the CLI shall 権限エラーメッセージを表示してコマンドを終了する

### Requirement 4: Confluence ページ取得

**Objective:** As a ユーザー, I want Confluence ページの本文、バージョン履歴、添付ファイルを取得する, so that ページの内容と履歴をローカルで利用できる

#### Acceptance Criteria 4

1. When 有効な Confluence ページ URL が指定される, the CLI shall ページのタイトルと本文を取得する
2. When 有効な Confluence ページ URL が指定される, the CLI shall ページのバージョン一覧を取得する
3. When 有効な Confluence ページ URL が指定される, the CLI shall 各バージョンの本文内容を取得する
4. When 有効な Confluence ページ URL が指定される, the CLI shall ページに添付されたファイル一覧を取得する
5. Where 添付ファイルのダウンロードオプションが有効, the CLI shall 添付ファイルを指定ディレクトリにダウンロードする
6. If ページが存在しない, then the CLI shall 404 エラーメッセージを表示してコマンドを終了する
7. If ページへのアクセス権がない, then the CLI shall 権限エラーメッセージを表示してコマンドを終了する

### Requirement 5: 差分表示

**Objective:** As a ユーザー, I want 変更履歴の差分をわかりやすく表示する, so that 何が変更されたかを素早く把握できる

#### Acceptance Criteria 5

1. When Jira Issue の changelog を取得する, the CLI shall 各変更のフィールド名、変更前の値、変更後の値を表示する
2. When Confluence ページのバージョン履歴を取得する, the CLI shall バージョン間の本文差分を表示する
3. Where diff オプションが指定される, the CLI shall 差分のみを出力する
4. The CLI shall 差分を unified diff 形式で表示する
5. Where カラー出力が有効, the CLI shall 追加行を緑、削除行を赤でハイライトする

### Requirement 6: 出力形式

**Objective:** As a ユーザー, I want 取得した情報を複数の形式で出力する, so that 用途に応じて使い分けられる

#### Acceptance Criteria 6

1. The CLI shall 取得した本文を JSON 形式で標準出力に出力する（デフォルト）
2. Where Markdown 出力オプションが指定される, the CLI shall 取得した本文を Markdown 形式で出力する
3. Where YAML 出力オプションが指定される, the CLI shall 取得した本文を YAML 形式で出力する
4. Where ファイル出力オプションが指定される, the CLI shall 出力を指定ファイルに書き込む
5. When 添付ファイルをダウンロードする, the CLI shall ダウンロード進捗を標準エラー出力に表示する

### Requirement 7: CLI インターフェース

**Objective:** As a ユーザー, I want 直感的なコマンドライン引数で操作する, so that 簡単にツールを利用できる

#### Acceptance Criteria 7

1. The CLI shall `atl-fetch <URL>` の形式でコマンドを受け付ける
2. The CLI shall `--format` オプションで出力形式（json/markdown/yaml）を指定できる
3. The CLI shall `--download` オプションで添付ファイルのダウンロードを有効にできる
4. The CLI shall `--dir` オプションで添付ファイルの保存先ディレクトリを指定できる
5. The CLI shall `--diff` オプションで差分のみを出力できる
6. The CLI shall `--no-color` オプションでカラー出力を無効にできる
7. The CLI shall `--help` オプションでヘルプメッセージを表示する
8. The CLI shall `--version` オプションでバージョン情報を表示する
9. If 必須引数が不足している, then the CLI shall 使用方法を表示してコマンドを終了する

### Requirement 8: ドキュメント整備

**Objective:** As a ユーザー, I want わかりやすいドキュメントを参照する, so that ツールの使い方を素早く理解できる

#### Acceptance Criteria 8

1. The project shall `docs/` ディレクトリにユーザー向けドキュメントを配置する
2. The project shall クイックスタートガイドを提供する
3. The project shall 全コマンドオプションのリファレンスを提供する
4. The project shall 認証設定の手順を説明するドキュメントを提供する
5. The project shall Mermaid 図を使用してデータフローやアーキテクチャを視覚的に説明する
6. The project shall Jira Issue 取得の使用例をドキュメントに含める
7. The project shall Confluence ページ取得の使用例をドキュメントに含める
8. The project shall 出力形式ごとのサンプル出力をドキュメントに含める
9. The project shall トラブルシューティングガイドを提供する
