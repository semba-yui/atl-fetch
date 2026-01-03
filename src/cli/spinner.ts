/**
 * CLI スピナー・進捗表示ユーティリティ
 *
 * ora と picocolors を使用した統一的な進捗表示を提供する。
 */

import ora, { type Ora } from 'ora';
import pc from 'picocolors';

/**
 * スピナーのステップ定義
 */
export interface SpinnerStep {
  /** ステップ名（内部識別用） */
  name: string;
  /** 表示テキスト（進行中） */
  text: string;
  /** 完了時のテキスト */
  successText?: string;
}

/**
 * 事前定義されたスピナーステップ
 */
export const SPINNER_STEPS = {
  AUTH_CHECK: {
    name: 'auth_check',
    successText: '認証情報を確認しました',
    text: '認証情報を確認中...',
  },
  DOWNLOAD_ATTACHMENTS: {
    name: 'download_attachments',
    successText: '添付ファイルをダウンロードしました',
    text: '添付ファイルをダウンロード中...',
  },
  FETCH_CONFLUENCE: {
    name: 'fetch_confluence',
    successText: 'Confluence ページを取得しました',
    text: 'Confluence ページを取得中...',
  },
  FETCH_DATA: {
    name: 'fetch_data',
    successText: 'データを取得しました',
    text: 'データを取得中...',
  },
  FETCH_JIRA: {
    name: 'fetch_jira',
    successText: 'Jira Issue を取得しました',
    text: 'Jira Issue を取得中...',
  },
  FORMAT_OUTPUT: {
    name: 'format_output',
    successText: '出力を整形しました',
    text: '出力を整形中...',
  },
  SAVE_FILES: {
    name: 'save_files',
    successText: 'ファイルを保存しました',
    text: 'ファイルを保存中...',
  },
  URL_PARSE: {
    name: 'url_parse',
    successText: 'URLを解析しました',
    text: 'URLを解析中...',
  },
} as const satisfies Record<string, SpinnerStep>;

/**
 * CLI 出力のカラーヘルパー
 */
export const colors = {
  /** 太字 */
  bold: (text: string): string => pc.bold(text),
  /** シアン（ファイルパスなど） */
  cyan: (text: string): string => pc.cyan(text),
  /** 薄いテキスト（グレー） */
  dim: (text: string): string => pc.dim(text),
  /** エラーメッセージ（赤） */
  error: (text: string): string => pc.red(text),
  /** 情報メッセージ（青） */
  info: (text: string): string => pc.blue(text),
  /** マゼンタ（URL など） */
  magenta: (text: string): string => pc.magenta(text),
  /** 成功メッセージ（緑） */
  success: (text: string): string => pc.green(text),
  /** 警告メッセージ（黄） */
  warn: (text: string): string => pc.yellow(text),
} as const;

/**
 * CLI スピナー管理クラス
 *
 * 処理の進捗状況をユーザーに表示するためのスピナーを管理する。
 *
 * @example
 * ```typescript
 * const spinner = new CliSpinner();
 * spinner.start('データを取得中...');
 * // ... 処理 ...
 * spinner.succeed('データを取得しました');
 * ```
 */
export class CliSpinner {
  private spinner: Ora | null = null;
  private enabled: boolean;

  /**
   * CliSpinner インスタンスを作成する
   *
   * @param enabled スピナーを有効にするかどうか（CI環境などでは無効にする）
   */
  constructor(enabled = true) {
    // CI環境やテスト環境ではスピナーを無効化
    this.enabled = enabled && !process.env['CI'] && process.stdout.isTTY === true;
  }

  /**
   * スピナーを開始する
   *
   * @param text 表示するテキスト
   */
  start(text: string): void {
    if (!this.enabled) {
      return;
    }

    this.spinner = ora({
      spinner: 'dots',
      text,
    }).start();
  }

  /**
   * スピナーのテキストを更新する
   *
   * @param text 新しいテキスト
   */
  update(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * スピナーを成功状態で終了する
   *
   * @param text 成功時に表示するテキスト
   */
  succeed(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }

  /**
   * スピナーを失敗状態で終了する
   *
   * @param text 失敗時に表示するテキスト
   */
  fail(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  /**
   * スピナーを警告状態で終了する
   *
   * @param text 警告時に表示するテキスト
   */
  warn(text?: string): void {
    if (this.spinner) {
      this.spinner.warn(text);
      this.spinner = null;
    }
  }

  /**
   * スピナーを情報状態で終了する
   *
   * @param text 情報として表示するテキスト
   */
  info(text?: string): void {
    if (this.spinner) {
      this.spinner.info(text);
      this.spinner = null;
    }
  }

  /**
   * スピナーを停止する（状態なし）
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * 事前定義されたステップでスピナーを開始する
   *
   * @param step スピナーステップ定義
   */
  startStep(step: SpinnerStep): void {
    this.start(step.text);
  }

  /**
   * 事前定義されたステップを成功状態で終了する
   *
   * @param step スピナーステップ定義
   */
  succeedStep(step: SpinnerStep): void {
    this.succeed(step.successText ?? step.text);
  }
}

/**
 * エラーメッセージを整形して出力する
 *
 * @param code エラーコード
 * @param message エラーメッセージ
 * @param cause 原因の説明（オプション）
 * @param solution 解決策の説明（オプション）
 * @returns 整形されたエラーメッセージ
 */
export function formatError(code: string, message: string, cause?: string, solution?: string): string {
  const lines: string[] = [];

  lines.push(colors.error(`${colors.bold(code)}: ${message}`));

  if (cause) {
    lines.push(colors.dim(`  原因: ${cause}`));
  }

  if (solution) {
    lines.push(colors.info(`  解決策: ${solution}`));
  }

  return lines.join('\n');
}

/**
 * 成功メッセージを整形する
 *
 * @param message メッセージ
 * @param details 詳細情報（オプション）
 * @returns 整形されたメッセージ
 */
export function formatSuccess(message: string, details?: Record<string, string>): string {
  const lines: string[] = [];

  lines.push(colors.success(`✓ ${message}`));

  if (details) {
    for (const [key, value] of Object.entries(details)) {
      lines.push(colors.dim(`  ${key}: ${colors.cyan(value)}`));
    }
  }

  return lines.join('\n');
}

/**
 * 情報メッセージを整形する
 *
 * @param message メッセージ
 * @returns 整形されたメッセージ
 */
export function formatInfo(message: string): string {
  return colors.info(`ℹ ${message}`);
}

/**
 * 警告メッセージを整形する
 *
 * @param message メッセージ
 * @returns 整形されたメッセージ
 */
export function formatWarn(message: string): string {
  return colors.warn(`⚠ ${message}`);
}
