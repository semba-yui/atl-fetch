import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_CLI_VERSION } from '../../../tests/helpers/version.js';
import type { ConfluencePage } from '../../types/confluence.js';
import type { JiraIssue } from '../../types/jira.js';

// モックの設定
vi.mock('../url-parser/url-parser.js');
vi.mock('../jira/jira-service.js');
vi.mock('../confluence/confluence-service.js');
vi.mock('../output/output-service.js');
vi.mock('../storage/storage-service.js');
vi.mock('../text-converter/text-converter.js');

import { err, ok } from 'neverthrow';
import { fetchConfluencePage } from '../confluence/confluence-service.js';
import { fetchJiraIssue } from '../jira/jira-service.js';
import { formatConfluencePage, formatJiraIssue, writeToFile } from '../output/output-service.js';
import { saveConfluencePage, saveConfluenceVersions, saveJiraIssue } from '../storage/storage-service.js';
import { convertAdfToPlainText, convertStorageFormatToPlainText } from '../text-converter/text-converter.js';
import { parseUrl } from '../url-parser/url-parser.js';
import { fetchAndOutput, fetchAndSave, fetchResource } from './fetch-service.js';

describe('fetchResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given: 有効な Jira Issue URL が渡される', () => {
    // Jira URL から Issue 情報を取得できることを確認するテスト
    it('When: fetchResource を呼び出す Then: Jira Issue データを返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));

      const result = await fetchResource(url);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.type).toBe('jira');
        expect(result.value.data).toEqual(mockIssue);
      }
      expect(fetchJiraIssue).toHaveBeenCalledWith('mycompany', 'PROJ-123');
    });
  });

  describe('Given: 有効な Confluence ページ URL が渡される', () => {
    // Confluence URL から ページ情報を取得できることを確認するテスト
    it('When: fetchResource を呼び出す Then: Confluence ページデータを返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';
      const mockPage: ConfluencePage = {
        attachments: [],
        body: '<p>Test content</p>',
        currentVersion: 1,
        id: '123456789',
        spaceKey: 'DOCS',
        title: 'Test Page',
        versions: [],
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(ok(mockPage));

      const result = await fetchResource(url);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.type).toBe('confluence');
        expect(result.value.data).toEqual(mockPage);
      }
      expect(fetchConfluencePage).toHaveBeenCalledWith('mycompany', '123456789');
    });
  });

  describe('Given: 不正な URL が渡される', () => {
    // URL パースエラー時にエラーを返すことを確認するテスト
    it('When: fetchResource を呼び出す Then: URL_PARSE_ERROR を返す', async () => {
      const url = 'https://invalid-url.com/test';

      vi.mocked(parseUrl).mockReturnValue(
        err({
          kind: 'UNSUPPORTED_HOST',
          message: 'Atlassian Cloud 以外の URL はサポートされていません',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('URL_PARSE_ERROR');
      }
      expect(fetchJiraIssue).not.toHaveBeenCalled();
      expect(fetchConfluencePage).not.toHaveBeenCalled();
    });
  });

  describe('Given: Jira Issue が見つからない', () => {
    // Jira API が 404 を返した場合にエラーを返すことを確認するテスト
    it('When: fetchResource を呼び出す Then: NOT_FOUND エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/NOTEXIST-999';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'NOTEXIST',
          resourceId: 'NOTEXIST-999',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(
        err({
          kind: 'NOT_FOUND',
          message: '指定された Issue が見つかりません。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('NOT_FOUND');
      }
    });
  });

  describe('Given: Confluence ページが見つからない', () => {
    // Confluence API が 404 を返した場合にエラーを返すことを確認するテスト
    it('When: fetchResource を呼び出す Then: NOT_FOUND エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/999999999/NotFound';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '999999999',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(
        err({
          kind: 'NOT_FOUND',
          message: '指定されたページが見つかりません。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('NOT_FOUND');
      }
    });
  });

  describe('Given: Jira Issue へのアクセス権がない', () => {
    // Jira API が 403 を返した場合にエラーを返すことを確認するテスト
    it('When: fetchResource を呼び出す Then: FORBIDDEN エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/SECRET-123';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'SECRET',
          resourceId: 'SECRET-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(
        err({
          kind: 'FORBIDDEN',
          message: 'この Issue へのアクセス権限がありません。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FORBIDDEN');
      }
    });
  });

  describe('Given: Confluence ページへのアクセス権がない', () => {
    // Confluence API が 403 を返した場合にエラーを返すことを確認するテスト
    it('When: fetchResource を呼び出す Then: FORBIDDEN エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/SECRET/pages/111111111/Secret';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '111111111',
          spaceKey: 'SECRET',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(
        err({
          kind: 'FORBIDDEN',
          message: 'このページへのアクセス権限がありません。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FORBIDDEN');
      }
    });
  });

  describe('Given: 認証エラーが発生する', () => {
    // 認証に失敗した場合にエラーを返すことを確認するテスト
    it('When: Jira への認証に失敗する Then: AUTH_FAILED エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(
        err({
          kind: 'AUTH_FAILED',
          message: '認証に失敗しました。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('AUTH_FAILED');
      }
    });
  });

  describe('Given: ネットワークエラーが発生する', () => {
    // ネットワークエラーが発生した場合にエラーを返すことを確認するテスト
    it('When: Jira API へのリクエストに失敗する Then: NETWORK_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(
        err({
          kind: 'NETWORK_ERROR',
          message: 'ネットワークエラーが発生しました。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('NETWORK_ERROR');
      }
    });
  });

  describe('Given: Jira API のレスポンスパースに失敗する', () => {
    // Jira API のレスポンスがパースできない場合にエラーを返すことを確認するテスト
    it('When: PARSE_ERROR が発生する Then: JIRA_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(
        err({
          kind: 'PARSE_ERROR',
          message: 'API レスポンスのパースに失敗しました。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('JIRA_ERROR');
      }
    });
  });

  describe('Given: Confluence API のレスポンスパースに失敗する', () => {
    // Confluence API のレスポンスがパースできない場合にエラーを返すことを確認するテスト
    it('When: PARSE_ERROR が発生する Then: CONFLUENCE_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(
        err({
          kind: 'PARSE_ERROR',
          message: 'API レスポンスのパースに失敗しました。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('CONFLUENCE_ERROR');
      }
    });
  });

  describe('Given: Confluence 認証エラーが発生する', () => {
    // Confluence 認証に失敗した場合にエラーを返すことを確認するテスト
    it('When: Confluence への認証に失敗する Then: AUTH_FAILED エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(
        err({
          kind: 'AUTH_FAILED',
          message: '認証に失敗しました。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('AUTH_FAILED');
      }
    });
  });

  describe('Given: Confluence ネットワークエラーが発生する', () => {
    // Confluence へのネットワークエラーが発生した場合にエラーを返すことを確認するテスト
    it('When: Confluence API へのリクエストに失敗する Then: NETWORK_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(
        err({
          kind: 'NETWORK_ERROR',
          message: 'ネットワークエラーが発生しました。',
        }),
      );

      const result = await fetchResource(url);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('NETWORK_ERROR');
      }
    });
  });
});

