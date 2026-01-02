import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';
import { httpDownload, httpRequest } from '../../ports/http/http-port.js';
import type {
  ConfluenceAttachment,
  ConfluenceError,
  ConfluencePage,
  ConfluenceVersion,
} from '../../types/confluence.js';
import { getAuthHeader } from '../auth/auth-service.js';

/**
 * Confluence Cloud API のベース URL を構築する
 *
 * @param organization - 組織名（.atlassian.net のサブドメイン）
 * @returns Confluence Cloud API のベース URL
 */
function getConfluenceApiBaseUrl(organization: string): string {
  return `https://${organization}.atlassian.net/wiki/rest/api`;
}

/**
 * Confluence API レスポンスのスキーマ
 *
 * Confluence Cloud REST API v1 のレスポンス形式に対応
 */
const confluenceApiResponseSchema = z.object({
  body: z.object({
    storage: z.object({
      representation: z.string(),
      value: z.string(),
    }),
  }),
  id: z.string(),
  space: z.object({
    key: z.string(),
  }),
  title: z.string(),
  version: z.object({
    number: z.number(),
  }),
});

type ConfluenceApiResponse = z.infer<typeof confluenceApiResponseSchema>;

/**
 * HTTP エラーを ConfluenceError に変換する
 *
 * @param status - HTTP ステータスコード
 * @param message - エラーメッセージ
 * @returns ConfluenceError
 */
function mapHttpStatusToConfluenceError(status: number, message: string): ConfluenceError {
  switch (status) {
    case 401:
      return {
        kind: 'AUTH_FAILED',
        message: '認証に失敗しました。API トークンとメールアドレスを確認してください。',
      };
    case 403:
      return {
        kind: 'FORBIDDEN',
        message: 'このページへのアクセス権限がありません。権限を確認してください。',
      };
    case 404:
      return {
        kind: 'NOT_FOUND',
        message: '指定されたページが見つかりません。ページ ID を確認してください。',
      };
    default:
      return {
        kind: 'NETWORK_ERROR',
        message: `API リクエストに失敗しました: ${message}`,
      };
  }
}

/**
 * Confluence ページを取得する
 *
 * Confluence Cloud API を使用してページの基本情報（タイトル、本文、バージョン）を取得する。
 *
 * @param organization - 組織名（.atlassian.net のサブドメイン）
 * @param pageId - ページ ID
 * @returns 成功時は {@link ConfluencePage} を含む Ok、失敗時は {@link ConfluenceError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const result = await fetchConfluencePage('my-company', '123456');
 * if (result.isOk()) {
 *   console.log(result.value.title);
 *   console.log(result.value.body);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // エラーハンドリング
 * const result = await fetchConfluencePage('my-company', 'invalid-id');
 * if (result.isErr()) {
 *   if (result.error.kind === 'NOT_FOUND') {
 *     console.log('ページが見つかりません');
 *   }
 * }
 * ```
 */
export async function fetchConfluencePage(
  organization: string,
  pageId: string,
): Promise<Result<ConfluencePage, ConfluenceError>> {
  // 認証ヘッダーを取得
  const authHeaderResult = getAuthHeader();
  if (authHeaderResult.isErr()) {
    return err({
      kind: 'AUTH_FAILED',
      message: authHeaderResult.error.message,
    });
  }

  const authHeader = authHeaderResult.value;
  const baseUrl = getConfluenceApiBaseUrl(organization);
  const url = `${baseUrl}/content/${pageId}?expand=body.storage,version,space`;

  // API リクエストを実行
  const response = await httpRequest<unknown>(url, {
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  });

  if (response.isErr()) {
    const error = response.error;
    if (error.kind === 'HTTP_ERROR') {
      return err(mapHttpStatusToConfluenceError(error.status, error.message));
    }
    return err({
      kind: 'NETWORK_ERROR',
      message: error.message,
    });
  }

  // レスポンスをパース
  const parseResult = confluenceApiResponseSchema.safeParse(response.value.data);
  if (!parseResult.success) {
    return err({
      kind: 'PARSE_ERROR',
      message: `API レスポンスのパースに失敗しました: ${parseResult.error.message}`,
    });
  }

  const apiResponse: ConfluenceApiResponse = parseResult.data;

  // バージョン一覧を取得（本文も含める）
  const versionsResult = await fetchConfluenceVersions(organization, pageId);
  let versions: readonly ConfluenceVersion[] = [];
  if (versionsResult.isOk()) {
    // 各バージョンの本文を取得
    const versionsWithBody = await Promise.all(
      versionsResult.value.map(async (v): Promise<ConfluenceVersion> => {
        const bodyResult = await fetchConfluenceVersionContent(organization, pageId, v.number);
        if (bodyResult.isOk()) {
          return { ...v, body: bodyResult.value };
        }
        return v;
      }),
    );
    versions = versionsWithBody;
  }

  // 添付ファイル一覧を取得
  const attachmentsResult = await fetchConfluenceAttachments(organization, pageId);
  const attachments = attachmentsResult.isOk() ? attachmentsResult.value : [];

  // ConfluencePage に変換
  const page: ConfluencePage = {
    attachments,
    body: apiResponse.body.storage.value,
    currentVersion: apiResponse.version.number,
    id: apiResponse.id,
    spaceKey: apiResponse.space.key,
    title: apiResponse.title,
    versions,
  };

  return ok(page);
}

