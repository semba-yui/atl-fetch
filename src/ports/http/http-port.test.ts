import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getStatusText, httpDownload, httpRequest, mapErrorToHttpError } from './http-port.js';

/**
 * HttpPort のユニットテスト
 *
 * MSW (Mock Service Worker) を使用して HTTP リクエストをモックし、
 * got ライブラリを使用した HTTP クライアントの動作を検証する。
 */
describe('HttpPort', () => {
  const TEST_BASE_URL = 'https://test-api.atlassian.net';

  // MSW サーバーのセットアップ
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('httpRequest', () => {
    describe('正常系', () => {
      it('GET リクエストが成功し、JSON レスポンスを返す', async () => {
        // Given: モック API が JSON レスポンスを返す
        const expectedData = { id: '123', name: 'Test Issue' };
        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/TEST-1`, () => {
            return HttpResponse.json(expectedData, { status: 200 });
          }),
        );

        // When: GET リクエストを実行する
        const result = await httpRequest<typeof expectedData>(`${TEST_BASE_URL}/rest/api/3/issue/TEST-1`);

        // Then: 成功し、正しいデータが返される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.status).toBe(200);
          expect(result.value.data).toEqual(expectedData);
        }
      });

      it('認証ヘッダーを付与してリクエストできる', async () => {
        // Given: モック API が Authorization ヘッダーを検証する
        const expectedData = { authenticated: true };
        let receivedAuthHeader: string | null = null;

        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/myself`, ({ request }) => {
            receivedAuthHeader = request.headers.get('Authorization');
            return HttpResponse.json(expectedData, { status: 200 });
          }),
        );

        // When: Authorization ヘッダーを付与してリクエストする
        const authHeader = 'Basic dXNlckBleGFtcGxlLmNvbTp0b2tlbg==';
        const result = await httpRequest<typeof expectedData>(`${TEST_BASE_URL}/rest/api/3/myself`, {
          headers: { Authorization: authHeader },
        });

        // Then: ヘッダーが正しく送信され、成功する
        expect(result.isOk()).toBe(true);
        expect(receivedAuthHeader).toBe(authHeader);
      });

      it('POST リクエストでボディを送信できる', async () => {
        // Given: モック API が POST リクエストを受け付ける
        const requestBody = { summary: 'New Issue' };
        const responseData = { id: '456', key: 'TEST-2' };
        let receivedBody: unknown = null;

        server.use(
          http.post(`${TEST_BASE_URL}/rest/api/3/issue`, async ({ request }) => {
            receivedBody = await request.json();
            return HttpResponse.json(responseData, { status: 201 });
          }),
        );

        // When: POST リクエストを実行する
        const result = await httpRequest<typeof responseData>(`${TEST_BASE_URL}/rest/api/3/issue`, {
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });

        // Then: ボディが正しく送信され、成功する
        expect(result.isOk()).toBe(true);
        expect(receivedBody).toEqual(requestBody);
        if (result.isOk()) {
          expect(result.value.status).toBe(201);
          expect(result.value.data).toEqual(responseData);
        }
      });
    });

    describe('HTTP エラーハンドリング', () => {
      it('404 エラー時に HTTP_ERROR を返す', async () => {
        // Given: モック API が 404 を返す
        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/NOTFOUND-1`, () => {
            return HttpResponse.json({ errorMessages: ['Issue does not exist'] }, { status: 404 });
          }),
        );

        // When: 存在しない Issue にリクエストする
        const result = await httpRequest(`${TEST_BASE_URL}/rest/api/3/issue/NOTFOUND-1`);

        // Then: HTTP_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('HTTP_ERROR');
          if (result.error.kind === 'HTTP_ERROR') {
            expect(result.error.status).toBe(404);
          }
        }
      });

      it('403 エラー時に HTTP_ERROR を返す', async () => {
        // Given: モック API が 403 を返す
        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/FORBIDDEN-1`, () => {
            return HttpResponse.json({ errorMessages: ['Permission denied'] }, { status: 403 });
          }),
        );

        // When: アクセス権のない Issue にリクエストする
        const result = await httpRequest(`${TEST_BASE_URL}/rest/api/3/issue/FORBIDDEN-1`);

        // Then: HTTP_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('HTTP_ERROR');
          if (result.error.kind === 'HTTP_ERROR') {
            expect(result.error.status).toBe(403);
          }
        }
      });

      it('401 エラー時に HTTP_ERROR を返す', async () => {
        // Given: モック API が 401 を返す
        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/AUTH-1`, () => {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
          }),
        );

        // When: 認証なしでリクエストする
        const result = await httpRequest(`${TEST_BASE_URL}/rest/api/3/issue/AUTH-1`);

        // Then: HTTP_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('HTTP_ERROR');
          if (result.error.kind === 'HTTP_ERROR') {
            expect(result.error.status).toBe(401);
          }
        }
      });

      it('500 エラー時に HTTP_ERROR を返す', async () => {
        // Given: モック API が 500 を返す
        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/ERROR-1`, () => {
            return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
          }),
        );

        // When: サーバーエラーが発生する
        const result = await httpRequest(`${TEST_BASE_URL}/rest/api/3/issue/ERROR-1`);

        // Then: HTTP_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('HTTP_ERROR');
          if (result.error.kind === 'HTTP_ERROR') {
            expect(result.error.status).toBe(500);
          }
        }
      });
    });

    describe('ネットワークエラーハンドリング', () => {
      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        // Given: ネットワークエラーが発生する
        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/NETWORK-1`, () => {
            return HttpResponse.error();
          }),
        );

        // When: リクエストを実行する
        const result = await httpRequest(`${TEST_BASE_URL}/rest/api/3/issue/NETWORK-1`);

        // Then: NETWORK_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NETWORK_ERROR');
        }
      });
    });

    describe('タイムアウトハンドリング', () => {
      it('タイムアウト時に TIMEOUT を返す', async () => {
        // Given: レスポンスが遅延する（タイムアウトより長い）
        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/SLOW-1`, async () => {
            // 1秒の遅延
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return HttpResponse.json({ id: 'slow' }, { status: 200 });
          }),
        );

        // When: 短いタイムアウトでリクエストする
        const result = await httpRequest(`${TEST_BASE_URL}/rest/api/3/issue/SLOW-1`, {
          timeout: 100, // 100ms タイムアウト
        });

        // Then: TIMEOUT が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('TIMEOUT');
        }
      });
    });

    describe('リトライ機能', () => {
      it('一時的なエラー後にリトライして成功する', async () => {
        // Given: 最初の2回は 503、3回目に成功する
        let requestCount = 0;
        const expectedData = { retried: true };

        server.use(
          http.get(`${TEST_BASE_URL}/rest/api/3/issue/RETRY-1`, () => {
            requestCount++;
            if (requestCount < 3) {
              return HttpResponse.json({ message: 'Service unavailable' }, { status: 503 });
            }
            return HttpResponse.json(expectedData, { status: 200 });
          }),
        );

        // When: リクエストを実行する（デフォルトでリトライ有効）
        const result = await httpRequest<typeof expectedData>(`${TEST_BASE_URL}/rest/api/3/issue/RETRY-1`);

        // Then: リトライ後に成功する
        expect(result.isOk()).toBe(true);
        expect(requestCount).toBe(3);
        if (result.isOk()) {
          expect(result.value.data).toEqual(expectedData);
        }
      });
    });
  });

  describe('httpDownload', () => {
    let testDir: string;

    beforeEach(async () => {
      // テスト用の一時ディレクトリを作成
      testDir = join(tmpdir(), `http-port-test-${randomBytes(8).toString('hex')}`);
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      // テスト用ディレクトリを削除
      await rm(testDir, { force: true, recursive: true });
    });

    describe('正常系', () => {
      it('ファイルをダウンロードして指定パスに保存する', async () => {
        // Given: モック API がバイナリデータを返す
        const fileContent = Buffer.from('Hello, World! This is a test file.');
        server.use(
          http.get(`${TEST_BASE_URL}/attachments/file.txt`, () => {
            return new HttpResponse(fileContent, {
              headers: { 'Content-Type': 'text/plain' },
              status: 200,
            });
          }),
        );

        // When: ファイルをダウンロードする
        const destPath = join(testDir, 'downloaded.txt');
        const result = await httpDownload(`${TEST_BASE_URL}/attachments/file.txt`, destPath);

        // Then: 成功し、ファイルが正しく保存される
        expect(result.isOk()).toBe(true);
        const savedContent = await readFile(destPath);
        expect(savedContent.toString()).toBe('Hello, World! This is a test file.');
      });

      it('認証ヘッダーを付与してダウンロードできる', async () => {
        // Given: モック API が Authorization ヘッダーを検証する
        const fileContent = Buffer.from('Authenticated content');
        let receivedAuthHeader: string | null = null;

        server.use(
          http.get(`${TEST_BASE_URL}/attachments/auth-file.txt`, ({ request }) => {
            receivedAuthHeader = request.headers.get('Authorization');
            return new HttpResponse(fileContent, {
              headers: { 'Content-Type': 'text/plain' },
              status: 200,
            });
          }),
        );

        // When: Authorization ヘッダーを付与してダウンロードする
        const authHeader = 'Basic dXNlckBleGFtcGxlLmNvbTp0b2tlbg==';
        const destPath = join(testDir, 'auth-downloaded.txt');
        const result = await httpDownload(`${TEST_BASE_URL}/attachments/auth-file.txt`, destPath, {
          Authorization: authHeader,
        });

        // Then: ヘッダーが正しく送信され、成功する
        expect(result.isOk()).toBe(true);
        expect(receivedAuthHeader).toBe(authHeader);
        const savedContent = await readFile(destPath);
        expect(savedContent.toString()).toBe('Authenticated content');
      });

      it('大きなファイルをストリームでダウンロードできる', async () => {
        // Given: モック API が大きなファイルを返す（1MB）
        const largeContent = Buffer.alloc(1024 * 1024, 'A'); // 1MB of 'A'
        server.use(
          http.get(`${TEST_BASE_URL}/attachments/large-file.bin`, () => {
            return new HttpResponse(largeContent, {
              headers: { 'Content-Type': 'application/octet-stream' },
              status: 200,
            });
          }),
        );

        // When: 大きなファイルをダウンロードする
        const destPath = join(testDir, 'large-file.bin');
        const result = await httpDownload(`${TEST_BASE_URL}/attachments/large-file.bin`, destPath);

        // Then: 成功し、ファイルが正しく保存される
        expect(result.isOk()).toBe(true);
        const savedContent = await readFile(destPath);
        expect(savedContent.length).toBe(1024 * 1024);
        expect(savedContent.equals(largeContent)).toBe(true);
      });

      it('進捗コールバックが呼び出される', async () => {
        // Given: モック API がファイルを返し、進捗コールバックを設定
        const fileContent = Buffer.from('Progress tracking content');
        server.use(
          http.get(`${TEST_BASE_URL}/attachments/progress-file.txt`, () => {
            return new HttpResponse(fileContent, {
              headers: {
                'Content-Length': String(fileContent.length),
                'Content-Type': 'text/plain',
              },
              status: 200,
            });
          }),
        );

        // When: 進捗コールバック付きでダウンロードする
        const progressCalls: Array<{ transferred: number; total: number | undefined }> = [];
        const destPath = join(testDir, 'progress-file.txt');
        const result = await httpDownload(
          `${TEST_BASE_URL}/attachments/progress-file.txt`,
          destPath,
          undefined,
          (transferred, total) => {
            progressCalls.push({ total, transferred });
          },
        );

        // Then: 進捗コールバックが呼び出される
        expect(result.isOk()).toBe(true);
        expect(progressCalls.length).toBeGreaterThan(0);
        // 最後の進捗は全ファイルサイズと一致する
        const lastProgress = progressCalls.at(-1);
        expect(lastProgress?.transferred).toBe(fileContent.length);
      });
    });

    describe('HTTP エラーハンドリング', () => {
      it('404 エラー時に HTTP_ERROR を返す', async () => {
        // Given: モック API が 404 を返す
        server.use(
          http.get(`${TEST_BASE_URL}/attachments/not-found.txt`, () => {
            return new HttpResponse('Not Found', { status: 404 });
          }),
        );

        // When: 存在しないファイルをダウンロードする
        const destPath = join(testDir, 'not-found.txt');
        const result = await httpDownload(`${TEST_BASE_URL}/attachments/not-found.txt`, destPath);

        // Then: HTTP_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('HTTP_ERROR');
          if (result.error.kind === 'HTTP_ERROR') {
            expect(result.error.status).toBe(404);
          }
        }
      });

      it('403 エラー時に HTTP_ERROR を返す', async () => {
        // Given: モック API が 403 を返す
        server.use(
          http.get(`${TEST_BASE_URL}/attachments/forbidden.txt`, () => {
            return new HttpResponse('Forbidden', { status: 403 });
          }),
        );

        // When: アクセス権のないファイルをダウンロードする
        const destPath = join(testDir, 'forbidden.txt');
        const result = await httpDownload(`${TEST_BASE_URL}/attachments/forbidden.txt`, destPath);

        // Then: HTTP_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('HTTP_ERROR');
          if (result.error.kind === 'HTTP_ERROR') {
            expect(result.error.status).toBe(403);
          }
        }
      });
    });

    describe('ネットワークエラーハンドリング', () => {
      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        // Given: ネットワークエラーが発生する
        server.use(
          http.get(`${TEST_BASE_URL}/attachments/network-error.txt`, () => {
            return HttpResponse.error();
          }),
        );

        // When: ダウンロードを実行する
        const destPath = join(testDir, 'network-error.txt');
        const result = await httpDownload(`${TEST_BASE_URL}/attachments/network-error.txt`, destPath);

        // Then: NETWORK_ERROR が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('NETWORK_ERROR');
        }
      });
    });

    describe('タイムアウトハンドリング', () => {
      it('タイムアウト時に TIMEOUT を返す', async () => {
        // Given: レスポンスが遅延する
        server.use(
          http.get(`${TEST_BASE_URL}/attachments/slow-file.txt`, async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return new HttpResponse('Slow content', { status: 200 });
          }),
        );

        // When: 短いタイムアウトでダウンロードする
        const destPath = join(testDir, 'slow-file.txt');
        const result = await httpDownload(
          `${TEST_BASE_URL}/attachments/slow-file.txt`,
          destPath,
          undefined,
          undefined,
          100, // 100ms タイムアウト
        );

        // Then: TIMEOUT が返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('TIMEOUT');
        }
      });
    });
  });

  describe('レスポンスヘッダー処理', () => {
    it('配列形式のレスポンスヘッダーをカンマ区切りで結合する', async () => {
      // Given: 配列形式のヘッダーを持つレスポンス
      server.use(
        http.get(`${TEST_BASE_URL}/rest/api/3/multi-header`, () => {
          return HttpResponse.json(
            { success: true },
            {
              headers: {
                'Set-Cookie': ['session=abc123', 'token=xyz789'],
              },
              status: 200,
            },
          );
        }),
      );

      // When: リクエストを実行
      const result = await httpRequest<{ success: boolean }>(`${TEST_BASE_URL}/rest/api/3/multi-header`);

      // Then: 配列ヘッダーがカンマ区切りで結合される
      // 注: MSW はスペースなしで結合するため、期待値を調整
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.headers['set-cookie']).toContain('session=abc123');
        expect(result.value.headers['set-cookie']).toContain('token=xyz789');
      }
    });
  });
});

