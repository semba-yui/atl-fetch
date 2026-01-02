import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';
import { httpDownload, httpRequest } from '../../ports/http/http-port.js';
import type { JiraAttachment, JiraChangelogEntry, JiraComment, JiraError, JiraIssue } from '../../types/jira.js';
import { getAuthHeader } from '../auth/auth-service.js';

/**
 * Jira Cloud API のベース URL を構築する
 *
 * @param organization - 組織名（.atlassian.net のサブドメイン）
 * @returns Jira Cloud API のベース URL
 */
function getJiraApiBaseUrl(organization: string): string {
  return `https://${organization}.atlassian.net/rest/api/3`;
}

/**
 * ADF (Atlassian Document Format) からプレーンテキストを抽出する
 *
 * Jira Cloud API v3 は説明やコメントを ADF 形式で返す。
 * この関数は ADF ドキュメントからテキストコンテンツを抽出する。
 *
 * @param adf - ADF ドキュメント
 * @returns プレーンテキスト
 *
 * @internal テスト用に export
 */
export function extractTextFromAdf(adf: unknown): string {
  if (!adf || typeof adf !== 'object') {
    return '';
  }

  const doc = adf as { type?: string; content?: unknown[]; text?: string };

  if (doc.type === 'text' && typeof doc.text === 'string') {
    return doc.text;
  }

  if (Array.isArray(doc.content)) {
    return doc.content.map((child) => extractTextFromAdf(child)).join('');
  }

  return '';
}

/**
 * Jira API レスポンスのコメントスキーマ
 */
const jiraApiCommentSchema = z.object({
  author: z.object({
    displayName: z.string(),
  }),
  body: z.unknown(),
  created: z.string(),
  id: z.string(),
  updated: z.string(),
});

/**
 * Jira API レスポンスの添付ファイルスキーマ
 */