/**
 * Confluence バージョン一覧 API レスポンスのスキーマ
 *
 * Confluence Cloud REST API v1 の /content/{id}/version 形式に対応
 */
const confluenceVersionsResponseSchema = z.object({
  results: z.array(
    z.object({
      by: z.object({
        displayName: z.string(),
      }),
      message: z.string().nullable(),
      number: z.number(),
      when: z.string(),
    }),
  ),
});

type ConfluenceVersionsResponse = z.infer<typeof confluenceVersionsResponseSchema>;

/**
 * Confluence ページのバージョン一覧を取得する
 *
 * Confluence Cloud API を使用してページのバージョン履歴を取得する。
 *
 * @param organization - 組織名（.atlassian.net のサブドメイン）
 * @param pageId - ページ ID
 * @returns 成功時は {@link ConfluenceVersion} の配列を含む Ok、失敗時は {@link ConfluenceError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const result = await fetchConfluenceVersions('my-company', '123456');
 * if (result.isOk()) {
 *   for (const version of result.value) {
 *     console.log(`v${version.number}: ${version.by} - ${version.when}`);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // エラーハンドリング
 * const result = await fetchConfluenceVersions('my-company', 'invalid-id');
 * if (result.isErr()) {
 *   if (result.error.kind === 'NOT_FOUND') {
 *     console.log('ページが見つかりません');
 *   }
 * }
 * ```
 */
export async function fetchConfluenceVersions(
  organization: string,
  pageId: string,
): Promise<Result<readonly ConfluenceVersion[], ConfluenceError>> {
  // 認証ヘッダーを取得
  const authHeaderResult = getAuthHeader();
  if (authHeaderResult.isErr()) {
    return err({
      kind: 'AUTH_FAILED',
      message: authHeaderResult.error.message,
    });
  }

  const authHeader = authHeaderResult.value;
  const baseUrl = getConfluenceApiBaseUrl(organization);
  const url = `${baseUrl}/content/${pageId}/version`;

  // API リクエストを実行
  const response = await httpRequest<unknown>(url, {
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  });

  if (response.isErr()) {
    const error = response.error;
    if (error.kind === 'HTTP_ERROR') {
      return err(mapHttpStatusToConfluenceError(error.status, error.message));
    }
    return err({
      kind: 'NETWORK_ERROR',
      message: error.message,
    });
  }

  // レスポンスをパース
  const parseResult = confluenceVersionsResponseSchema.safeParse(response.value.data);
  if (!parseResult.success) {
    return err({
      kind: 'PARSE_ERROR',
      message: `API レスポンスのパースに失敗しました: ${parseResult.error.message}`,
    });
  }

  const apiResponse: ConfluenceVersionsResponse = parseResult.data;

  // ConfluenceVersion の配列に変換
  const versions: readonly ConfluenceVersion[] = apiResponse.results.map((v) => ({
    by: v.by.displayName,
    message: v.message,
    number: v.number,
    when: v.when,
  }));

  return ok(versions);
}

