import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  downloadConfluenceAttachment,
  fetchConfluenceAttachments,
  fetchConfluencePage,
  fetchConfluenceVersionContent,
  fetchConfluenceVersions,
} from './confluence-service.js';

/**
 * Confluence Service のテスト
 *
 * Confluence ページの基本情報取得機能のテスト。
 * MSW を使用して Confluence Cloud API のモックを行う。
 */

// テスト用の環境変数を設定
const MOCK_EMAIL = 'test@example.com';
const MOCK_TOKEN = 'test-api-token';

// Confluence Cloud API のモックサーバー
const server = setupServer();

describe('fetchConfluencePage', () => {
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

  describe('Given: 有効な Confluence ページ URL と認証情報が設定されている', () => {
    describe('When: ページのタイトルと本文を取得する', () => {
      it('Then: ページの ID、タイトル、本文が正しく返される', async () => {
        // Given: モックレスポンスを設定
        // Confluence Cloud REST API v1 のレスポンス形式
        const mockPageResponse = {
          body: {
            storage: {
              representation: 'storage',
              value: '<p>これはテストページの本文です。</p>',
            },
          },
          id: '123456',
          space: {
            key: 'TEST',
          },
          title: 'テストページのタイトル',
          version: {
            number: 3,
          },
        };

        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456', ({ request }) => {
            // 認証ヘッダーの検証
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }

            // expand パラメータの検証
            const url = new URL(request.url);
            expect(url.searchParams.get('expand')).toBe('body.storage,version,space');

            return HttpResponse.json(mockPageResponse);
          }),
          // バージョン API のモック
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: Confluence ページを取得
        const result = await fetchConfluencePage('test-org', '123456');

        // Then: 結果を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.id).toBe('123456');
          expect(result.value.title).toBe('テストページのタイトル');
          expect(result.value.body).toBe('<p>これはテストページの本文です。</p>');
          expect(result.value.spaceKey).toBe('TEST');
          expect(result.value.currentVersion).toBe(3);
        }
      });
    });
  });

  describe('Given: 存在しないページ ID が指定されている', () => {
    describe('When: ページを取得しようとする', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/999999', () => {
            return HttpResponse.json({ message: 'No content found with id: 999999', statusCode: 404 }, { status: 404 });
          }),
        );

        // When: 存在しないページを取得
        const result = await fetchConfluencePage('test-org', '999999');

        // Then: NOT_FOUND エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
          expect(result.error.message).toContain('ページ');
        }
      });
    });
  });

  describe('Given: ページへのアクセス権がない', () => {
    describe('When: ページを取得しようとする', () => {
      it('Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/SECRET-PAGE', () => {
            return HttpResponse.json(
              { message: "You don't have permission to view this content", statusCode: 403 },
              { status: 403 },
            );
          }),
        );

        // When: アクセス権のないページを取得
        const result = await fetchConfluencePage('test-org', 'SECRET-PAGE');

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
    describe('When: ページを取得しようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 401 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456', () => {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
          }),
        );

        // When: 無効な認証情報でページを取得
        const result = await fetchConfluencePage('test-org', '123456');

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
          expect(result.error.message).toContain('認証');
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

    describe('When: ページを取得しようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // When: 認証情報なしでページを取得
        const result = await fetchConfluencePage('test-org', '123456');

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });
  });

  describe('Given: 本文が空のページ', () => {
    describe('When: ページを取得する', () => {
      it('Then: body は空文字列として返される', async () => {
        // Given: 本文が空のモックレスポンス
        const mockPageResponse = {
          body: {
            storage: {
              representation: 'storage',
              value: '',
            },
          },
          id: '789',
          space: {
            key: 'EMPTY',
          },
          title: '空ページ',
          version: {
            number: 1,
          },
        };

        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/789', () => {
            return HttpResponse.json(mockPageResponse);
          }),
          // バージョン API のモック
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/789/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/789/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: ページを取得
        const result = await fetchConfluencePage('test-org', '789');

        // Then: body が空文字列であることを検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.body).toBe('');
        }
      });
    });
  });
});

/**
 * fetchConfluenceVersions のテスト
 *
 * Confluence ページのバージョン一覧取得機能のテスト。
 * Requirements: 4.2
 */