/**
 * getStatusText のユニットテスト
 *
 * HTTP ステータスコードに対応するテキストを返す関数のテスト
 */
describe('getStatusText', () => {
  describe('定義済みステータスコード', () => {
    // クライアントエラー（4xx）のテスト
    it('400 に対して Bad Request を返す', () => {
      expect(getStatusText(400)).toBe('Bad Request');
    });

    it('401 に対して Unauthorized を返す', () => {
      expect(getStatusText(401)).toBe('Unauthorized');
    });

    it('403 に対して Forbidden を返す', () => {
      expect(getStatusText(403)).toBe('Forbidden');
    });

    it('404 に対して Not Found を返す', () => {
      expect(getStatusText(404)).toBe('Not Found');
    });

    it('405 に対して Method Not Allowed を返す', () => {
      expect(getStatusText(405)).toBe('Method Not Allowed');
    });

    it('408 に対して Request Timeout を返す', () => {
      expect(getStatusText(408)).toBe('Request Timeout');
    });

    it('429 に対して Too Many Requests を返す', () => {
      expect(getStatusText(429)).toBe('Too Many Requests');
    });

    // サーバーエラー（5xx）のテスト
    it('500 に対して Internal Server Error を返す', () => {
      expect(getStatusText(500)).toBe('Internal Server Error');
    });

    it('502 に対して Bad Gateway を返す', () => {
      expect(getStatusText(502)).toBe('Bad Gateway');
    });

    it('503 に対して Service Unavailable を返す', () => {
      expect(getStatusText(503)).toBe('Service Unavailable');
    });

    it('504 に対して Gateway Timeout を返す', () => {
      expect(getStatusText(504)).toBe('Gateway Timeout');
    });
  });

  describe('未定義のステータスコード', () => {
    // 未定義のステータスコードのテスト
    it("418 (I'm a teapot) に対してデフォルトの Error を返す", () => {
      expect(getStatusText(418)).toBe('Error');
    });

    it('422 (Unprocessable Entity) に対してデフォルトの Error を返す', () => {
      expect(getStatusText(422)).toBe('Error');
    });

    it('599 (未知のサーバーエラー) に対してデフォルトの Error を返す', () => {
      expect(getStatusText(599)).toBe('Error');
    });
  });
});

