/**
 * テキスト変換サービス
 *
 * Jira の ADF（Atlassian Document Format）と Confluence の Storage Format を
 * プレーンテキストや Markdown に変換する機能を提供する。
 */

import { convertAdfContentToHtml } from './adf-to-html.js';
import { createTurndownService, preprocessHtmlForMarkdown } from './markdown-utils.js';
import type { AttachmentPathMapping } from './types.js';
import { isAdfDocument } from './types.js';

// 公開 API の再エクスポート
export { convertAdfToPlainText } from './adf-to-plain-text.js';
export { convertStorageFormatToPlainText } from './storage-to-plain-text.js';

/**
 * ADF（Atlassian Document Format）を Markdown に変換する
 *
 * @param adf ADF ドキュメント（オブジェクトまたは JSON 文字列）
 * @param attachmentPaths 添付ファイル ID → ローカルパスのマッピング
 * @returns Markdown 文字列
 */
export const convertAdfToMarkdown = (adf: unknown, attachmentPaths?: AttachmentPathMapping): string => {
  // null または undefined の場合は空文字列を返す
  if (adf === null || adf === undefined) {
    return '';
  }

  // 文字列の場合は JSON としてパースを試みる
  if (typeof adf === 'string') {
    // 空文字列の場合
    if (adf === '') {
      return '';
    }
    try {
      const parsed = JSON.parse(adf) as unknown;
      if (isAdfDocument(parsed)) {
        const html = convertAdfContentToHtml(parsed.content, attachmentPaths);
        const turndownService = createTurndownService();
        return turndownService.turndown(html).trim();
      }
    } catch {
      // JSON パースに失敗した場合は元の文字列を返す
      return adf;
    }
    // パースできたが ADF 形式でない場合は元の文字列を返す
    return adf;
  }

  // オブジェクトの場合は ADF ドキュメントとして処理
  if (isAdfDocument(adf)) {
    const html = convertAdfContentToHtml(adf.content, attachmentPaths);
    const turndownService = createTurndownService();
    return turndownService.turndown(html).trim();
  }

  return '';
};

/**
 * Confluence Storage Format（XHTML）を Markdown に変換する
 *
 * @param storageFormat Storage Format 文字列（HTML/XHTML）
 * @param attachmentPaths 添付ファイル名 → ローカルパスのマッピング
 * @returns Markdown 文字列
 */
export const convertStorageFormatToMarkdown = (
  storageFormat: string | null | undefined,
  attachmentPaths?: AttachmentPathMapping,
): string => {
  // null または undefined の場合は空文字列を返す
  if (storageFormat === null || storageFormat === undefined || storageFormat === '') {
    return '';
  }

  // 前処理
  const preprocessedHtml = preprocessHtmlForMarkdown(storageFormat, attachmentPaths);

  // 共通の TurndownService を使用
  const turndownService = createTurndownService();

  // Markdown に変換
  const markdown = turndownService.turndown(preprocessedHtml);

  // 末尾の空白を除去
  return markdown.trim();
};
