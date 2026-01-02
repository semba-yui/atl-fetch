import type { Result } from 'neverthrow';

/**
 * URL 解析結果の型
 */
export interface UrlParseResult {
  /** リソースタイプ（jira または confluence） */
  readonly type: 'jira' | 'confluence';
  /** Atlassian Cloud の組織名（サブドメイン） */
  readonly organization: string;
  /** リソース ID（Jira の場合は Issue キー、Confluence の場合はページ ID） */
  readonly resourceId: string;
  /** プロジェクトキー（Jira の場合のみ） */
  readonly projectKey?: string;
  /** スペースキー（Confluence の場合のみ） */
  readonly spaceKey?: string;
}

/**
 * URL 解析エラーの型
 */
export type UrlParseError =
  | { kind: 'INVALID_FORMAT'; message: string }
  | { kind: 'UNSUPPORTED_HOST'; message: string }
  | { kind: 'MISSING_RESOURCE_ID'; message: string };

/**
 * URL バリデーションエラーの型
 */
export type UrlValidationError =
  | { kind: 'NOT_ATLASSIAN_CLOUD'; message: string }
  | { kind: 'UNSUPPORTED_RESOURCE'; message: string };

/**
 * URL パーサーサービスのインターフェース
 */
export interface UrlParserService {
  parse(url: string): Result<UrlParseResult, UrlParseError>;
  validate(url: string): Result<void, UrlValidationError>;
}
