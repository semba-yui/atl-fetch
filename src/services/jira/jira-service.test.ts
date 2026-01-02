import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { exists } from '../../ports/file/file-port.js';
import {
  downloadJiraAttachment,
  extractTextFromAdf,
  fetchJiraIssue,
  mapHttpStatusToDownloadError,
  mapHttpStatusToJiraError,
} from './jira-service.js';

/**
 * Jira Service のテスト
 *
 * Jira Issue の基本情報取得機能のテスト。
 * MSW を使用して Jira Cloud API のモックを行う。
 */

// テスト用の環境変数を設定
const MOCK_EMAIL = 'test@example.com';
const MOCK_TOKEN = 'test-api-token';

// Jira Cloud API のモックサーバー
const server = setupServer();

describe('fetchJiraIssue', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  beforeEach(() => {
    // テスト用の環境変数を設定
    process.env.ATLASSIAN_EMAIL = MOCK_EMAIL;
    process.env.ATLASSIAN_API_TOKEN = MOCK_TOKEN;
  });

  afterEach(() => {
    // 環境変数をクリア
    delete process.env.ATLASSIAN_EMAIL;
    delete process.env.ATLASSIAN_API_TOKEN;
  });

  describe('Given: 有効な Jira Issue URL と認証情報が設定されている', () => {
    describe('When: Issue のタイトルと説明を取得する', () => {
      it('Then: Issue のキー、タイトル、説明が正しく返される', async () => {
        // Given: モックレスポンスを設定
        const mockIssueResponse = {
          changelog: {
            histories: [],
          },
          fields: {
            attachment: [],
            comment: {
              comments: [],
              total: 0,
            },
            description: {
              content: [
                {
                  content: [{ text: 'これはテスト Issue の説明です。', type: 'text' }],
                  type: 'paragraph',
                },
              ],
              type: 'doc',
              version: 1,
            },
            summary: 'テスト Issue のタイトル',
          },
          key: 'TEST-123',
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-123', ({ request }) => {
            // 認証ヘッダーの検証
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
            return HttpResponse.json(mockIssueResponse);
          }),
        );

        // When: Jira Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-123');

        // Then: 結果を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.key).toBe('TEST-123');
          expect(result.value.summary).toBe('テスト Issue のタイトル');
          expect(result.value.description).toBe('これはテスト Issue の説明です。');
        }
      });
    });

    describe('When: Issue のコメント一覧を取得する', () => {
      it('Then: コメントの ID、作成者、本文、日時が正しく返される', async () => {
        // Given: コメント付きのモックレスポンスを設定
        const mockIssueResponse = {
          changelog: {
            histories: [],
          },
          fields: {
            attachment: [],
            comment: {
              comments: [
                {
                  author: { displayName: 'ユーザー A' },
                  body: {
                    content: [
                      {
                        content: [{ text: '最初のコメントです。', type: 'text' }],
                        type: 'paragraph',
                      },
                    ],
                    type: 'doc',
                    version: 1,
                  },
                  created: '2024-01-15T10:00:00.000+0900',
                  id: 'comment-1',
                  updated: '2024-01-15T10:00:00.000+0900',
                },
                {
                  author: { displayName: 'ユーザー B' },
                  body: {
                    content: [
                      {
                        content: [{ text: '2番目のコメントです。', type: 'text' }],
                        type: 'paragraph',
                      },
                    ],
                    type: 'doc',
                    version: 1,
                  },
                  created: '2024-01-16T14:30:00.000+0900',
                  id: 'comment-2',
                  updated: '2024-01-16T15:00:00.000+0900',
                },
              ],
              total: 2,
            },
            description: null,
            summary: 'コメント付き Issue',
          },
          key: 'TEST-456',
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-456', () => {
            return HttpResponse.json(mockIssueResponse);
          }),
        );

        // When: Jira Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-456');

        // Then: コメントを検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.comments).toHaveLength(2);

          const firstComment = result.value.comments[0];
          expect(firstComment?.id).toBe('comment-1');
          expect(firstComment?.author).toBe('ユーザー A');
          expect(firstComment?.body).toBe('最初のコメントです。');
          expect(firstComment?.created).toBe('2024-01-15T10:00:00.000+0900');
          expect(firstComment?.updated).toBe('2024-01-15T10:00:00.000+0900');

          const secondComment = result.value.comments[1];
          expect(secondComment?.id).toBe('comment-2');
          expect(secondComment?.author).toBe('ユーザー B');
          expect(secondComment?.body).toBe('2番目のコメントです。');
        }
      });
    });
  });

  describe('Given: 存在しない Issue キーが指定されている', () => {
    describe('When: Issue を取得しようとする', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/NOTEXIST-999', () => {
            return HttpResponse.json({ errorMessages: ['Issue Does Not Exist'], errors: {} }, { status: 404 });
          }),
        );

        // When: 存在しない Issue を取得
        const result = await fetchJiraIssue('test-org', 'NOTEXIST-999');

        // Then: NOT_FOUND エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
          expect(result.error.message).toContain('Issue');
        }
      });
    });
  });

  describe('Given: Issue へのアクセス権がない', () => {
    describe('When: Issue を取得しようとする', () => {
      it('Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/SECRET-001', () => {
            return HttpResponse.json(
              { errorMessages: ["You don't have permission to view this issue"], errors: {} },
              { status: 403 },
            );
          }),
        );

        // When: アクセス権のない Issue を取得
        const result = await fetchJiraIssue('test-org', 'SECRET-001');

        // Then: FORBIDDEN エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
          expect(result.error.message).toContain('権限');
        }
      });
    });
  });

  describe('Given: 認証情報が無効', () => {
    describe('When: Issue を取得しようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 401 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-123', () => {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
          }),
        );

        // When: 無効な認証情報で Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-123');

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
          expect(result.error.message).toContain('認証');
        }
      });
    });
  });

  describe('Given: API レスポンスの形式が不正', () => {
    describe('When: 不正な形式の JSON が返される', () => {
      it('Then: PARSE_ERROR エラーが返される', async () => {
        // Given: スキーマに合わない不正なレスポンスを設定
        // このテストは API レスポンスのパースエラーハンドリングを検証する
        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-INVALID', () => {
            // fields.summary が欠けている不正なレスポンス
            return HttpResponse.json({
              fields: {
                description: null,
                // summary が欠けている
              },
              key: 'TEST-INVALID',
            });
          }),
        );

        // When: Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-INVALID');

        // Then: PARSE_ERROR エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('PARSE_ERROR');
          expect(result.error.message).toContain('パース');
        }
      });
    });
  });

  describe('Given: サーバーエラーが発生する', () => {
    describe('When: 500 Internal Server Error が返される', () => {
      it('Then: NETWORK_ERROR エラーが返される', async () => {
        // Given: 500 レスポンスを設定
        // このテストはサーバーエラー時の適切なエラーハンドリングを検証する
        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-SERVER-ERROR', () => {
            return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
          }),
        );

        // When: Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-SERVER-ERROR');

        // Then: NETWORK_ERROR エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NETWORK_ERROR');
        }
      });
    });
  });

  describe('Given: 説明が null の Issue', () => {
    describe('When: Issue を取得する', () => {
      it('Then: description は null として返される', async () => {
        // Given: description が null のモックレスポンス
        const mockIssueResponse = {
          changelog: { histories: [] },
          fields: {
            attachment: [],
            comment: { comments: [], total: 0 },
            description: null,
            summary: '説明なし Issue',
          },
          key: 'TEST-789',
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-789', () => {
            return HttpResponse.json(mockIssueResponse);
          }),
        );

        // When: Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-789');

        // Then: description が null であることを検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.description).toBeNull();
        }
      });
    });
  });

  describe('Given: 添付ファイル付きの Issue', () => {
    describe('When: Issue を取得する', () => {
      it('Then: 添付ファイル一覧が正しく返される', async () => {
        // Given: 添付ファイル付きのモックレスポンス
        const mockIssueResponse = {
          changelog: { histories: [] },
          fields: {
            attachment: [
              {
                content: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-1',
                filename: 'screenshot.png',
                id: 'attach-1',
                mimeType: 'image/png',
                size: 12345,
              },
              {
                content: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-2',
                filename: 'document.pdf',
                id: 'attach-2',
                mimeType: 'application/pdf',
                size: 67890,
              },
            ],
            comment: { comments: [], total: 0 },
            description: null,
            summary: '添付ファイル付き Issue',
          },
          key: 'TEST-ATTACH',
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-ATTACH', () => {
            return HttpResponse.json(mockIssueResponse);
          }),
        );

        // When: Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-ATTACH');

        // Then: 添付ファイルを検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.attachments).toHaveLength(2);

          const firstAttachment = result.value.attachments[0];
          expect(firstAttachment?.id).toBe('attach-1');
          expect(firstAttachment?.filename).toBe('screenshot.png');
          expect(firstAttachment?.mimeType).toBe('image/png');
          expect(firstAttachment?.size).toBe(12345);

          const secondAttachment = result.value.attachments[1];
          expect(secondAttachment?.id).toBe('attach-2');
          expect(secondAttachment?.filename).toBe('document.pdf');
        }
      });
    });
  });

  describe('Given: 変更履歴付きの Issue', () => {
    describe('When: Issue の変更履歴を取得する', () => {
      it('Then: 変更履歴の ID、作成者、日時、変更アイテムが正しく返される', async () => {
        // Given: 変更履歴付きのモックレスポンス
        // このテストは Issue の changelog（変更履歴）を取得する機能をテストする
        const mockIssueResponse = {
          changelog: {
            histories: [
              {
                author: { displayName: '管理者ユーザー' },
                created: '2024-01-10T09:00:00.000+0900',
                id: 'history-1',
                items: [
                  {
                    field: 'status',
                    fromString: 'Open',
                    toString: 'In Progress',
                  },
                ],
              },
              {
                author: { displayName: '開発者ユーザー' },
                created: '2024-01-12T14:30:00.000+0900',
                id: 'history-2',
                items: [
                  {
                    field: 'assignee',
                    fromString: null,
                    toString: '開発者ユーザー',
                  },
                  {
                    field: 'priority',
                    fromString: 'Medium',
                    toString: 'High',
                  },
                ],
              },
            ],
          },
          fields: {
            attachment: [],
            comment: { comments: [], total: 0 },
            description: null,
            summary: '変更履歴付き Issue',
          },
          key: 'TEST-CHANGELOG',
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-CHANGELOG', ({ request }) => {
            // expand=changelog パラメータが指定されていることを確認
            const url = new URL(request.url);
            expect(url.searchParams.get('expand')).toBe('changelog');
            return HttpResponse.json(mockIssueResponse);
          }),
        );

        // When: Jira Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-CHANGELOG');

        // Then: 変更履歴を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.changelog).toHaveLength(2);

          // 最初の変更履歴エントリを検証
          const firstHistory = result.value.changelog[0];
          expect(firstHistory?.id).toBe('history-1');
          expect(firstHistory?.author).toBe('管理者ユーザー');
          expect(firstHistory?.created).toBe('2024-01-10T09:00:00.000+0900');
          expect(firstHistory?.items).toHaveLength(1);
          expect(firstHistory?.items[0]?.field).toBe('status');
          expect(firstHistory?.items[0]?.fromString).toBe('Open');
          expect(firstHistory?.items[0]?.toString).toBe('In Progress');

          // 2番目の変更履歴エントリを検証（複数の変更アイテム）
          const secondHistory = result.value.changelog[1];
          expect(secondHistory?.id).toBe('history-2');
          expect(secondHistory?.author).toBe('開発者ユーザー');
          expect(secondHistory?.created).toBe('2024-01-12T14:30:00.000+0900');
          expect(secondHistory?.items).toHaveLength(2);

          // assignee の変更（fromString が null = 新規割り当て）
          expect(secondHistory?.items[0]?.field).toBe('assignee');
          expect(secondHistory?.items[0]?.fromString).toBeNull();
          expect(secondHistory?.items[0]?.toString).toBe('開発者ユーザー');

          // priority の変更
          expect(secondHistory?.items[1]?.field).toBe('priority');
          expect(secondHistory?.items[1]?.fromString).toBe('Medium');
          expect(secondHistory?.items[1]?.toString).toBe('High');
        }
      });
    });

    describe('When: 変更履歴が空の Issue を取得する', () => {
      it('Then: 空の変更履歴配列が返される', async () => {
        // Given: 変更履歴が空のモックレスポンス
        const mockIssueResponse = {
          changelog: {
            histories: [],
          },
          fields: {
            attachment: [],
            comment: { comments: [], total: 0 },
            description: null,
            summary: '変更履歴なし Issue',
          },
          key: 'TEST-EMPTY-CHANGELOG',
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-EMPTY-CHANGELOG', () => {
            return HttpResponse.json(mockIssueResponse);
          }),
        );

        // When: Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-EMPTY-CHANGELOG');

        // Then: 空の変更履歴を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.changelog).toHaveLength(0);
        }
      });
    });

    describe('When: 値が削除された変更を取得する', () => {
      it('Then: toString が null として返される', async () => {
        // Given: 値が削除された変更履歴のモックレスポンス
        const mockIssueResponse = {
          changelog: {
            histories: [
              {
                author: { displayName: 'ユーザー' },
                created: '2024-01-15T10:00:00.000+0900',
                id: 'history-delete',
                items: [
                  {
                    field: 'labels',
                    fromString: 'bug, urgent',
                    toString: null,
                  },
                ],
              },
            ],
          },
          fields: {
            attachment: [],
            comment: { comments: [], total: 0 },
            description: null,
            summary: '値削除 Issue',
          },
          key: 'TEST-DELETE',
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/issue/TEST-DELETE', () => {
            return HttpResponse.json(mockIssueResponse);
          }),
        );

        // When: Issue を取得
        const result = await fetchJiraIssue('test-org', 'TEST-DELETE');

        // Then: 削除された値を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const item = result.value.changelog[0]?.items[0];
          expect(item?.field).toBe('labels');
          expect(item?.fromString).toBe('bug, urgent');
          expect(item?.toString).toBeNull();
        }
      });
    });
  });
});

