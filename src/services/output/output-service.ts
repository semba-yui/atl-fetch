/**
 * 出力サービス
 *
 * 取得したデータを指定形式（JSON/Markdown/YAML）で出力する。
 */

import { dirname } from 'node:path';

import { err, ok, type Result } from 'neverthrow';
import { stringify as yamlStringify } from 'yaml';

import { ensureDir, writeFileContent } from '../../ports/file/file-port.js';
import type { ConfluencePage } from '../../types/confluence.js';
import type { JiraIssue } from '../../types/jira.js';
import type { OutputError, OutputFormat } from '../../types/output.js';

/**
 * Jira Issue を Markdown 形式にフォーマットする
 *
 * @param issue Jira Issue
 * @returns Markdown 文字列
 */
const formatJiraIssueAsMarkdown = (issue: JiraIssue): string => {
  const lines: string[] = [];

  // Title
  lines.push(`# ${issue.key}: ${issue.summary}`);
  lines.push('');

  // Description
  lines.push('## Description');
  lines.push('');
  lines.push(issue.description ?? 'N/A');
  lines.push('');

  // Comments
  lines.push('## Comments');
  lines.push('');
  if (issue.comments.length === 0) {
    lines.push('No comments');
  } else {
    for (const comment of issue.comments) {
      lines.push(`### ${comment.author} (${comment.created})`);
      lines.push('');
      lines.push(comment.body);
      lines.push('');
    }
  }

  // Changelog
  lines.push('## Changelog');
  lines.push('');
  if (issue.changelog.length === 0) {
    lines.push('No changes');
  } else {
    for (const entry of issue.changelog) {
      lines.push(`### ${entry.author} (${entry.created})`);
      lines.push('');
      for (const item of entry.items) {
        const from = item.fromString ?? '(none)';
        const to = item.toString ?? '(none)';
        lines.push(`- **${item.field}**: ${from} → ${to}`);
      }
      lines.push('');
    }
  }

  // Attachments
  lines.push('## Attachments');
  lines.push('');
  if (issue.attachments.length === 0) {
    lines.push('No attachments');
  } else {
    for (const attachment of issue.attachments) {
      const sizeKB = (attachment.size / 1024).toFixed(1);
      lines.push(`- **${attachment.filename}** (${attachment.mimeType}, ${sizeKB} KB)`);
    }
  }

  return lines.join('\n');
};

/**
 * Jira Issue を指定形式でフォーマットする
 *
 * @param issue Jira Issue
 * @param options 出力オプション
 * @returns フォーマット済み文字列
 */
export const formatJiraIssue = (issue: JiraIssue, options: { format: OutputFormat }): Result<string, OutputError> => {
  if (options.format === 'json') {
    return ok(JSON.stringify(issue, null, 2));
  }

  if (options.format === 'markdown') {
    return ok(formatJiraIssueAsMarkdown(issue));
  }

  // YAML 形式
  return ok(yamlStringify(issue));
};

/**
 * HTML タグを除去してプレーンテキストを抽出する
 *
 * @param html HTML 文字列
 * @returns プレーンテキスト
 */
const stripHtmlTags = (html: string): string => {
  return html.replaceAll(/<[^>]*>/g, '');
};

/**
 * Confluence ページを Markdown 形式にフォーマットする
 *
 * @param page Confluence ページ
 * @returns Markdown 文字列
 */
