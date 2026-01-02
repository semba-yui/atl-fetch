/**
 * 出力サービスに関する型定義
 *
 * OutputService で使用する型を定義する。
 * JSON / Markdown / YAML 形式での出力に対応。
 */

import type { Result } from 'neverthrow';

/**
 * 出力形式
 */
export type OutputFormat = 'json' | 'markdown' | 'yaml';

/**
 * 出力オプション
 *
 * 出力時の設定を指定する。
 */
export interface OutputOptions {
  /** 出力形式 */
  readonly format: OutputFormat;
  /** 出力先ファイルパス（指定時はファイル出力、未指定時は標準出力） */
  readonly outputPath?: string;
  /** カラー出力を有効にするか */
  readonly colorEnabled: boolean;
}

/**
 * 出力サービスのエラーの型
 */
export type OutputError = { kind: 'WRITE_FAILED'; message: string } | { kind: 'INVALID_FORMAT'; message: string };

/**
 * 出力サービスのインターフェース
 */
export interface OutputServiceInterface {
  /**
   * Jira Issue を指定形式でフォーマットする
   *
   * @param issue Jira Issue
   * @param options 出力オプション
   * @returns フォーマット済み文字列
   */
  formatJiraIssue(
    issue: import('./jira.js').JiraIssue,
    options: Pick<OutputOptions, 'format'>,
  ): Result<string, OutputError>;

  /**
   * Confluence ページを指定形式でフォーマットする
   *
   * @param page Confluence ページ
   * @param options 出力オプション
   * @returns フォーマット済み文字列
   */
  formatConfluencePage(
    page: import('./confluence.js').ConfluencePage,
    options: Pick<OutputOptions, 'format'>,
  ): Result<string, OutputError>;
}
