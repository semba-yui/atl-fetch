import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { describe, expect } from 'vitest';
import type { ConfluencePage } from '../../types/confluence.js';
import type { JiraIssue } from '../../types/jira.js';
import type { OutputFormat } from '../../types/output.js';
import { formatConfluencePage, formatJiraIssue } from './output-service.js';

/**
 * 出力サービスのプロパティベーステスト
 *
 * fast-check を使用して任意の入力に対する堅牢性を検証する。
 * Given When Then パターンに従ってテストを記述。
 */
describe('OutputService Property-based Tests', () => {
  /**
   * OutputFormat を生成する Arbitrary
   */
  const outputFormatArb = fc.constantFrom<OutputFormat>('json', 'markdown', 'yaml');

  /**
   * 有効な日付を生成する Arbitrary
   */
  const validDateArb = fc.integer({ max: 4102444800000, min: 0 }).map((ms) => new Date(ms));

  /**
   * JiraComment を生成する Arbitrary
   */
  const jiraCommentArb = fc.record({
    author: fc.string({ maxLength: 100, minLength: 1 }),
    body: fc.string({ maxLength: 500 }),
    created: validDateArb.map((d) => d.toISOString()),
    id: fc.string({ maxLength: 20, minLength: 1 }),
    updated: validDateArb.map((d) => d.toISOString()),
  });

  /**
   * JiraChangelogItem を生成する Arbitrary
   */
  const jiraChangelogItemArb = fc.record({
    field: fc.string({ maxLength: 50, minLength: 1 }),
    fromString: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    toString: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  });

  /**
   * JiraChangelogEntry を生成する Arbitrary
   */
  const jiraChangelogEntryArb = fc.record({
    author: fc.string({ maxLength: 100, minLength: 1 }),
    created: validDateArb.map((d) => d.toISOString()),
    id: fc.string({ maxLength: 20, minLength: 1 }),
    items: fc.array(jiraChangelogItemArb, { maxLength: 5, minLength: 0 }),
  });

  /**
   * JiraAttachment を生成する Arbitrary
   */
  const jiraAttachmentArb = fc.record({
    contentUrl: fc.webUrl(),
    filename: fc.string({ maxLength: 100, minLength: 1 }),
    id: fc.string({ maxLength: 20, minLength: 1 }),
    mimeType: fc.constantFrom('image/png', 'application/pdf', 'text/plain', 'image/jpeg'),
    size: fc.integer({ max: 10000000, min: 0 }),
  });

  /**
   * ASCII のみの安全な文字列を生成する Arbitrary
   */
  const safeStringArb = (maxLength: number, minLength: number = 1) =>
    fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')), {
        maxLength,
        minLength,
      })
      .map((arr) => arr.join('').trim() || 'default');

  /**
   * JiraIssue を生成する Arbitrary
   */
  const jiraIssueArb: fc.Arbitrary<JiraIssue> = fc.record({
    attachments: fc.array(jiraAttachmentArb, { maxLength: 5, minLength: 0 }),
    changelog: fc.array(jiraChangelogEntryArb, { maxLength: 5, minLength: 0 }),
    comments: fc.array(jiraCommentArb, { maxLength: 5, minLength: 0 }),
    description: fc.option(safeStringArb(1000), { nil: null }),
    key: fc
      .tuple(
        fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { maxLength: 5, minLength: 2 }),
        fc.integer({ max: 9999, min: 1 }),
      )
      .map(([letters, num]) => `${letters.join('')}-${num}`),
    summary: safeStringArb(200),
  });

  /**
   * ConfluenceVersion を生成する Arbitrary
   */
  const confluenceVersionArb = fc.record({
    body: fc.option(safeStringArb(500), { nil: undefined }),
    by: safeStringArb(100),
    message: fc.option(safeStringArb(200), { nil: null }),
    number: fc.integer({ max: 100, min: 1 }),
    when: validDateArb.map((d) => d.toISOString()),
  });

  /**
   * ConfluenceAttachment を生成する Arbitrary
   */
  const confluenceAttachmentArb = fc.record({
    downloadUrl: fc.webUrl(),
    fileSize: fc.integer({ max: 10000000, min: 0 }),
    id: fc.string({ maxLength: 20, minLength: 1 }),
    mediaType: fc.constantFrom('image/png', 'application/pdf', 'text/plain', 'image/jpeg'),
    title: safeStringArb(100),
  });

  /**
   * ConfluencePage を生成する Arbitrary
   */
  const confluencePageArb: fc.Arbitrary<ConfluencePage> = fc.record({
    attachments: fc.array(confluenceAttachmentArb, { maxLength: 5, minLength: 0 }),
    body: safeStringArb(1000),
    currentVersion: fc.integer({ max: 100, min: 1 }),
    id: fc
      .array(fc.constantFrom(...'0123456789'.split('')), { maxLength: 10, minLength: 1 })
      .map((arr) => arr.join('')),
    spaceKey: fc
      .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { maxLength: 10, minLength: 1 })
      .map((arr) => arr.join('')),
    title: safeStringArb(200),
    versions: fc.array(confluenceVersionArb, { maxLength: 10, minLength: 0 }),
  });

  /**
   * formatJiraIssue の堅牢性テスト
   */
  describe('formatJiraIssue 堅牢性テスト', () => {
    test.prop([jiraIssueArb, outputFormatArb], { numRuns: 100 })(
      '任意の JiraIssue でクラッシュしない',
      (issue, format) => {
        // Given: 任意の JiraIssue と OutputFormat
        // When: JiraIssue をフォーマットする
        const result = formatJiraIssue(issue, { format });

        // Then: クラッシュせずに Ok を返す
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(typeof result.value).toBe('string');
        }
      },
    );
  });

  /**
   * formatJiraIssue の JSON フォーマットテスト
   */
  describe('formatJiraIssue JSON フォーマットテスト', () => {
    test.prop([jiraIssueArb], { numRuns: 100 })('JSON 出力が有効な JSON 文字列', (issue) => {
      // Given: 任意の JiraIssue
      // When: JSON 形式でフォーマットする
      const result = formatJiraIssue(issue, { format: 'json' });

      // Then: 有効な JSON 文字列を返す
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(() => JSON.parse(result.value)).not.toThrow();
      }
    });

    test.prop([jiraIssueArb], { numRuns: 100 })('JSON をパースした結果が元のデータと整合', (issue) => {
      // Given: 任意の JiraIssue
      // When: JSON 形式でフォーマットしてパースする
      const result = formatJiraIssue(issue, { format: 'json' });

      // Then: パースした結果が元のデータと一致する
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const parsed = JSON.parse(result.value);
        expect(parsed.key).toBe(issue.key);
        expect(parsed.summary).toBe(issue.summary);
        expect(parsed.description).toBe(issue.description);
        expect(parsed.comments.length).toBe(issue.comments.length);
        expect(parsed.changelog.length).toBe(issue.changelog.length);
        expect(parsed.attachments.length).toBe(issue.attachments.length);
      }
    });
  });

  /**
   * formatJiraIssue の冪等性テスト
   */
  describe('formatJiraIssue 冪等性テスト', () => {
    test.prop([jiraIssueArb, outputFormatArb], { numRuns: 100 })('同じ JiraIssue に対して同じ結果', (issue, format) => {
      // Given: 任意の JiraIssue
      // When: 同じ入力で 2 回フォーマットする
      const result1 = formatJiraIssue(issue, { format });
      const result2 = formatJiraIssue(issue, { format });

      // Then: 結果が一致する
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value).toBe(result2.value);
      }
    });
  });

  /**
   * formatJiraIssue の Markdown 形式テスト
   */
  describe('formatJiraIssue Markdown 形式テスト', () => {
    test.prop([jiraIssueArb], { numRuns: 100 })('Markdown 出力に key と summary が含まれる', (issue) => {
      // Given: 任意の JiraIssue
      // When: Markdown 形式でフォーマットする
      const result = formatJiraIssue(issue, { format: 'markdown' });

      // Then: key と summary が出力に含まれる
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain(issue.key);
        expect(result.value).toContain(issue.summary);
      }
    });
  });

  /**
   * formatConfluencePage の堅牢性テスト
   */
  describe('formatConfluencePage 堅牢性テスト', () => {
    test.prop([confluencePageArb, outputFormatArb], { numRuns: 100 })(
      '任意の ConfluencePage でクラッシュしない',
      (page, format) => {
        // Given: 任意の ConfluencePage と OutputFormat
        // When: ConfluencePage をフォーマットする
        const result = formatConfluencePage(page, { format });

        // Then: クラッシュせずに Ok を返す
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(typeof result.value).toBe('string');
        }
      },
    );
  });

  /**
   * formatConfluencePage の JSON フォーマットテスト
   */
  describe('formatConfluencePage JSON フォーマットテスト', () => {
    test.prop([confluencePageArb], { numRuns: 100 })('JSON 出力が有効な JSON 文字列', (page) => {
      // Given: 任意の ConfluencePage
      // When: JSON 形式でフォーマットする
      const result = formatConfluencePage(page, { format: 'json' });

      // Then: 有効な JSON 文字列を返す
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(() => JSON.parse(result.value)).not.toThrow();
      }
    });

    test.prop([confluencePageArb], { numRuns: 100 })('JSON をパースした結果が元のデータと整合', (page) => {
      // Given: 任意の ConfluencePage
      // When: JSON 形式でフォーマットしてパースする
      const result = formatConfluencePage(page, { format: 'json' });

      // Then: パースした結果が元のデータと一致する
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const parsed = JSON.parse(result.value);
        expect(parsed.id).toBe(page.id);
        expect(parsed.title).toBe(page.title);
        expect(parsed.spaceKey).toBe(page.spaceKey);
        expect(parsed.currentVersion).toBe(page.currentVersion);
        expect(parsed.versions.length).toBe(page.versions.length);
        expect(parsed.attachments.length).toBe(page.attachments.length);
      }
    });
  });

  /**
   * formatConfluencePage の冪等性テスト
   */
  describe('formatConfluencePage 冪等性テスト', () => {
    test.prop([confluencePageArb, outputFormatArb], { numRuns: 100 })(
      '同じ ConfluencePage に対して同じ結果',
      (page, format) => {
        // Given: 任意の ConfluencePage
        // When: 同じ入力で 2 回フォーマットする
        const result1 = formatConfluencePage(page, { format });
        const result2 = formatConfluencePage(page, { format });

        // Then: 結果が一致する
        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);
        if (result1.isOk() && result2.isOk()) {
          expect(result1.value).toBe(result2.value);
        }
      },
    );
  });

  /**
   * formatConfluencePage の Markdown 形式テスト
   */
  describe('formatConfluencePage Markdown 形式テスト', () => {
    test.prop([confluencePageArb], { numRuns: 100 })('Markdown 出力に title が含まれる', (page) => {
      // Given: 任意の ConfluencePage
      // When: Markdown 形式でフォーマットする
      const result = formatConfluencePage(page, { format: 'markdown' });

      // Then: title が出力に含まれる
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain(page.title);
      }
    });
  });

  /**
   * YAML 形式テスト
   */
  describe('YAML 形式テスト', () => {
    test.prop([jiraIssueArb], { numRuns: 50 })('JiraIssue の YAML 出力が文字列', (issue) => {
      // Given: 任意の JiraIssue
      // When: YAML 形式でフォーマットする
      const result = formatJiraIssue(issue, { format: 'yaml' });

      // Then: 文字列を返す
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value).toBe('string');
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    test.prop([confluencePageArb], { numRuns: 50 })('ConfluencePage の YAML 出力が文字列', (page) => {
      // Given: 任意の ConfluencePage
      // When: YAML 形式でフォーマットする
      const result = formatConfluencePage(page, { format: 'yaml' });

      // Then: 文字列を返す
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value).toBe('string');
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
  });
});
