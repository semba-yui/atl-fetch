#!/usr/bin/env node
/**
 * atl-fetch - Atlassian Cloud からコンテンツを取得する CLI ツール
 *
 * CLI エントリーポイント。
 * このファイルは `npx atl-fetch` または `atl-fetch` コマンドとして実行される。
 */

import { runCli } from './cli/index.js';

// CLI を実行
runCli().catch((error: unknown) => {
  console.error('エラーが発生しました:', error instanceof Error ? error.message : error);
  process.exit(1);
});
