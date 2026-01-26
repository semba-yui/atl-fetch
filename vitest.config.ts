import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.vitest': 'undefined',
  },
  test: {
    coverage: {
      exclude: [
        'src/**/*.test.ts',
        'src/types/**',
        'src/index.ts', // エントリーポイント
        'src/**/index.ts', // バレルエクスポート
        'src/cli/**', // CLI 実行ロジック（E2E テストでカバー）
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    includeSource: ['src/**/*.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
