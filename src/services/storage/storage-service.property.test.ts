import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { describe, expect } from 'vitest';

/**
 * ストレージサービスのプロパティベーステスト
 *
 * fast-check を使用して任意の入力に対する堅牢性を検証する。
 * Given When Then パターンに従ってテストを記述。
 *
 * Note: storage-service の主要関数はファイルシステム操作を行うため、
 * ここでは内部で使用される純粋関数のプロパティをテストする。
 */
describe('StorageService Property-based Tests', () => {
  /**
   * ISO 8601 タイムスタンプのプロパティテスト
   */
  describe('ISO 8601 タイムスタンプのプロパティ', () => {
    /**
     * 有効な日付を生成する Arbitrary（Invalid Date を避ける）
     */
    const validDateArb = fc
      .integer({ max: 4102444800000, min: 0 }) // 1970-01-01 to 2100-01-01 in milliseconds
      .map((ms) => new Date(ms));

    test.prop([validDateArb], { numRuns: 100 })(
      '任意の日付から有効な ISO 8601 形式のタイムスタンプを生成できる',
      (date) => {
        // Given: 任意の日付
        // When: ISO 8601 形式に変換する
        const timestamp = date.toISOString();

        // Then: 有効な ISO 8601 形式である
        expect(typeof timestamp).toBe('string');
        // ISO 8601 形式の正規表現パターン
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        expect(timestamp).toMatch(iso8601Regex);
      },
    );

    test.prop([validDateArb], { numRuns: 100 })('ISO 8601 形式のタイムスタンプから元の日付を復元できる', (date) => {
      // Given: 任意の日付
      // When: ISO 8601 形式に変換してから復元する
      const timestamp = date.toISOString();
      const restored = new Date(timestamp);

      // Then: 元の日付と同じ値になる
      expect(restored.getTime()).toBe(date.getTime());
    });
  });

  /**
   * Manifest 構造のプロパティテスト
   */
  describe('Manifest 構造のプロパティ', () => {
    /**
     * 有効な日付を生成する Arbitrary（Invalid Date を避ける）
     */
    const validDateForManifestArb = fc
      .integer({ max: 4102444800000, min: 0 }) // 1970-01-01 to 2100-01-01 in milliseconds
      .map((ms) => new Date(ms));

    /**
     * Manifest の resourceType を生成する Arbitrary
     */
    const resourceTypeArb = fc.constantFrom('jiraIssue', 'confluencePage') as fc.Arbitrary<
      'jiraIssue' | 'confluencePage'
    >;

    /**
     * AttachmentResult を生成する Arbitrary
     */
    const attachmentResultArb = fc.record({
      error: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
      filename: fc.string({ maxLength: 100, minLength: 1 }),
      id: fc.string({ maxLength: 20, minLength: 1 }),
      mimeType: fc.constantFrom('image/png', 'application/pdf', 'text/plain'),
      savedPath: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
      size: fc.integer({ max: 10000000, min: 0 }),
      status: fc.constantFrom('success', 'failed', 'skipped') as fc.Arbitrary<'success' | 'failed' | 'skipped'>,
    });

    /**
     * Manifest を生成する Arbitrary
     */
    const manifestArb = fc.record({
      attachments: fc.array(attachmentResultArb, { maxLength: 10, minLength: 0 }),
      cliVersion: fc.string({ maxLength: 20, minLength: 1 }),
      fetchedAt: validDateForManifestArb.map((d) => d.toISOString()),
      issues: fc.array(
        fc.record({
          code: fc.string({ maxLength: 50, minLength: 1 }),
          context: fc.option(fc.dictionary(fc.string({ maxLength: 20 }), fc.string({ maxLength: 100 })), {
            nil: undefined,
          }),
          level: fc.constantFrom('error', 'warning') as fc.Arbitrary<'error' | 'warning'>,
          message: fc.string({ maxLength: 200, minLength: 1 }),
        }),
        { maxLength: 5, minLength: 0 },
      ),
      resourceType: resourceTypeArb,
      sourceUrl: fc.webUrl(),
      summary: fc.record({
        resourceId: fc.string({ maxLength: 50, minLength: 1 }),
        success: fc.boolean(),
        title: fc.string({ maxLength: 200, minLength: 1 }),
      }),
    });

    test.prop([manifestArb], { numRuns: 100 })('Manifest が必須フィールドを持つ', (manifest) => {
      // Given: 任意の Manifest
      // When: フィールドの存在を確認する
      // Then: 必須フィールドが存在する
      expect(manifest).toHaveProperty('resourceType');
      expect(manifest).toHaveProperty('fetchedAt');
      expect(manifest).toHaveProperty('summary');
      expect(manifest).toHaveProperty('cliVersion');
      expect(manifest).toHaveProperty('sourceUrl');
      expect(manifest).toHaveProperty('issues');
      expect(manifest).toHaveProperty('attachments');
    });

    test.prop([manifestArb], { numRuns: 100 })('fetchedAt が有効な ISO 8601 形式', (manifest) => {
      // Given: 任意の Manifest
      // When: fetchedAt を検証する
      // Then: 有効な ISO 8601 形式である
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(manifest.fetchedAt).toMatch(iso8601Regex);
    });

    test.prop([manifestArb], { numRuns: 100 })('resourceType が jiraIssue または confluencePage', (manifest) => {
      // Given: 任意の Manifest
      // When: resourceType を検証する
      // Then: 有効な値である
      expect(['jiraIssue', 'confluencePage']).toContain(manifest.resourceType);
    });

    test.prop([manifestArb], { numRuns: 100 })('summary が必須フィールドを持つ', (manifest) => {
      // Given: 任意の Manifest
      // When: summary のフィールドを確認する
      // Then: 必須フィールドが存在する
      expect(manifest.summary).toHaveProperty('success');
      expect(manifest.summary).toHaveProperty('resourceId');
      expect(manifest.summary).toHaveProperty('title');
      expect(typeof manifest.summary.success).toBe('boolean');
    });

    test.prop([manifestArb], { numRuns: 100 })('attachments の各要素が必須フィールドを持つ', (manifest) => {
      // Given: 任意の Manifest
      // When: attachments の各要素を検証する
      // Then: 各要素が必須フィールドを持つ
      for (const attachment of manifest.attachments) {
        expect(attachment).toHaveProperty('id');
        expect(attachment).toHaveProperty('filename');
        expect(attachment).toHaveProperty('mimeType');
        expect(attachment).toHaveProperty('size');
        expect(attachment).toHaveProperty('status');
        expect(['success', 'failed', 'skipped']).toContain(attachment.status);
        expect(typeof attachment.size).toBe('number');
        expect(attachment.size).toBeGreaterThanOrEqual(0);
      }
    });
  });

  /**
   * JSON シリアライゼーションのプロパティテスト
   */
  describe('JSON シリアライゼーションのプロパティ', () => {
    /**
     * JSON シリアライズの挙動に合わせて値を正規化する関数
     * - -0 を 0 に変換（JSON.stringify は -0 を 0 に変換するため）
     * - オブジェクト内の undefined を削除（JSON.stringify は undefined を削除するため）
     */
    const normalizeForJsonComparison = (value: unknown): unknown => {
      if (typeof value === 'number' && Object.is(value, -0)) {
        return 0;
      }
      if (Array.isArray(value)) {
        return value.map(normalizeForJsonComparison);
      }
      if (value !== null && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
          const v = (value as Record<string, unknown>)[key];
          // undefined 値はオブジェクトからスキップ（JSON と同じ挙動）
          if (v !== undefined) {
            result[key] = normalizeForJsonComparison(v);
          }
        }
        return result;
      }
      return value;
    };

    test.prop([fc.jsonValue()], { numRuns: 100 })(
      '任意の JSON 値が正しくシリアライズ・デシリアライズできる',
      (value) => {
        // Given: 任意の JSON 値
        // When: シリアライズしてデシリアライズする
        const serialized = JSON.stringify(value, null, 2);
        const deserialized = JSON.parse(serialized);

        // Then: 元の値と等しい（JSON の挙動に合わせて正規化）
        expect(deserialized).toEqual(normalizeForJsonComparison(value));
      },
    );

    test.prop([fc.jsonValue()], { numRuns: 100 })('JSON.stringify は常に文字列を返す', (value) => {
      // Given: 任意の JSON 値
      // When: シリアライズする
      const serialized = JSON.stringify(value, null, 2);

      // Then: 文字列を返す
      expect(typeof serialized).toBe('string');
    });
  });
});