describe('fetchConfluenceVersions', () => {
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

  describe('Given: 有効な Confluence ページ ID と認証情報が設定されている', () => {
    describe('When: バージョン一覧を取得する', () => {
      it('Then: バージョン一覧が正しく返される', async () => {
        // Given: バージョン一覧のモックレスポンス
        // Confluence Cloud REST API v1 の /content/{id}/version 形式
        const mockVersionsResponse = {
          _links: {
            self: 'https://test-org.atlassian.net/wiki/rest/api/content/123456/version',
          },
          limit: 25,
          results: [
            {
              by: {
                displayName: '山田太郎',
                type: 'known',
                username: 'yamada',
              },
              message: '初版作成',
              minorEdit: false,
              number: 1,
              when: '2024-01-15T10:30:00.000+09:00',
            },
            {
              by: {
                displayName: '鈴木花子',
                type: 'known',
                username: 'suzuki',
              },
              message: '誤字修正',
              minorEdit: true,
              number: 2,
              when: '2024-01-16T14:00:00.000+09:00',
            },
            {
              by: {
                displayName: '佐藤一郎',
                type: 'known',
                username: 'sato',
              },
              message: null,
              minorEdit: false,
              number: 3,
              when: '2024-01-17T09:15:00.000+09:00',
            },
          ],
          size: 3,
          start: 0,
        };

        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456/version', ({ request }) => {
            // 認証ヘッダーの検証
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }

            return HttpResponse.json(mockVersionsResponse);
          }),
        );

        // When: バージョン一覧を取得
        const result = await fetchConfluenceVersions('test-org', '123456');

        // Then: 結果を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(3);

          // バージョン 1 の検証
          expect(result.value[0]?.number).toBe(1);
          expect(result.value[0]?.by).toBe('山田太郎');
          expect(result.value[0]?.when).toBe('2024-01-15T10:30:00.000+09:00');
          expect(result.value[0]?.message).toBe('初版作成');

          // バージョン 2 の検証
          expect(result.value[1]?.number).toBe(2);
          expect(result.value[1]?.by).toBe('鈴木花子');
          expect(result.value[1]?.message).toBe('誤字修正');

          // バージョン 3 の検証（message が null）
          expect(result.value[2]?.number).toBe(3);
          expect(result.value[2]?.by).toBe('佐藤一郎');
          expect(result.value[2]?.message).toBeNull();
        }
      });
    });
  });

  describe('Given: バージョン履歴が存在しないページ', () => {
    describe('When: バージョン一覧を取得する', () => {
      it('Then: 空配列が返される', async () => {
        // Given: バージョン履歴が空のモックレスポンス
        const mockEmptyVersionsResponse = {
          _links: {
            self: 'https://test-org.atlassian.net/wiki/rest/api/content/789/version',
          },
          limit: 25,
          results: [],
          size: 0,
          start: 0,
        };

        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/789/version', () => {
            return HttpResponse.json(mockEmptyVersionsResponse);
          }),
        );

        // When: バージョン一覧を取得
        const result = await fetchConfluenceVersions('test-org', '789');

        // Then: 空配列が返されることを検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(0);
        }
      });
    });
  });

  describe('Given: 存在しないページ ID が指定されている', () => {
    describe('When: バージョン一覧を取得しようとする', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/999999/version', () => {
            return HttpResponse.json({ message: 'No content found with id: 999999', statusCode: 404 }, { status: 404 });
          }),
        );

        // When: 存在しないページのバージョン一覧を取得
        const result = await fetchConfluenceVersions('test-org', '999999');

        // Then: NOT_FOUND エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
          expect(result.error.message).toContain('ページ');
        }
      });
    });
  });

  describe('Given: ページへのアクセス権がない', () => {
    describe('When: バージョン一覧を取得しようとする', () => {
      it('Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/SECRET/version', () => {
            return HttpResponse.json(
              { message: "You don't have permission to view this content", statusCode: 403 },
              { status: 403 },
            );
          }),
        );

        // When: アクセス権のないページのバージョン一覧を取得
        const result = await fetchConfluenceVersions('test-org', 'SECRET');

        // Then: FORBIDDEN エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
          expect(result.error.message).toContain('権限');
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

    describe('When: バージョン一覧を取得しようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // When: 認証情報なしでバージョン一覧を取得
        const result = await fetchConfluenceVersions('test-org', '123456');

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });
  });
});

/**
 * fetchConfluenceVersionContent のテスト
 *
 * Confluence ページの特定バージョンの本文取得機能のテスト。
 * Requirements: 4.3
 */
