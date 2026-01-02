import { err, ok, type Result } from 'neverthrow';
import type { UrlParseError, UrlParseResult } from '../../types/url-parser.js';

/**
 * Atlassian Cloud のホスト名パターン
 *
 * キャプチャグループ:
 * - グループ1: 組織名（サブドメイン部分）
 *
 * @example
 * // マッチする例
 * 'mycompany.atlassian.net' // グループ1: 'mycompany'
 * 'my-company-name.atlassian.net' // グループ1: 'my-company-name'
 *
 * @example
 * // マッチしない例
 * 'jira.mycompany.com' // Atlassian Cloud ではない
 * 'atlassian.net' // サブドメインがない
 */
const ATLASSIAN_CLOUD_HOST_PATTERN = /^([a-z0-9-]+)\.atlassian\.net$/i;

/**
 * Jira Issue キーのパターン
 *
 * Issue キーは `{プロジェクトキー}-{番号}` の形式。
 * プロジェクトキーは英大文字で始まり、英大文字または数字が続く。
 *
 * キャプチャグループ:
 * - グループ1: プロジェクトキー
 * - グループ2: Issue 番号
 *
 * @example
 * // マッチする例
 * 'PROJ-123' // グループ1: 'PROJ', グループ2: '123'
 * 'ABC-1' // グループ1: 'ABC', グループ2: '1'
 * 'A1B2-999' // グループ1: 'A1B2', グループ2: '999'
 *
 * @example
 * // マッチしない例
 * 'proj-123' // 小文字（ただし i フラグにより実際はマッチする）
 * 'PROJ' // 番号がない
 * '123-PROJ' // 順序が逆
 */
const JIRA_ISSUE_KEY_PATTERN = /^([A-Z][A-Z0-9]*)-(\d+)$/i;

/**
 * Confluence ページ URL のパスパターン
 *
 * `/wiki/spaces/{spaceKey}/pages/{pageId}` または
 * `/wiki/spaces/{spaceKey}/pages/{pageId}/{title}` 形式をマッチ。
 *
 * キャプチャグループ:
 * - グループ1: スペースキー
 * - グループ2: ページ ID（任意の文字列、後で数字かどうか検証）
 *
 * @example
 * // マッチする例
 * '/wiki/spaces/DOCS/pages/123456789' // グループ1: 'DOCS', グループ2: '123456789'
 * '/wiki/spaces/TEAM/pages/987654321/Page+Title' // グループ1: 'TEAM', グループ2: '987654321'
 *
 * @example
 * // マッチしない例
 * '/wiki/display/DOCS/Page' // 古い形式
 * '/wiki/spaces/DOCS/overview' // ページではない
 */
const CONFLUENCE_PAGE_PATH_PATTERN = /^\/wiki\/spaces\/([^/]+)\/pages\/([^/]+)(?:\/.*)?$/;

/**
 * ページ ID が有効な数字形式かどうかを検証するパターン
 */
const PAGE_ID_PATTERN = /^\d+$/;

/**
 * Atlassian Cloud の URL を解析し、リソース情報を抽出する
 *
 * サポートする URL 形式:
 * - Jira Issue: `https://{org}.atlassian.net/browse/{ISSUE-KEY}`
 * - Jira Board: `https://{org}.atlassian.net/jira/software/projects/{PROJECT}/boards/{id}?selectedIssue={ISSUE-KEY}`
 * - Confluence Page: `https://{org}.atlassian.net/wiki/spaces/{SPACE}/pages/{PAGE-ID}/{TITLE}`
 *
 * @param url - 解析対象の Atlassian Cloud URL（完全な URL 文字列）
 * @returns 成功時は {@link UrlParseResult} を含む Ok、失敗時は {@link UrlParseError} を含む Err
 *
 * @example
 * ```typescript
 * // 成功例: Jira Issue URL
 * const result = parseUrl('https://mycompany.atlassian.net/browse/PROJ-123');
 * if (result.isOk()) {
 *   console.log(result.value);
 *   // { type: 'jira', organization: 'mycompany', resourceId: 'PROJ-123', projectKey: 'PROJ' }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 成功例: Confluence ページ URL
 * const result = parseUrl('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title');
 * if (result.isOk()) {
 *   console.log(result.value);
 *   // { type: 'confluence', organization: 'mycompany', resourceId: '123456789', spaceKey: 'DOCS' }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 失敗例: Atlassian Cloud 以外の URL
 * const result = parseUrl('https://example.com/browse/PROJ-123');
 * if (result.isErr()) {
 *   console.log(result.error.kind); // 'UNSUPPORTED_HOST'
 * }
 * ```
 */
