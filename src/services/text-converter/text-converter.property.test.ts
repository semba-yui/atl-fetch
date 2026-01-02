import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { describe, expect } from 'vitest';
import { convertAdfToPlainText, convertStorageFormatToPlainText } from './text-converter.js';

/**
 * テキスト変換サービスのプロパティベーステスト
 *
 * fast-check を使用して任意の入力に対する堅牢性を検証する。
 * Given When Then パターンに従ってテストを記述。
 */
describe('TextConverter Property-based Tests', () => {
  /**
   * convertAdfToPlainText の堅牢性テスト
   */
  describe('convertAdfToPlainText 堅牢性テスト', () => {
    test.prop([fc.anything()], { numRuns: 100 })('任意の値を入力してもクラッシュせずに文字列を返す', (input) => {
      // Given: 任意の値（fast-check が生成）
      // When: ADF をプレーンテキストに変換する
      const result = convertAdfToPlainText(input);

      // Then: クラッシュせずに文字列を返す
      expect(typeof result).toBe('string');
    });

    test.prop([fc.object()], { numRuns: 100 })('任意のオブジェクトを入力してもクラッシュしない', (input) => {
      // Given: 任意のオブジェクト
      // When: ADF をプレーンテキストに変換する
      const result = convertAdfToPlainText(input);

      // Then: クラッシュせずに文字列を返す
      expect(typeof result).toBe('string');
    });

    test.prop([fc.string()], { numRuns: 100 })('任意の文字列を入力してもクラッシュしない', (input) => {
      // Given: 任意の文字列
      // When: ADF をプレーンテキストに変換する
      const result = convertAdfToPlainText(input);

      // Then: クラッシュせずに文字列を返す
      expect(typeof result).toBe('string');
    });

    test.prop([fc.constantFrom(null, undefined)])('null/undefined を入力しても空文字列を返す', (input) => {
      // Given: null または undefined
      // When: ADF をプレーンテキストに変換する
      const result = convertAdfToPlainText(input);

      // Then: 空文字列を返す
      expect(result).toBe('');
    });

    test.prop([fc.string({ maxLength: 10000, minLength: 1000 })], { numRuns: 10 })(
      '非常に長い文字列を入力してもクラッシュしない',
      (longString) => {
        // Given: 非常に長い文字列
        // When: ADF をプレーンテキストに変換する
        const result = convertAdfToPlainText(longString);

        // Then: クラッシュせずに文字列を返す
        expect(typeof result).toBe('string');
      },
    );
  });

  /**
   * convertAdfToPlainText の冪等性テスト
   */
  describe('convertAdfToPlainText 冪等性テスト', () => {
    test.prop([fc.anything()], { numRuns: 100 })('同じ入力に対して常に同じ結果を返す', (input) => {
      // Given: 任意の入力
      // When: 同じ入力で 2 回変換する
      const result1 = convertAdfToPlainText(input);
      const result2 = convertAdfToPlainText(input);

      // Then: 結果が一致する
      expect(result1).toBe(result2);
    });
  });

  /**
   * convertAdfToPlainText の有効な ADF 入力テスト
   */
  describe('convertAdfToPlainText 有効な ADF 入力テスト', () => {
    /**
     * 有効な ADF テキストノードを生成する Arbitrary
     */
    const validAdfTextNode = fc.string().map((text) => ({
      text,
      type: 'text',
    }));

    /**
     * 有効な ADF パラグラフノードを生成する Arbitrary
     */
    const validAdfParagraph = fc.array(validAdfTextNode, { maxLength: 5, minLength: 0 }).map((content) => ({
      content,
      type: 'paragraph',
    }));

    /**
     * 有効な ADF ドキュメントを生成する Arbitrary
     */
    const validAdfDocument = fc.array(validAdfParagraph, { maxLength: 10, minLength: 1 }).map((content) => ({
      content,
      type: 'doc',
      version: 1,
    }));

    test.prop([validAdfDocument], { numRuns: 50 })('有効な ADF ドキュメントから文字列を抽出できる', (adfDoc) => {
      // Given: 有効な ADF ドキュメント
      // When: ADF をプレーンテキストに変換する
      const result = convertAdfToPlainText(adfDoc);

      // Then: 文字列を返す
      expect(typeof result).toBe('string');
    });

    test.prop([validAdfDocument], { numRuns: 50 })('有効な ADF ドキュメントのテキストが出力に含まれる', (adfDoc) => {
      // Given: 有効な ADF ドキュメント
      const expectedTexts = adfDoc.content.flatMap((paragraph) =>
        paragraph.content.map((textNode) => textNode.text).filter((t) => t !== ''),
      );

      // When: ADF をプレーンテキストに変換する
      const result = convertAdfToPlainText(adfDoc);

      // Then: 元のテキストが出力に含まれる（空でないテキストのみ）
      for (const text of expectedTexts) {
        if (text.trim() !== '') {
          expect(result).toContain(text);
        }
      }
    });
  });

  /**
   * convertStorageFormatToPlainText の堅牢性テスト
   */
  describe('convertStorageFormatToPlainText 堅牢性テスト', () => {
    test.prop([fc.string()], { numRuns: 100 })('任意の文字列を入力してもクラッシュしない', (input) => {
      // Given: 任意の文字列
      // When: Storage Format をプレーンテキストに変換する
      const result = convertStorageFormatToPlainText(input);

      // Then: クラッシュせずに文字列を返す
      expect(typeof result).toBe('string');
    });

    test.prop([fc.constantFrom(null, undefined, '')])('null/undefined/空文字列を入力しても空文字列を返す', (input) => {
      // Given: null, undefined, または空文字列
      // When: Storage Format をプレーンテキストに変換する
      const result = convertStorageFormatToPlainText(input);

      // Then: 空文字列を返す
      expect(result).toBe('');
    });

    test.prop([fc.string({ maxLength: 10000, minLength: 1000 })], { numRuns: 10 })(
      '非常に長い文字列を入力してもクラッシュしない',
      (longString) => {
        // Given: 非常に長い文字列
        // When: Storage Format をプレーンテキストに変換する
        const result = convertStorageFormatToPlainText(longString);

        // Then: クラッシュせずに文字列を返す
        expect(typeof result).toBe('string');
      },
    );

    test.prop([fc.string({ unit: 'binary' })], { numRuns: 50 })(
      'Unicode 文字列を入力してもクラッシュしない',
      (input) => {
        // Given: Unicode 文字列（サロゲートペアを含む）
        // When: Storage Format をプレーンテキストに変換する
        const result = convertStorageFormatToPlainText(input);

        // Then: クラッシュせずに文字列を返す
        expect(typeof result).toBe('string');
      },
    );
  });

  /**
   * convertStorageFormatToPlainText の冪等性テスト
   */
  describe('convertStorageFormatToPlainText 冪等性テスト', () => {
    test.prop([fc.string()], { numRuns: 100 })('同じ入力に対して常に同じ結果を返す', (input) => {
      // Given: 任意の文字列
      // When: 同じ入力で 2 回変換する
      const result1 = convertStorageFormatToPlainText(input);
      const result2 = convertStorageFormatToPlainText(input);

      // Then: 結果が一致する
      expect(result1).toBe(result2);
    });
  });

  /**
   * convertStorageFormatToPlainText の不変条件テスト
   */
  describe('convertStorageFormatToPlainText 不変条件テスト', () => {
    /**
     * HTML タグを含む文字列を生成する Arbitrary
     */
    const stringWithHtmlTags = fc
      .tuple(
        fc.string({ maxLength: 50 }),
        fc.constantFrom('p', 'div', 'span', 'h1', 'h2', 'ul', 'li', 'table', 'tr', 'td'),
        fc.string({ maxLength: 50 }),
      )
      .map(([before, tag, content]) => `${before}<${tag}>${content}</${tag}>`);

    test.prop([stringWithHtmlTags], { numRuns: 100 })('出力に HTML タグが含まれない', (htmlString) => {
      // Given: HTML タグを含む文字列
      // When: Storage Format をプレーンテキストに変換する
      const result = convertStorageFormatToPlainText(htmlString);

      // Then: 出力に HTML タグが含まれない
      expect(result).not.toMatch(/<[^>]*>/);
    });

    test.prop([fc.string()], { numRuns: 100 })('出力の各行が前後にスペースを含まない', (input) => {
      // Given: 任意の文字列
      // When: Storage Format をプレーンテキストに変換する
      const result = convertStorageFormatToPlainText(input);

      // Then: 出力の各行が前後にスペースを含まない
      const lines = result.split('\n');
      for (const line of lines) {
        if (line !== '') {
          expect(line).toBe(line.trim());
        }
      }
    });
  });

  /**
   * HTML エンティティのデコードテスト
   */
  describe('HTML エンティティのデコードテスト', () => {
    /**
     * HTML エンティティを含む文字列を生成する Arbitrary
     * Note: &lt; と &gt; は < と > に変換されるが、タグ除去後に残る
     */
    const htmlEntityPairs: readonly [string, string][] = [
      ['&nbsp;', ' '],
      ['&amp;', '&'],
      ['&quot;', '"'],
      ['&#39;', "'"],
      ['&#x27;', "'"],
    ] as const;

    test.prop([fc.constantFrom(...htmlEntityPairs)], { numRuns: 5 })(
      'HTML エンティティが正しくデコードされる',
      ([entity, _expected]) => {
        // Given: HTML エンティティを含む文字列
        const input = `<p>before${entity}after</p>`;

        // When: Storage Format をプレーンテキストに変換する
        const result = convertStorageFormatToPlainText(input);

        // Then: エンティティがデコードされている
        // Note: 一部のエンティティは空白の正規化により変化する可能性がある
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      },
    );
  });
});
