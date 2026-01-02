import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ZodIssue } from 'zod';
import { getAuthHeader, getCredentials, mapZodIssuesToAuthError } from './auth-service.js';

describe('AuthService', () => {
  /**
   * 環境変数から認証情報を取得する機能のテスト
   */
  describe('getCredentials', () => {
    // 元の環境変数を保持
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
     * 有効な認証情報が設定されている場合のテスト
     */
    describe('有効な認証情報', () => {
      it('環境変数から認証情報を取得できる', () => {
        // Given: 有効な環境変数が設定されている
        process.env.ATLASSIAN_EMAIL = 'user@example.com';
        process.env.ATLASSIAN_API_TOKEN = 'valid-api-token';

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: 認証情報が正しく取得される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.email).toBe('user@example.com');
          expect(result.value.apiToken).toBe('valid-api-token');
        }
      });
    });

    /**
     * メールアドレスが未設定の場合のテスト
     */
    describe('メールアドレス未設定', () => {
      it('ATLASSIAN_EMAIL が未設定の場合は MISSING_EMAIL エラーを返す', () => {
        // Given: ATLASSIAN_EMAIL が未設定
        process.env.ATLASSIAN_API_TOKEN = 'valid-api-token';

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: MISSING_EMAIL エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_EMAIL');
          expect(result.error.message).toContain('ATLASSIAN_EMAIL');
        }
      });

      it('ATLASSIAN_EMAIL が空文字列の場合は MISSING_EMAIL エラーを返す', () => {
        // Given: ATLASSIAN_EMAIL が空文字列
        process.env.ATLASSIAN_EMAIL = '';
        process.env.ATLASSIAN_API_TOKEN = 'valid-api-token';

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: MISSING_EMAIL エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_EMAIL');
        }
      });
    });

    /**
     * API トークンが未設定の場合のテスト
     */
    describe('API トークン未設定', () => {
      it('ATLASSIAN_API_TOKEN が未設定の場合は MISSING_TOKEN エラーを返す', () => {
        // Given: ATLASSIAN_API_TOKEN が未設定
        process.env.ATLASSIAN_EMAIL = 'user@example.com';

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: MISSING_TOKEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_TOKEN');
          expect(result.error.message).toContain('ATLASSIAN_API_TOKEN');
        }
      });

      it('ATLASSIAN_API_TOKEN が空文字列の場合は MISSING_TOKEN エラーを返す', () => {
        // Given: ATLASSIAN_API_TOKEN が空文字列
        process.env.ATLASSIAN_EMAIL = 'user@example.com';
        process.env.ATLASSIAN_API_TOKEN = '';

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: MISSING_TOKEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_TOKEN');
        }
      });
    });

    /**
     * メールアドレス形式が無効な場合のテスト
     */
    describe('メールアドレス形式バリデーション', () => {
      it('無効なメールアドレス形式の場合は INVALID_EMAIL エラーを返す', () => {
        // Given: 無効な形式のメールアドレス
        process.env.ATLASSIAN_EMAIL = 'invalid-email';
        process.env.ATLASSIAN_API_TOKEN = 'valid-api-token';

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: INVALID_EMAIL エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_EMAIL');
        }
      });

      it('@マークがないメールアドレスは INVALID_EMAIL エラーを返す', () => {
        // Given: @マークがないメールアドレス
        process.env.ATLASSIAN_EMAIL = 'userexample.com';
        process.env.ATLASSIAN_API_TOKEN = 'valid-api-token';

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: INVALID_EMAIL エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_EMAIL');
        }
      });
    });

    /**
     * 両方の環境変数が未設定の場合のテスト
     */
    describe('両方未設定', () => {
      it('両方の環境変数が未設定の場合はエラーを返す', () => {
        // Given: 両方の環境変数が未設定
        // (beforeEach で削除済み)

        // When: 認証情報を取得する
        const result = getCredentials();

        // Then: エラーが返される
        expect(result.isErr()).toBe(true);
      });
    });
  });

  /**
   * Basic Auth ヘッダー生成機能のテスト
   *
   * Authorization: Basic <base64> 形式でヘッダーを生成する
   */
  describe('getAuthHeader', () => {
    // 元の環境変数を保持
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
     * 正常系: Basic Auth ヘッダーが生成される
     */
    describe('ヘッダー生成成功', () => {
      it('有効な認証情報から Basic Auth ヘッダーを生成する', () => {
        // Given: 有効な環境変数が設定されている
        process.env.ATLASSIAN_EMAIL = 'user@example.com';
        process.env.ATLASSIAN_API_TOKEN = 'api-token-123';

        // When: Auth ヘッダーを生成する
        const result = getAuthHeader();

        // Then: Basic Auth ヘッダーが正しく生成される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // email:token を base64 エンコードした値を確認
          // 'user@example.com:api-token-123' を base64 エンコード
          const expectedBase64 = Buffer.from('user@example.com:api-token-123').toString('base64');
          expect(result.value).toBe(`Basic ${expectedBase64}`);
        }
      });

      it('生成されたヘッダーは "Basic " プレフィックスで始まる', () => {
        // Given: 有効な環境変数が設定されている
        process.env.ATLASSIAN_EMAIL = 'test@test.com';
        process.env.ATLASSIAN_API_TOKEN = 'token';

        // When: Auth ヘッダーを生成する
        const result = getAuthHeader();

        // Then: "Basic " プレフィックスで始まる
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.startsWith('Basic ')).toBe(true);
        }
      });

      it('base64 部分は有効な base64 文字列である', () => {
        // Given: 有効な環境変数が設定されている
        process.env.ATLASSIAN_EMAIL = 'user@example.com';
        process.env.ATLASSIAN_API_TOKEN = 'my-secret-token';

        // When: Auth ヘッダーを生成する
        const result = getAuthHeader();

        // Then: base64 部分をデコードして元の値を確認
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const base64Part = result.value.replace('Basic ', '');
          const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
          expect(decoded).toBe('user@example.com:my-secret-token');
        }
      });
    });

    /**
     * 異常系: 認証情報が不正な場合
     */
    describe('認証エラー', () => {
      it('メールアドレスが未設定の場合は MISSING_EMAIL エラーを返す', () => {
        // Given: ATLASSIAN_EMAIL が未設定
        process.env.ATLASSIAN_API_TOKEN = 'valid-token';

        // When: Auth ヘッダーを生成しようとする
        const result = getAuthHeader();

        // Then: MISSING_EMAIL エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_EMAIL');
        }
      });

      it('API トークンが未設定の場合は MISSING_TOKEN エラーを返す', () => {
        // Given: ATLASSIAN_API_TOKEN が未設定
        process.env.ATLASSIAN_EMAIL = 'user@example.com';

        // When: Auth ヘッダーを生成しようとする
        const result = getAuthHeader();

        // Then: MISSING_TOKEN エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_TOKEN');
        }
      });

      it('メールアドレス形式が不正な場合は INVALID_EMAIL エラーを返す', () => {
        // Given: 不正な形式のメールアドレス
        process.env.ATLASSIAN_EMAIL = 'not-an-email';
        process.env.ATLASSIAN_API_TOKEN = 'valid-token';

        // When: Auth ヘッダーを生成しようとする
        const result = getAuthHeader();

        // Then: INVALID_EMAIL エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_EMAIL');
        }
      });

      it('両方の環境変数が未設定の場合はエラーを返す', () => {
        // Given: 両方の環境変数が未設定
        // (beforeEach で削除済み)

        // When: Auth ヘッダーを生成しようとする
        const result = getAuthHeader();

        // Then: エラーが返される
        expect(result.isErr()).toBe(true);
      });
    });
  });
});