export function parseUrl(url: string): Result<UrlParseResult, UrlParseError> {
  // 空文字列チェック
  if (url.trim() === '') {
    return err({
      kind: 'INVALID_FORMAT',
      message: 'URL が空です。有効な Atlassian Cloud URL を指定してください。',
    });
  }

  // URL のパース
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return err({
      kind: 'INVALID_FORMAT',
      message: `無効な URL 形式です: ${url}`,
    });
  }

  // Atlassian Cloud ホストの検証
  const hostMatch = ATLASSIAN_CLOUD_HOST_PATTERN.exec(parsedUrl.hostname);
  if (!hostMatch) {
    return err({
      kind: 'UNSUPPORTED_HOST',
      message: `Atlassian Cloud 以外の URL はサポートされていません: ${parsedUrl.hostname}`,
    });
  }

  const organization = hostMatch[1];
  if (organization === undefined) {
    return err({
      kind: 'INVALID_FORMAT',
      message: '組織名を抽出できませんでした。',
    });
  }

  // Confluence URL のパース（/wiki/ で始まる場合）
  if (parsedUrl.pathname.startsWith('/wiki/')) {
    return parseConfluenceUrl(parsedUrl, organization);
  }

  // Jira Issue URL のパース
  return parseJiraUrl(parsedUrl, organization);
}

/**
 * Jira URL を解析し、Issue 情報を抽出する
 *
 * サポートする URL パターン:
 * 1. `/browse/{ISSUE-KEY}` - 標準的な Issue ページ URL
 * 2. `/jira/software/projects/{PROJECT}/boards/{id}?selectedIssue={ISSUE-KEY}` - ボード上で選択された Issue
 *
 * @param parsedUrl - パース済みの URL オブジェクト
 * @param organization - Atlassian Cloud の組織名（サブドメイン）
 * @returns 成功時は {@link UrlParseResult} を含む Ok、失敗時は {@link UrlParseError} を含む Err
 *
 * @internal この関数は内部実装であり、外部から直接呼び出すべきではありません
 */
function parseJiraUrl(parsedUrl: URL, organization: string): Result<UrlParseResult, UrlParseError> {
  const pathname = parsedUrl.pathname;

  // /browse/{key} 形式
  if (pathname.startsWith('/browse/')) {
    const issueKey = pathname.slice('/browse/'.length);
    return validateAndCreateJiraResult(issueKey, organization);
  }

  // /jira/software/projects/.../boards/...?selectedIssue={key} 形式
  if (pathname.includes('/jira/software/projects/')) {
    const selectedIssue = parsedUrl.searchParams.get('selectedIssue');
    if (!selectedIssue) {
      return err({
        kind: 'MISSING_RESOURCE_ID',
        message: 'selectedIssue パラメータが見つかりません。',
      });
    }
    return validateAndCreateJiraResult(selectedIssue, organization);
  }

  return err({
    kind: 'MISSING_RESOURCE_ID',
    message: 'サポートされている Jira URL 形式ではありません。',
  });
}

