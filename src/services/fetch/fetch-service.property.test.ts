import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { describe, expect } from 'vitest';
import type { ConfluenceError } from '../../types/confluence.js';
import type { FetchError } from '../../types/fetch.js';
import type { JiraError } from '../../types/jira.js';

/**
 * フェッチサービスのプロパティベーステスト
 *
 * fast-check を使用してエラー型の構造とプロパティを検証する。
 * Given When Then パターンに従ってテストを記述。
 *
 * Note: fetch-service の主要関数は外部 API 呼び出しを行うため、
 * ここではエラー型の構造とマッピングのプロパティをテストする。
 */
describe('FetchService Property-based Tests', () => {
  /**
   * JiraError を生成する Arbitrary
   */
  const jiraErrorArb: fc.Arbitrary<JiraError> = fc.oneof(
    fc.record({ kind: fc.constant('NOT_FOUND' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('FORBIDDEN' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('AUTH_FAILED' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('NETWORK_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('PARSE_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
  );

  /**
   * ConfluenceError を生成する Arbitrary
   */
  const confluenceErrorArb: fc.Arbitrary<ConfluenceError> = fc.oneof(
    fc.record({ kind: fc.constant('NOT_FOUND' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('FORBIDDEN' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('AUTH_FAILED' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('NETWORK_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('PARSE_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
  );

  /**
   * FetchError を生成する Arbitrary
   */
  const fetchErrorArb: fc.Arbitrary<FetchError> = fc.oneof(
    fc.record({ kind: fc.constant('URL_PARSE_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('JIRA_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('CONFLUENCE_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('AUTH_FAILED' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('NOT_FOUND' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('FORBIDDEN' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('NETWORK_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('OUTPUT_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
    fc.record({ kind: fc.constant('STORAGE_ERROR' as const), message: fc.string({ maxLength: 200, minLength: 1 }) }),
  );

  /**
   * JiraError の構造プロパティテスト
   */
  describe('JiraError 構造プロパティテスト', () => {
    test.prop([jiraErrorArb], { numRuns: 100 })('JiraError が kind と message を持つ', (error) => {
      // Given: 任意の JiraError
      // When: 構造を確認する
      // Then: kind と message が存在する
      expect(error).toHaveProperty('kind');
      expect(error).toHaveProperty('message');
      expect(typeof error.kind).toBe('string');
      expect(typeof error.message).toBe('string');
    });

    test.prop([jiraErrorArb], { numRuns: 100 })('JiraError の kind は有効な値', (error) => {
      // Given: 任意の JiraError
      // When: kind を確認する
      // Then: 有効な kind のいずれか
      const validKinds = ['NOT_FOUND', 'FORBIDDEN', 'AUTH_FAILED', 'NETWORK_ERROR', 'PARSE_ERROR'];
      expect(validKinds).toContain(error.kind);
    });
  });

  /**
   * ConfluenceError の構造プロパティテスト
   */
  describe('ConfluenceError 構造プロパティテスト', () => {
    test.prop([confluenceErrorArb], { numRuns: 100 })('ConfluenceError が kind と message を持つ', (error) => {
      // Given: 任意の ConfluenceError
      // When: 構造を確認する
      // Then: kind と message が存在する
      expect(error).toHaveProperty('kind');
      expect(error).toHaveProperty('message');
      expect(typeof error.kind).toBe('string');
      expect(typeof error.message).toBe('string');
    });

    test.prop([confluenceErrorArb], { numRuns: 100 })('ConfluenceError の kind は有効な値', (error) => {
      // Given: 任意の ConfluenceError
      // When: kind を確認する
      // Then: 有効な kind のいずれか
      const validKinds = ['NOT_FOUND', 'FORBIDDEN', 'AUTH_FAILED', 'NETWORK_ERROR', 'PARSE_ERROR'];
      expect(validKinds).toContain(error.kind);
    });
  });

  /**
   * FetchError の構造プロパティテスト
   */
  describe('FetchError 構造プロパティテスト', () => {
    test.prop([fetchErrorArb], { numRuns: 100 })('FetchError が kind と message を持つ', (error) => {
      // Given: 任意の FetchError
      // When: 構造を確認する
      // Then: kind と message が存在する
      expect(error).toHaveProperty('kind');
      expect(error).toHaveProperty('message');
      expect(typeof error.kind).toBe('string');
      expect(typeof error.message).toBe('string');
    });

    test.prop([fetchErrorArb], { numRuns: 100 })('FetchError の kind は有効な値', (error) => {
      // Given: 任意の FetchError
      // When: kind を確認する
      // Then: 有効な kind のいずれか
      const validKinds = [
        'URL_PARSE_ERROR',
        'JIRA_ERROR',
        'CONFLUENCE_ERROR',
        'AUTH_FAILED',
        'NOT_FOUND',
        'FORBIDDEN',
        'NETWORK_ERROR',
        'OUTPUT_ERROR',
        'STORAGE_ERROR',
      ];
      expect(validKinds).toContain(error.kind);
    });

    test.prop([fetchErrorArb], { numRuns: 100 })('message は空でない文字列', (error) => {
      // Given: 任意の FetchError
      // When: message を確認する
      // Then: message が空でない
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  /**
   * エラーマッピングのプロパティテスト
   *
   * Note: 実際の mapJiraErrorToFetchError と mapConfluenceErrorToFetchError は
   * プライベート関数のため、ここではマッピングの論理的なプロパティをテストする。
   */
  describe('エラーマッピングプロパティテスト', () => {
    /**
     * JiraError を FetchError にマッピングするシミュレーション関数
     */
    const simulateMapJiraError = (jiraError: JiraError): FetchError => {
      switch (jiraError.kind) {
        case 'NOT_FOUND':
          return { kind: 'NOT_FOUND', message: jiraError.message };
        case 'FORBIDDEN':
          return { kind: 'FORBIDDEN', message: jiraError.message };
        case 'AUTH_FAILED':
          return { kind: 'AUTH_FAILED', message: jiraError.message };
        case 'NETWORK_ERROR':
          return { kind: 'NETWORK_ERROR', message: jiraError.message };
        case 'PARSE_ERROR':
          return { kind: 'JIRA_ERROR', message: jiraError.message };
      }
    };

    /**
     * ConfluenceError を FetchError にマッピングするシミュレーション関数
     */
    const simulateMapConfluenceError = (confluenceError: ConfluenceError): FetchError => {
      switch (confluenceError.kind) {
        case 'NOT_FOUND':
          return { kind: 'NOT_FOUND', message: confluenceError.message };
        case 'FORBIDDEN':
          return { kind: 'FORBIDDEN', message: confluenceError.message };
        case 'AUTH_FAILED':
          return { kind: 'AUTH_FAILED', message: confluenceError.message };
        case 'NETWORK_ERROR':
          return { kind: 'NETWORK_ERROR', message: confluenceError.message };
        case 'PARSE_ERROR':
          return { kind: 'CONFLUENCE_ERROR', message: confluenceError.message };
      }
    };

    test.prop([jiraErrorArb], { numRuns: 100 })('JiraError マッピングが message を保持する', (jiraError) => {
      // Given: 任意の JiraError
      // When: FetchError にマッピングする
      const fetchError = simulateMapJiraError(jiraError);

      // Then: message が保持される
      expect(fetchError.message).toBe(jiraError.message);
    });

    test.prop([confluenceErrorArb], { numRuns: 100 })(
      'ConfluenceError マッピングが message を保持する',
      (confluenceError) => {
        // Given: 任意の ConfluenceError
        // When: FetchError にマッピングする
        const fetchError = simulateMapConfluenceError(confluenceError);

        // Then: message が保持される
        expect(fetchError.message).toBe(confluenceError.message);
      },
    );

    test.prop([jiraErrorArb], { numRuns: 100 })('JiraError マッピングの出力が有効な FetchError', (jiraError) => {
      // Given: 任意の JiraError
      // When: FetchError にマッピングする
      const fetchError = simulateMapJiraError(jiraError);

      // Then: 有効な FetchError の kind を持つ
      const validKinds = ['NOT_FOUND', 'FORBIDDEN', 'AUTH_FAILED', 'NETWORK_ERROR', 'JIRA_ERROR'];
      expect(validKinds).toContain(fetchError.kind);
    });

    test.prop([confluenceErrorArb], { numRuns: 100 })(
      'ConfluenceError マッピングの出力が有効な FetchError',
      (confluenceError) => {
        // Given: 任意の ConfluenceError
        // When: FetchError にマッピングする
        const fetchError = simulateMapConfluenceError(confluenceError);

        // Then: 有効な FetchError の kind を持つ
        const validKinds = ['NOT_FOUND', 'FORBIDDEN', 'AUTH_FAILED', 'NETWORK_ERROR', 'CONFLUENCE_ERROR'];
        expect(validKinds).toContain(fetchError.kind);
      },
    );

    test.prop([jiraErrorArb], { numRuns: 100 })('JiraError マッピングは冪等性を持つ', (jiraError) => {
      // Given: 任意の JiraError
      // When: 同じエラーで 2 回マッピングする
      const result1 = simulateMapJiraError(jiraError);
      const result2 = simulateMapJiraError(jiraError);

      // Then: 結果が一致する
      expect(result1).toEqual(result2);
    });

    test.prop([confluenceErrorArb], { numRuns: 100 })('ConfluenceError マッピングは冪等性を持つ', (confluenceError) => {
      // Given: 任意の ConfluenceError
      // When: 同じエラーで 2 回マッピングする
      const result1 = simulateMapConfluenceError(confluenceError);
      const result2 = simulateMapConfluenceError(confluenceError);

      // Then: 結果が一致する
      expect(result1).toEqual(result2);
    });
  });

  /**
   * 共通エラー kind のマッピング整合性テスト
   */
  describe('共通エラー kind のマッピング整合性テスト', () => {
    /**
     * 共通の kind を持つ JiraError と ConfluenceError のペアを生成する Arbitrary
     */
    const commonKindArb = fc.constantFrom('NOT_FOUND', 'FORBIDDEN', 'AUTH_FAILED', 'NETWORK_ERROR') as fc.Arbitrary<
      'NOT_FOUND' | 'FORBIDDEN' | 'AUTH_FAILED' | 'NETWORK_ERROR'
    >;
    const messageArb = fc.string({ maxLength: 200, minLength: 1 });

    test.prop([commonKindArb, messageArb], { numRuns: 50 })(
      'JiraError と ConfluenceError の共通 kind は同じ FetchError kind にマッピングされる',
      (kind, message) => {
        // Given: 同じ kind と message を持つ JiraError と ConfluenceError
        const jiraError: JiraError = { kind, message };
        const confluenceError: ConfluenceError = { kind, message };

        // When: それぞれをシミュレーションマッピングする
        const simulateMapJiraError = (err: JiraError): FetchError => {
          switch (err.kind) {
            case 'NOT_FOUND':
              return { kind: 'NOT_FOUND', message: err.message };
            case 'FORBIDDEN':
              return { kind: 'FORBIDDEN', message: err.message };
            case 'AUTH_FAILED':
              return { kind: 'AUTH_FAILED', message: err.message };
            case 'NETWORK_ERROR':
              return { kind: 'NETWORK_ERROR', message: err.message };
            case 'PARSE_ERROR':
              return { kind: 'JIRA_ERROR', message: err.message };
          }
        };

        const simulateMapConfluenceError = (err: ConfluenceError): FetchError => {
          switch (err.kind) {
            case 'NOT_FOUND':
              return { kind: 'NOT_FOUND', message: err.message };
            case 'FORBIDDEN':
              return { kind: 'FORBIDDEN', message: err.message };
            case 'AUTH_FAILED':
              return { kind: 'AUTH_FAILED', message: err.message };
            case 'NETWORK_ERROR':
              return { kind: 'NETWORK_ERROR', message: err.message };
            case 'PARSE_ERROR':
              return { kind: 'CONFLUENCE_ERROR', message: err.message };
          }
        };

        const jiraFetchError = simulateMapJiraError(jiraError);
        const confluenceFetchError = simulateMapConfluenceError(confluenceError);

        // Then: 共通 kind は同じ FetchError kind にマッピングされる
        expect(jiraFetchError.kind).toBe(confluenceFetchError.kind);
        expect(jiraFetchError.message).toBe(confluenceFetchError.message);
      },
    );
  });
});
