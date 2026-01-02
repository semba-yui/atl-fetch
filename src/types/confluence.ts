/**
 * Confluence ページのバージョン情報の型
 */
export interface ConfluenceVersion {
  /** バージョン番号 */
  readonly number: number;
  /** 作成者の表示名 */
  readonly by: string;
  /** 作成日時（ISO 8601 形式） */
  readonly when: string;
  /** バージョンメッセージ（null の場合はメッセージなし） */
  readonly message: string | null;
  /** 本文（バージョン詳細取得時のみ） */
  readonly body?: string;
}

/**
 * Confluence ページの添付ファイルの型
 */
export interface ConfluenceAttachment {
  /** 添付ファイル ID */
  readonly id: string;
  /** ファイルタイトル */
  readonly title: string;
  /** メディアタイプ */
  readonly mediaType: string;
  /** ファイルサイズ（バイト） */
  readonly fileSize: number;
  /** ダウンロード URL */
  readonly downloadUrl: string;
}

/**
 * Confluence ページの型
 */
export interface ConfluencePage {
  /** ページ ID */
  readonly id: string;
  /** ページタイトル */
  readonly title: string;
  /** ページ本文（HTML 形式） */
  readonly body: string;
  /** スペースキー */
  readonly spaceKey: string;
  /** 現在のバージョン番号 */
  readonly currentVersion: number;
  /** バージョン一覧 */
  readonly versions: readonly ConfluenceVersion[];
  /** 添付ファイル一覧 */
  readonly attachments: readonly ConfluenceAttachment[];
}

/**
 * Confluence サービスのエラーの型
 */
export type ConfluenceError =
  | { kind: 'NOT_FOUND'; message: string }
  | { kind: 'FORBIDDEN'; message: string }
  | { kind: 'AUTH_FAILED'; message: string }
  | { kind: 'NETWORK_ERROR'; message: string }
  | { kind: 'PARSE_ERROR'; message: string };
