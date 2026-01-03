/**
 * CLI エントリーポイント
 *
 * yargs を使用した CLI インターフェースを提供する。
 */

import { createRequire } from 'node:module';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { getCredentials } from '../services/auth/auth-service.js';
import { fetchAndOutput, fetchAndSave } from '../services/fetch/fetch-service.js';
import { CliSpinner, colors, formatError, formatSuccess, formatWarn, SPINNER_STEPS } from './spinner.js';

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
  /** 詳細出力を有効にする */
  verbose: boolean;
  /** デバッグ出力を有効にする */
  debug: boolean;
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
    .usage('Usage: $0 <command> [options]')
    .command('$0 <url>', 'Atlassian Cloud の URL から情報を取得する', (yargs) => {
      return yargs.positional('url', {
        demandOption: true,
        describe: 'Atlassian Cloud URL (Jira Issue または Confluence ページ)',
        type: 'string',
      });
    })
    .command('auth', '認証情報を管理する', (yargs) => {
      return yargs.command('check', '認証情報の設定状態を確認する', () => {}, runAuthCheck);
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
    .option('verbose', {
      alias: 'v',
      default: false,
      describe: '詳細出力を有効にする',
      type: 'boolean',
    })
    .option('debug', {
      default: false,
      describe: 'デバッグ出力を有効にする（開発者向け）',
      type: 'boolean',
    })
    .example([
      ['$0 https://mycompany.atlassian.net/browse/PROJ-123', 'Jira Issue を JSON で取得'],
      ['$0 https://mycompany.atlassian.net/browse/PROJ-123 -f markdown', 'Markdown 形式で取得'],
      [
        '$0 https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456 -d -o ./output',
        'Confluence ページを添付ファイルごとダウンロード',
      ],
      ['$0 https://mycompany.atlassian.net/browse/PROJ-123 -v', '詳細モードで実行'],
    ])
    .epilogue(
      `環境変数:
  ATLASSIAN_EMAIL       Atlassian アカウントのメールアドレス（必須）
  ATLASSIAN_API_TOKEN   API トークン（必須）
                        https://id.atlassian.com/manage-profile/security/api-tokens で生成

エラーコード:
  ATL-URL-001   URL の形式が不正
  ATL-AUTH-001  認証失敗
  ATL-404-001   リソースが見つからない
  ATL-403-001   アクセス権限なし
  ATL-NET-001   ネットワークエラー

詳細: https://github.com/semba-yui/atl-fetch`,
    )
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
  const verbose = argv['verbose'] as boolean;
  const debug = argv['debug'] as boolean;

  const spinner = new CliSpinner(colorEnabled);

  // verbose モードの場合、処理開始を表示
  if (verbose) {
    console.log(colors.dim(`atl-fetch v${CLI_VERSION}`));
    console.log(colors.dim(`URL: ${url}`));
    console.log(colors.dim(`形式: ${format}`));
    if (download) {
      console.log(colors.dim(`ダウンロードモード: 有効`));
      console.log(colors.dim(`保存先: ${dir ?? process.cwd()}`));
    }
    console.log('');
  }

  // ダウンロードモード
  if (download) {
    const baseDir = dir ?? process.cwd();

    spinner.startStep(SPINNER_STEPS.FETCH_DATA);
    const result = await fetchAndSave(url, {
      baseDir,
      cliVersion: CLI_VERSION,
      sourceUrl: url,
    });

    if (result.isErr()) {
      spinner.fail();
      console.error(formatErrorForKind(result.error.kind, result.error.message, url, debug));
      process.exit(1);
    }

    spinner.succeedStep(SPINNER_STEPS.SAVE_FILES);
    console.log(
      formatSuccess('保存完了', {
        URL: url,
        保存先: result.value.directory,
      }),
    );
    return;
  }

  // 通常モード（標準出力）
  spinner.startStep(SPINNER_STEPS.FETCH_DATA);
  const result = await fetchAndOutput(url, {
    colorEnabled,
    format,
  });

  if (result.isErr()) {
    spinner.fail();
    console.error(formatErrorForKind(result.error.kind, result.error.message, url, debug));
    process.exit(1);
  }

  spinner.succeedStep(SPINNER_STEPS.FORMAT_OUTPUT);
  console.log(result.value);
}

/**
 * エラー種別に応じたエラーメッセージを生成する
 *
 * @param kind エラー種別
 * @param message エラーメッセージ
 * @param url 対象URL
 * @param debug デバッグモードが有効かどうか
 * @returns 整形されたエラーメッセージ
 */
function formatErrorForKind(kind: string, message: string, url: string, debug: boolean): string {
  let result: string;

  switch (kind) {
    case 'URL_PARSE_ERROR':
      result = formatError(
        'ATL-URL-001',
        message,
        'URLの形式が正しくありません',
        `サポートされるURL形式:\n    - Jira: https://<site>.atlassian.net/browse/<KEY>\n    - Confluence: https://<site>.atlassian.net/wiki/spaces/<SPACE>/pages/<ID>`,
      );
      break;

    case 'AUTH_FAILED':
      result = formatError(
        'ATL-AUTH-001',
        message,
        'APIトークンが無効または期限切れです',
        `環境変数を確認してください:\n    - ATLASSIAN_EMAIL: Atlassianアカウントのメールアドレス\n    - ATLASSIAN_API_TOKEN: https://id.atlassian.com/manage-profile/security/api-tokens で生成`,
      );
      break;

    case 'NOT_FOUND':
      result = formatError(
        'ATL-404-001',
        message,
        '指定されたリソースが見つかりません',
        `URL: ${colors.cyan(url)}\n    - URLが正しいか確認してください\n    - リソースが削除されていないか確認してください`,
      );
      break;

    case 'FORBIDDEN':
      result = formatError(
        'ATL-403-001',
        message,
        'アクセス権限がありません',
        `URL: ${colors.cyan(url)}\n    - 該当リソースへのアクセス権限があるか確認してください`,
      );
      break;

    case 'NETWORK_ERROR':
      result = formatError(
        'ATL-NET-001',
        message,
        'ネットワーク接続に問題があります',
        '- インターネット接続を確認してください\n    - ファイアウォール/プロキシ設定を確認してください',
      );
      break;

    default:
      result = formatError(
        'ATL-ERR-001',
        message,
        '予期しないエラーが発生しました',
        '--debug フラグで詳細を確認してください',
      );
  }

  // デバッグモードの場合、追加情報を表示
  if (debug) {
    result += `\n\n${colors.dim('--- デバッグ情報 ---')}`;
    result += `\n${colors.dim(`エラー種別: ${kind}`)}`;
    result += `\n${colors.dim(`対象URL: ${url}`)}`;
    result += `\n${colors.dim(`タイムスタンプ: ${new Date().toISOString()}`)}`;
  }

  return result;
}

/**
 * 認証情報のチェックを実行する
 *
 * 環境変数が正しく設定されているかを確認し、結果を表示する。
 */
function runAuthCheck(): void {
  console.log(colors.bold('認証情報チェック'));
  console.log(colors.dim('─'.repeat(40)));
  console.log('');

  const result = getCredentials();

  if (result.isOk()) {
    const email = result.value.email;
    const maskedToken = `***${result.value.apiToken.slice(-4)}`;

    console.log(colors.success('✓ 認証情報が正しく設定されています'));
    console.log('');
    console.log(colors.dim('  設定状態:'));
    console.log(colors.dim(`    ATLASSIAN_EMAIL:     ${colors.cyan(email)}`));
    console.log(colors.dim(`    ATLASSIAN_API_TOKEN: ${colors.cyan(maskedToken)}`));
    console.log('');
    console.log(colors.dim('  ※ 実際のAPI接続テストは行っていません。'));
    console.log(colors.dim('    トークンが有効かどうかは、実際にURLを取得して確認してください。'));
  } else {
    const error = result.error;

    console.log(colors.error('✗ 認証情報の設定に問題があります'));
    console.log('');

    switch (error.kind) {
      case 'MISSING_EMAIL':
        console.log(formatWarn('ATLASSIAN_EMAIL が設定されていません'));
        console.log('');
        console.log(colors.dim('  設定方法:'));
        console.log(colors.dim('    export ATLASSIAN_EMAIL="your-email@example.com"'));
        break;

      case 'MISSING_TOKEN':
        console.log(formatWarn('ATLASSIAN_API_TOKEN が設定されていません'));
        console.log('');
        console.log(colors.dim('  設定方法:'));
        console.log(colors.dim('    export ATLASSIAN_API_TOKEN="your-api-token"'));
        console.log('');
        console.log(colors.dim('  トークンの取得:'));
        console.log(colors.dim('    https://id.atlassian.com/manage-profile/security/api-tokens'));
        break;

      case 'INVALID_EMAIL':
        console.log(formatWarn('ATLASSIAN_EMAIL の形式が無効です'));
        console.log('');
        console.log(colors.dim('  有効なメールアドレス形式で設定してください。'));
        break;

      default:
        console.log(formatWarn(error.message));
    }

    process.exit(1);
  }
}
