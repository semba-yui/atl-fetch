/**
 * OutputService のテスト
 *
 * TDD に従い、Given When Then パターンで記述する。
 */

import { dirname } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// FilePort のモック
vi.mock('../../ports/file/file-port.js', () => ({
  ensureDir: vi.fn(),
  writeFileContent: vi.fn(),
}));

import { err, ok } from 'neverthrow';

import { ensureDir, writeFileContent } from '../../ports/file/file-port.js';
import type { ConfluencePage } from '../../types/confluence.js';
import type { JiraIssue } from '../../types/jira.js';
import { formatConfluencePage, formatJiraIssue, showProgress, writeToFile } from './output-service.js';

// テスト用の Jira Issue データ
const createTestJiraIssue = (overrides: Partial<JiraIssue> = {}): JiraIssue => ({
  attachments: [
    {
      contentUrl: 'https://example.com/test.png',
      filename: 'test.png',
      id: '1',
      mimeType: 'image/png',
      size: 1024,
    },
  ],
  changelog: [
    {
      author: 'テストユーザー',
      created: '2024-01-01T00:00:00.000Z',
      id: '1',
      items: [
        {
          field: 'status',
          fromString: 'Open',
          toString: 'In Progress',
        },
      ],
    },
  ],
  comments: [
    {
      author: 'テストユーザー',
      body: 'テストコメント',
      created: '2024-01-01T00:00:00.000Z',
      id: '1',
      updated: '2024-01-01T00:00:00.000Z',
    },
  ],
  description: 'これはテストの説明です。',
  key: 'TEST-123',
  summary: 'テスト Issue',
  ...overrides,
});

// テスト用の Confluence ページデータ
const createTestConfluencePage = (overrides: Partial<ConfluencePage> = {}): ConfluencePage => ({
  attachments: [
    {
      downloadUrl: 'https://example.com/diagram.png',
      fileSize: 2048,
      id: '1',
      mediaType: 'image/png',
      title: 'diagram.png',
    },
  ],
  body: '<p>これはテストの本文です。</p>',
  currentVersion: 1,
  id: '12345',
  spaceKey: 'TEST',
  title: 'テストページ',
  versions: [
    {
      by: 'テストユーザー',
      message: '初版作成',
      number: 1,
      when: '2024-01-01T00:00:00.000Z',
    },
  ],
  ...overrides,
});