/**
 * Confluence ページの特定バージョンの本文を取得する
 *
 * Confluence Cloud API を使用して特定バージョンのページ本文を取得する。
 *
 * @param organization - 組織名（.atlassian.net のサブドメイン）
 * @param pageId - ページ ID
 * @param versionNumber - バージョン番号
 * @returns 成功時は本文（HTML 形式）を含む Ok、失敗時は {@link ConfluenceError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const result = await fetchConfluenceVersionContent('my-company', '123456', 2);
 * if (result.isOk()) {
 *   console.log(result.value); // バージョン 2 の本文
 * }
 * ```
 */
export async function fetchConfluenceVersionContent(
  organization: string,
  pageId: string,
  versionNumber: number,
): Promise<Result<string, ConfluenceError>> {
  // 認証ヘッダーを取得
  const authHeaderResult = getAuthHeader();
  if (authHeaderResult.isErr()) {
    return err({
      kind: 'AUTH_FAILED',
      message: authHeaderResult.error.message,
    });
  }

  const authHeader = authHeaderResult.value;
  const baseUrl = getConfluenceApiBaseUrl(organization);
  const url = `${baseUrl}/content/${pageId}?status=historical&version=${versionNumber}&expand=body.storage`;

  // API リクエストを実行
  const response = await httpRequest<unknown>(url, {
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  });

  if (response.isErr()) {
    const error = response.error;
    if (error.kind === 'HTTP_ERROR') {
      return err(mapHttpStatusToConfluenceError(error.status, error.message));
    }
    return err({
      kind: 'NETWORK_ERROR',
      message: error.message,
    });
  }

  // レスポンスをパース（本文のみ取得するため簡易スキーマを使用）
  const versionContentSchema = z.object({
    body: z.object({
      storage: z.object({
        value: z.string(),
      }),
    }),
  });
  const parseResult = versionContentSchema.safeParse(response.value.data);
  if (!parseResult.success) {
    return err({
      kind: 'PARSE_ERROR',
      message: `API レスポンスのパースに失敗しました: ${parseResult.error.message}`,
    });
  }

  return ok(parseResult.data.body.storage.value);
}

/**
 * Confluence 添付ファイル一覧 API レスポンスのスキーマ
 *
 * Confluence Cloud REST API v1 の /content/{id}/child/attachment 形式に対応
 */
const confluenceAttachmentsResponseSchema = z.object({
  results: z.array(
    z.object({
      _links: z.object({
        download: z.string(),
      }),
      extensions: z.object({
        fileSize: z.number(),
        mediaType: z.string(),
      }),
      id: z.string(),
      title: z.string(),
    }),
  ),
});

type ConfluenceAttachmentsResponse = z.infer<typeof confluenceAttachmentsResponseSchema>;

/**
 * Confluence ページの添付ファイル一覧を取得する
 *
 * Confluence Cloud API を使用してページの添付ファイル一覧を取得する。
 *
 * @param organization - 組織名（.atlassian.net のサブドメイン）
 * @param pageId - ページ ID
 * @returns 成功時は {@link ConfluenceAttachment} の配列を含む Ok、失敗時は {@link ConfluenceError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const result = await fetchConfluenceAttachments('my-company', '123456');
 * if (result.isOk()) {
 *   for (const attachment of result.value) {
 *     console.log(`${attachment.title}: ${attachment.fileSize} bytes`);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // エラーハンドリング
 * const result = await fetchConfluenceAttachments('my-company', 'invalid-id');
 * if (result.isErr()) {
 *   if (result.error.kind === 'NOT_FOUND') {
 *     console.log('ページが見つかりません');
 *   }
 * }
 * ```
 */
