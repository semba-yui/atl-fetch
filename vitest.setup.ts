import fc from 'fast-check';

// fast-check グローバル設定
// 再現性とCI環境での安定性を確保
fc.configureGlobal({
  // 失敗時に即座に停止
  endOnFailure: true,
  // 各プロパティに対する実行回数
  // CI環境ではより多くのケースを実行
  numRuns: process.env.CI ? 1000 : 100,
  // CI環境では seed を固定して再現性を確保
  seed: process.env.CI ? 12345 : undefined,
  // 失敗時に詳細情報を表示
  verbose: !process.env.CI,
});
