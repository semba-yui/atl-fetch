import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect } from 'vitest';
import type { ZodIssue } from 'zod';
import { getAuthHeader, getCredentials, mapZodIssuesToAuthError } from './auth-service.js';

/**
 * 認証サービスのプロパティベーステスト
 *
 * fast-check を使用して任意の入力に対する堅牢性を検証する。
 * Given When Then パターンに従ってテストを記述。
 */
describe('AuthService Property-based Tests', () => {
  /**
   * 環境変数を保存・復元するためのヘルパー
   */
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // テスト前に環境変数をクリア
    delete process.env.ATLASSIAN_EMAIL;
    delete process.env.ATLASSIAN_API_TOKEN;
  });

  afterEach(() => {
    // テスト後に環境変数を復元
    process.env = { ...originalEnv };
  });

  /**
   * mapZodIssuesToAuthError のプロパティテスト
   */
  describe('mapZodIssuesToAuthError プロパティテスト', () => {
    /**
     * ZodIssue を生成する Arbitrary
     */
    const zodIssueArb: fc.Arbitrary<ZodIssue> = fc.record({
      code: fc.constantFrom('invalid_type', 'too_small', 'invalid_string', 'custom') as fc.Arbitrary<ZodIssue['code']>,
      message: fc.string({ maxLength: 200, minLength: 1 }),
      path: fc.array(fc.oneof(fc.string({ maxLength: 50, minLength: 1 }), fc.integer({ max: 100, min: 0 })), {
        maxLength: 3,
        minLength: 0,
      }),
    }) as fc.Arbitrary<ZodIssue>;

    test.prop([fc.array(zodIssueArb, { maxLength: 5, minLength: 0 })], { numRuns: 100 })(
      '任意の ZodIssue 配列を入力してもクラッシュしない',
      (issues) => {
        // Given: 任意の ZodIssue 配列
        // When: エラーをマッピングする
        const result = mapZodIssuesToAuthError(issues);

        // Then: クラッシュせずに AuthError を返す
        expect(result).toBeDefined();
        expect(result).toHaveProperty('kind');
        expect(result).toHaveProperty('message');
      },
    );

    test.prop([fc.array(zodIssueArb, { maxLength: 5, minLength: 0 })], { numRuns: 100 })(
      '返される kind は有効な AuthError kind のいずれか',
      (issues) => {
        // Given: 任意の ZodIssue 配列
        // When: エラーをマッピングする
        const result = mapZodIssuesToAuthError(issues);

        // Then: kind が有効な値
        const validKinds = ['MISSING_EMAIL', 'MISSING_TOKEN', 'INVALID_EMAIL', 'INVALID_CREDENTIALS'];
        expect(validKinds).toContain(result.kind);
      },
    );

    test.prop([fc.array(zodIssueArb, { maxLength: 5, minLength: 0 })], { numRuns: 100 })(
      'message は常に空でない文字列',
      (issues) => {
        // Given: 任意の ZodIssue 配列
        // When: エラーをマッピングする
        const result = mapZodIssuesToAuthError(issues);

        // Then: message が空でない文字列
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      },
    );

    /**
     * ATLASSIAN_EMAIL エラーの特定テスト
     */
    describe('ATLASSIAN_EMAIL エラーのマッピング', () => {
      const emailIssueArb: fc.Arbitrary<ZodIssue> = fc
        .record({
          code: fc.constantFrom('invalid_type', 'too_small') as fc.Arbitrary<ZodIssue['code']>,
          message: fc.string({ maxLength: 200, minLength: 1 }),
        })
        .map(
          (base) =>
            ({
              ...base,
              path: ['ATLASSIAN_EMAIL'],
            }) as ZodIssue,
        );

      test.prop([emailIssueArb], { numRuns: 50 })(
        'ATLASSIAN_EMAIL の invalid_type/too_small エラーは MISSING_EMAIL を返す',
        (issue) => {
          // Given: ATLASSIAN_EMAIL の invalid_type または too_small エラー
          // When: エラーをマッピングする
          const result = mapZodIssuesToAuthError([issue]);

          // Then: MISSING_EMAIL を返す
          expect(result.kind).toBe('MISSING_EMAIL');
        },
      );

      const emailInvalidFormatIssueArb: fc.Arbitrary<ZodIssue> = fc
        .record({
          code: fc.constantFrom('invalid_string', 'custom') as fc.Arbitrary<ZodIssue['code']>,
          message: fc.string({ maxLength: 200, minLength: 1 }),
        })
        .map(
          (base) =>
            ({
              ...base,
              path: ['ATLASSIAN_EMAIL'],
            }) as ZodIssue,
        );

      test.prop([emailInvalidFormatIssueArb], { numRuns: 50 })(
        'ATLASSIAN_EMAIL のその他のエラーは INVALID_EMAIL を返す',
        (issue) => {
          // Given: ATLASSIAN_EMAIL の invalid_string または custom エラー
          // When: エラーをマッピングする
          const result = mapZodIssuesToAuthError([issue]);

          // Then: INVALID_EMAIL を返す
          expect(result.kind).toBe('INVALID_EMAIL');
        },
      );
    });

    /**
     * ATLASSIAN_API_TOKEN エラーの特定テスト
     */
    describe('ATLASSIAN_API_TOKEN エラーのマッピング', () => {
      const tokenIssueArb: fc.Arbitrary<ZodIssue> = fc
        .record({
          code: fc.constantFrom('invalid_type', 'too_small', 'invalid_string', 'custom') as fc.Arbitrary<
            ZodIssue['code']
          >,
          message: fc.string({ maxLength: 200, minLength: 1 }),
        })
        .map(
          (base) =>
            ({
              ...base,
              path: ['ATLASSIAN_API_TOKEN'],
            }) as ZodIssue,
        );

      test.prop([tokenIssueArb], { numRuns: 50 })('ATLASSIAN_API_TOKEN のエラーは MISSING_TOKEN を返す', (issue) => {
        // Given: ATLASSIAN_API_TOKEN のエラー
        // When: エラーをマッピングする
        const result = mapZodIssuesToAuthError([issue]);

        // Then: MISSING_TOKEN を返す
        expect(result.kind).toBe('MISSING_TOKEN');
      });
    });
  });

  /**
   * Base64 エンコーディングのプロパティテスト
   */
  describe('Base64 エンコーディングのプロパティ', () => {
    /**
     * 有効なメールアドレスを生成する Arbitrary
     */
    const validEmailArb = fc
      .tuple(
        fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 20, minLength: 1 }),
        fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 10, minLength: 1 }),
        fc.constantFrom('com', 'net', 'org', 'io', 'co.jp'),
      )
      .map(([local, domain, tld]) => `${local.join('')}@${domain.join('')}.${tld}`);

    /**
     * 有効な API トークンを生成する Arbitrary
     */
    const validApiTokenArb = fc.string({ maxLength: 100, minLength: 1 });

    test.prop([validEmailArb, validApiTokenArb], { numRuns: 100 })(
      '有効な認証情報で Basic Auth ヘッダーが生成される',
      (email, apiToken) => {
        // Given: 有効なメールアドレスと API トークン
        process.env.ATLASSIAN_EMAIL = email;
        process.env.ATLASSIAN_API_TOKEN = apiToken;

        // When: Auth ヘッダーを取得する
        const result = getAuthHeader();

        // Then: 成功し、Basic プレフィックスを持つ
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toMatch(/^Basic /);
        }
      },
    );

    test.prop([validEmailArb, validApiTokenArb], { numRuns: 100 })(
      'ヘッダー形式が "Basic {base64}" パターンに一致',
      (email, apiToken) => {
        // Given: 有効なメールアドレスと API トークン
        process.env.ATLASSIAN_EMAIL = email;
        process.env.ATLASSIAN_API_TOKEN = apiToken;

        // When: Auth ヘッダーを取得する
        const result = getAuthHeader();

        // Then: Base64 形式のパターンに一致
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Base64 文字列の正規表現パターン
          expect(result.value).toMatch(/^Basic [A-Za-z0-9+/]+=*$/);
        }
      },
    );

    test.prop([validEmailArb, validApiTokenArb], { numRuns: 100 })(
      'Base64 エンコードされた文字列をデコードすると元の認証情報が復元される',
      (email, apiToken) => {
        // Given: 有効なメールアドレスと API トークン
        process.env.ATLASSIAN_EMAIL = email;
        process.env.ATLASSIAN_API_TOKEN = apiToken;

        // When: Auth ヘッダーを取得してデコードする
        const result = getAuthHeader();

        // Then: デコードすると元の認証情報になる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const base64Part = result.value.replace('Basic ', '');
          const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
          expect(decoded).toBe(`${email}:${apiToken}`);
        }
      },
    );
  });

  /**
   * getCredentials のプロパティテスト
   */
  describe('getCredentials プロパティテスト', () => {
    test.prop([fc.constant(null)], { numRuns: 10 })('環境変数が未設定の場合はエラーを返す', () => {
      // Given: 環境変数が未設定
      delete process.env.ATLASSIAN_EMAIL;
      delete process.env.ATLASSIAN_API_TOKEN;

      // When: 認証情報を取得する
      const result = getCredentials();

      // Then: エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const validKinds = ['MISSING_EMAIL', 'MISSING_TOKEN', 'INVALID_EMAIL', 'INVALID_CREDENTIALS'];
        expect(validKinds).toContain(result.error.kind);
      }
    });

    /**
     * 有効なメールアドレスを生成する Arbitrary
     */
    const validEmailArb = fc
      .tuple(
        fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 20, minLength: 1 }),
        fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 10, minLength: 1 }),
        fc.constantFrom('com', 'net', 'org', 'io', 'co.jp'),
      )
      .map(([local, domain, tld]) => `${local.join('')}@${domain.join('')}.${tld}`);

    /**
     * 有効な API トークンを生成する Arbitrary
     */
    const validApiTokenArb = fc.string({ maxLength: 100, minLength: 1 });

    test.prop([validEmailArb, validApiTokenArb], { numRuns: 100 })(
      '有効な環境変数が設定されている場合は認証情報を返す',
      (email, apiToken) => {
        // Given: 有効な環境変数
        process.env.ATLASSIAN_EMAIL = email;
        process.env.ATLASSIAN_API_TOKEN = apiToken;

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: 成功し、正しい値を持つ
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.email).toBe(email);
          expect(result.value.apiToken).toBe(apiToken);
        }
      },
    );
  });

  /**
   * getCredentials の冪等性テスト
   */
  describe('getCredentials 冪等性テスト', () => {
    /**
     * 有効なメールアドレスを生成する Arbitrary
     */
    const validEmailArb = fc
      .tuple(
        fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 20, minLength: 1 }),
        fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { maxLength: 10, minLength: 1 }),
        fc.constantFrom('com', 'net', 'org', 'io', 'co.jp'),
      )
      .map(([local, domain, tld]) => `${local.join('')}@${domain.join('')}.${tld}`);

    /**
     * 有効な API トークンを生成する Arbitrary
     */
    const validApiTokenArb = fc.string({ maxLength: 100, minLength: 1 });

    test.prop([validEmailArb, validApiTokenArb], { numRuns: 100 })(
      '同じ環境変数に対して常に同じ結果を返す',
      (email, apiToken) => {
        // Given: 有効な環境変数
        process.env.ATLASSIAN_EMAIL = email;
        process.env.ATLASSIAN_API_TOKEN = apiToken;

        // When: 同じ入力で 2 回認証情報を取得する
        const result1 = getCredentials();
        const result2 = getCredentials();

        // Then: 結果が一致する
        expect(result1.isOk()).toBe(result2.isOk());
        if (result1.isOk() && result2.isOk()) {
          expect(result1.value).toEqual(result2.value);
        }
      },
    );
  });
});