describe('fetchConfluenceVersionContent', () => {
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

  describe('Given: 有効なページ ID とバージョン番号が指定されている', () => {
    describe('When: 特定バージョンの本文を取得する', () => {
      it('Then: そのバージョンの本文が正しく返される', async () => {
        // Given: 特定バージョンのモックレスポンス
        // Confluence Cloud REST API v1 の /content/{id}?status=historical&version={versionNumber} 形式
        const mockVersionContentResponse = {
          body: {
            storage: {
              representation: 'storage',
              value: '<p>これはバージョン 2 の本文です。</p>',
            },
          },
          id: '123456',
          space: {
            key: 'TEST',
          },
          title: 'テストページ',
          version: {
            number: 2,
          },
        };

        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456', ({ request }) => {
            // 認証ヘッダーの検証
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }

            // クエリパラメータの検証
            const url = new URL(request.url);
            expect(url.searchParams.get('status')).toBe('historical');
            expect(url.searchParams.get('version')).toBe('2');
            expect(url.searchParams.get('expand')).toBe('body.storage');

            return HttpResponse.json(mockVersionContentResponse);
          }),
        );

        // When: バージョン 2 の本文を取得
        const result = await fetchConfluenceVersionContent('test-org', '123456', 2);

        // Then: 結果を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('<p>これはバージョン 2 の本文です。</p>');
        }
      });
    });
  });

  describe('Given: 存在しないバージョン番号が指定されている', () => {
    describe('When: その バージョンの本文を取得しようとする', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456', ({ request }) => {
            const url = new URL(request.url);
            if (url.searchParams.get('version') === '999') {
              return HttpResponse.json({ message: 'Version not found', statusCode: 404 }, { status: 404 });
            }
            return HttpResponse.json({});
          }),
        );

        // When: 存在しないバージョンの本文を取得
        const result = await fetchConfluenceVersionContent('test-org', '123456', 999);

        // Then: NOT_FOUND エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
        }
      });
    });
  });

  describe('Given: 存在しないページ ID が指定されている', () => {
    describe('When: バージョンの本文を取得しようとする', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/999999', () => {
            return HttpResponse.json({ message: 'No content found with id: 999999', statusCode: 404 }, { status: 404 });
          }),
        );

        // When: 存在しないページのバージョンの本文を取得
        const result = await fetchConfluenceVersionContent('test-org', '999999', 1);

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

    describe('When: バージョンの本文を取得しようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // When: 認証情報なしでバージョンの本文を取得
        const result = await fetchConfluenceVersionContent('test-org', '123456', 1);

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });
  });
});

/**
 * fetchConfluenceAttachments のテスト
 *
 * Confluence ページの添付ファイル一覧取得機能のテスト。
 * Requirements: 4.4
 */