/**
 * Jira Issue キーを検証し、パース結果オブジェクトを生成する
 *
 * Issue キーの形式 `{PROJECT}-{NUMBER}` を検証し、
 * 有効な場合は {@link UrlParseResult} を生成して返す。
 *
 * @param issueKey - 検証対象の Issue キー（例: 'PROJ-123'）
 * @param organization - Atlassian Cloud の組織名（サブドメイン）
 * @returns 成功時は {@link UrlParseResult} を含む Ok、失敗時は {@link UrlParseError} を含む Err
 *
 * @remarks
 * エラーケース:
 * - 空文字列の場合: `MISSING_RESOURCE_ID`
 * - 形式が不正な場合: `INVALID_FORMAT`
 *
 * @internal この関数は内部実装であり、外部から直接呼び出すべきではありません
 */
function validateAndCreateJiraResult(issueKey: string, organization: string): Result<UrlParseResult, UrlParseError> {
  // 空チェック
  if (issueKey.trim() === '') {
    return err({
      kind: 'MISSING_RESOURCE_ID',
      message: 'Issue キーが指定されていません。',
    });
  }

  // Issue キー形式の検証
  const keyMatch = JIRA_ISSUE_KEY_PATTERN.exec(issueKey);
  if (!keyMatch) {
    return err({
      kind: 'INVALID_FORMAT',
      message: `無効な Issue キー形式です: ${issueKey}。形式は PROJECT-123 のようにしてください。`,
    });
  }

  const projectKey = keyMatch[1];
  if (projectKey === undefined) {
    return err({
      kind: 'INVALID_FORMAT',
      message: 'プロジェクトキーを抽出できませんでした。',
    });
  }

  return ok({
    organization,
    projectKey,
    resourceId: issueKey,
    type: 'jira',
  });
}

/**
 * Confluence URL を解析し、ページ情報を抽出する
 *
 * サポートする URL パターン:
 * 1. `/wiki/spaces/{SPACE}/pages/{PAGE-ID}` - タイトルなし
 * 2. `/wiki/spaces/{SPACE}/pages/{PAGE-ID}/{TITLE}` - タイトルあり
 *
 * @param parsedUrl - パース済みの URL オブジェクト
 * @param organization - Atlassian Cloud の組織名（サブドメイン）
 * @returns 成功時は {@link UrlParseResult} を含む Ok、失敗時は {@link UrlParseError} を含む Err
 *
 * @internal この関数は内部実装であり、外部から直接呼び出すべきではありません
 */
function parseConfluenceUrl(parsedUrl: URL, organization: string): Result<UrlParseResult, UrlParseError> {
  const pathname = parsedUrl.pathname;

  // /wiki/spaces/{space}/pages/{id} 形式
  const pageMatch = CONFLUENCE_PAGE_PATH_PATTERN.exec(pathname);
  if (!pageMatch) {
    return err({
      kind: 'MISSING_RESOURCE_ID',
      message:
        'サポートされている Confluence URL 形式ではありません。/wiki/spaces/{SPACE}/pages/{PAGE-ID} 形式を使用してください。',
    });
  }

  const spaceKey = pageMatch[1];
  const pageId = pageMatch[2];

  // スペースキーの検証
  if (spaceKey === undefined || spaceKey.trim() === '') {
    return err({
      kind: 'MISSING_RESOURCE_ID',
      message: 'スペースキーが指定されていません。',
    });
  }

  // ページ ID の検証
  if (pageId === undefined || pageId.trim() === '') {
    return err({
      kind: 'MISSING_RESOURCE_ID',
      message: 'ページ ID が指定されていません。',
    });
  }

  // ページ ID が数字形式かどうかを検証
  if (!PAGE_ID_PATTERN.test(pageId)) {
    return err({
      kind: 'INVALID_FORMAT',
      message: `無効なページ ID 形式です: ${pageId}。ページ ID は数字のみで構成される必要があります。`,
    });
  }

  return ok({
    organization,
    resourceId: pageId,
    spaceKey,
    type: 'confluence',
  });
}
