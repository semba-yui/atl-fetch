/**
 * Jira Issue のコメントの型
 */
export interface JiraComment {
  /** コメント ID */
  readonly id: string;
  /** 作成者の表示名 */
  readonly author: string;
  /** コメント本文 */
  readonly body: string;
  /** 作成日時（ISO 8601 形式） */
  readonly created: string;
  /** 更新日時（ISO 8601 形式） */
  readonly updated: string;
}

/**
 * Jira Issue の変更履歴アイテムの型
 */
export interface JiraChangelogItem {
  /** 変更されたフィールド名 */
  readonly field: string;
  /** 変更前の値（null の場合は新規追加） */
  readonly fromString: string | null;
  /** 変更後の値（null の場合は削除） */
  readonly toString: string | null;
}

/**
 * Jira Issue の変更履歴エントリの型
 */
export interface JiraChangelogEntry {
  /** 変更履歴 ID */
  readonly id: string;
  /** 変更者の表示名 */
  readonly author: string;
  /** 変更日時（ISO 8601 形式） */
  readonly created: string;
  /** 変更アイテムのリスト */
  readonly items: readonly JiraChangelogItem[];
}

/**
 * Jira Issue の添付ファイルの型
 */
export interface JiraAttachment {
  /** 添付ファイル ID */
  readonly id: string;
  /** ファイル名 */
  readonly filename: string;
  /** MIME タイプ */
  readonly mimeType: string;
  /** ファイルサイズ（バイト） */
  readonly size: number;
  /** コンテンツダウンロード URL */
  readonly contentUrl: string;
}

/**
 * Jira Issue の型
 */
export interface JiraIssue {
  /** Issue キー（例: PROJECT-123） */
  readonly key: string;
  /** Issue タイトル（要約） */
  readonly summary: string;
  /** Issue 説明（null の場合は説明なし） */
  readonly description: string | null;
  /** コメント一覧 */
  readonly comments: readonly JiraComment[];
  /** 変更履歴一覧 */
  readonly changelog: readonly JiraChangelogEntry[];
  /** 添付ファイル一覧 */
  readonly attachments: readonly JiraAttachment[];
}

/**
 * Jira サービスのエラーの型
 */
export type JiraError =
  | { kind: 'NOT_FOUND'; message: string }
  | { kind: 'FORBIDDEN'; message: string }
  | { kind: 'AUTH_FAILED'; message: string }
  | { kind: 'NETWORK_ERROR'; message: string }
  | { kind: 'PARSE_ERROR'; message: string };
