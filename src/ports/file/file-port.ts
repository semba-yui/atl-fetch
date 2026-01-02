import { createWriteStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { err, ok, type Result } from 'neverthrow';
import type { FileError } from '../../types/file.js';

/**
 * ファイルにテキストコンテンツを書き込む
 *
 * UTF-8 エンコーディングで指定されたパスにテキストを書き込む。
 * 親ディレクトリが存在しない場合はエラーを返す。
 *
 * @param path - 書き込み先のファイルパス
 * @param content - 書き込むテキストコンテンツ
 * @returns 成功時は Ok(void)、失敗時は Err(FileError)
 *
 * @example
 * ```typescript
 * const result = await writeFileContent('/path/to/file.txt', 'Hello, World!');
 * if (result.isOk()) {
 *   console.log('ファイルを書き込みました');
 * }
 * ```
 */
export async function writeFileContent(path: string, content: string): Promise<Result<void, FileError>> {
  try {
    await writeFile(path, content, 'utf-8');
    return ok(undefined);
  } catch (error) {
    return err(mapErrorToFileError(path, error));
  }
}

/**
 * ストリームからファイルに書き込む
 *
 * Node.js の Readable ストリームを受け取り、指定されたパスにファイルとして書き込む。
 * 大きなファイルのダウンロードに適している。
 *
 * @param path - 書き込み先のファイルパス
 * @param stream - 読み取り元のストリーム
 * @returns 成功時は Ok(void)、失敗時は Err(FileError)
 *
 * @example
 * ```typescript
 * import { Readable } from 'node:stream';
 *
 * const stream = Readable.from(['chunk1', 'chunk2']);
 * const result = await writeStream('/path/to/file.bin', stream);
 * if (result.isOk()) {
 *   console.log('ストリームを書き込みました');
 * }
 * ```
 */
export async function writeStream(path: string, stream: Readable): Promise<Result<void, FileError>> {
  try {
    const writeStream = createWriteStream(path);
    await pipeline(stream, writeStream);
    return ok(undefined);
  } catch (error) {
    return err(mapErrorToFileError(path, error));
  }
}

/**
 * ディレクトリを再帰的に作成する
 *
 * 指定されたパスにディレクトリを作成する。中間ディレクトリも自動的に作成される。
 * 既にディレクトリが存在する場合は何もせずに成功を返す。
 *
 * @param path - 作成するディレクトリパス
 * @returns 成功時は Ok(void)、失敗時は Err(FileError)
 *
 * @example
 * ```typescript
 * const result = await ensureDir('/path/to/nested/directory');
 * if (result.isOk()) {
 *   console.log('ディレクトリを作成しました');
 * }
 * ```
 */
export async function ensureDir(path: string): Promise<Result<void, FileError>> {
  try {
    await mkdir(path, { recursive: true });
    return ok(undefined);
  } catch (error) {
    return err(mapErrorToFileError(path, error));
  }
}

/**
 * ファイルまたはディレクトリの存在を確認する
 *
 * 指定されたパスにファイルまたはディレクトリが存在するかを確認する。
 * アクセス権限がない場合も false を返す。
 *
 * @param path - 確認するパス
 * @returns ファイルまたはディレクトリが存在する場合は true、そうでない場合は false
 *
 * @example
 * ```typescript
 * if (await exists('/path/to/file.txt')) {
 *   console.log('ファイルが存在します');
 * }
 * ```
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * エラーを FileError にマッピングする
 *
 * @param path - 操作対象のパス
 * @param error - キャッチしたエラー
 * @returns 対応する FileError
 *
 * @internal テスト用に export
 */
export function mapErrorToFileError(path: string, error: unknown): FileError {
  if (!(error instanceof Error)) {
    return {
      kind: 'WRITE_FAILED',
      message: '不明なエラーが発生しました',
      path,
    };
  }

  const nodeError = error as NodeJS.ErrnoException;
  const code = nodeError.code;

  // パーミッションエラー
  if (code === 'EACCES' || code === 'EPERM') {
    return {
      kind: 'PERMISSION_DENIED',
      message: `ファイルへのアクセス権限がありません: ${error.message}`,
      path,
    };
  }

  // ディスク容量不足
  if (code === 'ENOSPC') {
    return {
      kind: 'DISK_FULL',
      message: `ディスク容量が不足しています: ${error.message}`,
      path,
    };
  }

  // その他のエラー（ディレクトリが存在しない、等）
  return {
    kind: 'WRITE_FAILED',
    message: `ファイル書き込みに失敗しました: ${error.message}`,
    path,
  };
}
