/**
 * テスト用バージョンヘルパー
 *
 * package.json からバージョン情報を取得し、テストで一元的に使用するための定数を提供する。
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

/**
 * テストで使用する CLI バージョン
 */
export const TEST_CLI_VERSION = packageJson.version;