const jiraApiAttachmentSchema = z.object({
  content: z.string(),
  filename: z.string(),
  id: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

/**
 * Jira API レスポンスの変更履歴アイテムスキーマ
 */
const jiraApiChangelogItemSchema = z.object({
  field: z.string(),
  fromString: z.string().nullable(),
  toString: z.string().nullable(),
});

/**
 * Jira API レスポンスの変更履歴エントリスキーマ
 */
const jiraApiChangelogEntrySchema = z.object({
  author: z.object({
    displayName: z.string(),
  }),
  created: z.string(),
  id: z.string(),
  items: z.array(jiraApiChangelogItemSchema),
});

/**
 * Jira API レスポンスのスキーマ
 */
const jiraApiResponseSchema = z.object({
  changelog: z
    .object({
      histories: z.array(jiraApiChangelogEntrySchema),
    })
    .optional(),
  fields: z.object({
    attachment: z.array(jiraApiAttachmentSchema).optional(),
    comment: z
      .object({
        comments: z.array(jiraApiCommentSchema),
        total: z.number(),
      })
      .optional(),
    description: z.unknown().nullable(),
    summary: z.string(),
  }),
  key: z.string(),
});

type JiraApiResponse = z.infer<typeof jiraApiResponseSchema>;

/**
 * API レスポンスを JiraComment に変換する
 *
 * @param apiComment - API レスポンスのコメント
 * @returns JiraComment
 */
function mapApiCommentToJiraComment(apiComment: z.infer<typeof jiraApiCommentSchema>): JiraComment {
  return {
    author: apiComment.author.displayName,
    body: extractTextFromAdf(apiComment.body),
    created: apiComment.created,
    id: apiComment.id,
    updated: apiComment.updated,
  };
}

/**
 * API レスポンスを JiraAttachment に変換する
 *
 * @param apiAttachment - API レスポンスの添付ファイル
 * @returns JiraAttachment
 */
function mapApiAttachmentToJiraAttachment(apiAttachment: z.infer<typeof jiraApiAttachmentSchema>): JiraAttachment {
  return {
    contentUrl: apiAttachment.content,
    filename: apiAttachment.filename,
    id: apiAttachment.id,
    mimeType: apiAttachment.mimeType,
    size: apiAttachment.size,
  };
}

/**
 * API レスポンスを JiraChangelogEntry に変換する
 *
 * @param apiEntry - API レスポンスの変更履歴エントリ
 * @returns JiraChangelogEntry
 */
function mapApiChangelogEntryToJiraChangelogEntry(
  apiEntry: z.infer<typeof jiraApiChangelogEntrySchema>,
): JiraChangelogEntry {
  return {
    author: apiEntry.author.displayName,
    created: apiEntry.created,
    id: apiEntry.id,
    items: apiEntry.items.map((item) => ({
      field: item.field,
      fromString: item.fromString,
      toString: item.toString,
    })),
  };
}

/**
 * HTTP エラーを JiraError に変換する
 *
 * @param status - HTTP ステータスコード
 * @param message - エラーメッセージ
 * @returns JiraError
 *
 * @internal テスト用に export
 */
export function mapHttpStatusToJiraError(status: number, message: string): JiraError {
  switch (status) {
    case 401:
      return {
        kind: 'AUTH_FAILED',
        message: '認証に失敗しました。API トークンとメールアドレスを確認してください。',
      };
    case 403:
      return {
        kind: 'FORBIDDEN',
        message: 'この Issue へのアクセス権限がありません。権限を確認してください。',
      };
    case 404:
      return {
        kind: 'NOT_FOUND',
        message: '指定された Issue が見つかりません。Issue キーを確認してください。',
      };
    default:
      return {
        kind: 'NETWORK_ERROR',
        message: `API リクエストに失敗しました: ${message}`,
      };
  }
}

/**
 * Jira Issue を取得する
 *
 * Jira Cloud API を使用して Issue の基本情報（タイトル、説明、コメント、
 * 変更履歴、添付ファイル）を取得する。
 *
 * @param organization - 組織名（.atlassian.net のサブドメイン）
 * @param issueKey - Issue キー（例: PROJECT-123）
 * @returns 成功時は {@link JiraIssue} を含む Ok、失敗時は {@link JiraError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const result = await fetchJiraIssue('my-company', 'PROJECT-123');
 * if (result.isOk()) {
 *   console.log(result.value.summary);
 *   console.log(result.value.description);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // エラーハンドリング
 * const result = await fetchJiraIssue('my-company', 'NOTEXIST-999');
 * if (result.isErr()) {
 *   if (result.error.kind === 'NOT_FOUND') {
 *     console.log('Issue が見つかりません');
 *   }
 * }
 * ```
 */
export async function fetchJiraIssue(organization: string, issueKey: string): Promise<Result<JiraIssue, JiraError>> {
  // 認証ヘッダーを取得
  const authHeaderResult = getAuthHeader();
  if (authHeaderResult.isErr()) {
    return err({
      kind: 'AUTH_FAILED',
      message: authHeaderResult.error.message,
    });
  }

  const authHeader = authHeaderResult.value;
  const baseUrl = getJiraApiBaseUrl(organization);
  const url = `${baseUrl}/issue/${issueKey}?expand=changelog`;

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
      return err(mapHttpStatusToJiraError(error.status, error.message));
    }
    return err({
      kind: 'NETWORK_ERROR',
      message: error.message,
    });
  }

  // レスポンスをパース
  const parseResult = jiraApiResponseSchema.safeParse(response.value.data);
  if (!parseResult.success) {
    return err({
      kind: 'PARSE_ERROR',
      message: `API レスポンスのパースに失敗しました: ${parseResult.error.message}`,
    });
  }

  const apiResponse: JiraApiResponse = parseResult.data;

  // JiraIssue に変換
  const issue: JiraIssue = {
    attachments: (apiResponse.fields.attachment ?? []).map(mapApiAttachmentToJiraAttachment),
    changelog: (apiResponse.changelog?.histories ?? []).map(mapApiChangelogEntryToJiraChangelogEntry),
    comments: (apiResponse.fields.comment?.comments ?? []).map(mapApiCommentToJiraComment),
    description: apiResponse.fields.description ? extractTextFromAdf(apiResponse.fields.description) : null,
    key: apiResponse.key,
    summary: apiResponse.fields.summary,
  };

  return ok(issue);
}

/**
 * HTTP エラーステータスをダウンロード用の JiraError に変換する
 *
 * @param status - HTTP ステータスコード
 * @returns JiraError
 *
 * @internal テスト用に export
 */
export function mapHttpStatusToDownloadError(status: number): JiraError {
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
 * Jira 添付ファイルをダウンロードする
 *
 * Jira Cloud API を使用して添付ファイルを指定パスにダウンロードする。
 *
 * @param attachment - ダウンロード対象の添付ファイル情報
 * @param destPath - 保存先ファイルパス
 * @param onProgress - 進捗コールバック関数（オプション）
 * @returns 成功時は void を含む Ok、失敗時は {@link JiraError} を含む Err
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const attachment = issue.attachments[0];
 * const result = await downloadJiraAttachment(attachment, '/path/to/save/file.png');
 * if (result.isOk()) {
 *   console.log('ダウンロード完了');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 進捗表示付き
 * const result = await downloadJiraAttachment(
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
export async function downloadJiraAttachment(
  attachment: JiraAttachment,
  destPath: string,
  onProgress?: (transferred: number, total: number | undefined) => void,
): Promise<Result<void, JiraError>> {
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
    attachment.contentUrl,
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
