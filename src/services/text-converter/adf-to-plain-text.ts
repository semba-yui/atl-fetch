/**
 * ADF（Atlassian Document Format）→ PlainText 変換
 */

import type { AdfNode } from './types.js';
import { isAdfDocument } from './types.js';

/**
 * ADF ノードからプレーンテキストを抽出する
 *
 * @param node ADF ノード
 * @returns 抽出されたプレーンテキスト
 */
export const extractTextFromAdfNode = (node: AdfNode): string => {
  // テキストノードの場合
  if (node.type === 'text' && node.text !== undefined) {
    return node.text;
  }

  // 硬い改行の場合
  if (node.type === 'hardBreak') {
    return '\n';
  }

  // メンションの場合
  if (node.type === 'mention' && node.attrs !== undefined) {
    const text = node.attrs['text'];
    if (typeof text === 'string') {
      return text;
    }
    return '@ユーザー';
  }

  // 絵文字の場合
  if (node.type === 'emoji' && node.attrs !== undefined) {
    const text = node.attrs['text'];
    const shortName = node.attrs['shortName'];
    if (typeof text === 'string') {
      return text;
    }
    if (typeof shortName === 'string') {
      return shortName;
    }
    return '';
  }

  // メディアの場合
  if (node.type === 'media') {
    return '[添付ファイル]';
  }

  // mediaSingle の場合（メディアコンテナ）
  if (node.type === 'mediaSingle' && node.content !== undefined) {
    return node.content.map(extractTextFromAdfNode).join('');
  }

  // 子ノードがある場合は再帰的に処理
  if (node.content !== undefined && Array.isArray(node.content)) {
    const texts = node.content.map(extractTextFromAdfNode);

    // パラグラフや見出しの後には改行を追加
    if (node.type === 'paragraph' || node.type === 'heading') {
      return texts.join('');
    }

    // リストアイテムの後には改行を追加
    if (node.type === 'listItem') {
      return `${texts.join('')}\n`;
    }

    // テーブルセルとヘッダーはタブで区切る
    if (node.type === 'tableCell' || node.type === 'tableHeader') {
      return `${texts.join('')}\t`;
    }

    // テーブル行は改行で区切る
    if (node.type === 'tableRow') {
      return `${texts.join('').trimEnd()}\n`;
    }

    return texts.join('');
  }

  return '';
};

/**
 * ADF ドキュメントのトップレベルコンテンツを処理する
 *
 * @param content トップレベルのコンテンツ配列
 * @returns プレーンテキスト
 */
export const processAdfContent = (content: readonly AdfNode[]): string => {
  const results: string[] = [];

  for (const node of content) {
    const text = extractTextFromAdfNode(node);
    if (text !== '') {
      results.push(text);
    }
  }

  // パラグラフや見出しは改行で結合
  return results.join('\n');
};

/**
 * ADF（Atlassian Document Format）をプレーンテキストに変換する
 *
 * @param adf ADF ドキュメント（オブジェクトまたは JSON 文字列）
 * @returns プレーンテキスト
 */
export const convertAdfToPlainText = (adf: unknown): string => {
  // null または undefined の場合は空文字列を返す
  if (adf === null || adf === undefined) {
    return '';
  }

  // 文字列の場合は JSON としてパースを試みる
  if (typeof adf === 'string') {
    try {
      const parsed = JSON.parse(adf) as unknown;
      if (isAdfDocument(parsed)) {
        return processAdfContent(parsed.content);
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
    return processAdfContent(adf.content);
  }

  return '';
};
