/**
 * テキスト変換サービスの型定義
 */

/**
 * 添付ファイルパスのマッピング型
 * filename -> savedPath
 */
export type AttachmentPathMapping = Record<string, string>;

/**
 * ADF マークの型定義
 */
export interface AdfMark {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
}

/**
 * ADF ノードの型定義
 */
export interface AdfNode {
  readonly type: string;
  readonly text?: string;
  readonly content?: readonly AdfNode[];
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly marks?: readonly AdfMark[];
}

/**
 * ADF ドキュメントの型定義
 */
export interface AdfDocument {
  readonly type: 'doc';
  readonly version: number;
  readonly content: readonly AdfNode[];
}

/**
 * 入力が ADF ドキュメント形式かどうかを判定する
 *
 * @param input 入力値
 * @returns ADF ドキュメント形式の場合 true
 */
export const isAdfDocument = (input: unknown): input is AdfDocument => {
  if (typeof input !== 'object' || input === null) {
    return false;
  }
  const doc = input as Record<string, unknown>;
  return doc['type'] === 'doc' && Array.isArray(doc['content']);
};