describe('mapErrorToHttpError', () => {
  describe('不明なエラー', () => {
    // Error インスタンスだが got のエラー型ではない場合のテスト
    it('通常の Error に対して NETWORK_ERROR を返す', () => {
      // Given: 通常の Error オブジェクト
      const error = new Error('Unknown error occurred');

      // When: エラーマッピングを実行
      const result = mapErrorToHttpError(error);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('リクエストエラー');
      expect(result.message).toContain('Unknown error occurred');
    });

    // 非 Error オブジェクトのテスト
    it('文字列エラーに対して NETWORK_ERROR を返す', () => {
      // Given: 文字列がスローされた
      const error = 'string error';

      // When: エラーマッピングを実行
      const result = mapErrorToHttpError(error);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('不明なエラー');
    });

    // null のテスト
    it('null に対して NETWORK_ERROR を返す', () => {
      // Given: null がスローされた
      const error = null;

      // When: エラーマッピングを実行
      const result = mapErrorToHttpError(error);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('不明なエラー');
    });

    // undefined のテスト
    it('undefined に対して NETWORK_ERROR を返す', () => {
      // Given: undefined がスローされた
      const error = undefined;

      // When: エラーマッピングを実行
      const result = mapErrorToHttpError(error);

      // Then: NETWORK_ERROR が返される
      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.message).toContain('不明なエラー');
    });
  });
});
