/**
 * CLI エントリーポイント
 *
 * yargs を使用した CLI インターフェースを提供する。
 */

import { createRequire } from 'node:module';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { fetchAndOutput, fetchAndSave } from '../services/fetch/fetch-service.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

/**
 * CLI の引数の型
 */
export interface CliArgs {
  /** Atlassian Cloud URL */
  url: string;
  /** 出力形式（json/markdown/yaml） */
  format: 'json' | 'markdown' | 'yaml';
  /** 添付ファイルダウンロードを有効にする */
  download: boolean;
  /** 保存先ディレクトリ */
  dir?: string;
  /** 差分のみを出力する */
  diff: boolean;
  /** カラー出力を有効にする */
  color: boolean;
}

/**
 * CLI 作成オプション
 */
export interface CliOptions {
  /** process.exit を呼び出すかどうか（テスト時は false にする） */
  exitProcess?: boolean;
}

/**
 * CLI バージョン（package.json から取得）
 */
const CLI_VERSION = packageJson.version;

/**
 * CLI インスタンスを作成する
 *
 * yargs を使用して CLI 引数をパースするインスタンスを返す。
 *
 * @param options CLI 作成オプション
 * @returns yargs インスタンス
 */
export function createCli(options: CliOptions = {}) {
  const { exitProcess = true } = options;

  return yargs()
    .scriptName('atl-fetch')
    .usage('Usage: $0 <url> [options]')
    .command('$0 <url>', 'Atlassian Cloud の URL から情報を取得する', (yargs) => {
      return yargs.positional('url', {
        demandOption: true,
        describe: 'Atlassian Cloud URL (Jira Issue または Confluence ページ)',
        type: 'string',
      });
    })
    .option('format', {
      alias: 'f',
      choices: ['json', 'markdown', 'yaml'] as const,
      default: 'json' as const,
      describe: '出力形式',
      type: 'string',
    })
    .option('download', {
      alias: 'd',
      default: false,
      describe: '添付ファイルをダウンロードする',
      type: 'boolean',
    })
    .option('dir', {
      alias: 'o',
      describe: '保存先ディレクトリ',
      type: 'string',
    })
    .check((argv) => {
      // --dir オプションは --download オプションと一緒に指定する必要がある
      if (argv['dir'] !== undefined && !argv['download']) {
        throw new Error('--dir オプションは --download オプションと一緒に指定してください');
      }
      return true;
    })
    .option('diff', {
      default: false,
      describe: '差分のみを出力する',
      type: 'boolean',
    })
    .option('color', {
      default: true,
      describe: 'カラー出力を有効にする',
      type: 'boolean',
    })
    .help('help')
    .alias('h', 'help')
    .version(CLI_VERSION)
    .alias('V', 'version')
    .strict()
    .exitProcess(exitProcess)
    .demandCommand(1, 'URL を指定してください')
    .fail((msg, err) => {
      if (err) {
        throw err;
      }
      throw new Error(msg);
    })
    .wrap(null);
}

/**
 * CLI を実行する
 *
 * process.argv から引数を取得してパースし、適切な処理を実行する。
 * メインエントリーポイントとして使用する。
 *
 * @example
 * ```typescript
 * // メインエントリーポイント
 * await runCli();
 * ```
 */
export async function runCli(): Promise<void> {
  const cli = createCli();
  const argv = await cli.parse(hideBin(process.argv));

  const url = argv['url'] as string;
  const format = argv['format'] as 'json' | 'markdown' | 'yaml';
  const download = argv['download'] as boolean;
  const dir = argv['dir'] as string | undefined;
  const colorEnabled = argv['color'] as boolean;

  // ダウンロードモード
  if (download) {
    const baseDir = dir ?? process.cwd();
    const result = await fetchAndSave(url, {
      baseDir,
      cliVersion: CLI_VERSION,
      sourceUrl: url,
    });

    if (result.isErr()) {
      console.error(`エラー: ${result.error.message}`);
      process.exit(1);
    }

    console.log(`保存完了: ${result.value.directory}`);
    return;
  }

  // 通常モード（標準出力）
  const result = await fetchAndOutput(url, {
    colorEnabled,
    format,
  });

  if (result.isErr()) {
    console.error(`エラー: ${result.error.message}`);
    process.exit(1);
  }

  console.log(result.value);
}