/**
 * mapZodIssuesToAuthError のユニットテスト
 *
 * Zod バリデーションエラーを AuthError に変換する機能のテスト
 */
describe('mapZodIssuesToAuthError', () => {
  describe('issues が空の場合', () => {
    // issues 配列が空の場合のテスト
    it('空の issues 配列に対して INVALID_CREDENTIALS を返す', () => {
      // Given: 空の issues 配列
      const issues: ZodIssue[] = [];

      // When: エラーマッピングを実行
      const result = mapZodIssuesToAuthError(issues);

      // Then: INVALID_CREDENTIALS が返される
      expect(result.kind).toBe('INVALID_CREDENTIALS');
      expect(result.message).toContain('バリデーションに失敗');
    });
  });

  describe('ATLASSIAN_EMAIL のエラー', () => {
    // invalid_type エラーのテスト
    it('invalid_type エラーで MISSING_EMAIL を返す', () => {
      // Given: ATLASSIAN_EMAIL の invalid_type エラー
      const issues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          message: '必須項目です',
          path: ['ATLASSIAN_EMAIL'],
          received: 'undefined',
        },
      ];

      // When: エラーマッピングを実行
      const result = mapZodIssuesToAuthError(issues);

      // Then: MISSING_EMAIL が返される
      expect(result.kind).toBe('MISSING_EMAIL');
      expect(result.message).toContain('ATLASSIAN_EMAIL');
    });

    // too_small エラーのテスト
    it('too_small エラーで MISSING_EMAIL を返す', () => {
      // Given: ATLASSIAN_EMAIL の too_small エラー（空文字列）
      const issues: ZodIssue[] = [
        {
          code: 'too_small',
          inclusive: true,
          message: '1文字以上必要です',
          minimum: 1,
          path: ['ATLASSIAN_EMAIL'],
          type: 'string',
        },
      ];

      // When: エラーマッピングを実行
      const result = mapZodIssuesToAuthError(issues);

      // Then: MISSING_EMAIL が返される
      expect(result.kind).toBe('MISSING_EMAIL');
    });

    // invalid_string エラーのテスト（メール形式エラー）
    it('invalid_string エラーで INVALID_EMAIL を返す', () => {
      // Given: ATLASSIAN_EMAIL の invalid_string エラー（メール形式）
      const issues: ZodIssue[] = [
        {
          code: 'invalid_string',
          message: '有効なメールアドレスを指定してください',
          path: ['ATLASSIAN_EMAIL'],
          validation: 'email',
        },
      ];

      // When: エラーマッピングを実行
      const result = mapZodIssuesToAuthError(issues);

      // Then: INVALID_EMAIL が返される
      expect(result.kind).toBe('INVALID_EMAIL');
      expect(result.message).toContain('無効なメールアドレス');
    });
  });

  describe('ATLASSIAN_API_TOKEN のエラー', () => {
    // API トークン未設定のテスト
    it('ATLASSIAN_API_TOKEN エラーで MISSING_TOKEN を返す', () => {
      // Given: ATLASSIAN_API_TOKEN の invalid_type エラー
      const issues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          message: '必須項目です',
          path: ['ATLASSIAN_API_TOKEN'],
          received: 'undefined',
        },
      ];

      // When: エラーマッピングを実行
      const result = mapZodIssuesToAuthError(issues);

      // Then: MISSING_TOKEN が返される
      expect(result.kind).toBe('MISSING_TOKEN');
      expect(result.message).toContain('ATLASSIAN_API_TOKEN');
    });
  });

  describe('不明なフィールドのエラー', () => {
    // 不明なパスのエラーテスト
    it('不明なパスに対して INVALID_CREDENTIALS を返す', () => {
      // Given: 不明なフィールドのエラー
      const issues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          message: '不明なエラー',
          path: ['UNKNOWN_FIELD'],
          received: 'undefined',
        },
      ];

      // When: エラーマッピングを実行
      const result = mapZodIssuesToAuthError(issues);

      // Then: INVALID_CREDENTIALS が返される
      expect(result.kind).toBe('INVALID_CREDENTIALS');
      expect(result.message).toContain('バリデーションに失敗');
    });
  });
});