export async function fetchConfluenceAttachments(
  organization: string,
  pageId: string,
): Promise<Result<readonly ConfluenceAttachment[], ConfluenceError>> {
  // 認証ヘッダーを取得
  const authHeaderResult = getAuthHeader();
  if (authHeaderResult.isErr()) {
    return err({
      kind: 'AUTH_FAILED',
      message: authHeaderResult.error.message,
    });
  }

  const authHeader = authHeaderResult.value;
  const baseUrl = getConfluenceApiBaseUrl(organization);
  const url = `${baseUrl}/content/${pageId}/child/attachment`;

  // API リクエストを実行
  const response = await httpRequest<unknown>(url, {
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  });

  if (response.isErr()) {
    const error = response.error;
    if (error.kind === 'HTTP_ERROR') {
      return err(mapHttpStatusToConfluenceError(error.status, error.message));
    }
    return err({
      kind: 'NETWORK_ERROR',
      message: error.message,
    });
  }

  // レスポンスをパース
  const parseResult = confluenceAttachmentsResponseSchema.safeParse(response.value.data);
  if (!parseResult.success) {
    return err({
      kind: 'PARSE_ERROR',
      message: `API レスポンスのパースに失敗しました: ${parseResult.error.message}`,
    });
  }

  const apiResponse: ConfluenceAttachmentsResponse = parseResult.data;

  // ConfluenceAttachment の配列に変換
  // download URL は相対パスで返されるため、絶対 URL に変換する
  // /wiki プレフィックスが必要（API から返されるパスは /wiki なしの相対パス）
  const attachments: readonly ConfluenceAttachment[] = apiResponse.results.map((att) => ({
    downloadUrl: `https://${organization}.atlassian.net/wiki${att._links.download}`,
    fileSize: att.extensions.fileSize,
    id: att.id,
    mediaType: att.extensions.mediaType,
    title: att.title,
  }));

  return ok(attachments);
}

/**
 * HTTP エラーステータスをダウンロード用の ConfluenceError に変換する
 *
 * @param status - HTTP ステータスコード
 * @returns ConfluenceError
 */
function mapHttpStatusToDownloadError(status: number): ConfluenceError {
  switch (status) {
    case 401:
      return {
        kind: 'AUTH_FAILED',
        message: '認証に失敗しました。API トークンとメールアドレスを確認してください。',
      };
    case 403:
      return {
        kind: 'FORBIDDEN',
        message: 'この添付ファイルへのアクセス権限がありません。権限を確認してください。',
      };
    case 404:
      return {
        kind: 'NOT_FOUND',
        message: '指定された添付ファイルが見つかりません。',
      };
    default:
      return {
        kind: 'NETWORK_ERROR',
        message: `添付ファイルのダウンロードに失敗しました（HTTP ${status}）`,
      };
  }
}

/**
 * Confluence 添付ファイルをダウンロードする
 *
 * Confluence Cloud API を使用して添付ファイルを指定パスにダウンロードする。
 *
 * @param attachment - ダウンロード対象の添付ファイル情報
 * @param destPath - 保存先ファイルパス
 * @param onProgress - 進捗コールバック関数（オプション）
 * @returns 成功時は void を含む Ok、失敗時は {@link ConfluenceError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const attachment = page.attachments[0];
 * const result = await downloadConfluenceAttachment(attachment, '/path/to/save/file.png');
 * if (result.isOk()) {
 *   console.log('ダウンロード完了');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 進捗表示付き
 * const result = await downloadConfluenceAttachment(
 *   attachment,
 *   '/path/to/save/file.png',
 *   (transferred, total) => {
 *     if (total) {
 *       console.log(`Progress: ${(transferred / total * 100).toFixed(1)}%`);
 *     }
 *   }
 * );
 * ```
 */
export async function downloadConfluenceAttachment(
  attachment: ConfluenceAttachment,
  destPath: string,
  onProgress?: (transferred: number, total: number | undefined) => void,
): Promise<Result<void, ConfluenceError>> {
  // 認証ヘッダーを取得
  const authHeaderResult = getAuthHeader();
  if (authHeaderResult.isErr()) {
    return err({
      kind: 'AUTH_FAILED',
      message: authHeaderResult.error.message,
    });
  }

  const authHeader = authHeaderResult.value;

  // ファイルをダウンロード
  const downloadResult = await httpDownload(
    attachment.downloadUrl,
    destPath,
    {
      Accept: '*/*',
      Authorization: authHeader,
    },
    onProgress,
  );

  if (downloadResult.isErr()) {
    const error = downloadResult.error;
    if (error.kind === 'HTTP_ERROR') {
      return err(mapHttpStatusToDownloadError(error.status));
    }
    return err({
      kind: 'NETWORK_ERROR',
      message: error.message,
    });
  }

  return ok(undefined);
}
