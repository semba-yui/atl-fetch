/**
 * Jira Issue 取得フローの E2E テスト
 *
 * FetchService を通じた Jira Issue 取得の統合テスト。
 * MSW を使用して Jira Cloud API のモックを行い、
 * URL パース → 認証 → API リクエスト → データ変換 → 出力 の
 * 一連のフローをテストする。
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fetchAndOutput, fetchAndSave, fetchResource } from '../src/services/fetch/fetch-service.js';
import { TEST_CLI_VERSION } from './helpers/version.js';

// テスト用の環境変数
const MOCK_EMAIL = 'test@example.com';
const MOCK_TOKEN = 'test-api-token';
const TEST_TEMP_DIR = join(process.cwd(), 'tmp', 'e2e-jira-test');

// Jira Cloud API のモックサーバー
const server = setupServer();

/**
 * 有効な Jira API レスポンスを生成するヘルパー
 */
function createValidJiraResponse(issueKey: string, options?: { description?: unknown | null }) {
  return {
    changelog: {
      histories: [],
    },
    fields: {
      attachment: [],
      comment: {
        comments: [],
        total: 0,
      },
      description: options?.description ?? {
        content: [
          {
            content: [{ text: 'テスト説明', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      },
      summary: 'テスト Issue',
    },
    key: issueKey,
  };
}

describe('Jira Issue 取得フロー E2E テスト', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    // テスト用の環境変数を設定
    process.env.ATLASSIAN_EMAIL = MOCK_EMAIL;
    process.env.ATLASSIAN_API_TOKEN = MOCK_TOKEN;
  });

  afterEach(async () => {
    server.resetHandlers();
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

  describe('fetchResource - Jira Issue 取得', () => {
    describe('Given: 有効な Jira Issue URL と正しい認証情報', () => {
      // Jira Issue URL を指定して Issue 情報を取得できることを検証するテスト
      it('When: browse 形式の URL を指定する Then: Issue データが正しく取得される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('PROJ-123');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-123', ({ request }) => {
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: fetchResource を呼び出す
        const result = await fetchResource('https://mycompany.atlassian.net/browse/PROJ-123');

        // Then: 正しい Issue データが返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.type).toBe('jira');
          expect(result.value.data.key).toBe('PROJ-123');
          expect(result.value.data.summary).toBe('テスト Issue');
          expect(result.value.data.description).toBe('テスト説明');
        }
      });

      // selectedIssue 形式の URL からも Issue を取得できることを検証するテスト
      it('When: selectedIssue 形式の URL を指定する Then: Issue データが正しく取得される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('PROJ-456');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-456', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: selectedIssue 形式の URL で fetchResource を呼び出す
        const result = await fetchResource(
          'https://mycompany.atlassian.net/jira/software/projects/PROJ/boards/1?selectedIssue=PROJ-456',
        );

        // Then: 正しい Issue データが返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.type).toBe('jira');
          expect(result.value.data.key).toBe('PROJ-456');
        }
      });

      // コメント付き Issue を取得できることを検証するテスト
      it('When: コメント付き Issue を取得する Then: コメント一覧が含まれる', async () => {
        // Given: コメント付きのモック API を設定
        const mockResponse = {
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
                        content: [{ text: '最初のコメント', type: 'text' }],
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
              ],
              total: 1,
            },
            description: null,
            summary: 'コメント付き Issue',
          },
          key: 'PROJ-201',
        };

        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-201', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: fetchResource を呼び出す
        const result = await fetchResource('https://mycompany.atlassian.net/browse/PROJ-201');

        // Then: コメントが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.data.comments).toHaveLength(1);
          expect(result.value.data.comments[0]?.author).toBe('ユーザー A');
          expect(result.value.data.comments[0]?.body).toBe('最初のコメント');
        }
      });

      // 変更履歴付き Issue を取得できることを検証するテスト
      it('When: 変更履歴付き Issue を取得する Then: changelog が含まれる', async () => {
        // Given: 変更履歴付きのモック API を設定
        const mockResponse = {
          changelog: {
            histories: [
              {
                author: { displayName: '管理者' },
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
            ],
          },
          fields: {
            attachment: [],
            comment: {
              comments: [],
              total: 0,
            },
            description: null,
            summary: '変更履歴付き Issue',
          },
          key: 'PROJ-202',
        };

        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-202', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: fetchResource を呼び出す
        const result = await fetchResource('https://mycompany.atlassian.net/browse/PROJ-202');

        // Then: 変更履歴が含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.data.changelog).toHaveLength(1);
          expect(result.value.data.changelog[0]?.author).toBe('管理者');
          expect(result.value.data.changelog[0]?.items[0]?.field).toBe('status');
        }
      });

      // 添付ファイル付き Issue を取得できることを検証するテスト
      it('When: 添付ファイル付き Issue を取得する Then: attachments が含まれる', async () => {
        // Given: 添付ファイル付きのモック API を設定
        const mockResponse = {
          changelog: {
            histories: [],
          },
          fields: {
            attachment: [
              {
                content: 'https://mycompany.atlassian.net/rest/api/3/attachment/content/att-1',
                filename: 'screenshot.png',
                id: 'att-1',
                mimeType: 'image/png',
                size: 12345,
              },
            ],
            comment: {
              comments: [],
              total: 0,
            },
            description: null,
            summary: '添付ファイル付き Issue',
          },
          key: 'PROJ-203',
        };

        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-203', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: fetchResource を呼び出す
        const result = await fetchResource('https://mycompany.atlassian.net/browse/PROJ-203');

        // Then: 添付ファイルが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.data.attachments).toHaveLength(1);
          expect(result.value.data.attachments[0]?.filename).toBe('screenshot.png');
          expect(result.value.data.attachments[0]?.mimeType).toBe('image/png');
        }
      });
    });

    describe('Given: Issue が存在しない', () => {
      // 存在しない Issue を取得しようとした場合に NOT_FOUND エラーが返ることを検証するテスト
      it('When: 存在しない Issue キーを指定する Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/NOTEXIST-999', () => {
            return HttpResponse.json({ errorMessages: ['Issue Does Not Exist'], errors: {} }, { status: 404 });
          }),
        );

        // When: 存在しない Issue を取得
        const result = await fetchResource('https://mycompany.atlassian.net/browse/NOTEXIST-999');

        // Then: NOT_FOUND エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
          expect(result.error.message).toContain('Issue');
        }
      });
    });

    describe('Given: Issue へのアクセス権がない', () => {
      // アクセス権のない Issue を取得しようとした場合に FORBIDDEN エラーが返ることを検証するテスト
      it('When: 権限のない Issue を取得する Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/SECRET-001', () => {
            return HttpResponse.json(
              { errorMessages: ["You don't have permission to view this issue"], errors: {} },
              { status: 403 },
            );
          }),
        );

        // When: 権限のない Issue を取得
        const result = await fetchResource('https://mycompany.atlassian.net/browse/SECRET-001');

        // Then: FORBIDDEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
          expect(result.error.message).toContain('権限');
        }
      });
    });

    describe('Given: 認証情報が無効', () => {
      // 無効な認証情報で Issue を取得しようとした場合に AUTH_FAILED エラーが返ることを検証するテスト
      it('When: 無効な認証情報で Issue を取得する Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 401 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-123', () => {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
          }),
        );

        // When: Issue を取得
        const result = await fetchResource('https://mycompany.atlassian.net/browse/PROJ-123');

        // Then: AUTH_FAILED エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
          expect(result.error.message).toContain('認証');
        }
      });
    });

    describe('Given: 認証情報が未設定', () => {
      beforeEach(() => {
        // 環境変数を削除
        delete process.env.ATLASSIAN_EMAIL;
        delete process.env.ATLASSIAN_API_TOKEN;
      });

      // 認証情報未設定で Issue を取得しようとした場合に AUTH_FAILED エラーが返ることを検証するテスト
      it('When: 認証情報なしで Issue を取得する Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 認証情報が未設定

        // When: Issue を取得
        const result = await fetchResource('https://mycompany.atlassian.net/browse/PROJ-123');

        // Then: AUTH_FAILED エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });

    describe('Given: サポートされていない URL', () => {
      // Atlassian Cloud 以外の URL を指定した場合に URL_PARSE_ERROR が返ることを検証するテスト
      it('When: Atlassian Cloud 以外の URL を指定する Then: URL_PARSE_ERROR が返される', async () => {
        // Given: サポートされていない URL

        // When: 無効な URL で fetchResource を呼び出す
        const result = await fetchResource('https://example.com/some-page');

        // Then: URL_PARSE_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('URL_PARSE_ERROR');
        }
      });

      // 不正な形式の URL を指定した場合に URL_PARSE_ERROR が返ることを検証するテスト
      it('When: 不正な形式の URL を指定する Then: URL_PARSE_ERROR が返される', async () => {
        // Given: 不正な URL

        // When: 無効な URL で fetchResource を呼び出す
        const result = await fetchResource('not-a-valid-url');

        // Then: URL_PARSE_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('URL_PARSE_ERROR');
        }
      });
    });
  });

  describe('fetchAndOutput - JSON 形式で出力', () => {
    describe('Given: 有効な Jira Issue URL と JSON 形式指定', () => {
      // Jira Issue を JSON 形式で取得できることを検証するテスト
      it('When: JSON 形式で出力する Then: 有効な JSON 文字列が返される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('PROJ-301');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-301', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: JSON 形式で fetchAndOutput を呼び出す
        const result = await fetchAndOutput('https://mycompany.atlassian.net/browse/PROJ-301', {
          colorEnabled: false,
          format: 'json',
        });

        // Then: 有効な JSON 文字列が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.key).toBe('PROJ-301');
          expect(parsed.summary).toBe('テスト Issue');
        }
      });
    });
  });

  describe('fetchAndOutput - Markdown 形式で出力', () => {
    describe('Given: 有効な Jira Issue URL と Markdown 形式指定', () => {
      // Jira Issue を Markdown 形式で取得できることを検証するテスト
      it('When: Markdown 形式で出力する Then: Markdown フォーマットの文字列が返される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('PROJ-302');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-302', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: Markdown 形式で fetchAndOutput を呼び出す
        const result = await fetchAndOutput('https://mycompany.atlassian.net/browse/PROJ-302', {
          colorEnabled: false,
          format: 'markdown',
        });

        // Then: Markdown フォーマットの文字列が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('# PROJ-302');
          expect(result.value).toContain('テスト Issue');
        }
      });
    });
  });

  describe('fetchAndOutput - YAML 形式で出力', () => {
    describe('Given: 有効な Jira Issue URL と YAML 形式指定', () => {
      // Jira Issue を YAML 形式で取得できることを検証するテスト
      it('When: YAML 形式で出力する Then: YAML フォーマットの文字列が返される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('PROJ-303');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-303', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: YAML 形式で fetchAndOutput を呼び出す
        const result = await fetchAndOutput('https://mycompany.atlassian.net/browse/PROJ-303', {
          colorEnabled: false,
          format: 'yaml',
        });

        // Then: YAML フォーマットの文字列が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('key: PROJ-303');
          expect(result.value).toContain('summary: テスト Issue');
        }
      });
    });
  });

  describe('fetchAndSave - ディレクトリ構造で保存', () => {
    describe('Given: 有効な Jira Issue URL とダウンロードオプション', () => {
      // Jira Issue をディレクトリ構造で保存できることを検証するテスト
      it('When: ディレクトリ構造で保存する Then: 正しい構造でファイルが保存される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('PROJ-401');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/PROJ-401', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/browse/PROJ-401', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/browse/PROJ-401',
        });

        // Then: 正しい構造で保存される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.directory).toBe(join(TEST_TEMP_DIR, 'jira', 'PROJ-401'));
          expect(result.value.manifest.resourceType).toBe('jiraIssue');
          expect(result.value.manifest.summary.resourceId).toBe('PROJ-401');
          expect(result.value.manifest.summary.title).toBe('テスト Issue');
          expect(result.value.manifest.summary.success).toBe(true);
        }
      });

      // 存在しない Issue を保存しようとした場合に NOT_FOUND エラーが返ることを検証するテスト
      it('When: 存在しない Issue を保存しようとする Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/NOTEXIST-9991', () => {
            return HttpResponse.json({ errorMessages: ['Issue Does Not Exist'], errors: {} }, { status: 404 });
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/browse/NOTEXIST-9991', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/browse/NOTEXIST-9991',
        });

        // Then: NOT_FOUND エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
        }
      });

      // 権限のない Issue を保存しようとした場合に FORBIDDEN エラーが返ることを検証するテスト
      it('When: 権限のない Issue を保存しようとする Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/SECRET-9992', () => {
            return HttpResponse.json(
              { errorMessages: ["You don't have permission to view this issue"], errors: {} },
              { status: 403 },
            );
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/browse/SECRET-9992', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/browse/SECRET-9992',
        });

        // Then: FORBIDDEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
        }
      });
    });
  });
});
