import { err, ok, type Result } from 'neverthrow';
import type { ConfluenceError } from '../../types/confluence.js';
import type { FetchAndSaveOptions, FetchAndSaveResult, FetchError, FetchResult } from '../../types/fetch.js';
import type { JiraError } from '../../types/jira.js';
import type { OutputOptions } from '../../types/output.js';
import { fetchConfluencePage } from '../confluence/confluence-service.js';
import { fetchJiraIssue } from '../jira/jira-service.js';
import { formatConfluencePage, formatJiraIssue, writeToFile } from '../output/output-service.js';
import { saveConfluencePage, saveConfluenceVersions, saveJiraIssue } from '../storage/storage-service.js';
import { convertStorageFormatToPlainText } from '../text-converter/text-converter.js';
import { parseUrl } from '../url-parser/url-parser.js';

/**
 * Jira エラーを FetchError に変換する
 *
 * @param jiraError - Jira サービスから返されたエラー
 * @returns FetchError
 */
function mapJiraErrorToFetchError(jiraError: JiraError): FetchError {
  switch (jiraError.kind) {
    case 'NOT_FOUND':
      return { kind: 'NOT_FOUND', message: jiraError.message };
    case 'FORBIDDEN':
      return { kind: 'FORBIDDEN', message: jiraError.message };
    case 'AUTH_FAILED':
      return { kind: 'AUTH_FAILED', message: jiraError.message };
    case 'NETWORK_ERROR':
      return { kind: 'NETWORK_ERROR', message: jiraError.message };
    case 'PARSE_ERROR':
      return { kind: 'JIRA_ERROR', message: jiraError.message };
  }
}

/**
 * Confluence エラーを FetchError に変換する
 *
 * @param confluenceError - Confluence サービスから返されたエラー
 * @returns FetchError
 */
function mapConfluenceErrorToFetchError(confluenceError: ConfluenceError): FetchError {
  switch (confluenceError.kind) {
    case 'NOT_FOUND':
      return { kind: 'NOT_FOUND', message: confluenceError.message };
    case 'FORBIDDEN':
      return { kind: 'FORBIDDEN', message: confluenceError.message };
    case 'AUTH_FAILED':
      return { kind: 'AUTH_FAILED', message: confluenceError.message };
    case 'NETWORK_ERROR':
      return { kind: 'NETWORK_ERROR', message: confluenceError.message };
    case 'PARSE_ERROR':
      return { kind: 'CONFLUENCE_ERROR', message: confluenceError.message };
  }
}

/**
 * URL からリソースを取得する
 *
 * Atlassian Cloud の URL を解析し、リソースタイプ（Jira / Confluence）に応じて
 * 適切なサービスを呼び出してデータを取得する。
 *
 * @param url - Atlassian Cloud の URL
 * @returns 成功時は {@link FetchResult} を含む Ok、失敗時は {@link FetchError} を含む Err
 *
 * @example
 * ```typescript
 * // Jira Issue を取得
 * const result = await fetchResource('https://mycompany.atlassian.net/browse/PROJ-123');
 * if (result.isOk()) {
 *   if (result.value.type === 'jira') {
 *     console.log(result.value.data.summary);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Confluence ページを取得
 * const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789');
 * if (result.isOk()) {
 *   if (result.value.type === 'confluence') {
 *     console.log(result.value.data.title);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // エラーハンドリング
 * const result = await fetchResource('https://invalid-url.com');
 * if (result.isErr()) {
 *   console.log(result.error.kind); // 'URL_PARSE_ERROR'
 * }
 * ```
 */
export async function fetchResource(url: string): Promise<Result<FetchResult, FetchError>> {
  // URL を解析
  const parseResult = parseUrl(url);
  if (parseResult.isErr()) {
    return err({
      kind: 'URL_PARSE_ERROR',
      message: parseResult.error.message,
    });
  }

  const { type, organization, resourceId } = parseResult.value;

  // リソースタイプに応じてサービスを呼び出す
  if (type === 'jira') {
    const issueResult = await fetchJiraIssue(organization, resourceId);
    if (issueResult.isErr()) {
      return err(mapJiraErrorToFetchError(issueResult.error));
    }
    return ok({
      data: issueResult.value,
      type: 'jira',
    });
  }

  // type === 'confluence'
  const pageResult = await fetchConfluencePage(organization, resourceId);
  if (pageResult.isErr()) {
    return err(mapConfluenceErrorToFetchError(pageResult.error));
  }
  return ok({
    data: pageResult.value,
    type: 'confluence',
  });
}

/**
 * URL からリソースを取得し、指定形式で出力する
 *
 * Atlassian Cloud の URL を解析してリソースを取得し、
 * 出力オプションに応じて JSON/Markdown/YAML 形式でフォーマットする。
 * outputPath が指定されている場合はファイルに書き込む。
 *
 * @param url - Atlassian Cloud の URL
 * @param options - 出力オプション（形式、出力先パス、カラー有効化）
 * @returns 成功時はフォーマット済み文字列を含む Ok、失敗時は {@link FetchError} を含む Err
 *
 * @example
 * ```typescript
 * // JSON 形式で標準出力
 * const result = await fetchAndOutput(
 *   'https://mycompany.atlassian.net/browse/PROJ-123',
 *   { format: 'json', colorEnabled: true }
 * );
 * if (result.isOk()) {
 *   console.log(result.value);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Markdown 形式でファイル出力
 * const result = await fetchAndOutput(
 *   'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789',
 *   { format: 'markdown', outputPath: '/tmp/page.md', colorEnabled: false }
 * );
 * ```
 */