describe('fetchConfluenceAttachments', () => {
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

  describe('Given: 有効な Confluence ページ ID と認証情報が設定されている', () => {
    describe('When: 添付ファイル一覧を取得する', () => {
      it('Then: 添付ファイル一覧が正しく返される', async () => {
        // Given: 添付ファイル一覧のモックレスポンス
        // Confluence Cloud REST API v1 の /content/{id}/child/attachment 形式
        // Confluence Cloud API の実際のレスポンス形式
        // download URL は /wiki なしの相対パスで返される
        const mockAttachmentsResponse = {
          _links: {
            self: 'https://test-org.atlassian.net/wiki/rest/api/content/123456/child/attachment',
          },
          limit: 25,
          results: [
            {
              _links: {
                download: '/download/attachments/123456/diagram.png',
              },
              extensions: {
                fileSize: 102400,
                mediaType: 'image/png',
              },
              id: 'att-001',
              title: 'diagram.png',
            },
            {
              _links: {
                download: '/download/attachments/123456/spec.pdf',
              },
              extensions: {
                fileSize: 524288,
                mediaType: 'application/pdf',
              },
              id: 'att-002',
              title: 'spec.pdf',
            },
          ],
          size: 2,
          start: 0,
        };

        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/123456/child/attachment', ({ request }) => {
            // 認証ヘッダーの検証
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }

            return HttpResponse.json(mockAttachmentsResponse);
          }),
        );

        // When: 添付ファイル一覧を取得
        const result = await fetchConfluenceAttachments('test-org', '123456');

        // Then: 結果を検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(2);

          // 添付ファイル 1 の検証
          expect(result.value[0]?.id).toBe('att-001');
          expect(result.value[0]?.title).toBe('diagram.png');
          expect(result.value[0]?.mediaType).toBe('image/png');
          expect(result.value[0]?.fileSize).toBe(102400);
          expect(result.value[0]?.downloadUrl).toBe(
            'https://test-org.atlassian.net/wiki/download/attachments/123456/diagram.png',
          );

          // 添付ファイル 2 の検証
          expect(result.value[1]?.id).toBe('att-002');
          expect(result.value[1]?.title).toBe('spec.pdf');
          expect(result.value[1]?.mediaType).toBe('application/pdf');
          expect(result.value[1]?.fileSize).toBe(524288);
        }
      });
    });
  });

  describe('Given: 添付ファイルが存在しないページ', () => {
    describe('When: 添付ファイル一覧を取得する', () => {
      it('Then: 空配列が返される', async () => {
        // Given: 添付ファイルが空のモックレスポンス
        const mockEmptyAttachmentsResponse = {
          _links: {
            self: 'https://test-org.atlassian.net/wiki/rest/api/content/789/child/attachment',
          },
          limit: 25,
          results: [],
          size: 0,
          start: 0,
        };

        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/789/child/attachment', () => {
            return HttpResponse.json(mockEmptyAttachmentsResponse);
          }),
        );

        // When: 添付ファイル一覧を取得
        const result = await fetchConfluenceAttachments('test-org', '789');

        // Then: 空配列が返されることを検証
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(0);
        }
      });
    });
  });

  describe('Given: 存在しないページ ID が指定されている', () => {
    describe('When: 添付ファイル一覧を取得しようとする', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/999999/child/attachment', () => {
            return HttpResponse.json({ message: 'No content found with id: 999999', statusCode: 404 }, { status: 404 });
          }),
        );

        // When: 存在しないページの添付ファイル一覧を取得
        const result = await fetchConfluenceAttachments('test-org', '999999');

        // Then: NOT_FOUND エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
          expect(result.error.message).toContain('ページ');
        }
      });
    });
  });

  describe('Given: ページへのアクセス権がない', () => {
    describe('When: 添付ファイル一覧を取得しようとする', () => {
      it('Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/rest/api/content/SECRET/child/attachment', () => {
            return HttpResponse.json(
              { message: "You don't have permission to view this content", statusCode: 403 },
              { status: 403 },
            );
          }),
        );

        // When: アクセス権のないページの添付ファイル一覧を取得
        const result = await fetchConfluenceAttachments('test-org', 'SECRET');

        // Then: FORBIDDEN エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
          expect(result.error.message).toContain('権限');
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

    describe('When: 添付ファイル一覧を取得しようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        // When: 認証情報なしで添付ファイル一覧を取得
        const result = await fetchConfluenceAttachments('test-org', '123456');

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });
  });
});

/**
 * downloadConfluenceAttachment のテスト
 *
 * Confluence ページの添付ファイルダウンロード機能のテスト。
 * Requirements: 4.5
 */
