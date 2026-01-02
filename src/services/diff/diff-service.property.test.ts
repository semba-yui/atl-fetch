import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { describe, expect } from 'vitest';
import { diffText, formatConfluenceVersionDiff, formatJiraChangelog } from './diff-service.js';

/**
 * 差分サービスのプロパティベーステスト
 *
 * fast-check を使用して任意の入力に対する堅牢性を検証する。
 * Given When Then パターンに従ってテストを記述。
 */
describe('DiffService Property-based Tests', () => {
  /**
   * DiffOptions を生成する Arbitrary
   */
  const diffOptionsArb = fc.record({
    colorEnabled: fc.boolean(),
    contextLines: fc.option(fc.integer({ max: 10, min: 0 }), { nil: undefined }),
  });

  /**
   * diffText の堅牢性テスト
   */
  describe('diffText 堅牢性テスト', () => {
    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      '任意の2つの文字列を入力してもクラッシュしない',
      (oldText, newText, options) => {
        // Given: 任意の2つの文字列と DiffOptions
        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: クラッシュせずに DiffResult を返す
        expect(result).toBeDefined();
        expect(Array.isArray(result.hunks)).toBe(true);
        expect(typeof result.formatted).toBe('string');
        expect(typeof result.stats.additions).toBe('number');
        expect(typeof result.stats.deletions).toBe('number');
        expect(typeof result.stats.changes).toBe('number');
      },
    );

    test.prop([diffOptionsArb], { numRuns: 10 })('空文字列同士の diff でもクラッシュしない', (options) => {
      // Given: 空文字列同士
      // When: 差分を計算する
      const result = diffText('', '', options);

      // Then: クラッシュせずに空の差分を返す
      expect(result.hunks).toHaveLength(0);
      expect(result.formatted).toBe('');
      expect(result.stats.additions).toBe(0);
      expect(result.stats.deletions).toBe(0);
    });

    test.prop(
      [
        fc.string({ maxLength: 5000, minLength: 1000 }),
        fc.string({ maxLength: 5000, minLength: 1000 }),
        diffOptionsArb,
      ],
      {
        numRuns: 10,
      },
    )('非常に長い文字列でもクラッシュしない', (oldText, newText, options) => {
      // Given: 非常に長い文字列
      // When: 差分を計算する
      const result = diffText(oldText, newText, options);

      // Then: クラッシュせずに DiffResult を返す
      expect(result).toBeDefined();
      expect(Array.isArray(result.hunks)).toBe(true);
    });
  });

  /**
   * diffText の統計不変条件テスト
   */
  describe('diffText 統計不変条件テスト', () => {
    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      'additions が実際の追加行数と一致する',
      (oldText, newText, options) => {
        // Given: 任意の2つの文字列
        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: additions が実際の add 行数と一致する
        let actualAdditions = 0;
        for (const hunk of result.hunks) {
          for (const line of hunk.lines) {
            if (line.type === 'add') {
              actualAdditions++;
            }
          }
        }
        expect(result.stats.additions).toBe(actualAdditions);
      },
    );

    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      'deletions が実際の削除行数と一致する',
      (oldText, newText, options) => {
        // Given: 任意の2つの文字列
        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: deletions が実際の remove 行数と一致する
        let actualDeletions = 0;
        for (const hunk of result.hunks) {
          for (const line of hunk.lines) {
            if (line.type === 'remove') {
              actualDeletions++;
            }
          }
        }
        expect(result.stats.deletions).toBe(actualDeletions);
      },
    );

    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      'additions と deletions は非負整数',
      (oldText, newText, options) => {
        // Given: 任意の2つの文字列
        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 統計値が非負整数
        expect(result.stats.additions).toBeGreaterThanOrEqual(0);
        expect(result.stats.deletions).toBeGreaterThanOrEqual(0);
        expect(result.stats.changes).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result.stats.additions)).toBe(true);
        expect(Number.isInteger(result.stats.deletions)).toBe(true);
        expect(Number.isInteger(result.stats.changes)).toBe(true);
      },
    );

    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      'changes がハンク数と一致する',
      (oldText, newText, options) => {
        // Given: 任意の2つの文字列
        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: changes がハンク数と一致する
        expect(result.stats.changes).toBe(result.hunks.length);
      },
    );
  });

  /**
   * diffText の冪等性テスト
   */
  describe('diffText 冪等性テスト', () => {
    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      '同じ入力に対して同じ diff 結果を返す',
      (oldText, newText, options) => {
        // Given: 任意の2つの文字列
        // When: 同じ入力で 2 回 diff を計算する
        const result1 = diffText(oldText, newText, options);
        const result2 = diffText(oldText, newText, options);

        // Then: 結果が一致する
        expect(result1.formatted).toBe(result2.formatted);
        expect(result1.stats).toEqual(result2.stats);
        expect(result1.hunks.length).toBe(result2.hunks.length);
      },
    );
  });

  /**
   * diffText の自己差分テスト
   */
  describe('diffText 自己差分テスト', () => {
    test.prop([fc.string(), diffOptionsArb], { numRuns: 100 })(
      '同一文字列の diff は変更なし (additions=0, deletions=0)',
      (text, options) => {
        // Given: 同一の文字列
        // When: 自己差分を計算する
        const result = diffText(text, text, options);

        // Then: 変更なし
        expect(result.stats.additions).toBe(0);
        expect(result.stats.deletions).toBe(0);
        expect(result.hunks).toHaveLength(0);
        expect(result.formatted).toBe('');
      },
    );
  });

  /**
   * diffText の対称性テスト
   */
  describe('diffText 対称性テスト', () => {
    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      '入力を逆にすると additions と deletions が入れ替わる',
      (textA, textB, options) => {
        // Given: 任意の2つの文字列
        // When: A→B と B→A の差分を計算する
        const resultAB = diffText(textA, textB, options);
        const resultBA = diffText(textB, textA, options);

        // Then: additions と deletions が入れ替わる
        expect(resultAB.stats.additions).toBe(resultBA.stats.deletions);
        expect(resultAB.stats.deletions).toBe(resultBA.stats.additions);
      },
    );
  });

  /**
   * formatJiraChangelog の堅牢性テスト
   */
  describe('formatJiraChangelog 堅牢性テスト', () => {
    /**
     * JiraChangelogEntry を生成する Arbitrary
     */
    const jiraChangelogItemArb = fc.record({
      field: fc.string({ maxLength: 50, minLength: 1 }),
      fieldId: fc.string({ maxLength: 50, minLength: 1 }),
      fieldtype: fc.string({ maxLength: 50, minLength: 1 }),
      from: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
      fromString: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
      to: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
      toString: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    });

    const jiraChangelogEntryArb = fc.record({
      author: fc.string({ maxLength: 100, minLength: 1 }),
      created: fc.date().map((d) => d.toISOString()),
      id: fc.string({ maxLength: 20, minLength: 1 }),
      items: fc.array(jiraChangelogItemArb, { maxLength: 10, minLength: 1 }),
    });

    test.prop([fc.array(jiraChangelogEntryArb, { maxLength: 10 }), diffOptionsArb], { numRuns: 50 })(
      '任意の changelog を入力してもクラッシュしない',
      (changelog, options) => {
        // Given: 任意の changelog
        // When: changelog をフォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: クラッシュせずに文字列を返す
        expect(typeof result).toBe('string');
      },
    );

    test.prop([diffOptionsArb], { numRuns: 10 })('空の changelog は空文字列を返す', (options) => {
      // Given: 空の changelog
      // When: changelog をフォーマットする
      const result = formatJiraChangelog([], options);

      // Then: 空文字列を返す
      expect(result).toBe('');
    });
  });

  /**
   * formatConfluenceVersionDiff の堅牢性テスト
   */
  describe('formatConfluenceVersionDiff 堅牢性テスト', () => {
    /**
     * 有効な日付を生成する Arbitrary
     */
    const validDateArb = fc.integer({ max: 4102444800000, min: 0 }).map((ms) => new Date(ms));

    /**
     * ConfluenceVersion を生成する Arbitrary
     */
    const confluenceVersionArb = fc.record({
      body: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
      by: fc.string({ maxLength: 100, minLength: 1 }),
      message: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
      number: fc.integer({ max: 1000, min: 1 }),
      when: validDateArb.map((d) => d.toISOString()),
    });

    test.prop([confluenceVersionArb, confluenceVersionArb, diffOptionsArb], { numRuns: 50 })(
      '任意の2つのバージョンを入力してもクラッシュしない',
      (oldVersion, newVersion, options) => {
        // Given: 任意の2つの Confluence バージョン
        // When: バージョン間の差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: クラッシュせずに文字列を返す
        expect(typeof result).toBe('string');
      },
    );

    test.prop([confluenceVersionArb, confluenceVersionArb, diffOptionsArb], { numRuns: 50 })(
      '出力にバージョン番号が含まれる',
      (oldVersion, newVersion, options) => {
        // Given: 任意の2つの Confluence バージョン
        // When: バージョン間の差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 出力にバージョン番号が含まれる
        expect(result).toContain(`v${oldVersion.number}`);
        expect(result).toContain(`v${newVersion.number}`);
      },
    );
  });

  /**
   * diffText の行種別不変条件テスト
   */
  describe('diffText 行種別不変条件テスト', () => {
    test.prop([fc.string(), fc.string(), diffOptionsArb], { numRuns: 100 })(
      'すべての差分行の type は add, remove, context のいずれか',
      (oldText, newText, options) => {
        // Given: 任意の2つの文字列
        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: すべての行の type が有効な値
        const validTypes = new Set(['add', 'remove', 'context']);
        for (const hunk of result.hunks) {
          for (const line of hunk.lines) {
            expect(validTypes.has(line.type)).toBe(true);
          }
        }
      },
    );
  });
});
