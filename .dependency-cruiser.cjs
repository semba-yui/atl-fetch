/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // === レイヤー分離ルール ===
    {
      comment: 'CLI層はPorts層に直接依存してはいけません。Service層を経由してください。',
      from: { path: '^src/cli/' },
      name: 'no-cli-to-ports',
      severity: 'error',
      to: { path: '^src/ports/' },
    },
    {
      comment: 'Service層はCLI層に依存してはいけません（逆方向の依存）。',
      from: { path: '^src/services/' },
      name: 'no-service-to-cli',
      severity: 'error',
      to: { path: '^src/cli/' },
    },
    {
      comment: 'Ports層はService層に依存してはいけません（逆方向の依存）。',
      from: { path: '^src/ports/' },
      name: 'no-ports-to-service',
      severity: 'error',
      to: { path: '^src/services/' },
    },
    {
      comment: 'Ports層はCLI層に依存してはいけません。',
      from: { path: '^src/ports/' },
      name: 'no-ports-to-cli',
      severity: 'error',
      to: { path: '^src/cli/' },
    },
    {
      comment: 'Types層は純粋な型定義のみで、他の実装に依存してはいけません。',
      from: { path: '^src/types/' },
      name: 'types-no-runtime-dependencies',
      severity: 'error',
      to: {
        dependencyTypesNot: ['type-only'],
        path: '^src/(cli|services|ports)/',
      },
    },

    // === ドメイン分離ルール ===
    {
      comment: 'JiraサービスはConfluenceサービスに依存してはいけません。',
      from: { path: '^src/services/jira/' },
      name: 'no-jira-to-confluence',
      severity: 'error',
      to: { path: '^src/services/confluence/' },
    },
    {
      comment: 'ConfluenceサービスはJiraサービスに依存してはいけません。',
      from: { path: '^src/services/confluence/' },
      name: 'no-confluence-to-jira',
      severity: 'error',
      to: { path: '^src/services/jira/' },
    },

    // === 外部ライブラリ依存ルール ===
    {
      comment: 'got ライブラリは http-port モジュールのみで使用可能です。',
      from: { pathNot: '^src/ports/http/' },
      name: 'got-only-in-http-port',
      severity: 'error',
      to: { path: 'node_modules/got' },
    },
    {
      comment: 'node:fs は ports 層のみで使用可能です。',
      from: { pathNot: '^src/ports/' },
      name: 'node-fs-only-in-ports',
      severity: 'error',
      to: { path: '^node:fs' },
    },

    // === 循環依存ルール ===
    {
      comment: '循環依存は禁止です。',
      from: { pathNot: '^node_modules' },
      name: 'no-circular',
      severity: 'error',
      to: { circular: true },
    },

    // === その他のルール ===
    {
      comment: '本番コードはテストファイルに依存してはいけません。',
      from: {
        path: '^src/',
        pathNot: '\\.test\\.ts$',
      },
      name: 'no-prod-to-test',
      severity: 'error',
      to: { path: '\\.test\\.ts$' },
    },
    {
      comment: 'どこからも参照されていないモジュールは削除を検討してください。',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.test\\.ts$',
          '\\.property\\.test\\.ts$',
          '^src/index\\.ts$',
          '^tests/',
        ],
      },
      name: 'no-orphans',
      severity: 'warn',
      to: {},
    },
    {
      comment: '非推奨の Node.js コアモジュールは使用しないでください。',
      from: {},
      name: 'no-deprecated-core',
      severity: 'warn',
      to: {
        dependencyTypes: ['core'],
        path: '^(punycode|domain|constants|sys|_linklist|_stream_wrap)$',
      },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    enhancedResolveOptions: {
      conditionNames: ['import', 'require', 'node', 'default'],
      exportsFields: ['exports'],
      mainFields: ['module', 'main', 'types'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    tsPreCompilationDeps: true,
  },
};
