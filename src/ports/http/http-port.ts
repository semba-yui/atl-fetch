import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import got, { HTTPError, RequestError, TimeoutError } from 'got';
import { err, ok, type Result } from 'neverthrow';
import type { HttpError, HttpRequestOptions, HttpResponse, ProgressCallback } from '../../types/http.js';

/**
 * デフォルトのタイムアウト（ミリ秒）
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * リトライ対象のステータスコード
 */
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * リトライ回数
 */
const DEFAULT_RETRY_LIMIT = 2;

/**
 * HTTP リクエストを実行する
 *
 * got ライブラリを使用して HTTP リクエストを実行し、Result 型で結果を返す。
 * 認証ヘッダーの付与、リトライ、タイムアウト処理をサポート。
 *
 * @typeParam T - レスポンスデータの型
 * @param url - リクエスト先の URL
 * @param options - リクエストオプション（メソッド、ヘッダー、ボディ、タイムアウト）
 * @returns 成功時は {@link HttpResponse} を含む Ok、失敗時は {@link HttpError} を含む Err
 *
 * @example
 * ```typescript
 * // GET リクエスト
 * const result = await httpRequest<{ id: string }>('https://api.example.com/data');
 * if (result.isOk()) {
 *   console.log(result.value.data.id);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 認証付き GET リクエスト
 * const result = await httpRequest<{ user: string }>('https://api.example.com/me', {
 *   headers: { Authorization: 'Basic xxx' }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // POST リクエスト
 * const result = await httpRequest<{ id: string }>('https://api.example.com/create', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'test' }),
 * });
 * ```
 */
export async function httpRequest<T>(
  url: string,
  options: HttpRequestOptions = {},
): Promise<Result<HttpResponse<T>, HttpError>> {
  const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT } = options;

  try {
    const response = await got<T>(url, {
      body,
      headers,
      method,
      responseType: 'json',
      retry: {
        limit: DEFAULT_RETRY_LIMIT,
        statusCodes: RETRY_STATUS_CODES,
      },
      timeout: {
        request: timeout,
      },
    });

    // ヘッダーを Record<string, string> に変換
    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === 'string') {
        responseHeaders[key] = value;
      } else if (Array.isArray(value)) {
        responseHeaders[key] = value.join(', ');
      }
    }

    return ok({
      data: response.body,
      headers: responseHeaders,
      status: response.statusCode,
    });
  } catch (error) {
    return err(mapErrorToHttpError(error));
  }
}

/**
 * エラーを HttpError にマッピングする
 *
 * @param error - キャッチしたエラー
 * @returns 対応する HttpError
 *
 * @internal テスト用に export
 */
export function mapErrorToHttpError(error: unknown): HttpError {
  // タイムアウトエラー
  if (error instanceof TimeoutError) {
    return {
      kind: 'TIMEOUT',
      message: `リクエストがタイムアウトしました: ${error.message}`,
    };
  }

  // HTTP エラー（4xx, 5xx）
  if (error instanceof HTTPError) {
    const status = error.response.statusCode;
    const statusText = getStatusText(status);
    return {
      kind: 'HTTP_ERROR',
      message: `HTTP ${status} ${statusText}: ${error.message}`,
      status,
    };
  }

  // その他の got エラー（ネットワークエラー等）
  if (error instanceof RequestError) {
    return {
      kind: 'NETWORK_ERROR',
      message: `ネットワークエラーが発生しました: ${error.message}`,
    };
  }

  // 不明なエラー
  const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
  return {
    kind: 'NETWORK_ERROR',
    message: `リクエストエラー: ${message}`,
  };
}

/**
 * HTTP ステータスコードに対応するテキストを取得する
 *
 * @param status - HTTP ステータスコード
 * @returns ステータステキスト
 *
 * @internal テスト用に export
 */
export function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return statusTexts[status] ?? 'Error';
}

/**
 * ファイルをダウンロードして指定パスに保存する
 *
 * got ライブラリを使用してストリームでファイルをダウンロードし、
 * 指定したパスに保存する。大きなファイルでもメモリを節約できる。
 *
 * @param url - ダウンロード対象の URL
 * @param destPath - 保存先ファイルパス
 * @param headers - リクエストヘッダー（認証ヘッダー等）
 * @param onProgress - 進捗コールバック関数
 * @param timeout - タイムアウト（ミリ秒）
 * @returns 成功時は void を含む Ok、失敗時は {@link HttpError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的なダウンロード
 * const result = await httpDownload(
 *   'https://example.com/file.pdf',
 *   '/path/to/save/file.pdf'
 * );
 * ```
 *
 * @example
 * ```typescript
 * // 認証付きダウンロード
 * const result = await httpDownload(
 *   'https://api.example.com/attachments/123',
 *   '/path/to/save/attachment.pdf',
 *   { Authorization: 'Basic xxx' }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // 進捗コールバック付きダウンロード
 * const result = await httpDownload(
 *   'https://example.com/large-file.zip',
 *   '/path/to/save/large-file.zip',
 *   undefined,
 *   (transferred, total) => {
 *     if (total) {
 *       console.log(`Progress: ${(transferred / total * 100).toFixed(1)}%`);
 *     }
 *   }
 * );
 * ```
 */
export async function httpDownload(
  url: string,
  destPath: string,
  headers?: Record<string, string>,
  onProgress?: ProgressCallback,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<Result<void, HttpError>> {
  try {
    // 保存先ディレクトリを作成
    await mkdir(dirname(destPath), { recursive: true });

    // ダウンロードストリームを作成
    const downloadStream = got.stream(url, {
      ...(headers && { headers }),
      retry: {
        limit: DEFAULT_RETRY_LIMIT,
        statusCodes: RETRY_STATUS_CODES,
      },
      timeout: {
        request: timeout,
      },
    });

    // 進捗追跡
    let transferred = 0;
    let total: number | undefined;

    downloadStream.on('downloadProgress', (progress) => {
      transferred = progress.transferred;
      total = progress.total;
      if (onProgress) {
        onProgress(transferred, total);
      }
    });

    // ファイル書き込みストリームを作成
    const writeStream = createWriteStream(destPath);

    // ストリームをパイプラインで接続
    await pipeline(downloadStream, writeStream);

    return ok(undefined);
  } catch (error) {
    return err(mapErrorToHttpError(error));
  }
}
