import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { describe, expect } from 'vitest';
import { parseUrl } from './url-parser.js';

/**
 * URL パーサーのプロパティベーステスト
 *
 * fast-check を使用して任意の入力に対する堅牢性を検証する。
 * Given When Then パターンに従ってテストを記述。
 */
describe('UrlParser Property-based Tests', () => {
  /**
   * 任意の文字列入力に対して parseUrl がクラッシュせずに
   * Result 型を返すことを検証するテスト
   */
  describe('堅牢性テスト: 任意の入力に対してクラッシュしない', () => {
    test.prop([fc.string()], { numRuns: 100 })('任意の文字列を入力してもクラッシュせずに Result を返す', (input) => {
      // Given: 任意の文字列（fast-check が生成）
      // When: URL をパースする
      const result = parseUrl(input);

      // Then: クラッシュせずに Ok または Err を返す
      expect(result.isOk() || result.isErr()).toBe(true);
    });

    test.prop([fc.constant('')])('空文字列の場合は常にエラーを返す', (input) => {
      // Given: 空文字列
      // When: URL をパースする
      const result = parseUrl(input);

      // Then: 常に Err を返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('INVALID_FORMAT');
      }
    });

    test.prop([fc.constantFrom(' ', '  ', '\t', '\n', ' \t\n ')])(
      '空白のみの文字列の場合は常にエラーを返す',
      (input) => {
        // Given: 空白のみの文字列
        // When: URL をパースする
        const result = parseUrl(input);

        // Then: 常に Err を返す
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
        }
      },
    );
  });

  /**
   * 有効な Atlassian Cloud URL のパターンに対して
   * 正しくパースできることを検証するテスト
   */
  describe('有効な URL パターンのプロパティテスト', () => {
    /**
     * 有効な組織名を生成する Arbitrary
     * フィルターを使わず、直接有効な値を生成
     */
    const validOrganization = fc
      .tuple(
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
        fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 10, minLength: 0 }),
      )
      .map(([first, rest]) => first + rest.join(''));

    /**
     * 有効な Jira プロジェクトキーを生成する Arbitrary
     */
    const validProjectKey = fc
      .tuple(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
        fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { maxLength: 5, minLength: 1 }),
      )
      .map(([first, rest]) => first + rest.join(''));

    /**
     * 有効な Issue 番号を生成する Arbitrary
     */
    const validIssueNumber = fc.integer({ max: 99999, min: 1 });

    /**
     * 有効な Confluence スペースキーを生成する Arbitrary
     */
    const validSpaceKey = fc
      .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { maxLength: 10, minLength: 1 })
      .map((arr) => arr.join(''));

    /**
     * 有効なページ ID を生成する Arbitrary
     */
    const validPageId = fc
      .array(fc.constantFrom(...'123456789'.split('')), { maxLength: 10, minLength: 1 })
      .map((arr) => arr.join(''));

    describe('Jira Issue URL のプロパティテスト', () => {
      test.prop([validOrganization, validProjectKey, validIssueNumber], { numRuns: 50 })(
        '/browse/{key} 形式の有効な URL は常に正しくパースされる',
        (org, projectKey, issueNumber) => {
          // Given: 有効な Jira Issue URL
          const issueKey = `${projectKey}-${issueNumber}`;
          const url = `https://${org}.atlassian.net/browse/${issueKey}`;

          // When: URL をパースする
          const result = parseUrl(url);

          // Then: 成功し、正しい値が抽出される
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.type).toBe('jira');
            expect(result.value.organization).toBe(org);
            expect(result.value.resourceId).toBe(issueKey);
            expect(result.value.projectKey).toBe(projectKey);
          }
        },
      );

      test.prop([validOrganization, validProjectKey, validIssueNumber, fc.integer({ max: 100, min: 1 })], {
        numRuns: 50,
      })('selectedIssue 形式の有効な URL は常に正しくパースされる', (org, projectKey, issueNumber, boardId) => {
        // Given: 有効な Jira Software ボード URL
        const issueKey = `${projectKey}-${issueNumber}`;
        const url = `https://${org}.atlassian.net/jira/software/projects/${projectKey}/boards/${boardId}?selectedIssue=${issueKey}`;

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 成功し、正しい値が抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.type).toBe('jira');
          expect(result.value.organization).toBe(org);
          expect(result.value.resourceId).toBe(issueKey);
          expect(result.value.projectKey).toBe(projectKey);
        }
      });
    });

    describe('Confluence ページ URL のプロパティテスト', () => {
      test.prop([validOrganization, validSpaceKey, validPageId], { numRuns: 50 })(
        '/wiki/spaces/{space}/pages/{id} 形式の有効な URL は常に正しくパースされる',
        (org, spaceKey, pageId) => {
          // Given: 有効な Confluence ページ URL（タイトルなし）
          const url = `https://${org}.atlassian.net/wiki/spaces/${spaceKey}/pages/${pageId}`;

          // When: URL をパースする
          const result = parseUrl(url);

          // Then: 成功し、正しい値が抽出される
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.type).toBe('confluence');
            expect(result.value.organization).toBe(org);
            expect(result.value.resourceId).toBe(pageId);
            expect(result.value.spaceKey).toBe(spaceKey);
          }
        },
      );

      test.prop(
        [
          validOrganization,
          validSpaceKey,
          validPageId,
          fc
            .array(fc.constantFrom(...'0123456789abcdef'.split('')), { maxLength: 20, minLength: 1 })
            .map((arr) => arr.join('')),
        ],
        { numRuns: 50 },
      )(
        '/wiki/spaces/{space}/pages/{id}/{title} 形式の有効な URL は常に正しくパースされる',
        (org, spaceKey, pageId, title) => {
          // Given: 有効な Confluence ページ URL（タイトルあり）
          const url = `https://${org}.atlassian.net/wiki/spaces/${spaceKey}/pages/${pageId}/${title}`;

          // When: URL をパースする
          const result = parseUrl(url);

          // Then: 成功し、正しい値が抽出される
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.type).toBe('confluence');
            expect(result.value.organization).toBe(org);
            expect(result.value.resourceId).toBe(pageId);
            expect(result.value.spaceKey).toBe(spaceKey);
          }
        },
      );
    });
  });

  /**
   * 無効な URL パターンに対して適切なエラーを返すことを検証するテスト
   */
  describe('無効な URL パターンのプロパティテスト', () => {
    test.prop([fc.domain(), fc.webPath()], { numRuns: 50 })(
      'Atlassian Cloud 以外のドメインは常に UNSUPPORTED_HOST エラーを返す',
      (domain, path) => {
        // Atlassian Cloud ドメインをスキップ
        fc.pre(!domain.endsWith('.atlassian.net'));

        // Given: Atlassian Cloud 以外の URL
        const url = `https://${domain}${path}`;

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: UNSUPPORTED_HOST エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('UNSUPPORTED_HOST');
        }
      },
    );

    /**
     * 無効な Issue キー形式
     * 注: URL パーサーは大文字小文字を区別しない（i フラグあり）ため、
     * 小文字の Issue キー（例: 'a-1'）は有効と見なされる
     */
    const invalidIssueKey = fc.constantFrom(
      'invalid', // ハイフンと数字がない
      '123', // プロジェクトキーがない
      'ABC', // 数字がない
      '123-ABC', // 順序が逆
      '-123', // プロジェクトキーがない
      'ABC-', // Issue 番号がない
      '', // 空文字列
      'PROJ', // 数字がない
      '---', // 無効な形式
      '1ABC-123', // 数字で始まる
    );

    test.prop(
      [
        fc
          .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 10, minLength: 3 })
          .map((arr) => arr.join('')),
        invalidIssueKey,
      ],
      { numRuns: 30 },
    )('無効な Issue キー形式は常にエラーを返す', (org, invalidKey) => {
      // Given: 無効な Issue キーを含む URL
      const url = `https://${org}.atlassian.net/browse/${invalidKey}`;

      // When: URL をパースする
      const result = parseUrl(url);

      // Then: エラーが返される
      expect(result.isErr()).toBe(true);
    });
  });

  /**
   * 特殊文字やエッジケースに対する堅牢性を検証するテスト
   */
  describe('エッジケースのプロパティテスト', () => {
    test.prop([fc.string({ maxLength: 5000, minLength: 1000 })], { numRuns: 10 })(
      '非常に長い文字列を入力してもクラッシュしない',
      (longString) => {
        // Given: 非常に長い文字列
        // When: URL をパースする
        const result = parseUrl(longString);

        // Then: クラッシュせずに Err を返す
        expect(result.isErr()).toBe(true);
      },
    );

    test.prop([fc.string({ unit: 'binary' })], { numRuns: 50 })(
      'Unicode 文字列を入力してもクラッシュしない',
      (unicodeString) => {
        // Given: Unicode 文字列（サロゲートペアを含む全 Unicode 範囲）
        // When: URL をパースする
        const result = parseUrl(unicodeString);

        // Then: クラッシュせずに Result を返す
        expect(result.isOk() || result.isErr()).toBe(true);
      },
    );

    test.prop([fc.constantFrom('test\0string', '\0', 'abc\0def\0ghi')], { numRuns: 3 })(
      'null バイトを含む文字列を入力してもクラッシュしない',
      (stringWithNull) => {
        // Given: null バイトを含む文字列
        // When: URL をパースする
        const result = parseUrl(stringWithNull);

        // Then: クラッシュせずに Err を返す
        expect(result.isErr()).toBe(true);
      },
    );

    /**
     * URL エンコードされた特殊文字を含むパスのテスト
     */
    test.prop(
      [
        fc
          .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 10, minLength: 3 })
          .map((arr) => arr.join('')),
        fc
          .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { maxLength: 4, minLength: 2 })
          .map((arr) => arr.join('')),
        fc.integer({ max: 999, min: 1 }),
        fc.constantFrom('%20', '%2F', '%3F', '%23', '%26', '%3D', '%2B', '%25'),
      ],
      { numRuns: 20 },
    )(
      'URL エンコードされた特殊文字がパスに含まれていてもクラッシュしない',
      (org, projectKey, issueNum, encodedChar) => {
        // Given: URL エンコードされた特殊文字を含む URL
        const url = `https://${org}.atlassian.net/browse/${projectKey}${encodedChar}-${issueNum}`;

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: クラッシュせずに Result を返す（エラーでも OK）
        expect(result.isOk() || result.isErr()).toBe(true);
      },
    );
  });

  /**
   * 冪等性（同じ入力に対して同じ出力）を検証するテスト
   */
  describe('冪等性のプロパティテスト', () => {
    test.prop([fc.string()], { numRuns: 100 })('同じ入力に対して常に同じ結果を返す', (input) => {
      // Given: 任意の入力文字列
      // When: 同じ入力で 2 回パースする
      const result1 = parseUrl(input);
      const result2 = parseUrl(input);

      // Then: 結果が一致する
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value).toEqual(result2.value);
      } else if (result1.isErr() && result2.isErr()) {
        expect(result1.error).toEqual(result2.error);
      } else {
        // Ok/Err の状態が異なる場合は失敗
        expect(result1.isOk()).toBe(result2.isOk());
      }
    });
  });
});
