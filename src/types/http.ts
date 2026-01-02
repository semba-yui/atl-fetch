/**
 * HTTP リクエストオプションの型
 */
export interface HttpRequestOptions {
  /** HTTP メソッド */
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** リクエストヘッダー */
  readonly headers?: Record<string, string>;
  /** リクエストボディ */
  readonly body?: string;
  /** タイムアウト（ミリ秒） */
  readonly timeout?: number;
}

/**
 * HTTP レスポンスの型
 */
export interface HttpResponse<T> {
  /** HTTP ステータスコード */
  readonly status: number;
  /** レスポンスヘッダー */
  readonly headers: Record<string, string>;
  /** レスポンスデータ */
  readonly data: T;
}

/**
 * HTTP エラーの型
 */
export type HttpError =
  | { kind: 'NETWORK_ERROR'; message: string }
  | { kind: 'TIMEOUT'; message: string }
  | { kind: 'HTTP_ERROR'; status: number; message: string };

/**
 * ダウンロード進捗コールバックの型
 *
 * @param transferred - 転送済みバイト数
 * @param total - 総バイト数（不明な場合は undefined）
 */
export type ProgressCallback = (transferred: number, total: number | undefined) => void;