/**
 * downloadJiraAttachment のテスト
 *
 * Jira 添付ファイルのダウンロード機能のテスト。
 * 添付ファイルを指定ディレクトリにダウンロードする。
 */
describe('downloadJiraAttachment', () => {
  // テスト用の環境変数を設定
  const MOCK_EMAIL = 'test@example.com';
  const MOCK_TOKEN = 'test-api-token';
  const TEST_TEMP_DIR = join(process.cwd(), 'tmp', 'jira-test');

  // Jira Cloud API のモックサーバー
  const server = setupServer();

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  beforeEach(() => {
    // テスト用の環境変数を設定
    process.env.ATLASSIAN_EMAIL = MOCK_EMAIL;
    process.env.ATLASSIAN_API_TOKEN = MOCK_TOKEN;
  });

  afterEach(async () => {
    // 環境変数をクリア
    delete process.env.ATLASSIAN_EMAIL;
    delete process.env.ATLASSIAN_API_TOKEN;

    // テスト用ディレクトリをクリーンアップ
    try {
      await rm(TEST_TEMP_DIR, { force: true, recursive: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  });

  describe('Given: 有効な添付ファイル情報と認証情報が設定されている', () => {
    describe('When: 添付ファイルをダウンロードする', () => {
      it('Then: 添付ファイルが指定ディレクトリに保存される', async () => {
        // Given: 添付ファイル情報とモックレスポンスを設定
        const attachment = {
          contentUrl: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-1',
          filename: 'screenshot.png',
          id: 'attach-1',
          mimeType: 'image/png',
          size: 1024,
        };

        const mockFileContent = Buffer.from('PNG file content mock');

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/attachment/content/attach-1', ({ request }) => {
            // 認証ヘッダーの検証
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
            return new HttpResponse(mockFileContent, {
              headers: { 'Content-Type': 'image/png' },
            });
          }),
        );

        const destPath = join(TEST_TEMP_DIR, 'attachments', attachment.filename);

        // When: 添付ファイルをダウンロード
        const result = await downloadJiraAttachment(attachment, destPath);

        // Then: 結果を検証
        expect(result.isOk()).toBe(true);
        expect(await exists(destPath)).toBe(true);
      });
    });

    describe('When: 認証情報が無効な状態でダウンロードする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 401 レスポンスを返すモック
        const attachment = {
          contentUrl: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-auth-fail',
          filename: 'secret.pdf',
          id: 'attach-auth-fail',
          mimeType: 'application/pdf',
          size: 2048,
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/attachment/content/attach-auth-fail', () => {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
          }),
        );

        const destPath = join(TEST_TEMP_DIR, 'attachments', attachment.filename);

        // When: 添付ファイルをダウンロード
        const result = await downloadJiraAttachment(attachment, destPath);

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });

    describe('When: 添付ファイルへのアクセス権がない', () => {
      it('Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを返すモック
        const attachment = {
          contentUrl: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-forbidden',
          filename: 'restricted.docx',
          id: 'attach-forbidden',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 4096,
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/attachment/content/attach-forbidden', () => {
            return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
          }),
        );

        const destPath = join(TEST_TEMP_DIR, 'attachments', attachment.filename);

        // When: 添付ファイルをダウンロード
        const result = await downloadJiraAttachment(attachment, destPath);

        // Then: FORBIDDEN エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
        }
      });
    });

    describe('When: 添付ファイルが存在しない', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを返すモック
        const attachment = {
          contentUrl: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-not-found',
          filename: 'missing.txt',
          id: 'attach-not-found',
          mimeType: 'text/plain',
          size: 100,
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/attachment/content/attach-not-found', () => {
            return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
          }),
        );

        const destPath = join(TEST_TEMP_DIR, 'attachments', attachment.filename);

        // When: 添付ファイルをダウンロード
        const result = await downloadJiraAttachment(attachment, destPath);

        // Then: NOT_FOUND エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
        }
      });
    });
  });

  describe('Given: 認証情報が未設定の状態', () => {
    beforeEach(() => {
      // 環境変数を未設定にする
      delete process.env.ATLASSIAN_EMAIL;
      delete process.env.ATLASSIAN_API_TOKEN;
    });

    describe('When: 添付ファイルをダウンロードしようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 添付ファイル情報
        const attachment = {
          contentUrl: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-no-auth',
          filename: 'noauth.txt',
          id: 'attach-no-auth',
          mimeType: 'text/plain',
          size: 50,
        };

        const destPath = join(TEST_TEMP_DIR, 'attachments', attachment.filename);

        // When: 添付ファイルをダウンロード
        const result = await downloadJiraAttachment(attachment, destPath);

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });
  });

  describe('Given: サーバーがその他の HTTP エラーを返す', () => {
    describe('When: 500 エラーで添付ファイルをダウンロードする', () => {
      it('Then: NETWORK_ERROR エラーが返される', async () => {
        // Given: 500 レスポンスを返すモック
        // このテストはサーバーエラー時の適切なエラーハンドリングを検証する
        const attachment = {
          contentUrl: 'https://test-org.atlassian.net/rest/api/3/attachment/content/attach-server-error',
          filename: 'server-error.pdf',
          id: 'attach-server-error',
          mimeType: 'application/pdf',
          size: 1024,
        };

        server.use(
          http.get('https://test-org.atlassian.net/rest/api/3/attachment/content/attach-server-error', () => {
            return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
          }),
        );

        const destPath = join(TEST_TEMP_DIR, 'attachments', attachment.filename);

        // When: 添付ファイルをダウンロード
        const result = await downloadJiraAttachment(attachment, destPath);

        // Then: NETWORK_ERROR エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NETWORK_ERROR');
          expect(result.error.message).toContain('500');
        }
      });
    });
  });
});

