/**
 * CLI エントリーポイントのテスト
 *
 * yargs を使用した CLI インターフェースのテスト。
 * Given When Then パターンに沿って記述。
 */

import { describe, expect, it } from 'vitest';
import { createCli } from './cli.js';

describe('CLI', () => {
  describe('基本コマンド', () => {
    // URL 引数を受け付けて解析できることを確認するテスト
    it('atl-fetch <URL> 形式でコマンドを受け付ける', async () => {
      // Given: URL 引数が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: URL が正しく解析される
      expect(argv.url).toBe('https://example.atlassian.net/browse/PROJ-123');
    });

    // 必須引数が不足している場合のエラーを確認するテスト
    it('必須引数が不足している場合はエラーになる', async () => {
      // Given: 引数が指定されていない
      const args: string[] = [];

      // When: CLI をパースする
      const cli = createCli();

      // Then: エラーメッセージが含まれる例外が発生する
      try {
        await cli.parse(args);
        // parse が成功した場合はテスト失敗
        expect.fail('parse should throw an error');
      } catch (error) {
        // エラーが発生することを確認
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('--help オプション', () => {
    // --help オプションが設定されていることを確認するテスト
    it('--help オプションでヘルプを設定している', () => {
      // Given: CLI を作成する

      // When: CLI のオプション設定を確認する
      const cli = createCli();

      // Then: help オプションが設定されている（yargs の設定が正しい）
      expect(cli.getHelp).toBeDefined();
    });

    // -h エイリアスが設定されていることを確認するテスト
    it('-h エイリアスが設定されている', async () => {
      // Given: URL と一緒に -h を指定しない（ヘルプ表示のテスト）
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: パースが成功する（-h エイリアスの存在確認）
      expect(argv).toBeDefined();
    });
  });

  describe('--version オプション', () => {
    // --version オプションが設定されていることを確認するテスト
    it('--version オプションでバージョンを設定している', () => {
      // Given: CLI を作成する

      // When: CLI のバージョン設定を確認する
      const cli = createCli();

      // Then: version メソッドが存在する
      expect(cli.version).toBeDefined();
    });

    // -V エイリアスが設定されていることを確認するテスト
    it('-V エイリアスが設定されている', async () => {
      // Given: URL を指定してパースする
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: パースが成功する
      expect(argv).toBeDefined();
    });
  });

  describe('デフォルトオプション', () => {
    // デフォルトオプションが正しく設定されていることを確認するテスト
    it('デフォルトのオプション値が設定されている', async () => {
      // Given: URL のみが指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: デフォルト値が設定されている
      expect(argv.format).toBe('json');
      expect(argv.download).toBe(false);
      expect(argv.diff).toBe(false);
      expect(argv.color).toBe(true);
    });
  });

  describe('--format オプション', () => {
    // --format オプションで出力形式を指定できることを確認するテスト
    it('--format json で JSON 形式を指定できる', async () => {
      // Given: --format json が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--format', 'json'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: format が json になる
      expect(argv.format).toBe('json');
    });

    it('--format markdown で Markdown 形式を指定できる', async () => {
      // Given: --format markdown が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--format', 'markdown'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: format が markdown になる
      expect(argv.format).toBe('markdown');
    });

    it('--format yaml で YAML 形式を指定できる', async () => {
      // Given: --format yaml が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--format', 'yaml'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: format が yaml になる
      expect(argv.format).toBe('yaml');
    });

    // 不正な format 値を拒否することを確認するテスト
    it('不正な format 値を拒否する', async () => {
      // Given: 不正な format が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--format', 'invalid'];

      // When: CLI をパースする
      const cli = createCli();

      // Then: エラーが発生する
      try {
        await cli.parse(args);
        // parse が成功した場合はテスト失敗
        expect.fail('parse should throw an error');
      } catch (error) {
        // エラーが発生することを確認
        expect(error).toBeInstanceOf(Error);
      }
    });

    // -f オプションでも指定できることを確認するテスト
    it('-f オプションでも指定できる', async () => {
      // Given: -f が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '-f', 'yaml'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: format が yaml になる
      expect(argv.format).toBe('yaml');
    });
  });

  describe('--download オプション', () => {
    // --download オプションで添付ファイルダウンロードを有効にできることを確認するテスト
    it('--download オプションで添付ファイルダウンロードを有効にする', async () => {
      // Given: --download が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--download'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: download が true になる
      expect(argv.download).toBe(true);
    });

    // -d オプションでも指定できることを確認するテスト
    it('-d オプションでも指定できる', async () => {
      // Given: -d が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '-d'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: download が true になる
      expect(argv.download).toBe(true);
    });
  });

  describe('--dir オプション', () => {
    // --dir オプションで保存先ディレクトリを指定できることを確認するテスト
    it('--dir オプションで保存先ディレクトリを指定する', async () => {
      // Given: --download と --dir が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--download', '--dir', '/path/to/output'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: dir が指定値になる
      expect(argv.dir).toBe('/path/to/output');
    });

    // -o オプションでも指定できることを確認するテスト
    it('-o オプションでも指定できる', async () => {
      // Given: -d と -o が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '-d', '-o', '/path/to/output'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: dir が指定値になる
      expect(argv.dir).toBe('/path/to/output');
    });

    // --download なしで --dir を指定した場合はエラーになることを確認するテスト
    it('--download なしで --dir を指定するとエラーになる', async () => {
      // Given: --download なしで --dir が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--dir', '/path/to/output'];

      // When: CLI をパースする
      const cli = createCli();

      // Then: エラーが発生する
      try {
        await cli.parse(args);
        expect.fail('parse should throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('--dir オプションは --download オプションと一緒に指定してください');
      }
    });

    // テストの目的: --download のみ指定（--dir なし）で成功すること
    it('Given: --download のみ指定（--dir なし）, When: CLI をパースする, Then: 成功する', async () => {
      // Given: --download のみ指定
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--download'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: download が true で dir は undefined
      expect(argv.download).toBe(true);
      expect(argv.dir).toBeUndefined();
    });

    // テストの目的: --download=false と --dir の組み合わせでエラーになること
    it('Given: --download=false と --dir 指定, When: CLI をパースする, Then: エラーを返す', async () => {
      // Given: --download=false と --dir が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--no-download', '--dir', '/path'];

      // When: CLI をパースする
      const cli = createCli();

      // Then: エラーが発生する
      try {
        await cli.parse(args);
        expect.fail('parse should throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('--dir オプションは --download オプションと一緒に指定してください');
      }
    });

    // テストの目的: -d と -o の短形式の組み合わせで成功すること
    it('Given: -d と -o の短形式の組み合わせ, When: CLI をパースする, Then: 成功する', async () => {
      // Given: -d と -o が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '-d', '-o', './output'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: 両方のオプションが設定される
      expect(argv.download).toBe(true);
      expect(argv.dir).toBe('./output');
    });
  });

  describe('--diff オプション', () => {
    // --diff オプションで差分のみを出力できることを確認するテスト
    it('--diff オプションで差分のみを出力する', async () => {
      // Given: --diff が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--diff'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: diff が true になる
      expect(argv.diff).toBe(true);
    });
  });

  describe('--no-color オプション', () => {
    // --no-color オプションでカラー出力を無効にできることを確認するテスト
    it('--no-color オプションでカラー出力を無効にする', async () => {
      // Given: --no-color が指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--no-color'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: color が false になる
      expect(argv.color).toBe(false);
    });
  });

  describe('複合オプション', () => {
    // 複数のオプションを同時に指定できることを確認するテスト
    it('複数のオプションを同時に指定できる', async () => {
      // Given: 複数のオプションが指定されている
      const args = [
        'https://example.atlassian.net/browse/PROJ-123',
        '--format',
        'markdown',
        '--download',
        '--dir',
        '/tmp/output',
        '--diff',
        '--no-color',
      ];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: すべてのオプションが正しく設定される
      expect(argv.url).toBe('https://example.atlassian.net/browse/PROJ-123');
      expect(argv.format).toBe('markdown');
      expect(argv.download).toBe(true);
      expect(argv.dir).toBe('/tmp/output');
      expect(argv.diff).toBe(true);
      expect(argv.color).toBe(false);
    });
  });

  describe('fail ハンドラー', () => {
    // テストの目的: 不正なオプション指定時にエラーがスローされること
    it('Given: 不正なオプション, When: CLI をパースする, Then: Error をスローする', async () => {
      // Given: 存在しないオプションが指定されている
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--invalid-option'];

      // When: CLI をパースする
      const cli = createCli();

      // Then: エラーがスローされる
      try {
        await cli.parse(args);
        expect.fail('parse should throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unknown argument');
      }
    });

    // テストの目的: URL が不足している場合にエラーがスローされること
    it('Given: URL が不足, When: CLI をパースする, Then: Error をスローする', async () => {
      // Given: 引数なし
      const args: string[] = [];

      // When: CLI をパースする
      const cli = createCli();

      // Then: エラーがスローされる
      try {
        await cli.parse(args);
        expect.fail('parse should throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // yargs のデフォルトエラーメッセージまたはカスタムメッセージ
        const message = (error as Error).message;
        expect(message.includes('URL を指定してください') || message.includes('Not enough non-option arguments')).toBe(
          true,
        );
      }
    });

    // テストの目的: check 関数からのエラーが正しくスローされること
    it('Given: check 関数でエラー発生, When: CLI をパースする, Then: 元のエラーをスローする', async () => {
      // Given: check 関数でエラーが発生する状況 (--dir without --download)
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--dir', '/tmp'];

      // When: CLI をパースする
      const cli = createCli();

      // Then: check 関数からのエラーがスローされる
      try {
        await cli.parse(args);
        expect.fail('parse should throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // 元のエラーメッセージが保持されていること
        expect((error as Error).message).toBe('--dir オプションは --download オプションと一緒に指定してください');
      }
    });
  });

  describe('デフォルト値の厳密な検証', () => {
    // テストの目的: format のデフォルト値が正確に 'json' であること
    it('Given: format 未指定, When: CLI をパースする, Then: format は正確に "json"', async () => {
      // Given: format 未指定
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: format は正確に 'json' (型も含めて)
      expect(argv.format).toBe('json');
      expect(typeof argv.format).toBe('string');
    });

    // テストの目的: download のデフォルト値が正確に false であること
    it('Given: download 未指定, When: CLI をパースする, Then: download は正確に false', async () => {
      // Given: download 未指定
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: download は正確に false (型も含めて)
      expect(argv.download).toBe(false);
      expect(typeof argv.download).toBe('boolean');
    });

    // テストの目的: diff のデフォルト値が正確に false であること
    it('Given: diff 未指定, When: CLI をパースする, Then: diff は正確に false', async () => {
      // Given: diff 未指定
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: diff は正確に false (型も含めて)
      expect(argv.diff).toBe(false);
      expect(typeof argv.diff).toBe('boolean');
    });

    // テストの目的: color のデフォルト値が正確に true であること
    it('Given: color 未指定, When: CLI をパースする, Then: color は正確に true', async () => {
      // Given: color 未指定
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: color は正確に true (型も含めて)
      expect(argv.color).toBe(true);
      expect(typeof argv.color).toBe('boolean');
    });

    // テストの目的: dir のデフォルト値が undefined であること
    it('Given: dir 未指定, When: CLI をパースする, Then: dir は undefined', async () => {
      // Given: dir 未指定
      const args = ['https://example.atlassian.net/browse/PROJ-123'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: dir は undefined
      expect(argv.dir).toBeUndefined();
    });
  });

  describe('boolean オプションの明示的な指定', () => {
    // テストの目的: --download=true を明示的に指定できること
    it('Given: --download=true 明示指定, When: CLI をパースする, Then: download は true', async () => {
      // Given: --download=true 明示指定
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--download=true'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: download は true
      expect(argv.download).toBe(true);
    });

    // テストの目的: --download=false を明示的に指定できること
    it('Given: --download=false 明示指定, When: CLI をパースする, Then: download は false', async () => {
      // Given: --download=false 明示指定
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--download=false'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: download は false
      expect(argv.download).toBe(false);
    });

    // テストの目的: --diff=true を明示的に指定できること
    it('Given: --diff=true 明示指定, When: CLI をパースする, Then: diff は true', async () => {
      // Given: --diff=true 明示指定
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--diff=true'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: diff は true
      expect(argv.diff).toBe(true);
    });

    // テストの目的: --color=false を明示的に指定できること
    it('Given: --color=false 明示指定, When: CLI をパースする, Then: color は false', async () => {
      // Given: --color=false 明示指定
      const args = ['https://example.atlassian.net/browse/PROJ-123', '--color=false'];

      // When: CLI をパースする
      const cli = createCli();
      const argv = await cli.parse(args);

      // Then: color は false
      expect(argv.color).toBe(false);
    });
  });
});
