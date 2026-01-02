import type { ConfluencePage } from './confluence.js';
import type { JiraIssue } from './jira.js';

/**
 * Fetch 結果の型（判別共用体）
 *
 * Jira または Confluence のいずれかのデータを含む
 */
export type FetchResult =
  | { readonly type: 'jira'; readonly data: JiraIssue }
  | { readonly type: 'confluence'; readonly data: ConfluencePage };

/**
 * Fetch サービスのエラーの型
 */
export type FetchError =
  | { kind: 'URL_PARSE_ERROR'; message: string }
  | { kind: 'JIRA_ERROR'; message: string }
  | { kind: 'CONFLUENCE_ERROR'; message: string }
  | { kind: 'AUTH_FAILED'; message: string }
  | { kind: 'NOT_FOUND'; message: string }
  | { kind: 'FORBIDDEN'; message: string }
  | { kind: 'NETWORK_ERROR'; message: string }
  | { kind: 'OUTPUT_ERROR'; message: string }
  | { kind: 'STORAGE_ERROR'; message: string };

/**
 * FetchAndSave のオプションの型
 */
export interface FetchAndSaveOptions {
  /** 出力先ベースディレクトリ */
  readonly baseDir: string;
  /** 入力 URL */
  readonly sourceUrl: string;
  /** CLI バージョン */
  readonly cliVersion: string;
}

/**
 * FetchAndSave の結果の型
 */
export interface FetchAndSaveResult {
  /** 保存先ディレクトリパス */
  readonly directory: string;
  /** 生成された Manifest */
  readonly manifest: import('./storage.js').Manifest;
}