const formatConfluencePageAsMarkdown = (page: ConfluencePage): string => {
  const lines: string[] = [];

  // Title
  lines.push(`# ${page.title}`);
  lines.push('');

  // Metadata
  lines.push(`**Page ID**: ${page.id}`);
  lines.push(`**Space**: ${page.spaceKey}`);
  lines.push(`**Version**: ${String(page.currentVersion)}`);
  lines.push('');

  // Content
  lines.push('## Content');
  lines.push('');
  lines.push(stripHtmlTags(page.body));
  lines.push('');

  // Version History
  lines.push('## Version History');
  lines.push('');
  if (page.versions.length === 0) {
    lines.push('No version history');
  } else {
    for (const version of page.versions) {
      const message = version.message !== null ? `: ${version.message}` : '';
      lines.push(`### Version ${String(version.number)} by ${version.by} (${version.when})${message}`);
      lines.push('');
    }
  }

  // Attachments
  lines.push('## Attachments');
  lines.push('');
  if (page.attachments.length === 0) {
    lines.push('No attachments');
  } else {
    for (const attachment of page.attachments) {
      const sizeKB = (attachment.fileSize / 1024).toFixed(1);
      lines.push(`- **${attachment.title}** (${attachment.mediaType}, ${sizeKB} KB)`);
    }
  }

  return lines.join('\n');
};

/**
 * Confluence ページを指定形式でフォーマットする
 *
 * @param page Confluence ページ
 * @param options 出力オプション
 * @returns フォーマット済み文字列
 */
export const formatConfluencePage = (
  page: ConfluencePage,
  options: { format: OutputFormat },
): Result<string, OutputError> => {
  if (options.format === 'json') {
    return ok(JSON.stringify(page, null, 2));
  }

  if (options.format === 'markdown') {
    return ok(formatConfluencePageAsMarkdown(page));
  }

  // YAML 形式
  return ok(yamlStringify(page));
};

/**
 * ダウンロード進捗を標準エラー出力に表示する
 *
 * 添付ファイルダウンロード時に進捗を表示する。
 * 同じ行で更新するためにキャリッジリターン（\r）を使用し、
 * 完了時（current === total）には改行を追加する。
 *
 * @param message 進捗メッセージ
 * @param current 現在の進捗位置
 * @param total 合計数
 *
 * @example
 * ```typescript
 * // ダウンロード進捗を表示
 * showProgress('Downloading', 1, 3);  // "\rDownloading: 1/3 (33%)"
 * showProgress('Downloading', 2, 3);  // "\rDownloading: 2/3 (67%)"
 * showProgress('Downloading', 3, 3);  // "\rDownloading: 3/3 (100%)\n"
 * ```
 */
export const showProgress = (message: string, current: number, total: number): void => {
  // パーセンテージを計算（total が 0 の場合は 0%）
  const percentage = total === 0 ? 0 : Math.min(100, Math.floor((current / total) * 100));

  // 進捗メッセージを構築
  const progressMessage = `\r${message}: ${String(current)}/${String(total)} (${String(percentage)}%)`;

  // 完了時は改行を追加
  const output = current >= total && total > 0 ? `${progressMessage}\n` : progressMessage;

  // 標準エラー出力に書き込む
  process.stderr.write(output);
};

/**
 * コンテンツをファイルに書き込む
 *
 * 親ディレクトリを作成してから、指定されたパスにコンテンツを書き込む。
 *
 * @param content 書き込むコンテンツ
 * @param outputPath 出力先ファイルパス
 * @returns 成功時は Ok(void)、失敗時は Err(OutputError)
 *
 * @example
 * ```typescript
 * const result = await writeToFile('{"key": "value"}', '/path/to/output.json');
 * if (result.isOk()) {
 *   console.log('ファイルを書き込みました');
 * }
 * ```
 */
export const writeToFile = async (content: string, outputPath: string): Promise<Result<void, OutputError>> => {
  const parentDir = dirname(outputPath);

  // 親ディレクトリを作成
  const ensureDirResult = await ensureDir(parentDir);
  if (ensureDirResult.isErr()) {
    return err({
      kind: 'WRITE_FAILED',
      message: `ディレクトリの作成に失敗しました: ${parentDir} - ${ensureDirResult.error.message}`,
    });
  }

  // ファイルに書き込む
  const writeResult = await writeFileContent(outputPath, content);
  if (writeResult.isErr()) {
    return err({
      kind: 'WRITE_FAILED',
      message: `ファイルの書き込みに失敗しました: ${outputPath} - ${writeResult.error.message}`,
    });
  }

  return ok(undefined);
};
