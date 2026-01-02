/**
 * Confluence ページ取得フローの E2E テスト
 *
 * FetchService を通じた Confluence ページ取得の統合テスト。
 * MSW を使用して Confluence Cloud API のモックを行い、
 * URL パース → 認証 → API リクエスト → データ変換 → 出力 の
 * 一連のフローをテストする。
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fetchConfluenceAttachments, fetchConfluenceVersions } from '../src/services/confluence/confluence-service.js';
import { fetchAndOutput, fetchAndSave, fetchResource } from '../src/services/fetch/fetch-service.js';
import { TEST_CLI_VERSION } from './helpers/version.js';

// テスト用の環境変数
const MOCK_EMAIL = 'test@example.com';
const MOCK_TOKEN = 'test-api-token';
const TEST_TEMP_DIR = join(process.cwd(), 'tmp', 'e2e-confluence-test');

// Confluence Cloud API のモックサーバー
const server = setupServer();

/**
 * 有効な Confluence API レスポンスを生成するヘルパー
 */
function createValidConfluenceResponse(pageId: string, options?: { title?: string; body?: string }) {
  return {
    body: {
      storage: {
        representation: 'storage',
        value: options?.body ?? '<p>テストコンテンツ</p>',
      },
    },
    id: pageId,
    space: {
      key: 'DOCS',
    },
    title: options?.title ?? 'テストページ',
    version: {
      number: 1,
    },
  };
}

/**
 * Confluence バージョン一覧 API レスポンスを生成するヘルパー
 */
function createVersionsResponse(versions: Array<{ number: number; by: string; when: string; message: string | null }>) {
  return {
    results: versions.map((v) => ({
      by: {
        displayName: v.by,
      },
      message: v.message,
      number: v.number,
      when: v.when,
    })),
  };
}

/**
 * Confluence 添付ファイル一覧 API レスポンスを生成するヘルパー
 */
function createAttachmentsResponse(
  attachments: Array<{ id: string; title: string; mediaType: string; fileSize: number }>,
) {
  return {
    results: attachments.map((att) => ({
      _links: {
        download: `/wiki/download/attachments/${att.id}/${att.title}`,
      },
      extensions: {
        fileSize: att.fileSize,
        mediaType: att.mediaType,
      },
      id: att.id,
      title: att.title,
    })),
  };
}