export async function fetchAndOutput(url: string, options: OutputOptions): Promise<Result<string, FetchError>> {
  // リソースを取得
  const fetchResult = await fetchResource(url);
  if (fetchResult.isErr()) {
    return err(fetchResult.error);
  }

  const { type, data } = fetchResult.value;

  // リソースタイプに応じてフォーマット
  const formatResult =
    type === 'jira'
      ? formatJiraIssue(data, { format: options.format })
      : formatConfluencePage(data, { format: options.format });

  if (formatResult.isErr()) {
    return err({
      kind: 'OUTPUT_ERROR',
      message: formatResult.error.message,
    });
  }

  const formattedContent = formatResult.value;

  // ファイル出力が指定されている場合は書き込む
  if (options.outputPath !== undefined) {
    const writeResult = await writeToFile(formattedContent, options.outputPath);
    if (writeResult.isErr()) {
      return err({
        kind: 'OUTPUT_ERROR',
        message: writeResult.error.message,
      });
    }
  }

  return ok(formattedContent);
}

/**
 * URL からリソースを取得し、ディレクトリ構造で保存する
 *
 * Atlassian Cloud の URL を解析してリソースを取得し、
 * ダウンロードオプションに応じて StorageService を呼び出してディレクトリ構造で保存する。
 *
 * @param url - Atlassian Cloud の URL
 * @param options - 保存オプション（ベースディレクトリ、CLI バージョン、入力 URL）
 * @returns 成功時は {@link FetchAndSaveResult} を含む Ok、失敗時は {@link FetchError} を含む Err
 *
 * @example
 * ```typescript
 * // Jira Issue をディレクトリ構造で保存
 * const result = await fetchAndSave(
 *   'https://mycompany.atlassian.net/browse/PROJ-123',
 *   { baseDir: '/tmp/output', cliVersion: '1.0.0', sourceUrl: 'https://mycompany.atlassian.net/browse/PROJ-123' }
 * );
 * if (result.isOk()) {
 *   console.log('保存先:', result.value.directory);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Confluence ページをディレクトリ構造で保存
 * const result = await fetchAndSave(
 *   'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789',
 *   { baseDir: '/tmp/output', cliVersion: '1.0.0', sourceUrl: 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789' }
 * );
 * if (result.isOk()) {
 *   console.log('保存先:', result.value.directory);
 * }
 * ```
 */
export async function fetchAndSave(
  url: string,
  options: FetchAndSaveOptions,
): Promise<Result<FetchAndSaveResult, FetchError>> {
  // URL を解析
  const parseResult = parseUrl(url);
  if (parseResult.isErr()) {
    return err({
      kind: 'URL_PARSE_ERROR',
      message: parseResult.error.message,
    });
  }

  const { type, organization, resourceId } = parseResult.value;

  // リソースタイプに応じてサービスを呼び出す
  if (type === 'jira') {
    // Jira Issue を取得
    const issueResult = await fetchJiraIssue(organization, resourceId);
    if (issueResult.isErr()) {
      return err(mapJiraErrorToFetchError(issueResult.error));
    }

    const issue = issueResult.value;

    // Jira Issue をディレクトリ構造で保存
    // description は ADF 形式で保存、descriptionPlainText は後方互換性のため維持
    const saveResult = await saveJiraIssue(
      {
        attachments: issue.attachments,
        changelog: issue.changelog,
        comments: issue.comments,
        description: issue.descriptionAdf,
        descriptionPlainText: issue.description,
        key: issue.key,
        summary: issue.summary,
      },
      {
        baseDir: options.baseDir,
        cliVersion: options.cliVersion,
        sourceUrl: options.sourceUrl,
      },
    );

    if (saveResult.isErr()) {
      return err({
        kind: 'STORAGE_ERROR',
        message: saveResult.error.message,
      });
    }

    return ok({
      directory: saveResult.value.directory,
      manifest: saveResult.value.manifest,
    });
  }

  // type === 'confluence'
  // Confluence ページを取得
  const pageResult = await fetchConfluencePage(organization, resourceId);
  if (pageResult.isErr()) {
    return err(mapConfluenceErrorToFetchError(pageResult.error));
  }

  const page = pageResult.value;

  // Storage Format をプレーンテキストに変換
  const bodyPlainText = convertStorageFormatToPlainText(page.body);

  // Confluence ページをディレクトリ構造で保存
  const saveResult = await saveConfluencePage(
    {
      attachments: page.attachments,
      body: page.body,
      bodyPlainText,
      currentVersion: page.currentVersion,
      id: page.id,
      spaceKey: page.spaceKey,
      title: page.title,
      versions: page.versions,
    },
    {
      baseDir: options.baseDir,
      cliVersion: options.cliVersion,
      sourceUrl: options.sourceUrl,
    },
  );

  if (saveResult.isErr()) {
    return err({
      kind: 'STORAGE_ERROR',
      message: saveResult.error.message,
    });
  }

  // バージョン別保存
  const versionsResult = await saveConfluenceVersions(page.versions, saveResult.value.directory);
  if (versionsResult.isErr()) {
    return err({
      kind: 'STORAGE_ERROR',
      message: versionsResult.error.message,
    });
  }

  return ok({
    directory: saveResult.value.directory,
    manifest: saveResult.value.manifest,
  });
}
