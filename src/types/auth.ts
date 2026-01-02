/**
 * 認証情報の型
 */
export interface Credentials {
  /** Atlassian アカウントのメールアドレス */
  readonly email: string;
  /** Atlassian API トークン */
  readonly apiToken: string;
}

/**
 * 認証エラーの型
 */
export type AuthError =
  | { kind: 'MISSING_EMAIL'; message: string }
  | { kind: 'MISSING_TOKEN'; message: string }
  | { kind: 'INVALID_EMAIL'; message: string }
  | { kind: 'INVALID_CREDENTIALS'; message: string };
