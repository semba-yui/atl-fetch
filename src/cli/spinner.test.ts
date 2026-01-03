/**
 * CLI スピナー・進捗表示ユーティリティのテスト
 *
 * ora と picocolors を使用した統一的な進捗表示のテスト。
 * Given When Then パターンに沿って記述。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliSpinner, colors, formatError, formatInfo, formatSuccess, formatWarn, SPINNER_STEPS } from './spinner.js';

describe('spinner', () => {
  describe('SPINNER_STEPS', () => {
    // 事前定義されたスピナーステップが存在することを確認するテスト
    it('事前定義されたスピナーステップが存在する', () => {
      // Given: SPINNER_STEPS 定数

      // When: 各ステップにアクセスする

      // Then: 各ステップに必要なプロパティが存在する
      expect(SPINNER_STEPS.AUTH_CHECK).toBeDefined();
      expect(SPINNER_STEPS.AUTH_CHECK.name).toBe('auth_check');
      expect(SPINNER_STEPS.AUTH_CHECK.text).toBe('認証情報を確認中...');
      expect(SPINNER_STEPS.AUTH_CHECK.successText).toBe('認証情報を確認しました');
    });

    // すべてのステップに必須プロパティがあることを確認するテスト
    it('すべてのステップに name と text プロパティが存在する', () => {
      // Given: SPINNER_STEPS の各ステップ
      const steps = Object.values(SPINNER_STEPS);

      // When: 各ステップのプロパティを検証する

      // Then: すべてのステップに name と text が存在する
      for (const step of steps) {
        expect(step.name).toBeDefined();
        expect(typeof step.name).toBe('string');
        expect(step.text).toBeDefined();
        expect(typeof step.text).toBe('string');
      }
    });

    // 定義されているステップの一覧を確認するテスト
    it('必要なステップがすべて定義されている', () => {
      // Given: 期待されるステップ名のリスト
      const expectedSteps = [
        'AUTH_CHECK',
        'DOWNLOAD_ATTACHMENTS',
        'FETCH_CONFLUENCE',
        'FETCH_DATA',
        'FETCH_JIRA',
        'FORMAT_OUTPUT',
        'SAVE_FILES',
        'URL_PARSE',
      ];

      // When: SPINNER_STEPS のキーを取得する

      // Then: すべての期待されるステップが存在する
      for (const stepName of expectedSteps) {
        expect(SPINNER_STEPS).toHaveProperty(stepName);
      }
    });
  });

  describe('colors', () => {
    // 各カラー関数が文字列を返すことを確認するテスト
    it('bold 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'test text';

      // When: bold 関数を呼び出す
      const result = colors.bold(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('cyan 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'test text';

      // When: cyan 関数を呼び出す
      const result = colors.cyan(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
    });

    it('dim 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'test text';

      // When: dim 関数を呼び出す
      const result = colors.dim(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
    });

    it('error 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'error message';

      // When: error 関数を呼び出す
      const result = colors.error(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
    });

    it('info 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'info message';

      // When: info 関数を呼び出す
      const result = colors.info(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
    });

    it('magenta 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'url text';

      // When: magenta 関数を呼び出す
      const result = colors.magenta(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
    });

    it('success 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'success message';

      // When: success 関数を呼び出す
      const result = colors.success(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
    });

    it('warn 関数が文字列を返す', () => {
      // Given: テスト用の文字列
      const text = 'warning message';

      // When: warn 関数を呼び出す
      const result = colors.warn(text);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
    });

    // 空文字列を処理できることを確認するテスト
    it('空文字列を処理できる', () => {
      // Given: 空文字列
      const text = '';

      // When: 各関数を呼び出す
      const results = [
        colors.bold(text),
        colors.cyan(text),
        colors.dim(text),
        colors.error(text),
        colors.info(text),
        colors.magenta(text),
        colors.success(text),
        colors.warn(text),
      ];

      // Then: すべての結果が文字列である
      for (const result of results) {
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('CliSpinner', () => {
    // 元の環境変数を保持
    const originalEnv = { ...process.env };
    const originalIsTTY = process.stdout.isTTY;

    beforeEach(() => {
      // CI 環境をシミュレート
      process.env.CI = 'true';
    });

    afterEach(() => {
      // 環境変数を復元
      process.env = { ...originalEnv };
      Object.defineProperty(process.stdout, 'isTTY', {
        configurable: true,
        value: originalIsTTY,
      });
    });

    describe('constructor', () => {
      // enabled=false でスピナーが無効化されることを確認するテスト
      it('enabled=false でスピナーが無効化される', () => {
        // Given: enabled=false

        // When: CliSpinner を作成する
        const spinner = new CliSpinner(false);

        // Then: start を呼び出してもエラーにならない（無効化されている）
        expect(() => spinner.start('test')).not.toThrow();
      });

      // CI 環境ではスピナーが無効化されることを確認するテスト
      it('CI 環境ではスピナーが無効化される', () => {
        // Given: CI 環境変数が設定されている
        process.env.CI = 'true';

        // When: CliSpinner を作成する
        const spinner = new CliSpinner(true);

        // Then: start を呼び出してもエラーにならない
        expect(() => spinner.start('test')).not.toThrow();
      });
    });

    describe('start / succeed / fail / warn / info / stop', () => {
      // 各メソッドがエラーなく呼び出せることを確認するテスト
      it('start メソッドがエラーなく呼び出せる', () => {
        // Given: 無効化されたスピナー
        const spinner = new CliSpinner(false);

        // When: start を呼び出す

        // Then: エラーにならない
        expect(() => spinner.start('テスト中...')).not.toThrow();
      });

      it('succeed メソッドがエラーなく呼び出せる', () => {
        // Given: スピナー
        const spinner = new CliSpinner(false);

        // When: succeed を呼び出す

        // Then: エラーにならない
        expect(() => spinner.succeed('完了')).not.toThrow();
      });

      it('fail メソッドがエラーなく呼び出せる', () => {
        // Given: スピナー
        const spinner = new CliSpinner(false);

        // When: fail を呼び出す

        // Then: エラーにならない
        expect(() => spinner.fail('失敗')).not.toThrow();
      });

      it('warn メソッドがエラーなく呼び出せる', () => {
        // Given: スピナー
        const spinner = new CliSpinner(false);

        // When: warn を呼び出す

        // Then: エラーにならない
        expect(() => spinner.warn('警告')).not.toThrow();
      });

      it('info メソッドがエラーなく呼び出せる', () => {
        // Given: スピナー
        const spinner = new CliSpinner(false);

        // When: info を呼び出す

        // Then: エラーにならない
        expect(() => spinner.info('情報')).not.toThrow();
      });

      it('stop メソッドがエラーなく呼び出せる', () => {
        // Given: スピナー
        const spinner = new CliSpinner(false);

        // When: stop を呼び出す

        // Then: エラーにならない
        expect(() => spinner.stop()).not.toThrow();
      });

      it('update メソッドがエラーなく呼び出せる', () => {
        // Given: スピナー
        const spinner = new CliSpinner(false);

        // When: update を呼び出す

        // Then: エラーにならない
        expect(() => spinner.update('新しいテキスト')).not.toThrow();
      });
    });

    describe('startStep / succeedStep', () => {
      // startStep がステップ定義を使用してスピナーを開始することを確認するテスト
      it('startStep がエラーなく呼び出せる', () => {
        // Given: スピナーとステップ定義
        const spinner = new CliSpinner(false);
        const step = SPINNER_STEPS.FETCH_DATA;

        // When: startStep を呼び出す

        // Then: エラーにならない
        expect(() => spinner.startStep(step)).not.toThrow();
      });

      // succeedStep がステップ定義を使用してスピナーを終了することを確認するテスト
      it('succeedStep がエラーなく呼び出せる', () => {
        // Given: スピナーとステップ定義
        const spinner = new CliSpinner(false);
        const step = SPINNER_STEPS.FETCH_DATA;

        // When: succeedStep を呼び出す

        // Then: エラーにならない
        expect(() => spinner.succeedStep(step)).not.toThrow();
      });
    });
  });

  describe('formatError', () => {
    // エラーコードとメッセージのみの場合のテスト
    it('エラーコードとメッセージを含む文字列を返す', () => {
      // Given: エラーコードとメッセージ
      const code = 'ATL-001';
      const message = 'テストエラー';

      // When: formatError を呼び出す
      const result = formatError(code, message);

      // Then: コードとメッセージが含まれる
      expect(result).toContain(code);
      expect(result).toContain(message);
    });

    // 原因が指定された場合のテスト
    it('原因が含まれる', () => {
      // Given: エラーコード、メッセージ、原因
      const code = 'ATL-002';
      const message = 'エラー発生';
      const cause = '設定が不正です';

      // When: formatError を呼び出す
      const result = formatError(code, message, cause);

      // Then: 原因が含まれる
      expect(result).toContain('原因');
      expect(result).toContain(cause);
    });

    // 解決策が指定された場合のテスト
    it('解決策が含まれる', () => {
      // Given: エラーコード、メッセージ、原因、解決策
      const code = 'ATL-003';
      const message = 'エラー発生';
      const cause = '設定が不正です';
      const solution = '設定ファイルを確認してください';

      // When: formatError を呼び出す
      const result = formatError(code, message, cause, solution);

      // Then: 解決策が含まれる
      expect(result).toContain('解決策');
      expect(result).toContain(solution);
    });

    // 原因なしで解決策のみ指定した場合のテスト
    it('原因なしで解決策のみ指定できる', () => {
      // Given: エラーコード、メッセージ、解決策（原因なし）
      const code = 'ATL-004';
      const message = 'エラー発生';
      const solution = '再試行してください';

      // When: formatError を呼び出す
      const result = formatError(code, message, undefined, solution);

      // Then: 解決策は含まれるが原因は含まれない
      expect(result).toContain('解決策');
      expect(result).toContain(solution);
      expect(result).not.toContain('原因');
    });

    // 複数行の出力になることを確認するテスト
    it('複数行の出力になる', () => {
      // Given: すべてのパラメータ
      const code = 'ATL-005';
      const message = 'テストエラー';
      const cause = '原因の説明';
      const solution = '解決策の説明';

      // When: formatError を呼び出す
      const result = formatError(code, message, cause, solution);

      // Then: 複数行になる
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe('formatSuccess', () => {
    // メッセージのみの場合のテスト
    it('成功メッセージを含む文字列を返す', () => {
      // Given: 成功メッセージ
      const message = '処理が完了しました';

      // When: formatSuccess を呼び出す
      const result = formatSuccess(message);

      // Then: メッセージとチェックマークが含まれる
      expect(result).toContain('✓');
      expect(result).toContain(message);
    });

    // 詳細情報が指定された場合のテスト
    it('詳細情報が含まれる', () => {
      // Given: 成功メッセージと詳細
      const message = '保存完了';
      const details = {
        サイズ: '1.2KB',
        ファイル: 'test.json',
      };

      // When: formatSuccess を呼び出す
      const result = formatSuccess(message, details);

      // Then: 詳細情報が含まれる
      expect(result).toContain('ファイル');
      expect(result).toContain('test.json');
      expect(result).toContain('サイズ');
      expect(result).toContain('1.2KB');
    });

    // 空の詳細オブジェクトの場合のテスト
    it('空の詳細オブジェクトでもエラーにならない', () => {
      // Given: 成功メッセージと空の詳細
      const message = '完了';
      const details = {};

      // When: formatSuccess を呼び出す
      const result = formatSuccess(message, details);

      // Then: メッセージが含まれる
      expect(result).toContain(message);
    });
  });

  describe('formatInfo', () => {
    // 情報メッセージをフォーマットするテスト
    it('情報アイコンとメッセージを含む文字列を返す', () => {
      // Given: 情報メッセージ
      const message = 'これは情報です';

      // When: formatInfo を呼び出す
      const result = formatInfo(message);

      // Then: 情報アイコンとメッセージが含まれる
      expect(result).toContain('ℹ');
      expect(result).toContain(message);
    });

    // 空文字列を処理できることを確認するテスト
    it('空文字列を処理できる', () => {
      // Given: 空のメッセージ
      const message = '';

      // When: formatInfo を呼び出す
      const result = formatInfo(message);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
      expect(result).toContain('ℹ');
    });
  });

  describe('formatWarn', () => {
    // 警告メッセージをフォーマットするテスト
    it('警告アイコンとメッセージを含む文字列を返す', () => {
      // Given: 警告メッセージ
      const message = 'これは警告です';

      // When: formatWarn を呼び出す
      const result = formatWarn(message);

      // Then: 警告アイコンとメッセージが含まれる
      expect(result).toContain('⚠');
      expect(result).toContain(message);
    });

    // 空文字列を処理できることを確認するテスト
    it('空文字列を処理できる', () => {
      // Given: 空のメッセージ
      const message = '';

      // When: formatWarn を呼び出す
      const result = formatWarn(message);

      // Then: 結果は文字列である
      expect(typeof result).toBe('string');
      expect(result).toContain('⚠');
    });
  });
});