describe('fetchAndOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Jira Issue を JSON 形式で標準出力に出力するテスト
  describe('Given: 有効な Jira Issue URL と JSON 形式が指定される', () => {
    it('When: fetchAndOutput を呼び出す Then: JSON 形式でフォーマットされた文字列を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };
      const formattedJson = JSON.stringify(mockIssue, null, 2);

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(formatJiraIssue).mockReturnValue(ok(formattedJson));

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'json' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(formattedJson);
      }
      expect(formatJiraIssue).toHaveBeenCalledWith(mockIssue, { format: 'json' });
      expect(writeToFile).not.toHaveBeenCalled();
    });
  });

  // Jira Issue を Markdown 形式でフォーマットするテスト
  describe('Given: 有効な Jira Issue URL と Markdown 形式が指定される', () => {
    it('When: fetchAndOutput を呼び出す Then: Markdown 形式でフォーマットされた文字列を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };
      const formattedMarkdown = '# PROJ-123: Test Issue\n\n## Description\n\nTest description';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(formatJiraIssue).mockReturnValue(ok(formattedMarkdown));

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'markdown' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(formattedMarkdown);
      }
      expect(formatJiraIssue).toHaveBeenCalledWith(mockIssue, { format: 'markdown' });
    });
  });

  // Jira Issue を YAML 形式でフォーマットするテスト
  describe('Given: 有効な Jira Issue URL と YAML 形式が指定される', () => {
    it('When: fetchAndOutput を呼び出す Then: YAML 形式でフォーマットされた文字列を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };
      const formattedYaml = 'key: PROJ-123\nsummary: Test Issue\ndescription: Test description\n';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(formatJiraIssue).mockReturnValue(ok(formattedYaml));

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'yaml' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(formattedYaml);
      }
      expect(formatJiraIssue).toHaveBeenCalledWith(mockIssue, { format: 'yaml' });
    });
  });

  // Confluence ページを JSON 形式でフォーマットするテスト
  describe('Given: 有効な Confluence URL と JSON 形式が指定される', () => {
    it('When: fetchAndOutput を呼び出す Then: JSON 形式でフォーマットされた文字列を返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';
      const mockPage: ConfluencePage = {
        attachments: [],
        body: '<p>Test content</p>',
        currentVersion: 1,
        id: '123456789',
        spaceKey: 'DOCS',
        title: 'Test Page',
        versions: [],
      };
      const formattedJson = JSON.stringify(mockPage, null, 2);

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(ok(mockPage));
      vi.mocked(formatConfluencePage).mockReturnValue(ok(formattedJson));

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'json' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(formattedJson);
      }
      expect(formatConfluencePage).toHaveBeenCalledWith(mockPage, { format: 'json' });
    });
  });

  // ファイルに出力するテスト
  describe('Given: 出力先ファイルパスが指定される', () => {
    it('When: fetchAndOutput を呼び出す Then: ファイルに書き込んで結果を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const outputPath = '/tmp/output.json';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };
      const formattedJson = JSON.stringify(mockIssue, null, 2);

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(formatJiraIssue).mockReturnValue(ok(formattedJson));
      vi.mocked(writeToFile).mockResolvedValue(ok(undefined));

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'json', outputPath });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(formattedJson);
      }
      expect(writeToFile).toHaveBeenCalledWith(formattedJson, outputPath);
    });
  });

  // ファイル書き込みエラーのテスト
  describe('Given: ファイル書き込みに失敗する', () => {
    it('When: fetchAndOutput を呼び出す Then: OUTPUT_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const outputPath = '/invalid/path/output.json';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };
      const formattedJson = JSON.stringify(mockIssue, null, 2);

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(formatJiraIssue).mockReturnValue(ok(formattedJson));
      vi.mocked(writeToFile).mockResolvedValue(
        err({
          kind: 'WRITE_FAILED',
          message: 'ファイルの書き込みに失敗しました',
        }),
      );

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'json', outputPath });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('OUTPUT_ERROR');
      }
    });
  });

  // URL パースエラーのテスト
  describe('Given: 不正な URL が渡される', () => {
    it('When: fetchAndOutput を呼び出す Then: URL_PARSE_ERROR を返す', async () => {
      const url = 'https://invalid-url.com/test';

      vi.mocked(parseUrl).mockReturnValue(
        err({
          kind: 'UNSUPPORTED_HOST',
          message: 'Atlassian Cloud 以外の URL はサポートされていません',
        }),
      );

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'json' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('URL_PARSE_ERROR');
      }
    });
  });

  // フォーマットエラーのテスト
  describe('Given: フォーマット処理に失敗する', () => {
    it('When: fetchAndOutput を呼び出す Then: OUTPUT_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(formatJiraIssue).mockReturnValue(
        err({
          kind: 'INVALID_FORMAT',
          message: '不正な形式が指定されました',
        }),
      );

      const result = await fetchAndOutput(url, { colorEnabled: true, format: 'json' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('OUTPUT_ERROR');
      }
    });
  });
});

