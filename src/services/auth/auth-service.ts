import { createEnv } from '@t3-oss/env-core';
import { err, ok, type Result } from 'neverthrow';
import { type ZodIssue, z } from 'zod';
import type { AuthError, Credentials } from '../../types/auth.js';

/**
 * 環境変数スキーマの定義
 *
 * @t3-oss/env-core と zod を使用して環境変数をバリデーション
 */
const envSchema = {
  ATLASSIAN_API_TOKEN: z.string().min(1, 'API トークンは必須です'),
  ATLASSIAN_EMAIL: z.string().min(1, 'メールアドレスは必須です').email('有効なメールアドレスを指定してください'),
};

/**
 * Zod の issues 配列からエラーの種別を判定し、AuthError を生成する
 *
 * @t3-oss/env-core は onValidationError で ZodError ではなく issues 配列を渡す
 *
 * @param issues - Zod バリデーションエラーの issues 配列
 * @returns 適切な AuthError
 *
 * @internal テスト用に export
 */
export function mapZodIssuesToAuthError(issues: ZodIssue[]): AuthError {
  // 最初のエラーを取得
  const firstIssue = issues[0];

  if (!firstIssue) {
    return {
      kind: 'INVALID_CREDENTIALS',
      message: '認証情報のバリデーションに失敗しました。',
    };
  }

  const path = firstIssue.path[0];
  const code = firstIssue.code;

  // ATLASSIAN_EMAIL のエラー
  if (path === 'ATLASSIAN_EMAIL') {
    // 未設定または空の場合
    if (code === 'invalid_type' || code === 'too_small') {
      return {
        kind: 'MISSING_EMAIL',
        message:
          '環境変数 ATLASSIAN_EMAIL が設定されていません。Atlassian アカウントのメールアドレスを設定してください。',
      };
    }
    // メール形式が無効
    return {
      kind: 'INVALID_EMAIL',
      message: `無効なメールアドレス形式です。有効なメールアドレスを ATLASSIAN_EMAIL に設定してください。`,
    };
  }

  // ATLASSIAN_API_TOKEN のエラー
  if (path === 'ATLASSIAN_API_TOKEN') {
    return {
      kind: 'MISSING_TOKEN',
      message:
        '環境変数 ATLASSIAN_API_TOKEN が設定されていません。Atlassian API トークンを設定してください。トークンは https://id.atlassian.com/manage-profile/security/api-tokens で作成できます。',
    };
  }

  return {
    kind: 'INVALID_CREDENTIALS',
    message: `認証情報のバリデーションに失敗しました: ${firstIssue.message}`,
  };
}

/**
 * 環境変数から Atlassian Cloud の認証情報を取得する
 *
 * @t3-oss/env-core と zod を使用して環境変数をバリデーションし、
 * 型安全な認証情報を返す。
 *
 * 必要な環境変数:
 * - `ATLASSIAN_EMAIL`: Atlassian アカウントのメールアドレス（有効なメール形式）
 * - `ATLASSIAN_API_TOKEN`: Atlassian API トークン（空でない文字列）
 *
 * @returns 成功時は {@link Credentials} を含む Ok、失敗時は {@link AuthError} を含す Err
 *
 * @example
 * ```typescript
 * // 成功例
 * process.env.ATLASSIAN_EMAIL = 'user@example.com';
 * process.env.ATLASSIAN_API_TOKEN = 'your-api-token';
 * const result = getCredentials();
 * if (result.isOk()) {
 *   console.log(result.value.email); // 'user@example.com'
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 失敗例: 環境変数未設定
 * delete process.env.ATLASSIAN_EMAIL;
 * const result = getCredentials();
 * if (result.isErr()) {
 *   console.log(result.error.kind); // 'MISSING_EMAIL'
 * }
 * ```
 */
export function getCredentials(): Result<Credentials, AuthError> {
  let validationError: AuthError | null = null;

  try {
    const env = createEnv({
      onValidationError: (issues) => {
        // @t3-oss/env-core は issues 配列を渡す
        validationError = mapZodIssuesToAuthError(issues as ZodIssue[]);
        throw new Error('Validation failed');
      },
      runtimeEnv: process.env,
      server: envSchema,
    });

    return ok({
      apiToken: env.ATLASSIAN_API_TOKEN,
      email: env.ATLASSIAN_EMAIL,
    });
  } catch {
    if (validationError) {
      return err(validationError);
    }

    // 予期しないエラー
    return err({
      kind: 'INVALID_CREDENTIALS',
      message: '認証情報の取得中に予期しないエラーが発生しました。',
    });
  }
}

/**
 * Basic Auth ヘッダーを生成する
 *
 * 環境変数から認証情報を取得し、`Authorization: Basic <base64>` 形式の
 * ヘッダー値を生成する。email:token を base64 エンコードする。
 *
 * @returns 成功時は `Basic <base64>` 形式の文字列を含む Ok、失敗時は {@link AuthError} を含む Err
 *
 * @example
 * ```typescript
 * // 成功例
 * process.env.ATLASSIAN_EMAIL = 'user@example.com';
 * process.env.ATLASSIAN_API_TOKEN = 'your-api-token';
 * const result = getAuthHeader();
 * if (result.isOk()) {
 *   // result.value は 'Basic dXNlckBleGFtcGxlLmNvbTp5b3VyLWFwaS10b2tlbg=='
 *   fetch(url, { headers: { Authorization: result.value } });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 失敗例: 環境変数未設定
 * delete process.env.ATLASSIAN_EMAIL;
 * const result = getAuthHeader();
 * if (result.isErr()) {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function getAuthHeader(): Result<string, AuthError> {
  return getCredentials().map((credentials) => {
    const rawCredentials = `${credentials.email}:${credentials.apiToken}`;
    const base64Encoded = Buffer.from(rawCredentials).toString('base64');
    return `Basic ${base64Encoded}`;
  });
}
