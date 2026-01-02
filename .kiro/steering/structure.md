# Project Structure

## Organization Philosophy

レイヤードアーキテクチャを採用。ソースコードは`src/`に集約し、テストはソースファイルと同階層（co-located）またはトップレベルの`tests/`ディレクトリに配置。

## Directory Patterns

### Source Code (`/src/`)
**Purpose**: アプリケーションのメインコード
**Example**: `src/index.ts`がエントリーポイント

### Types (`/src/types/`)
**Purpose**: 型定義（カバレッジ・ミューテーション対象外）
**Example**: 共有インターフェース、型エイリアス

### Ports (`/src/ports/`)
**Purpose**: 外部依存の抽象化層（ミューテーション対象外）
**Example**: HTTP クライアント、ファイルシステムなどのアダプター

### Tests
**Co-located**: `src/**/*.test.ts` - ユニットテスト
**Integration**: `tests/**/*.test.ts` - 統合テスト

### Build Output (`/dist/`)
**Purpose**: コンパイル済みJavaScriptと型定義
**Note**: Gitで無視、npmパッケージに含む

### Reports (`/reports/`)
**Purpose**: カバレッジ、ミューテーションレポート
**Note**: Gitで無視

## Naming Conventions

- **Files**: kebab-case（例: `http-client.ts`）
- **Classes/Interfaces**: PascalCase（例: `HttpClient`）
- **Functions/Variables**: camelCase（例: `fetchData`）
- **Constants**: SCREAMING_SNAKE_CASE（例: `DEFAULT_TIMEOUT`）
- **Test files**: `*.test.ts`

## Import Organization

```typescript
// Node.js built-ins
import { readFile } from 'node:fs/promises';

// External dependencies
import { Command } from 'yargs';

// Internal modules (relative)
import { HttpClient } from './http-client.js';
import type { RequestOptions } from './types/request.js';
```

**ESM Extension**: `.js`拡張子を使用（TypeScriptでも）

## Code Organization Principles

- **Co-location**: 関連するテストはソースファイルの隣に配置
- **Type-only imports**: 型のみのインポートには`import type`を使用
- **Barrel exports**: `index.ts`でパブリックAPIをエクスポート
- **ports/除外**: 外部依存はportsレイヤーで抽象化し、ミューテーションテスト対象外

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