describe('downloadConfluenceAttachment', () => {
  // テスト用の一時ディレクトリ
  let testDir: string;

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

    // テスト用の一時ディレクトリを作成
    testDir = join(tmpdir(), `confluence-attachment-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // 環境変数をクリア
    delete process.env.ATLASSIAN_EMAIL;
    delete process.env.ATLASSIAN_API_TOKEN;

    // テスト用ディレクトリを削除
    if (existsSync(testDir)) {
      rmSync(testDir, { force: true, recursive: true });
    }
  });

  describe('Given: 有効な添付ファイル情報と認証情報が設定されている', () => {
    describe('When: 添付ファイルをダウンロードする', () => {
      it('Then: ファイルが正しくダウンロードされる', async () => {
        // Given: ダウンロード用のモックレスポンス
        const mockFileContent = Buffer.from('This is a test file content');

        server.use(
          http.get('https://test-org.atlassian.net/wiki/download/attachments/123456/test.txt', ({ request }) => {
            // 認証ヘッダーの検証
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.text('Unauthorized', { status: 401 });
            }

            return new HttpResponse(mockFileContent, {
              headers: {
                'Content-Length': mockFileContent.length.toString(),
                'Content-Type': 'text/plain',
              },
            });
          }),
        );

        // Given: 添付ファイル情報
        const attachment = {
          downloadUrl: 'https://test-org.atlassian.net/wiki/download/attachments/123456/test.txt',
          fileSize: mockFileContent.length,
          id: 'att-001',
          mediaType: 'text/plain',
          title: 'test.txt',
        };

        const destPath = join(testDir, 'test.txt');

        // When: 添付ファイルをダウンロード
        const result = await downloadConfluenceAttachment(attachment, destPath);

        // Then: 結果を検証
        expect(result.isOk()).toBe(true);
        expect(existsSync(destPath)).toBe(true);
        const downloadedContent = readFileSync(destPath);
        expect(downloadedContent.toString()).toBe('This is a test file content');
      });
    });
  });

  describe('Given: 添付ファイルが存在しない', () => {
    describe('When: ダウンロードしようとする', () => {
      it('Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/download/attachments/123456/notfound.txt', () => {
            return HttpResponse.text('Not Found', { status: 404 });
          }),
        );

        const attachment = {
          downloadUrl: 'https://test-org.atlassian.net/wiki/download/attachments/123456/notfound.txt',
          fileSize: 100,
          id: 'att-999',
          mediaType: 'text/plain',
          title: 'notfound.txt',
        };

        const destPath = join(testDir, 'notfound.txt');

        // When: 存在しないファイルをダウンロード
        const result = await downloadConfluenceAttachment(attachment, destPath);

        // Then: NOT_FOUND エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
        }
      });
    });
  });

  describe('Given: 添付ファイルへのアクセス権がない', () => {
    describe('When: ダウンロードしようとする', () => {
      it('Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを設定
        server.use(
          http.get('https://test-org.atlassian.net/wiki/download/attachments/123456/secret.txt', () => {
            return HttpResponse.text('Forbidden', { status: 403 });
          }),
        );

        const attachment = {
          downloadUrl: 'https://test-org.atlassian.net/wiki/download/attachments/123456/secret.txt',
          fileSize: 100,
          id: 'att-secret',
          mediaType: 'text/plain',
          title: 'secret.txt',
        };

        const destPath = join(testDir, 'secret.txt');

        // When: アクセス権のないファイルをダウンロード
        const result = await downloadConfluenceAttachment(attachment, destPath);

        // Then: FORBIDDEN エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
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

    describe('When: ダウンロードしようとする', () => {
      it('Then: AUTH_FAILED エラーが返される', async () => {
        const attachment = {
          downloadUrl: 'https://test-org.atlassian.net/wiki/download/attachments/123456/test.txt',
          fileSize: 100,
          id: 'att-001',
          mediaType: 'text/plain',
          title: 'test.txt',
        };

        const destPath = join(testDir, 'test.txt');

        // When: 認証情報なしでダウンロード
        const result = await downloadConfluenceAttachment(attachment, destPath);

        // Then: AUTH_FAILED エラーを検証
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('AUTH_FAILED');
        }
      });
    });
  });

  describe('Given: 進捗コールバックが指定されている', () => {
    describe('When: ダウンロードする', () => {
      it('Then: 進捗コールバックが呼び出される', async () => {
        // Given: ダウンロード用のモックレスポンス
        const mockFileContent = Buffer.from('Progress test content');

        server.use(
          http.get('https://test-org.atlassian.net/wiki/download/attachments/123456/progress.txt', () => {
            return new HttpResponse(mockFileContent, {
              headers: {
                'Content-Length': mockFileContent.length.toString(),
                'Content-Type': 'text/plain',
              },
            });
          }),
        );

        const attachment = {
          downloadUrl: 'https://test-org.atlassian.net/wiki/download/attachments/123456/progress.txt',
          fileSize: mockFileContent.length,
          id: 'att-progress',
          mediaType: 'text/plain',
          title: 'progress.txt',
        };

        const destPath = join(testDir, 'progress.txt');
        const progressCalls: Array<{ transferred: number; total: number | undefined }> = [];

        // When: 進捗コールバック付きでダウンロード
        const result = await downloadConfluenceAttachment(attachment, destPath, (transferred, total) => {
          progressCalls.push({ total, transferred });
        });

        // Then: 進捗コールバックが呼び出されたことを検証
        expect(result.isOk()).toBe(true);
        // 進捗コールバックが少なくとも1回は呼び出されることを検証
        expect(progressCalls.length).toBeGreaterThan(0);
      });
    });
  });
});
