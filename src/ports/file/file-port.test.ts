import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureDir, exists, mapErrorToFileError, writeFileContent, writeStream } from './file-port.js';

describe('FilePort', () => {
  let testDir: string;

  beforeEach(async () => {
    // Given: テスト用の一時ディレクトリを作成
    testDir = join(tmpdir(), `atl-fetch-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト後にディレクトリを削除
    await rm(testDir, { force: true, recursive: true });
  });

  describe('writeFileContent', () => {
    // ファイル書き込み機能のテスト
    it('指定パスにテキストファイルを書き込むこと', async () => {
      // Given: テスト対象のファイルパスとコンテンツ
      const filePath = join(testDir, 'test.txt');
      const content = 'Hello, World!';

      // When: ファイルを書き込む
      const result = await writeFileContent(filePath, content);

      // Then: 成功し、ファイルが正しく書き込まれていること
      expect(result.isOk()).toBe(true);
      const writtenContent = await readFile(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    // 日本語コンテンツの書き込みテスト
    it('日本語を含むテキストを正しく書き込むこと', async () => {
      // Given: 日本語を含むコンテンツ
      const filePath = join(testDir, 'japanese.txt');
      const content = 'こんにちは、世界！\n日本語テスト';

      // When: ファイルを書き込む
      const result = await writeFileContent(filePath, content);

      // Then: 日本語が正しく保存されていること
      expect(result.isOk()).toBe(true);
      const writtenContent = await readFile(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    // ネストされたディレクトリへの書き込みテスト
    it('存在しない中間ディレクトリがある場合エラーを返すこと', async () => {
      // Given: 存在しない中間ディレクトリを含むパス
      const filePath = join(testDir, 'nested', 'deep', 'test.txt');
      const content = 'Nested content';

      // When: ファイルを書き込む
      const result = await writeFileContent(filePath, content);

      // Then: エラーが返されること
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('WRITE_FAILED');
      }
    });

    // 空文字列の書き込みテスト
    it('空文字列を正しく書き込むこと', async () => {
      // Given: 空文字列
      const filePath = join(testDir, 'empty.txt');
      const content = '';

      // When: ファイルを書き込む
      const result = await writeFileContent(filePath, content);

      // Then: 空ファイルが作成されること
      expect(result.isOk()).toBe(true);
      const writtenContent = await readFile(filePath, 'utf-8');
      expect(writtenContent).toBe('');
    });
  });

  describe('writeStream', () => {
    // ストリーム書き込み機能のテスト
    it('ReadableStream からファイルに書き込むこと', async () => {
      // Given: テスト用のストリーム
      const filePath = join(testDir, 'stream.txt');
      const chunks = ['Hello', ' ', 'Stream', '!'];
      const stream = Readable.from(chunks);

      // When: ストリームをファイルに書き込む
      const result = await writeStream(filePath, stream);

      // Then: ストリームの内容が正しく書き込まれること
      expect(result.isOk()).toBe(true);
      const writtenContent = await readFile(filePath, 'utf-8');
      expect(writtenContent).toBe('Hello Stream!');
    });

    // 大きなデータのストリーム書き込みテスト
    it('大きなデータをストリームで書き込むこと', async () => {
      // Given: 1MB のデータ
      const filePath = join(testDir, 'large.bin');
      const chunkSize = 1024;
      const totalChunks = 1024;
      const chunk = Buffer.alloc(chunkSize, 'x');

      async function* generateChunks() {
        for (let i = 0; i < totalChunks; i++) {
          yield chunk;
        }
      }

      const stream = Readable.from(generateChunks());

      // When: ストリームをファイルに書き込む
      const result = await writeStream(filePath, stream);

      // Then: 正しいサイズのファイルが作成されること
      expect(result.isOk()).toBe(true);
      const stats = await stat(filePath);
      expect(stats.size).toBe(chunkSize * totalChunks);
    });

    // 存在しないディレクトリへのストリーム書き込みテスト
    it('存在しないディレクトリへの書き込みでエラーを返すこと', async () => {
      // Given: 存在しないディレクトリ
      const filePath = join(testDir, 'nonexistent', 'stream.txt');
      const stream = Readable.from(['test']);

      // When: ストリームをファイルに書き込む
      const result = await writeStream(filePath, stream);

      // Then: エラーが返されること
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('WRITE_FAILED');
      }
    });
  });

  describe('ensureDir', () => {
    // ディレクトリ作成機能のテスト
    it('新しいディレクトリを作成すること', async () => {
      // Given: 作成するディレクトリパス
      const dirPath = join(testDir, 'new-dir');

      // When: ディレクトリを作成する
      const result = await ensureDir(dirPath);

      // Then: ディレクトリが作成されること
      expect(result.isOk()).toBe(true);
      const stats = await stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    // ネストされたディレクトリの作成テスト
    it('ネストされたディレクトリを再帰的に作成すること', async () => {
      // Given: 深いネストのディレクトリパス
      const dirPath = join(testDir, 'level1', 'level2', 'level3', 'level4');

      // When: ディレクトリを作成する
      const result = await ensureDir(dirPath);

      // Then: 全ての階層が作成されること
      expect(result.isOk()).toBe(true);
      const stats = await stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    // 既存ディレクトリへの再実行テスト
    it('既存のディレクトリに対して成功を返すこと', async () => {
      // Given: 既に存在するディレクトリ
      const dirPath = join(testDir, 'existing');
      await mkdir(dirPath, { recursive: true });

      // When: 同じディレクトリを作成しようとする
      const result = await ensureDir(dirPath);

      // Then: エラーなく成功すること
      expect(result.isOk()).toBe(true);
    });
  });

  describe('exists', () => {
    // ファイル存在確認機能のテスト
    it('存在するファイルに対してtrueを返すこと', async () => {
      // Given: 存在するファイル
      const filePath = join(testDir, 'exists.txt');
      await writeFile(filePath, 'content');

      // When: 存在確認する
      const result = await exists(filePath);

      // Then: true が返されること
      expect(result).toBe(true);
    });

    // 存在しないファイルのテスト
    it('存在しないファイルに対してfalseを返すこと', async () => {
      // Given: 存在しないファイルパス
      const filePath = join(testDir, 'not-exists.txt');

      // When: 存在確認する
      const result = await exists(filePath);

      // Then: false が返されること
      expect(result).toBe(false);
    });

    // ディレクトリの存在確認テスト
    it('存在するディレクトリに対してtrueを返すこと', async () => {
      // Given: 存在するディレクトリ
      const dirPath = join(testDir, 'dir-exists');
      await mkdir(dirPath);

      // When: 存在確認する
      const result = await exists(dirPath);

      // Then: true が返されること
      expect(result).toBe(true);
    });
  });

  describe('mapErrorToFileError', () => {
    // エラーマッピング機能のテスト
    // 実運用で発生しうるファイルシステムエラーの適切なハンドリングを検証

    describe('パーミッションエラー', () => {
      // EACCES エラーコードのテスト
      it('EACCES エラー時に PERMISSION_DENIED を返すこと', () => {
        // Given: EACCES エラーコードを持つエラー
        const error = new Error('permission denied') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        const path = '/protected/file.txt';

        // When: エラーマッピングを実行
        const result = mapErrorToFileError(path, error);

        // Then: PERMISSION_DENIED エラーが返される
        expect(result.kind).toBe('PERMISSION_DENIED');
        expect(result.path).toBe(path);
        expect(result.message).toContain('アクセス権限');
      });

      // EPERM エラーコードのテスト
      it('EPERM エラー時に PERMISSION_DENIED を返すこと', () => {
        // Given: EPERM エラーコードを持つエラー
        const error = new Error('operation not permitted') as NodeJS.ErrnoException;
        error.code = 'EPERM';
        const path = '/system/file.txt';

        // When: エラーマッピングを実行
        const result = mapErrorToFileError(path, error);

        // Then: PERMISSION_DENIED エラーが返される
        expect(result.kind).toBe('PERMISSION_DENIED');
        expect(result.path).toBe(path);
      });
    });

    describe('ディスク容量不足', () => {
      // ENOSPC エラーコードのテスト
      it('ENOSPC エラー時に DISK_FULL を返すこと', () => {
        // Given: ENOSPC エラーコードを持つエラー
        const error = new Error('no space left on device') as NodeJS.ErrnoException;
        error.code = 'ENOSPC';
        const path = '/data/large-file.bin';

        // When: エラーマッピングを実行
        const result = mapErrorToFileError(path, error);

        // Then: DISK_FULL エラーが返される
        expect(result.kind).toBe('DISK_FULL');
        expect(result.path).toBe(path);
        expect(result.message).toContain('ディスク容量');
      });
    });

    describe('その他のエラー', () => {
      // エラーコードがない Error オブジェクトのテスト
      it('エラーコードがない場合に WRITE_FAILED を返すこと', () => {
        // Given: エラーコードがない通常のエラー
        const error = new Error('unknown error');
        const path = '/some/file.txt';

        // When: エラーマッピングを実行
        const result = mapErrorToFileError(path, error);

        // Then: WRITE_FAILED エラーが返される
        expect(result.kind).toBe('WRITE_FAILED');
        expect(result.path).toBe(path);
        expect(result.message).toContain('ファイル書き込みに失敗');
      });

      // ENOENT エラーコードのテスト（ディレクトリが存在しない）
      it('ENOENT エラー時に WRITE_FAILED を返すこと', () => {
        // Given: ENOENT エラーコードを持つエラー
        const error = new Error('no such file or directory') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        const path = '/nonexistent/file.txt';

        // When: エラーマッピングを実行
        const result = mapErrorToFileError(path, error);

        // Then: WRITE_FAILED エラーが返される
        expect(result.kind).toBe('WRITE_FAILED');
        expect(result.path).toBe(path);
      });

      // 非 Error オブジェクトのテスト
      it('非 Error オブジェクトがスローされた場合に WRITE_FAILED を返すこと', () => {
        // Given: Error ではないオブジェクトがスローされた
        const error = 'string error';
        const path = '/some/file.txt';

        // When: エラーマッピングを実行
        const result = mapErrorToFileError(path, error);

        // Then: WRITE_FAILED エラーが返される
        expect(result.kind).toBe('WRITE_FAILED');
        expect(result.path).toBe(path);
        expect(result.message).toContain('不明なエラー');
      });

      // null がスローされた場合のテスト
      it('null がスローされた場合に WRITE_FAILED を返すこと', () => {
        // Given: null がスローされた
        const error = null;
        const path = '/some/file.txt';

        // When: エラーマッピングを実行
        const result = mapErrorToFileError(path, error);

        // Then: WRITE_FAILED エラーが返される
        expect(result.kind).toBe('WRITE_FAILED');
        expect(result.message).toContain('不明なエラー');
      });
    });
  });
});
