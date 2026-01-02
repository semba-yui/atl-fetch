/**
 * 各出力形式とファイル保存の E2E テスト
 *
 * Task 13.3: JSON/Markdown/YAML 出力のテスト、ディレクトリ構造保存のテスト
 *
 * このテストでは以下を検証する:
 * - fetchAndOutput でファイルに出力できること
 * - 各形式（JSON/Markdown/YAML）で正しくフォーマットされること
 * - fetchAndSave でディレクトリ構造が正しく生成されること
 * - 保存されたファイルの内容が正しいこと
 */

import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { fetchAndOutput, fetchAndSave } from '../src/services/fetch/fetch-service.js';
import { TEST_CLI_VERSION } from './helpers/version.js';

// テスト用の環境変数
const MOCK_EMAIL = 'test@example.com';
const MOCK_TOKEN = 'test-api-token';
const TEST_TEMP_DIR = join(process.cwd(), 'tmp', 'e2e-output-test');

// MSW サーバー
const server = setupServer();

/**
 * 有効な Jira API レスポンスを生成するヘルパー
 */
function createValidJiraResponse(issueKey: string) {
  return {
    changelog: {
      histories: [
        {
          author: { displayName: '変更者' },
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
      attachment: [
        {
          content: 'https://example.atlassian.net/secure/attachment/10001/image.png',
          filename: 'image.png',
          id: 'att-1',
          mimeType: 'image/png',
          size: 1024,
        },
      ],
      comment: {
        comments: [
          {
            author: { displayName: 'コメント者' },
            body: {
              content: [
                {
                  content: [{ text: 'テストコメント', type: 'text' }],
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
      summary: 'テスト Issue サマリー',
    },
    key: issueKey,
  };
}

/**
 * 有効な Confluence API レスポンスを生成するヘルパー
 */
function createValidConfluenceResponse(pageId: string) {
  return {
    body: {
      storage: {
        representation: 'storage',
        value: '<h1>テスト見出し</h1><p>これはテストページの本文です。</p>',
      },
    },
    id: pageId,
    space: {
      key: 'DOCS',
    },
    title: 'テストページタイトル',
    version: {
      number: 2,
    },
  };
}

describe('各出力形式とファイル保存の E2E テスト', () => {
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

  describe('fetchAndOutput - ファイル出力', () => {
    describe('Given: 有効な Jira Issue URL とファイル出力パス', () => {
      // JSON 形式でファイルに出力できることを検証するテスト
      it('When: JSON 形式でファイル出力する Then: 有効な JSON ファイルが作成される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('OUTPUT-001');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/OUTPUT-001', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        const outputPath = join(TEST_TEMP_DIR, 'output', 'issue.json');

        // When: JSON 形式でファイル出力する
        const result = await fetchAndOutput('https://mycompany.atlassian.net/browse/OUTPUT-001', {
          colorEnabled: false,
          format: 'json',
          outputPath,
        });

        // Then: 成功し、ファイルが作成される
        expect(result.isOk()).toBe(true);

        // ファイルが存在し、有効な JSON であること
        const fileContent = await readFile(outputPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        expect(parsed.key).toBe('OUTPUT-001');
        expect(parsed.summary).toBe('テスト Issue サマリー');
        expect(parsed.description).toBe('これはテスト Issue の説明です。');
      });

      // Markdown 形式でファイルに出力できることを検証するテスト
      it('When: Markdown 形式でファイル出力する Then: Markdown ファイルが作成される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('OUTPUT-002');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/OUTPUT-002', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        const outputPath = join(TEST_TEMP_DIR, 'output', 'issue.md');

        // When: Markdown 形式でファイル出力する
        const result = await fetchAndOutput('https://mycompany.atlassian.net/browse/OUTPUT-002', {
          colorEnabled: false,
          format: 'markdown',
          outputPath,
        });

        // Then: 成功し、ファイルが作成される
        expect(result.isOk()).toBe(true);

        // ファイルが存在し、Markdown 形式であること
        const fileContent = await readFile(outputPath, 'utf-8');
        expect(fileContent).toContain('# OUTPUT-002');
        expect(fileContent).toContain('テスト Issue サマリー');
        expect(fileContent).toContain('## Description');
        expect(fileContent).toContain('## Comments');
        expect(fileContent).toContain('## Changelog');
      });

      // YAML 形式でファイルに出力できることを検証するテスト
      it('When: YAML 形式でファイル出力する Then: 有効な YAML ファイルが作成される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('OUTPUT-003');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/OUTPUT-003', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        const outputPath = join(TEST_TEMP_DIR, 'output', 'issue.yaml');

        // When: YAML 形式でファイル出力する
        const result = await fetchAndOutput('https://mycompany.atlassian.net/browse/OUTPUT-003', {
          colorEnabled: false,
          format: 'yaml',
          outputPath,
        });

        // Then: 成功し、ファイルが作成される
        expect(result.isOk()).toBe(true);

        // ファイルが存在し、有効な YAML であること
        const fileContent = await readFile(outputPath, 'utf-8');
        const parsed = parseYaml(fileContent);
        expect(parsed.key).toBe('OUTPUT-003');
        expect(parsed.summary).toBe('テスト Issue サマリー');
      });
    });

    describe('Given: 有効な Confluence ページ URL とファイル出力パス', () => {
      // JSON 形式でファイルに出力できることを検証するテスト
      it('When: JSON 形式でファイル出力する Then: 有効な JSON ファイルが作成される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('11111111');
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/11111111', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/11111111/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/11111111/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        const outputPath = join(TEST_TEMP_DIR, 'output', 'page.json');

        // When: JSON 形式でファイル出力する
        const result = await fetchAndOutput('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/11111111/Test', {
          colorEnabled: false,
          format: 'json',
          outputPath,
        });

        // Then: 成功し、ファイルが作成される
        expect(result.isOk()).toBe(true);

        // ファイルが存在し、有効な JSON であること
        const fileContent = await readFile(outputPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        expect(parsed.id).toBe('11111111');
        expect(parsed.title).toBe('テストページタイトル');
      });

      // Markdown 形式でファイルに出力できることを検証するテスト
      it('When: Markdown 形式でファイル出力する Then: Markdown ファイルが作成される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('22222222');
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/22222222', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/22222222/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/22222222/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        const outputPath = join(TEST_TEMP_DIR, 'output', 'page.md');

        // When: Markdown 形式でファイル出力する
        const result = await fetchAndOutput('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/22222222/Test', {
          colorEnabled: false,
          format: 'markdown',
          outputPath,
        });

        // Then: 成功し、ファイルが作成される
        expect(result.isOk()).toBe(true);

        // ファイルが存在し、Markdown 形式であること
        const fileContent = await readFile(outputPath, 'utf-8');
        expect(fileContent).toContain('# テストページタイトル');
        expect(fileContent).toContain('## Content');
      });

      // YAML 形式でファイルに出力できることを検証するテスト
      it('When: YAML 形式でファイル出力する Then: 有効な YAML ファイルが作成される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidConfluenceResponse('33333333');
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/33333333', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/33333333/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/33333333/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        const outputPath = join(TEST_TEMP_DIR, 'output', 'page.yaml');

        // When: YAML 形式でファイル出力する
        const result = await fetchAndOutput('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/33333333/Test', {
          colorEnabled: false,
          format: 'yaml',
          outputPath,
        });

        // Then: 成功し、ファイルが作成される
        expect(result.isOk()).toBe(true);

        // ファイルが存在し、有効な YAML であること
        const fileContent = await readFile(outputPath, 'utf-8');
        const parsed = parseYaml(fileContent);
        expect(parsed.id).toBe('33333333');
        expect(parsed.title).toBe('テストページタイトル');
      });
    });
  });

  describe('fetchAndSave - ディレクトリ構造保存の詳細検証', () => {
    describe('Given: 有効な Jira Issue URL', () => {
      // Jira Issue がディレクトリ構造で正しく保存されることを検証するテスト
      it('When: ディレクトリ構造で保存する Then: 全ファイルが正しく生成される', async () => {
        // Given: モック API を設定
        const mockResponse = createValidJiraResponse('SAVE-001');
        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/SAVE-001', () => {
            return HttpResponse.json(mockResponse);
          }),
          // 添付ファイルダウンロード API のモック（ダウンロードはスキップされるため空レスポンス）
          http.get('https://example.atlassian.net/rest/api/3/attachment/content/:attachmentId', () => {
            return new HttpResponse(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
              headers: {
                'Content-Length': '4',
                'Content-Type': 'image/png',
              },
            });
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/browse/SAVE-001', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/browse/SAVE-001',
        });

        // Then: 正しい構造で保存される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const dir = result.value.directory;

          // manifest.json の検証
          const manifestContent = await readFile(join(dir, 'manifest.json'), 'utf-8');
          const manifest = JSON.parse(manifestContent);
          expect(manifest.resourceType).toBe('jiraIssue');
          expect(manifest.cliVersion).toBe(TEST_CLI_VERSION);
          expect(manifest.summary.resourceId).toBe('SAVE-001');
          expect(manifest.summary.success).toBe(true);
          expect(manifest.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

          // issue.json の検証
          const issueContent = await readFile(join(dir, 'issue.json'), 'utf-8');
          const issue = JSON.parse(issueContent);
          expect(issue.key).toBe('SAVE-001');
          expect(issue.summary).toBe('テスト Issue サマリー');
          expect(issue.comments).toHaveLength(1);
          expect(issue.changelog).toHaveLength(1);
          expect(issue.attachments).toHaveLength(1);

          // description.txt の検証
          const descContent = await readFile(join(dir, 'description.txt'), 'utf-8');
          expect(descContent).toContain('これはテスト Issue の説明です');

          // changelog.json の検証
          const changelogContent = await readFile(join(dir, 'changelog.json'), 'utf-8');
          const changelog = JSON.parse(changelogContent);
          expect(changelog).toHaveLength(1);
          expect(changelog[0].items[0].field).toBe('status');

          // comments.json の検証
          const commentsContent = await readFile(join(dir, 'comments.json'), 'utf-8');
          const comments = JSON.parse(commentsContent);
          expect(comments).toHaveLength(1);
          expect(comments[0].body).toBe('テストコメント');

          // attachments.json の検証
          const attachmentsContent = await readFile(join(dir, 'attachments.json'), 'utf-8');
          const attachments = JSON.parse(attachmentsContent);
          expect(attachments).toHaveLength(1);
          expect(attachments[0].filename).toBe('image.png');
        }
      });
    });

    describe('Given: 有効な Confluence ページ URL', () => {
      // Confluence ページがディレクトリ構造で正しく保存されることを検証するテスト
      it('When: ディレクトリ構造で保存する Then: 全ファイルが正しく生成される', async () => {
        // Given: モック API を設定（バージョン履歴付き）
        const mockResponse = createValidConfluenceResponse('44444444');
        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/44444444', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/44444444/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/44444444/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave('https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/44444444/SaveTest', {
          baseDir: TEST_TEMP_DIR,
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/44444444/SaveTest',
        });

        // Then: 正しい構造で保存される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const dir = result.value.directory;

          // manifest.json の検証
          const manifestContent = await readFile(join(dir, 'manifest.json'), 'utf-8');
          const manifest = JSON.parse(manifestContent);
          expect(manifest.resourceType).toBe('confluencePage');
          expect(manifest.cliVersion).toBe(TEST_CLI_VERSION);
          expect(manifest.summary.resourceId).toBe('44444444');
          expect(manifest.summary.success).toBe(true);

          // page.json の検証
          const pageContent = await readFile(join(dir, 'page.json'), 'utf-8');
          const page = JSON.parse(pageContent);
          expect(page.id).toBe('44444444');
          expect(page.title).toBe('テストページタイトル');
          expect(page.spaceKey).toBe('DOCS');
          expect(page.currentVersion).toBe(2);

          // content.txt の検証
          const contentTxt = await readFile(join(dir, 'content.txt'), 'utf-8');
          expect(contentTxt).toContain('テスト見出し');
          expect(contentTxt).toContain('これはテストページの本文です');
          // HTML タグが除去されていることを確認
          expect(contentTxt).not.toContain('<h1>');
          expect(contentTxt).not.toContain('<p>');

          // versions.json の検証
          const versionsContent = await readFile(join(dir, 'versions.json'), 'utf-8');
          const versions = JSON.parse(versionsContent);
          expect(Array.isArray(versions)).toBe(true);
        }
      });
    });

    describe('Given: バージョン履歴なし Confluence ページ', () => {
      // 現在の fetchConfluencePage はバージョン一覧を空配列で返すため、
      // versions ディレクトリは生成されないことを検証するテスト
      it('When: ページを保存する（バージョン一覧なし） Then: versions ディレクトリは生成されない', async () => {
        // Given: バージョン一覧なしのモック API を設定
        const mockResponse = createValidConfluenceResponse('55555555');

        server.use(
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/55555555', () => {
            return HttpResponse.json(mockResponse);
          }),
          // バージョン API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/55555555/version', () => {
            return HttpResponse.json({ results: [] });
          }),
          // 添付ファイル API のモック
          http.get('https://mycompany.atlassian.net/wiki/rest/api/content/55555555/child/attachment', () => {
            return HttpResponse.json({ results: [] });
          }),
        );

        // When: fetchAndSave を呼び出す
        const result = await fetchAndSave(
          'https://mycompany.atlassian.net/wiki/spaces/VER/pages/55555555/VersionTest',
          {
            baseDir: TEST_TEMP_DIR,
            cliVersion: TEST_CLI_VERSION,
            sourceUrl: 'https://mycompany.atlassian.net/wiki/spaces/VER/pages/55555555/VersionTest',
          },
        );

        // Then: 正常に保存されるが、versions ディレクトリは生成されない
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const dir = result.value.directory;
          const versionsDir = join(dir, 'versions');

          // versions ディレクトリが存在しないこと
          let versionsExists = false;
          try {
            await readFile(join(versionsDir, 'v1', 'content.json'), 'utf-8');
            versionsExists = true;
          } catch {
            // ディレクトリが存在しない場合は期待通り
          }
          expect(versionsExists).toBe(false);

          // page.json が正しく保存されていること
          const pageContent = await readFile(join(dir, 'page.json'), 'utf-8');
          const page = JSON.parse(pageContent);
          expect(page.id).toBe('55555555');
          expect(page.versions).toEqual([]);
        }
      });
    });
  });

  describe('出力形式の互換性', () => {
    describe('Given: 特殊文字を含むデータ', () => {
      // 特殊文字（日本語、絵文字、改行など）が正しく処理されることを検証するテスト
      it('When: 日本語や特殊文字を含む Issue を出力する Then: 文字化けせずに保存される', async () => {
        // Given: 特殊文字を含むモック API を設定
        const mockResponse = {
          changelog: { histories: [] },
          fields: {
            attachment: [],
            comment: { comments: [], total: 0 },
            description: {
              content: [
                {
                  content: [
                    {
                      text: '日本語テスト 🚀 特殊文字 <>&"\' 改行\nテスト',
                      type: 'text',
                    },
                  ],
                  type: 'paragraph',
                },
              ],
              type: 'doc',
              version: 1,
            },
            summary: 'テスト📝日本語サマリー',
          },
          key: 'SPECIAL-001',
        };

        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/SPECIAL-001', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        const jsonPath = join(TEST_TEMP_DIR, 'special.json');
        const yamlPath = join(TEST_TEMP_DIR, 'special.yaml');

        // When: 各形式で出力する
        const jsonResult = await fetchAndOutput('https://mycompany.atlassian.net/browse/SPECIAL-001', {
          colorEnabled: false,
          format: 'json',
          outputPath: jsonPath,
        });

        const yamlResult = await fetchAndOutput('https://mycompany.atlassian.net/browse/SPECIAL-001', {
          colorEnabled: false,
          format: 'yaml',
          outputPath: yamlPath,
        });

        // Then: 文字化けせずに保存される
        expect(jsonResult.isOk()).toBe(true);
        expect(yamlResult.isOk()).toBe(true);

        const jsonContent = await readFile(jsonPath, 'utf-8');
        const parsed = JSON.parse(jsonContent);
        expect(parsed.summary).toContain('テスト');
        expect(parsed.summary).toContain('日本語');

        const yamlContent = await readFile(yamlPath, 'utf-8');
        const yamlParsed = parseYaml(yamlContent);
        expect(yamlParsed.summary).toContain('テスト');
        expect(yamlParsed.summary).toContain('日本語');
      });
    });

    describe('Given: 空のフィールドを含むデータ', () => {
      // 空の配列や null 値が正しく処理されることを検証するテスト
      it('When: 空のフィールドを含む Issue を出力する Then: 正しく null や空配列として保存される', async () => {
        // Given: 空のフィールドを含むモック API を設定
        const mockResponse = {
          changelog: { histories: [] },
          fields: {
            attachment: [],
            comment: { comments: [], total: 0 },
            description: null,
            summary: '空フィールドテスト',
          },
          key: 'EMPTY-001',
        };

        server.use(
          http.get('https://mycompany.atlassian.net/rest/api/3/issue/EMPTY-001', () => {
            return HttpResponse.json(mockResponse);
          }),
        );

        const jsonPath = join(TEST_TEMP_DIR, 'empty.json');

        // When: JSON 形式で出力する
        const result = await fetchAndOutput('https://mycompany.atlassian.net/browse/EMPTY-001', {
          colorEnabled: false,
          format: 'json',
          outputPath: jsonPath,
        });

        // Then: 正しく null や空配列として保存される
        expect(result.isOk()).toBe(true);

        const jsonContent = await readFile(jsonPath, 'utf-8');
        const parsed = JSON.parse(jsonContent);
        expect(parsed.description).toBeNull();
        expect(parsed.comments).toEqual([]);
        expect(parsed.changelog).toEqual([]);
        expect(parsed.attachments).toEqual([]);
      });
    });
  });
});