describe('Confluence ページ取得フロー E2E テスト', () => {
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

  describe('fetchResource - Confluence ページ取得', () => {
    describe('Given: 有効な Confluence ページ URL と正しい認証情報', () => {
      // Confluence ページ URL を指定してページ情報を取得できることを検証するテスト
      it('When: spaces 形式の URL を指定する Then: ページデータが正しく取得される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('123456789');
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/123456789', ({ request }) => {
            const authHeader = request.headers.get('Authorization');
            const expectedAuth = `Basic ${Buffer.from(`${MOCK_EMAIL}:${MOCK_TOKEN}`).toString('base64')}`;
            if (authHeader !== expectedAuth) {
              return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/123456789/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/123456789/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: fetchResource を呼び出す
        const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/TestPage');

        // Then: 正しいページデータが返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.type).toBe('confluence');
          expect(result.value.data.id).toBe('123456789');
          expect(result.value.data.title).toBe('テストページ');
          expect(result.value.data.body).toBe('<p>テストコンテンツ</p>');
        }
      });

      // タイトルなしの URL からもページを取得できることを検証するテスト
      it('When: タイトルなしの URL を指定する Then: ページデータが正しく取得される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('987654321', { title: 'タイトルなし URL' });
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/987654321', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/987654321/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/987654321/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: タイトルなしの URL で fetchResource を呼び出す
        const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/987654321');

        // Then: 正しいページデータが返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.type).toBe('confluence');
          expect(result.value.data.id).toBe('987654321');
          expect(result.value.data.title).toBe('タイトルなし URL');
        }
      });

      // HTML コンテンツを含むページを取得できることを検証するテスト
      it('When: 複雑な HTML コンテンツを持つページを取得する Then: 本文が正しく取得される', async () => {
        // Given: 複雑な HTML コンテンツを含むモック API を設定
        const complexBody = `
          <h1>見出し</h1>
          <p>段落テキスト</p>
          <ul>
            <li>リスト項目 1</li>
            <li>リスト項目 2</li>
          </ul>
          <table>
            <tr><td>セル 1</td><td>セル 2</td></tr>
          </table>
        `;
        const mockResponse = createValidConfluenceResponse('111111111', {
          body: complexBody,
          title: '複雑なページ',
        });

        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/111111111', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/111111111/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/111111111/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: fetchResource を呼び出す
        const result = await fetchResource(
          'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/111111111/ComplexPage',
        );

        // Then: 本文が正しく取得される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.data.body).toContain('<h1>見出し</h1>');
          expect(result.value.data.body).toContain('<li>リスト項目 1</li>');
          expect(result.value.data.body).toContain('<table>');
        }
      });
    });

    describe('Given: ページが存在しない', () => {
      // 存在しないページを取得しようとした場合に NOT_FOUND エラーが返ることを検証するテスト
      it('When: 存在しないページ ID を指定する Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/999999999', () => {
            return HttpResponse.json(
              { message: 'No content found with id : 999999999', statusCode: 404 },
              { status: 404 },
            );
          }),
        );

        // When: 存在しないページを取得
        const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/999999999/NotFound');

        // Then: NOT_FOUND エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
          expect(result.error.message).toContain('ページ');
        }
      });
    });

    describe('Given: ページへのアクセス権がない', () => {
      // アクセス権のないページを取得しようとした場合に FORBIDDEN エラーが返ることを検証するテスト
      it('When: 権限のないページを取得する Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/222222222', () => {
            return HttpResponse.json(
              { message: 'The user does not have permission to view the requested content', statusCode: 403 },
              { status: 403 },
            );
          }),
        );

        // When: 権限のないページを取得
        const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/SECRET/pages/222222222/Secret');

        // Then: FORBIDDEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
          expect(result.error.message).toContain('権限');
        }
      });
    });

    describe('Given: 認証情報が無効', () => {
      // 無効な認証情報でページを取得しようとした場合に AUTH_FAILED エラーが返ることを検証するテスト
      it('When: 無効な認証情報でページを取得する Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 401 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/333333333', () => {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
          }),
        );

        // When: ページを取得
        const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/333333333/Page');

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

      // 認証情報未設定でページを取得しようとした場合に AUTH_FAILED エラーが返ることを検証するテスト
      it('When: 認証情報なしでページを取得する Then: AUTH_FAILED エラーが返される', async () => {
        // Given: 認証情報が未設定

        // When: ページを取得
        const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/444444444/Page');

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
        const result = await fetchResource('https://example.com/wiki/some-page');

        // Then: URL_PARSE_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('URL_PARSE_ERROR');
        }
      });

      // 不正な形式の Confluence URL を指定した場合に URL_PARSE_ERROR が返ることを検証するテスト
      it('When: 不正な形式の Confluence URL を指定する Then: URL_PARSE_ERROR が返される', async () => {
        // Given: 不正な URL（ページ ID がない）

        // When: 無効な URL で fetchResource を呼び出す
        const result = await fetchResource('https://mycompany.atlassian.net/wiki/spaces/DOCS/overview');

        // Then: URL_PARSE_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('URL_PARSE_ERROR');
        }
      });
    });
  });

  describe('fetchAndOutput - JSON 形式で出力', () => {
    describe('Given: 有効な Confluence ページ URL と JSON 形式指定', () => {
      // Confluence ページを JSON 形式で取得できることを検証するテスト
      it('When: JSON 形式で出力する Then: 有効な JSON 文字列が返される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('501501501', { title: 'JSON テストページ' });
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/501501501', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/501501501/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/501501501/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: JSON 形式で fetchAndOutput を呼び出す
        const result = await fetchAndOutput('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/501501501/Test', {
          colorEnabled: false,
          format: 'json',
        });

        // Then: 有効な JSON 文字列が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.id).toBe('501501501');
          expect(parsed.title).toBe('JSON テストページ');
          expect(parsed.body).toBe('<p>テストコンテンツ</p>');
        }
      });
    });
  });

  describe('fetchAndOutput - Markdown 形式で出力', () => {
    describe('Given: 有効な Confluence ページ URL と Markdown 形式指定', () => {
      // Confluence ページを Markdown 形式で取得できることを検証するテスト
      it('When: Markdown 形式で出力する Then: Markdown フォーマットの文字列が返される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('502502502', { title: 'Markdown テストページ' });
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/502502502', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/502502502/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/502502502/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: Markdown 形式で fetchAndOutput を呼び出す
        const result = await fetchAndOutput('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/502502502/Test', {
          colorEnabled: false,
          format: 'markdown',
        });

        // Then: Markdown フォーマットの文字列が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('# Markdown テストページ');
        }
      });
    });
  });

  describe('fetchAndOutput - YAML 形式で出力', () => {
    describe('Given: 有効な Confluence ページ URL と YAML 形式指定', () => {
      // Confluence ページを YAML 形式で取得できることを検証するテスト
      it('When: YAML 形式で出力する Then: YAML フォーマットの文字列が返される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('503503503', { title: 'YAML テストページ' });
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/503503503', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/503503503/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/503503503/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: YAML 形式で fetchAndOutput を呼び出す
        const result = await fetchAndOutput('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/503503503/Test', {
          colorEnabled: false,
          format: 'yaml',
        });

        // Then: YAML フォーマットの文字列が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('id: "503503503"');
          expect(result.value).toContain('title: YAML テストページ');
        }
      });
    });
  });

  describe('fetchAndSave - ディレクトリ構造で保存', () => {
    describe('Given: 有効な Confluence ページ URL とダウンロードオプション', () => {
      // Confluence ページをディレクトリ構造で保存できることを検証するテスト
      it('When: ディレクトリ構造で保存する Then: 正しい構造でファイルが保存される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('601601601', { title: '保存テストページ' });
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/601601601', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/601601601/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/601601601/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/601601601/SaveTest', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/601601601/SaveTest',
        });

        // Then: 正しい構造で保存される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.directory).toBe(join(TEST_TEMP_DIR, 'confluence', '601601601'));
          expect(result.value.manifest.resourceType).toBe('confluencePage');
          expect(result.value.manifest.summary.resourceId).toBe('601601601');
          expect(result.value.manifest.summary.title).toBe('保存テストページ');
          expect(result.value.manifest.summary.success).toBe(true);
        }
      });

      // 存在しないページを保存しようとした場合に NOT_FOUND エラーが返ることを検証するテスト
      it('When: 存在しないページを保存しようとする Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/888888888', () => {
            return HttpResponse.json(
              { message: 'No content found with id : 888888888', statusCode: 404 },
              { status: 404 },
            );
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/888888888/NotFound', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/888888888/NotFound',
        });

        // Then: NOT_FOUND エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
        }
      });

      // 権限のないページを保存しようとした場合に FORBIDDEN エラーが返ることを検証するテスト
      it('When: 権限のないページを保存しようとする Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/777777777', () => {
            return HttpResponse.json(
              { message: 'The user does not have permission to view the requested content', statusCode: 403 },
              { status: 403 },
            );
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/wiki/spaces/SECRET/pages/777777777/Secret', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/wiki/spaces/SECRET/pages/777777777/Secret',
        });

        // Then: FORBIDDEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
        }
      });
    });
  });

  describe('fetchConfluenceVersions - バージョン履歴取得', () => {
    describe('Given: 有効なページ ID と正しい認証情報', () => {
      // バージョン一覧を取得できることを検証するテスト
      it('When: バージョン一覧を取得する Then: 正しいバージョン情報が返される', async () => {
        // Given: バージョン一覧 API のモックを設定
        const mockVersions = createVersionsResponse([
          { by: 'Author1', message: '初回作成', number: 1, when: '2024-01-01T10:00:00.000Z' },
          { by: 'Author2', message: '内容を更新', number: 2, when: '2024-01-02T15:00:00.000Z' },
          { by: 'Author1', message: null, number: 3, when: '2024-01-03T09:00:00.000Z' },
        ]);

        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/701701701/version', () => {
            return HttpResponse.json(mockVersions);
          }),
        );

        // When: fetchConfluenceVersions を呼び出す
        const result = await fetchConfluenceVersions('mycompany', '701701701');

        // Then: 正しいバージョン情報が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(3);
          expect(result.value[0].number).toBe(1);
          expect(result.value[0].by).toBe('Author1');
          expect(result.value[0].message).toBe('初回作成');
          expect(result.value[1].number).toBe(2);
          expect(result.value[1].by).toBe('Author2');
          expect(result.value[2].message).toBeNull();
        }
      });
    });

    describe('Given: 存在しないページ ID', () => {
      // 存在しないページのバージョン一覧を取得しようとした場合に NOT_FOUND エラーが返ることを検証するテスト
      it('When: バージョン一覧を取得する Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/999999999/version', () => {
            return HttpResponse.json(
              { message: 'No content found with id : 999999999', statusCode: 404 },
              { status: 404 },
            );
          }),
        );

        // When: fetchConfluenceVersions を呼び出す
        const result = await fetchConfluenceVersions('mycompany', '999999999');

        // Then: NOT_FOUND エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
        }
      });
    });

    describe('Given: アクセス権がないページ', () => {
      // アクセス権のないページのバージョン一覧を取得しようとした場合に FORBIDDEN エラーが返ることを検証するテスト
      it('When: バージョン一覧を取得する Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/888888888/version', () => {
            return HttpResponse.json(
              { message: 'The user does not have permission to view the requested content', statusCode: 403 },
              { status: 403 },
            );
          }),
        );

        // When: fetchConfluenceVersions を呼び出す
        const result = await fetchConfluenceVersions('mycompany', '888888888');

        // Then: FORBIDDEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
        }
      });
    });
  });

  describe('fetchConfluenceAttachments - 添付ファイル一覧取得', () => {
    describe('Given: 有効なページ ID と正しい認証情報', () => {
      // 添付ファイル一覧を取得できることを検証するテスト
      it('When: 添付ファイル一覧を取得する Then: 正しい添付ファイル情報が返される', async () => {
        // Given: 添付ファイル一覧 API のモックを設定
        const mockAttachments = createAttachmentsResponse([
          { fileSize: 1024, id: 'att-1', mediaType: 'image/png', title: 'diagram.png' },
          { fileSize: 2048, id: 'att-2', mediaType: 'application/pdf', title: 'spec.pdf' },
        ]);

        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/801801801/child/attachment', () => {
            return HttpResponse.json(mockAttachments);
          }),
        );

        // When: fetchConfluenceAttachments を呼び出す
        const result = await fetchConfluenceAttachments('mycompany', '801801801');

        // Then: 正しい添付ファイル情報が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(2);
          expect(result.value[0].id).toBe('att-1');
          expect(result.value[0].title).toBe('diagram.png');
          expect(result.value[0].mediaType).toBe('image/png');
          expect(result.value[0].fileSize).toBe(1024);
          expect(result.value[0].downloadUrl).toContain('mycompany.atlassian.net');
          expect(result.value[1].id).toBe('att-2');
          expect(result.value[1].title).toBe('spec.pdf');
        }
      });

      // 添付ファイルがないページの場合に空配列が返ることを検証するテスト
      it('When: 添付ファイルがないページを取得する Then: 空配列が返される', async () => {
        // Given: 空の添付ファイル一覧を返すモック API を設定
        const mockEmptyAttachments = createAttachmentsResponse([]);

        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/802802802/child/attachment', () => {
            return HttpResponse.json(mockEmptyAttachments);
          }),
        );

        // When: fetchConfluenceAttachments を呼び出す
        const result = await fetchConfluenceAttachments('mycompany', '802802802');

        // Then: 空配列が返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(0);
        }
      });
    });

    describe('Given: 存在しないページ ID', () => {
      // 存在しないページの添付ファイル一覧を取得しようとした場合に NOT_FOUND エラーが返ることを検証するテスト
      it('When: 添付ファイル一覧を取得する Then: NOT_FOUND エラーが返される', async () => {
        // Given: 404 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/999999999/child/attachment', () => {
            return HttpResponse.json(
              { message: 'No content found with id : 999999999', statusCode: 404 },
              { status: 404 },
            );
          }),
        );

        // When: fetchConfluenceAttachments を呼び出す
        const result = await fetchConfluenceAttachments('mycompany', '999999999');

        // Then: NOT_FOUND エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NOT_FOUND');
        }
      });
    });

    describe('Given: アクセス権がないページ', () => {
      // アクセス権のないページの添付ファイル一覧を取得しようとした場合に FORBIDDEN エラーが返ることを検証するテスト
      it('When: 添付ファイル一覧を取得する Then: FORBIDDEN エラーが返される', async () => {
        // Given: 403 レスポンスを返すモック API を設定
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/888888888/child/attachment', () => {
            return HttpResponse.json(
              { message: 'The user does not have permission to view the requested content', statusCode: 403 },
              { status: 403 },
            );
          }),
        );

        // When: fetchConfluenceAttachments を呼び出す
        const result = await fetchConfluenceAttachments('mycompany', '888888888');

        // Then: FORBIDDEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('FORBIDDEN');
        }
      });
    });
  });
});