describe('fetchAndSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Jira Issue をディレクトリ構造で保存するテスト
  describe('Given: 有効な Jira Issue URL とダウンロードオプションが指定される', () => {
    it('When: fetchAndSave を呼び出す Then: ディレクトリ構造で保存して結果を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [
          {
            contentUrl: 'https://example.com/file.png',
            filename: 'file.png',
            id: 'att-1',
            mimeType: 'image/png',
            size: 1024,
          },
        ],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(convertAdfToPlainText).mockReturnValue('Test description');
      vi.mocked(saveJiraIssue).mockResolvedValue(
        ok({
          directory: '/tmp/output/jira/PROJ-123',
          manifest: {
            attachments: [],
            cliVersion: TEST_CLI_VERSION,
            fetchedAt: '2024-01-01T00:00:00.000Z',
            issues: [],
            resourceType: 'jiraIssue',
            sourceUrl: url,
            summary: {
              resourceId: 'PROJ-123',
              success: true,
              title: 'Test Issue',
            },
          },
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.directory).toBe('/tmp/output/jira/PROJ-123');
        expect(result.value.manifest.resourceType).toBe('jiraIssue');
      }
      expect(saveJiraIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: mockIssue.attachments,
          changelog: mockIssue.changelog,
          comments: mockIssue.comments,
          description: mockIssue.description,
          descriptionPlainText: 'Test description',
          key: 'PROJ-123',
          summary: 'Test Issue',
        }),
        expect.objectContaining({
          baseDir: '/tmp/output',
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: url,
        }),
      );
    });
  });

  // Confluence ページをディレクトリ構造で保存するテスト
  describe('Given: 有効な Confluence ページ URL とダウンロードオプションが指定される', () => {
    it('When: fetchAndSave を呼び出す Then: ディレクトリ構造で保存して結果を返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';
      const mockPage: ConfluencePage = {
        attachments: [
          {
            downloadUrl: 'https://example.com/image.png',
            fileSize: 2048,
            id: 'att-1',
            mediaType: 'image/png',
            title: 'image.png',
          },
        ],
        body: '<p>Test content</p>',
        currentVersion: 2,
        id: '123456789',
        spaceKey: 'DOCS',
        title: 'Test Page',
        versions: [
          { body: '<p>Version 1</p>', by: 'User1', message: null, number: 1, when: '2024-01-01T00:00:00Z' },
          { body: '<p>Test content</p>', by: 'User2', message: 'Updated', number: 2, when: '2024-01-02T00:00:00Z' },
        ],
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(ok(mockPage));
      vi.mocked(convertStorageFormatToPlainText).mockReturnValue('Test content');
      vi.mocked(saveConfluencePage).mockResolvedValue(
        ok({
          directory: '/tmp/output/confluence/123456789',
          manifest: {
            attachments: [],
            cliVersion: TEST_CLI_VERSION,
            fetchedAt: '2024-01-01T00:00:00.000Z',
            issues: [],
            resourceType: 'confluencePage',
            sourceUrl: url,
            summary: {
              resourceId: '123456789',
              success: true,
              title: 'Test Page',
            },
          },
        }),
      );
      vi.mocked(saveConfluenceVersions).mockResolvedValue(ok(undefined));

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.directory).toBe('/tmp/output/confluence/123456789');
        expect(result.value.manifest.resourceType).toBe('confluencePage');
      }
      expect(saveConfluencePage).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: mockPage.attachments,
          body: mockPage.body,
          bodyPlainText: 'Test content',
          currentVersion: 2,
          id: '123456789',
          spaceKey: 'DOCS',
          title: 'Test Page',
          versions: mockPage.versions,
        }),
        expect.objectContaining({
          baseDir: '/tmp/output',
          cliVersion: TEST_CLI_VERSION,
          sourceUrl: url,
        }),
      );
      expect(saveConfluenceVersions).toHaveBeenCalledWith(mockPage.versions, '/tmp/output/confluence/123456789');
    });
  });

  // URL パースエラーのテスト
  describe('Given: 不正な URL が渡される', () => {
    it('When: fetchAndSave を呼び出す Then: URL_PARSE_ERROR を返す', async () => {
      const url = 'https://invalid-url.com/test';

      vi.mocked(parseUrl).mockReturnValue(
        err({
          kind: 'UNSUPPORTED_HOST',
          message: 'Atlassian Cloud 以外の URL はサポートされていません',
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('URL_PARSE_ERROR');
      }
      expect(saveJiraIssue).not.toHaveBeenCalled();
      expect(saveConfluencePage).not.toHaveBeenCalled();
    });
  });

  // Jira Issue 取得エラーのテスト
  describe('Given: Jira Issue が見つからない', () => {
    it('When: fetchAndSave を呼び出す Then: NOT_FOUND エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/NOTEXIST-999';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'NOTEXIST',
          resourceId: 'NOTEXIST-999',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(
        err({
          kind: 'NOT_FOUND',
          message: '指定された Issue が見つかりません。',
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('NOT_FOUND');
      }
      expect(saveJiraIssue).not.toHaveBeenCalled();
    });
  });

  // ストレージ保存エラーのテスト
  describe('Given: ストレージ保存に失敗する', () => {
    it('When: Jira Issue の保存に失敗する Then: STORAGE_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        key: 'PROJ-123',
        summary: 'Test Issue',
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      vi.mocked(convertAdfToPlainText).mockReturnValue('Test description');
      vi.mocked(saveJiraIssue).mockResolvedValue(
        err({
          kind: 'DIRECTORY_CREATE_FAILED',
          message: 'ディレクトリの作成に失敗しました',
          path: '/tmp/output/jira/PROJ-123',
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('STORAGE_ERROR');
      }
    });
  });

  // Confluence バージョン保存エラーのテスト
  describe('Given: Confluence バージョン保存に失敗する', () => {
    it('When: saveConfluenceVersions が失敗する Then: STORAGE_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';
      const mockPage: ConfluencePage = {
        attachments: [],
        body: '<p>Test content</p>',
        currentVersion: 1,
        id: '123456789',
        spaceKey: 'DOCS',
        title: 'Test Page',
        versions: [
          { body: '<p>Test content</p>', by: 'User1', message: null, number: 1, when: '2024-01-01T00:00:00Z' },
        ],
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(ok(mockPage));
      vi.mocked(convertStorageFormatToPlainText).mockReturnValue('Test content');
      vi.mocked(saveConfluencePage).mockResolvedValue(
        ok({
          directory: '/tmp/output/confluence/123456789',
          manifest: {
            attachments: [],
            cliVersion: TEST_CLI_VERSION,
            fetchedAt: '2024-01-01T00:00:00.000Z',
            issues: [],
            resourceType: 'confluencePage',
            sourceUrl: url,
            summary: {
              resourceId: '123456789',
              success: true,
              title: 'Test Page',
            },
          },
        }),
      );
      vi.mocked(saveConfluenceVersions).mockResolvedValue(
        err({
          kind: 'FILE_WRITE_FAILED',
          message: 'ファイルの書き込みに失敗しました',
          path: '/tmp/output/confluence/123456789/versions/v1/content.json',
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('STORAGE_ERROR');
      }
    });
  });

  // 説明が null の場合のテスト
  describe('Given: 説明が null の Jira Issue を保存する', () => {
    it('When: description が null Then: descriptionPlainText も null になる', async () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      const mockIssue: JiraIssue = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        key: 'PROJ-123',
        summary: 'Test Issue',
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          projectKey: 'PROJ',
          resourceId: 'PROJ-123',
          type: 'jira',
        }),
      );
      vi.mocked(fetchJiraIssue).mockResolvedValue(ok(mockIssue));
      // description が null なので convertAdfToPlainText は呼ばれない
      vi.mocked(saveJiraIssue).mockResolvedValue(
        ok({
          directory: '/tmp/output/jira/PROJ-123',
          manifest: {
            attachments: [],
            cliVersion: TEST_CLI_VERSION,
            fetchedAt: '2024-01-01T00:00:00.000Z',
            issues: [],
            resourceType: 'jiraIssue',
            sourceUrl: url,
            summary: {
              resourceId: 'PROJ-123',
              success: true,
              title: 'Test Issue',
            },
          },
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isOk()).toBe(true);
      expect(convertAdfToPlainText).not.toHaveBeenCalled();
      expect(saveJiraIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          descriptionPlainText: null,
        }),
        expect.anything(),
      );
    });
  });

  // Confluence ページ保存エラーのテスト
  describe('Given: Confluence ページ保存に失敗する', () => {
    it('When: saveConfluencePage が失敗する Then: STORAGE_ERROR を返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Title';
      const mockPage: ConfluencePage = {
        attachments: [],
        body: '<p>Test content</p>',
        currentVersion: 1,
        id: '123456789',
        spaceKey: 'DOCS',
        title: 'Test Page',
        versions: [],
      };

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '123456789',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(ok(mockPage));
      vi.mocked(convertStorageFormatToPlainText).mockReturnValue('Test content');
      vi.mocked(saveConfluencePage).mockResolvedValue(
        err({
          kind: 'DIRECTORY_CREATE_FAILED',
          message: 'ディレクトリの作成に失敗しました',
          path: '/tmp/output/confluence/123456789',
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('STORAGE_ERROR');
      }
      expect(saveConfluenceVersions).not.toHaveBeenCalled();
    });
  });

  // Confluence ページ取得エラーのテスト
  describe('Given: Confluence ページが見つからない', () => {
    it('When: fetchAndSave を呼び出す Then: NOT_FOUND エラーを返す', async () => {
      const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/999999999/NotFound';

      vi.mocked(parseUrl).mockReturnValue(
        ok({
          organization: 'mycompany',
          resourceId: '999999999',
          spaceKey: 'DOCS',
          type: 'confluence',
        }),
      );
      vi.mocked(fetchConfluencePage).mockResolvedValue(
        err({
          kind: 'NOT_FOUND',
          message: '指定されたページが見つかりません。',
        }),
      );

      const result = await fetchAndSave(url, {
        baseDir: '/tmp/output',
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: url,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('NOT_FOUND');
      }
      expect(saveConfluencePage).not.toHaveBeenCalled();
    });
  });
});
