# Technology Stack

## Architecture

Node.js CLIツール兼ライブラリとして設計。ESM形式でビルドし、CLIとライブラリの両方のエントリーポイントを提供。

## Core Technologies

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 22+
- **Module System**: ESM (ES Modules)
- **Package Manager**: pnpm 10.x

## Key Libraries

- **yargs**: CLIインターフェース構築

## Development Standards

### Type Safety

TypeScript strictモードに加え、以下の厳格な設定を適用:
- `noUncheckedIndexedAccess`: インデックスアクセスの型安全性
- `exactOptionalPropertyTypes`: オプショナルプロパティの厳密な型チェック
- `noImplicitReturns`: 暗黙的なreturnを禁止
- `noUnusedLocals` / `noUnusedParameters`: 未使用変数・引数の禁止

### Code Quality

Biomeを使用したリンティング・フォーマット:
- インデント: スペース2つ
- 行幅: 120文字
- クォート: シングルクォート
- トレイリングカンマ: すべて

### Testing

Vitestを使用:
- カバレッジ閾値: 90%（lines, branches, functions, statements）
- プロバイダー: v8
- Property-based testing: fast-check

### Mutation Testing

Stryker Mutatorを使用:
- 閾値: 80%（break）, 90%（high）, 70%（low）
- TypeScriptチェッカー有効

### その他のLint

- **Markdown**: remark-cli
- **Secrets**: secretlint
- **YAML**: yamllint
- **Commit**: commitlint（Conventional Commits）

## Development Environment

### Required Tools

- Node.js 22.0.0以上
- pnpm 10.27.0
- Git hooks: lefthook

### Common Commands

```bash
# Dev: pnpm run dev
# Build: pnpm run build
# Test: pnpm run test
# Lint: pnpm run lint
# Type check: pnpm run typecheck
# Mutation test: pnpm run test:mutation
```

## Key Technical Decisions

- **ESM Only**: CommonJSはサポートせず、ESMネイティブで構築
- **Biome**: ESLint + Prettierの代替として採用（高速、一体型）
- **pnpm Catalogs**: 依存関係バージョンの一元管理
- **Stryker**: ミューテーションテストによるテスト品質保証

---
_Document standards and patterns, not every dependency_