/**
 * extractTextFromAdf のユニットテスト
 *
 * ADF (Atlassian Document Format) からプレーンテキストを抽出する機能のテスト
 * 多様な ADF 構造とエッジケースへの対応を検証
 */
describe('extractTextFromAdf', () => {
  describe('無効な入力値', () => {
    // ADF が null/undefined の場合のテスト
    it('null に対して空文字列を返す', () => {
      // Given: null
      const adf = null;

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    it('undefined に対して空文字列を返す', () => {
      // Given: undefined
      const adf = undefined;

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // プリミティブ型の場合のテスト
    it('文字列に対して空文字列を返す', () => {
      // Given: 文字列
      const adf = 'plain text';

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    it('数値に対して空文字列を返す', () => {
      // Given: 数値
      const adf = 123;

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    it('空のオブジェクトに対して空文字列を返す', () => {
      // Given: 空のオブジェクト
      const adf = {};

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });
  });

  describe('有効な ADF 構造', () => {
    // text ノードのテスト
    it('text ノードからテキストを抽出する', () => {
      // Given: text タイプのノード
      const adf = { text: 'Hello World', type: 'text' };

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: テキストが抽出される
      expect(result).toBe('Hello World');
    });

    // ネストされた content のテスト
    it('ネストされた content からテキストを結合して抽出する', () => {
      // Given: ネストされた ADF 構造
      const adf = {
        content: [
          { text: 'First ', type: 'text' },
          { text: 'Second ', type: 'text' },
          { text: 'Third', type: 'text' },
        ],
        type: 'paragraph',
      };

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 全てのテキストが結合される
      expect(result).toBe('First Second Third');
    });

    // 深くネストされた構造のテスト
    it('深くネストされた ADF 構造からテキストを抽出する', () => {
      // Given: 複数段階のネスト
      const adf = {
        content: [
          {
            content: [{ text: 'Nested text', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      };

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: ネストされたテキストが抽出される
      expect(result).toBe('Nested text');
    });

    // type が text だが text プロパティがない場合
    it('type が text だが text プロパティがない場合は空文字列を返す', () => {
      // Given: text タイプだがテキストがないノード
      const adf = { type: 'text' };

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // content が空配列の場合
    it('content が空配列の場合は空文字列を返す', () => {
      // Given: 空の content 配列
      const adf = { content: [], type: 'paragraph' };

      // When: テキスト抽出を実行
      const result = extractTextFromAdf(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });
  });
});

/**
 * mapHttpStatusToJiraError のユニットテスト
 *
 * HTTP ステータスコードを JiraError にマッピングする機能のテスト
 * API エラーレスポンスの適切なハンドリングを検証
 */
describe('mapHttpStatusToJiraError', () => {
  describe('認証エラー', () => {
    it('401 に対して AUTH_FAILED を返す', () => {
      // Given: 401 ステータスコード
      const status = 401;
      const message = 'Unauthorized';

      // When: エラーマッピングを実行
      const result = mapHttpStatusToJiraError(status, message);

      // Then: AUTH_FAILED が返される
      expect(result.kind).toBe('AUTH_FAILED');
      expect(result.message).toContain('認証');
    });
  });

  describe('権限エラー', () => {
    it('403 に対して FORBIDDEN を返す', () => {
      // Given: 403 ステータスコード
      const status = 403;
      const message = 'Forbidden';

      // When: エラーマッピングを実行
      const result = mapHttpStatusToJiraError(status, message);

      // Then: FORBIDDEN が返される
      expect(result.kind).toBe('FORBIDDEN');
      expect(result.message).toContain('権限');
    });
  });

  describe('未検出エラー', () => {
    it('404 に対して NOT_FOUND を返す', () => {
      // Given: 404 ステータスコード
      const status = 404;
      const message = 'Not Found';

      // When: エラーマッピングを実行
      const result = mapHttpStatusToJiraError(status, message);

      // Then: NOT_FOUND が返される
      expect(result.kind).toBe('NOT_FOUND');
      expect(result.message).toContain('Issue');
    });
  });

  describe('その他のエラー', () => {
    // サーバーエラーのテスト
    it('500 に対して NETWORK_ERROR を返す', () => {
      // Given: 500 ステータスコード
      const status = 500;
      const message = 'Internal Server Error';

      // When: エラーマッピングを実行
      const result = mapHttpStatusToJiraError(status, message);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('Internal Server Error');
    });

    // 502 Bad Gateway のテスト
    it('502 に対して NETWORK_ERROR を返す', () => {
      // Given: 502 ステータスコード
      const status = 502;
      const message = 'Bad Gateway';

      // When: エラーマッピングを実行
      const result = mapHttpStatusToJiraError(status, message);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('Bad Gateway');
    });

    // 429 Too Many Requests のテスト
    it('429 に対して NETWORK_ERROR を返す', () => {
      // Given: 429 ステータスコード（レートリミット）
      const status = 429;
      const message = 'Too Many Requests';

      // When: エラーマッピングを実行
      const result = mapHttpStatusToJiraError(status, message);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('Too Many Requests');
    });
  });
});

/**
 * mapHttpStatusToDownloadError のユニットテスト
 *
 * HTTP ステータスコードをダウンロード用 JiraError にマッピングする機能のテスト
 * 添付ファイルダウンロード時のエラーハンドリングを検証
 */
describe('mapHttpStatusToDownloadError', () => {
  describe('認証エラー', () => {
    it('401 に対して AUTH_FAILED を返す', () => {
      // Given: 401 ステータスコード
      const status = 401;

      // When: エラーマッピングを実行
      const result = mapHttpStatusToDownloadError(status);

      // Then: AUTH_FAILED が返される
      expect(result.kind).toBe('AUTH_FAILED');
    });
  });

  describe('権限エラー', () => {
    it('403 に対して FORBIDDEN を返す', () => {
      // Given: 403 ステータスコード
      const status = 403;

      // When: エラーマッピングを実行
      const result = mapHttpStatusToDownloadError(status);

      // Then: FORBIDDEN が返される
      expect(result.kind).toBe('FORBIDDEN');
      expect(result.message).toContain('添付ファイル');
    });
  });

  describe('未検出エラー', () => {
    it('404 に対して NOT_FOUND を返す', () => {
      // Given: 404 ステータスコード
      const status = 404;

      // When: エラーマッピングを実行
      const result = mapHttpStatusToDownloadError(status);

      // Then: NOT_FOUND が返される
      expect(result.kind).toBe('NOT_FOUND');
    });
  });

  describe('その他のエラー', () => {
    // サーバーエラーのテスト
    it('500 に対して NETWORK_ERROR を返す', () => {
      // Given: 500 ステータスコード
      const status = 500;

      // When: エラーマッピングを実行
      const result = mapHttpStatusToDownloadError(status);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('HTTP 500');
    });

    // 503 Service Unavailable のテスト
    it('503 に対して NETWORK_ERROR を返す', () => {
      // Given: 503 ステータスコード
      const status = 503;

      // When: エラーマッピングを実行
      const result = mapHttpStatusToDownloadError(status);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('HTTP 503');
    });
  });
});