describe('OutputService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatJiraIssue', () => {
    describe('JSON 形式での出力', () => {
      // Jira Issue を JSON 形式で出力できること
      it('should format Jira Issue as valid JSON', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: JSON 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'json' });

        // Then: 成功結果が返される
        expect(result.isOk()).toBe(true);
      });

      // JSON 出力が有効な JSON 文字列であること
      it('should return parseable JSON string', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: JSON 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'json' });

        // Then: 有効な JSON として解析できる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed).toBeDefined();
        }
      });

      // JSON 出力に全フィールドが含まれること
      it('should include all Jira Issue fields in JSON output', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: JSON 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'json' });

        // Then: 全フィールドが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.key).toBe('TEST-123');
          expect(parsed.summary).toBe('テスト Issue');
          expect(parsed.description).toBe('これはテストの説明です。');
          expect(parsed.comments).toHaveLength(1);
          expect(parsed.changelog).toHaveLength(1);
          expect(parsed.attachments).toHaveLength(1);
        }
      });

      // description が null の場合も正しく処理されること
      it('should handle null description correctly', () => {
        // Given: description が null の Jira Issue が与えられた場合
        const issue = createTestJiraIssue({ description: null });

        // When: JSON 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'json' });

        // Then: description が null として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.description).toBeNull();
        }
      });

      // 空の配列フィールドも正しく処理されること
      it('should handle empty arrays correctly', () => {
        // Given: 空の配列を持つ Jira Issue が与えられた場合
        const issue = createTestJiraIssue({
          attachments: [],
          changelog: [],
          comments: [],
        });

        // When: JSON 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'json' });

        // Then: 空の配列として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.comments).toEqual([]);
          expect(parsed.changelog).toEqual([]);
          expect(parsed.attachments).toEqual([]);
        }
      });

      // インデントされた読みやすい JSON が出力されること
      it('should output pretty-printed JSON with 2-space indentation', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: JSON 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'json' });

        // Then: 2スペースでインデントされている
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('  "key"');
        }
      });
    });

    describe('Markdown 形式での出力', () => {
      // Jira Issue を Markdown 形式で出力できること
      it('should format Jira Issue as Markdown', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: 成功結果が返される
        expect(result.isOk()).toBe(true);
      });

      // Markdown 出力にタイトル（H1）が含まれること
      it('should include issue key and summary as H1 title', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: H1 形式でタイトルが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('# TEST-123: テスト Issue');
        }
      });

      // Markdown 出力に説明セクションが含まれること
      it('should include description section', () => {
        // Given: 説明付きの Jira Issue が与えられた場合
        const issue = createTestJiraIssue({ description: 'これはテストの説明です。' });

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: 説明セクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Description');
          expect(result.value).toContain('これはテストの説明です。');
        }
      });

      // description が null の場合は説明セクションが「N/A」になること
      it('should show N/A when description is null', () => {
        // Given: description が null の Jira Issue が与えられた場合
        const issue = createTestJiraIssue({ description: null });

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: 説明セクションに N/A が表示される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Description');
          expect(result.value).toContain('N/A');
        }
      });

      // Markdown 出力にコメントセクションが含まれること
      it('should include comments section', () => {
        // Given: コメント付きの Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: コメントセクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Comments');
          expect(result.value).toContain('テストユーザー');
          expect(result.value).toContain('テストコメント');
        }
      });

      // コメントがない場合も正しく処理されること
      it('should handle empty comments correctly', () => {
        // Given: コメントがない Jira Issue が与えられた場合
        const issue = createTestJiraIssue({ comments: [] });

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: コメントセクションに「No comments」が表示される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Comments');
          expect(result.value).toContain('No comments');
        }
      });

      // Markdown 出力に変更履歴セクションが含まれること
      it('should include changelog section', () => {
        // Given: 変更履歴付きの Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: 変更履歴セクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Changelog');
          expect(result.value).toContain('status');
          expect(result.value).toContain('Open');
          expect(result.value).toContain('In Progress');
        }
      });

      // 変更履歴がない場合も正しく処理されること
      it('should handle empty changelog correctly', () => {
        // Given: 変更履歴がない Jira Issue が与えられた場合
        const issue = createTestJiraIssue({ changelog: [] });

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: 変更履歴セクションに「No changes」が表示される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Changelog');
          expect(result.value).toContain('No changes');
        }
      });

      // Markdown 出力に添付ファイルセクションが含まれること
      it('should include attachments section', () => {
        // Given: 添付ファイル付きの Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: 添付ファイルセクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Attachments');
          expect(result.value).toContain('test.png');
        }
      });

      // 添付ファイルがない場合も正しく処理されること
      it('should handle empty attachments correctly', () => {
        // Given: 添付ファイルがない Jira Issue が与えられた場合
        const issue = createTestJiraIssue({ attachments: [] });

        // When: Markdown 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'markdown' });

        // Then: 添付ファイルセクションに「No attachments」が表示される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Attachments');
          expect(result.value).toContain('No attachments');
        }
      });
    });

    describe('YAML 形式での出力', () => {
      // Jira Issue を YAML 形式で出力できること
      it('should format Jira Issue as valid YAML', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: YAML 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'yaml' });

        // Then: 成功結果が返される
        expect(result.isOk()).toBe(true);
      });

      // YAML 出力に全フィールドが含まれること
      it('should include all Jira Issue fields in YAML output', () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: YAML 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'yaml' });

        // Then: 全フィールドが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('key: TEST-123');
          expect(result.value).toContain('summary: テスト Issue');
          expect(result.value).toContain('description: これはテストの説明です。');
        }
      });

      // description が null の場合も正しく YAML 出力されること
      it('should handle null description correctly in YAML', () => {
        // Given: description が null の Jira Issue が与えられた場合
        const issue = createTestJiraIssue({ description: null });

        // When: YAML 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'yaml' });

        // Then: description が null として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('description: null');
        }
      });

      // 空の配列フィールドも正しく YAML 出力されること
      it('should handle empty arrays correctly in YAML', () => {
        // Given: 空の配列を持つ Jira Issue が与えられた場合
        const issue = createTestJiraIssue({
          attachments: [],
          changelog: [],
          comments: [],
        });

        // When: YAML 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'yaml' });

        // Then: 空の配列として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('comments: []');
          expect(result.value).toContain('changelog: []');
          expect(result.value).toContain('attachments: []');
        }
      });

      // YAML 出力がパースできる形式であること
      it('should output parseable YAML', async () => {
        // Given: 有効な Jira Issue が与えられた場合
        const issue = createTestJiraIssue();

        // When: YAML 形式でフォーマットする
        const result = formatJiraIssue(issue, { format: 'yaml' });

        // Then: 有効な YAML として解析できる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const { parse } = await import('yaml');
          const parsed = parse(result.value);
          expect(parsed).toBeDefined();
          expect(parsed.key).toBe('TEST-123');
        }
      });
    });
  });

  describe('formatConfluencePage', () => {
    describe('JSON 形式での出力', () => {
      // Confluence ページを JSON 形式で出力できること
      it('should format Confluence page as valid JSON', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: JSON 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'json' });

        // Then: 成功結果が返される
        expect(result.isOk()).toBe(true);
      });

      // JSON 出力が有効な JSON 文字列であること
      it('should return parseable JSON string', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: JSON 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'json' });

        // Then: 有効な JSON として解析できる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed).toBeDefined();
        }
      });

      // JSON 出力に全フィールドが含まれること
      it('should include all Confluence page fields in JSON output', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: JSON 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'json' });

        // Then: 全フィールドが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.id).toBe('12345');
          expect(parsed.title).toBe('テストページ');
          expect(parsed.body).toBe('<p>これはテストの本文です。</p>');
          expect(parsed.spaceKey).toBe('TEST');
          expect(parsed.currentVersion).toBe(1);
          expect(parsed.versions).toHaveLength(1);
          expect(parsed.attachments).toHaveLength(1);
        }
      });

      // バージョンに本文が含まれる場合も正しく処理されること
      it('should handle version with body correctly', () => {
        // Given: 本文付きのバージョンを持つ Confluence ページが与えられた場合
        const page = createTestConfluencePage({
          versions: [
            {
              body: '<p>バージョン 1 の本文</p>',
              by: 'テストユーザー',
              message: '初版作成',
              number: 1,
              when: '2024-01-01T00:00:00.000Z',
            },
          ],
        });

        // When: JSON 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'json' });

        // Then: バージョンの本文も含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.versions[0].body).toBe('<p>バージョン 1 の本文</p>');
        }
      });

      // message が null の場合も正しく処理されること
      it('should handle null version message correctly', () => {
        // Given: message が null のバージョンを持つ Confluence ページが与えられた場合
        const page = createTestConfluencePage({
          versions: [
            {
              by: 'テストユーザー',
              message: null,
              number: 1,
              when: '2024-01-01T00:00:00.000Z',
            },
          ],
        });

        // When: JSON 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'json' });

        // Then: message が null として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.versions[0].message).toBeNull();
        }
      });

      // 空の配列フィールドも正しく処理されること
      it('should handle empty arrays correctly', () => {
        // Given: 空の配列を持つ Confluence ページが与えられた場合
        const page = createTestConfluencePage({
          attachments: [],
          versions: [],
        });

        // When: JSON 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'json' });

        // Then: 空の配列として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parsed = JSON.parse(result.value);
          expect(parsed.versions).toEqual([]);
          expect(parsed.attachments).toEqual([]);
        }
      });
    });

    describe('Markdown 形式での出力', () => {
      // Confluence ページを Markdown 形式で出力できること
      it('should format Confluence page as Markdown', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: 成功結果が返される
        expect(result.isOk()).toBe(true);
      });

      // Markdown 出力にタイトル（H1）が含まれること
      it('should include page title as H1', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: H1 形式でタイトルが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('# テストページ');
        }
      });

      // Markdown 出力にメタデータセクションが含まれること
      it('should include metadata section', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: メタデータセクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('**Page ID**: 12345');
          expect(result.value).toContain('**Space**: TEST');
          expect(result.value).toContain('**Version**: 1');
        }
      });

      // Markdown 出力に本文セクションが含まれること
      it('should include content section', () => {
        // Given: 本文付きの Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: 本文セクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Content');
          expect(result.value).toContain('これはテストの本文です。');
        }
      });

      // Markdown 出力にバージョン履歴セクションが含まれること
      it('should include version history section', () => {
        // Given: バージョン履歴付きの Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: バージョン履歴セクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Version History');
          expect(result.value).toContain('Version 1');
          expect(result.value).toContain('テストユーザー');
        }
      });

      // バージョン履歴がない場合も正しく処理されること
      it('should handle empty versions correctly', () => {
        // Given: バージョン履歴がない Confluence ページが与えられた場合
        const page = createTestConfluencePage({ versions: [] });

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: バージョン履歴セクションに「No version history」が表示される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Version History');
          expect(result.value).toContain('No version history');
        }
      });

      // Markdown 出力に添付ファイルセクションが含まれること
      it('should include attachments section', () => {
        // Given: 添付ファイル付きの Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: 添付ファイルセクションが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Attachments');
          expect(result.value).toContain('diagram.png');
        }
      });

      // 添付ファイルがない場合も正しく処理されること
      it('should handle empty attachments correctly', () => {
        // Given: 添付ファイルがない Confluence ページが与えられた場合
        const page = createTestConfluencePage({ attachments: [] });

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: 添付ファイルセクションに「No attachments」が表示される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('## Attachments');
          expect(result.value).toContain('No attachments');
        }
      });

      // バージョンメッセージが null の場合も正しく処理されること
      it('should handle null version message correctly', () => {
        // Given: message が null のバージョンを持つ Confluence ページが与えられた場合
        const page = createTestConfluencePage({
          versions: [
            {
              by: 'テストユーザー',
              message: null,
              number: 1,
              when: '2024-01-01T00:00:00.000Z',
            },
          ],
        });

        // When: Markdown 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'markdown' });

        // Then: メッセージなしでも正しく出力される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('Version 1');
        }
      });
    });

    describe('YAML 形式での出力', () => {
      // Confluence ページを YAML 形式で出力できること
      it('should format Confluence page as valid YAML', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: YAML 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'yaml' });

        // Then: 成功結果が返される
        expect(result.isOk()).toBe(true);
      });

      // YAML 出力に全フィールドが含まれること
      it('should include all Confluence page fields in YAML output', () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: YAML 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'yaml' });

        // Then: 全フィールドが含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('id: "12345"');
          expect(result.value).toContain('title: テストページ');
          expect(result.value).toContain('spaceKey: TEST');
          expect(result.value).toContain('currentVersion: 1');
        }
      });

      // message が null のバージョンも正しく YAML 出力されること
      it('should handle null version message correctly in YAML', () => {
        // Given: message が null のバージョンを持つ Confluence ページが与えられた場合
        const page = createTestConfluencePage({
          versions: [
            {
              by: 'テストユーザー',
              message: null,
              number: 1,
              when: '2024-01-01T00:00:00.000Z',
            },
          ],
        });

        // When: YAML 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'yaml' });

        // Then: message が null として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('message: null');
        }
      });

      // 空の配列フィールドも正しく YAML 出力されること
      it('should handle empty arrays correctly in YAML', () => {
        // Given: 空の配列を持つ Confluence ページが与えられた場合
        const page = createTestConfluencePage({
          attachments: [],
          versions: [],
        });

        // When: YAML 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'yaml' });

        // Then: 空の配列として含まれる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toContain('versions: []');
          expect(result.value).toContain('attachments: []');
        }
      });

      // YAML 出力がパースできる形式であること
      it('should output parseable YAML', async () => {
        // Given: 有効な Confluence ページが与えられた場合
        const page = createTestConfluencePage();

        // When: YAML 形式でフォーマットする
        const result = formatConfluencePage(page, { format: 'yaml' });

        // Then: 有効な YAML として解析できる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const { parse } = await import('yaml');
          const parsed = parse(result.value);
          expect(parsed).toBeDefined();
          expect(parsed.id).toBe('12345');
          expect(parsed.title).toBe('テストページ');
        }
      });
    });
  });

  describe('showProgress', () => {
    // ダウンロード進捗表示機能のテスト
    // 添付ファイルダウンロード時に進捗を標準エラー出力に表示する

    describe('正常系', () => {
      // 進捗メッセージが標準エラー出力に表示されること
      it('should write progress message to stderr', () => {
        // Given: メッセージ、現在位置、合計が与えられた場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'Downloading attachment';
        const current = 1;
        const total = 3;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: 標準エラー出力に書き込まれる
        expect(stderrWriteSpy).toHaveBeenCalled();
        stderrWriteSpy.mockRestore();
      });

      // 進捗メッセージにメッセージ、現在位置、合計が含まれること
      it('should include message, current, and total in output', () => {
        // Given: メッセージ、現在位置、合計が与えられた場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'Downloading';
        const current = 2;
        const total = 5;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: 出力にメッセージと進捗情報が含まれる
        const output = stderrWriteSpy.mock.calls[0]?.[0];
        expect(output).toContain('Downloading');
        expect(output).toContain('2');
        expect(output).toContain('5');
        stderrWriteSpy.mockRestore();
      });

      // 進捗メッセージがキャリッジリターン（\r）で始まること（同じ行で更新）
      it('should start with carriage return to overwrite previous line', () => {
        // Given: メッセージ、現在位置、合計が与えられた場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'Processing';
        const current = 1;
        const total = 10;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: 出力がキャリッジリターンで始まる
        const output = stderrWriteSpy.mock.calls[0]?.[0];
        expect(output).toMatch(/^\r/);
        stderrWriteSpy.mockRestore();
      });

      // 進捗が 100% の場合は改行が追加されること
      it('should add newline when progress is complete', () => {
        // Given: 進捗が 100% の場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'Done';
        const current = 5;
        const total = 5;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: 出力が改行で終わる
        const output = stderrWriteSpy.mock.calls[0]?.[0];
        expect(output).toMatch(/\n$/);
        stderrWriteSpy.mockRestore();
      });

      // 進捗が 100% 未満の場合は改行が追加されないこと
      it('should not add newline when progress is incomplete', () => {
        // Given: 進捗が 100% 未満の場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'In progress';
        const current = 3;
        const total = 5;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: 出力が改行で終わらない
        const output = stderrWriteSpy.mock.calls[0]?.[0];
        expect(output).not.toMatch(/\n$/);
        stderrWriteSpy.mockRestore();
      });

      // パーセンテージが表示されること
      it('should display percentage', () => {
        // Given: メッセージ、現在位置、合計が与えられた場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'Downloading';
        const current = 1;
        const total = 4;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: パーセンテージが表示される（1/4 = 25%）
        const output = stderrWriteSpy.mock.calls[0]?.[0];
        expect(output).toContain('25%');
        stderrWriteSpy.mockRestore();
      });
    });

    describe('エッジケース', () => {
      // total が 0 の場合は 0% として表示されること
      it('should display 0% when total is 0', () => {
        // Given: total が 0 の場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'Empty';
        const current = 0;
        const total = 0;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: 0% として表示される
        const output = stderrWriteSpy.mock.calls[0]?.[0];
        expect(output).toContain('0%');
        stderrWriteSpy.mockRestore();
      });

      // current が total を超える場合も正しく処理されること
      it('should handle current exceeding total gracefully', () => {
        // Given: current が total を超える場合
        const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const message = 'Overflow';
        const current = 10;
        const total = 5;

        // When: 進捗を表示する
        showProgress(message, current, total);

        // Then: エラーなく処理される（100% として表示）
        const output = stderrWriteSpy.mock.calls[0]?.[0];
        expect(output).toBeDefined();
        stderrWriteSpy.mockRestore();
      });
    });
  });

  describe('writeToFile', () => {
    describe('正常系', () => {
      // コンテンツを指定されたファイルパスに書き込めること
      it('should write content to specified file path', async () => {
        // Given: コンテンツと出力パスが与えられた場合
        const content = '{"key": "value"}';
        const outputPath = '/path/to/output.json';
        vi.mocked(ensureDir).mockResolvedValue(ok(undefined));
        vi.mocked(writeFileContent).mockResolvedValue(ok(undefined));

        // When: ファイルに書き込む
        const result = await writeToFile(content, outputPath);

        // Then: 成功結果が返される
        expect(result.isOk()).toBe(true);
      });

      // 親ディレクトリが作成されること
      it('should create parent directory before writing', async () => {
        // Given: ネストされたパスが与えられた場合
        const content = 'test content';
        const outputPath = '/path/to/nested/output.txt';
        vi.mocked(ensureDir).mockResolvedValue(ok(undefined));
        vi.mocked(writeFileContent).mockResolvedValue(ok(undefined));

        // When: ファイルに書き込む
        await writeToFile(content, outputPath);

        // Then: ensureDir が親ディレクトリで呼ばれる
        expect(ensureDir).toHaveBeenCalledWith(dirname(outputPath));
      });

      // ファイル書き込みが正しいパスとコンテンツで呼ばれること
      it('should call writeFileContent with correct path and content', async () => {
        // Given: コンテンツと出力パスが与えられた場合
        const content = 'test content';
        const outputPath = '/path/to/output.txt';
        vi.mocked(ensureDir).mockResolvedValue(ok(undefined));
        vi.mocked(writeFileContent).mockResolvedValue(ok(undefined));

        // When: ファイルに書き込む
        await writeToFile(content, outputPath);

        // Then: writeFileContent が正しい引数で呼ばれる
        expect(writeFileContent).toHaveBeenCalledWith(outputPath, content);
      });
    });

    describe('異常系', () => {
      // ディレクトリ作成に失敗した場合エラーが返されること
      it('should return error when directory creation fails', async () => {
        // Given: ディレクトリ作成が失敗する場合
        const content = 'test content';
        const outputPath = '/path/to/output.txt';
        vi.mocked(ensureDir).mockResolvedValue(
          err({
            kind: 'PERMISSION_DENIED' as const,
            message: 'Permission denied',
            path: dirname(outputPath),
          }),
        );

        // When: ファイルに書き込む
        const result = await writeToFile(content, outputPath);

        // Then: エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('WRITE_FAILED');
        }
      });

      // ファイル書き込みに失敗した場合エラーが返されること
      it('should return error when file writing fails', async () => {
        // Given: ファイル書き込みが失敗する場合
        const content = 'test content';
        const outputPath = '/path/to/output.txt';
        vi.mocked(ensureDir).mockResolvedValue(ok(undefined));
        vi.mocked(writeFileContent).mockResolvedValue(
          err({
            kind: 'DISK_FULL' as const,
            message: 'Disk full',
            path: outputPath,
          }),
        );

        // When: ファイルに書き込む
        const result = await writeToFile(content, outputPath);

        // Then: エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('WRITE_FAILED');
        }
      });

      // ディレクトリ作成が失敗した場合、ファイル書き込みは呼ばれないこと
      it('should not call writeFileContent when directory creation fails', async () => {
        // Given: ディレクトリ作成が失敗する場合
        const content = 'test content';
        const outputPath = '/path/to/output.txt';
        vi.mocked(ensureDir).mockResolvedValue(
          err({
            kind: 'PERMISSION_DENIED' as const,
            message: 'Permission denied',
            path: dirname(outputPath),
          }),
        );

        // When: ファイルに書き込む
        await writeToFile(content, outputPath);

        // Then: writeFileContent は呼ばれない
        expect(writeFileContent).not.toHaveBeenCalled();
      });
    });

    describe('エラーメッセージ', () => {
      // ディレクトリ作成エラー時に適切なメッセージが返されること
      it('should include appropriate error message for directory creation failure', async () => {
        // Given: ディレクトリ作成が失敗する場合
        const content = 'test content';
        const outputPath = '/path/to/output.txt';
        vi.mocked(ensureDir).mockResolvedValue(
          err({
            kind: 'PERMISSION_DENIED' as const,
            message: 'Permission denied',
            path: dirname(outputPath),
          }),
        );

        // When: ファイルに書き込む
        const result = await writeToFile(content, outputPath);

        // Then: エラーメッセージにパス情報が含まれる
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(dirname(outputPath));
        }
      });

      // ファイル書き込みエラー時に適切なメッセージが返されること
      it('should include appropriate error message for file write failure', async () => {
        // Given: ファイル書き込みが失敗する場合
        const content = 'test content';
        const outputPath = '/path/to/output.txt';
        vi.mocked(ensureDir).mockResolvedValue(ok(undefined));
        vi.mocked(writeFileContent).mockResolvedValue(
          err({
            kind: 'DISK_FULL' as const,
            message: 'Disk full',
            path: outputPath,
          }),
        );

        // When: ファイルに書き込む
        const result = await writeToFile(content, outputPath);

        // Then: エラーメッセージにパス情報が含まれる
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(outputPath);
        }
      });
    });
  });
});
