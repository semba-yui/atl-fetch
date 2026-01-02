import { describe, expect, it } from 'vitest';
import type { ConfluenceVersion } from '../../types/confluence.js';
import type { JiraChangelogEntry } from '../../types/jira.js';
import { diffText, formatConfluenceVersionDiff, formatJiraChangelog } from './diff-service.js';

describe('DiffService', () => {
  /**
   * テキスト間の差分計算機能のテスト
   *
   * unified diff 形式で差分を出力し、差分統計を計算する。
   */
  describe('diffText', () => {
    /**
     * 同一テキストの場合のテスト
     */
    describe('同一テキスト', () => {
      it('同一テキストの場合は空のハンクを返す', () => {
        // Given: 同一の2つのテキスト
        const oldText = 'Hello, World!';
        const newText = 'Hello, World!';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 差分がないことを確認
        expect(result.hunks).toHaveLength(0);
        expect(result.stats.additions).toBe(0);
        expect(result.stats.deletions).toBe(0);
        expect(result.stats.changes).toBe(0);
      });

      it('空文字列同士の場合は空のハンクを返す', () => {
        // Given: 2つの空文字列
        const oldText = '';
        const newText = '';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 差分がないことを確認
        expect(result.hunks).toHaveLength(0);
        expect(result.stats.additions).toBe(0);
        expect(result.stats.deletions).toBe(0);
      });
    });

    /**
     * 行の追加のテスト
     */
    describe('行の追加', () => {
      it('空文字列からテキストへの変更は追加として検出される', () => {
        // Given: 空文字列と新しいテキスト
        const oldText = '';
        const newText = 'Hello, World!';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 1行が追加されたことを確認
        expect(result.stats.additions).toBe(1);
        expect(result.stats.deletions).toBe(0);
        expect(result.hunks.length).toBeGreaterThan(0);
      });

      it('複数行の追加が正しくカウントされる', () => {
        // Given: 1行のテキストと3行のテキスト（改行で終わる）
        const oldText = 'Line 1\n';
        const newText = 'Line 1\nLine 2\nLine 3\n';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 2行が追加されたことを確認
        expect(result.stats.additions).toBe(2);
        expect(result.stats.deletions).toBe(0);
      });
    });

    /**
     * 行の削除のテスト
     */
    describe('行の削除', () => {
      it('テキストから空文字列への変更は削除として検出される', () => {
        // Given: テキストと空文字列
        const oldText = 'Hello, World!';
        const newText = '';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 1行が削除されたことを確認
        expect(result.stats.additions).toBe(0);
        expect(result.stats.deletions).toBe(1);
        expect(result.hunks.length).toBeGreaterThan(0);
      });

      it('複数行の削除が正しくカウントされる', () => {
        // Given: 3行のテキストと1行のテキスト（改行で終わる）
        const oldText = 'Line 1\nLine 2\nLine 3\n';
        const newText = 'Line 1\n';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 2行が削除されたことを確認
        expect(result.stats.additions).toBe(0);
        expect(result.stats.deletions).toBe(2);
      });
    });

    /**
     * 行の変更のテスト
     */
    describe('行の変更', () => {
      it('1行の変更は削除と追加として検出される', () => {
        // Given: 異なる2つのテキスト
        const oldText = 'Hello, World!';
        const newText = 'Goodbye, World!';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 1行が削除され1行が追加されたことを確認
        expect(result.stats.additions).toBe(1);
        expect(result.stats.deletions).toBe(1);
      });

      it('複数行の変更が正しくカウントされる', () => {
        // Given: 変更を含む複数行のテキスト
        const oldText = 'Line 1\nLine 2\nLine 3';
        const newText = 'Line 1\nModified Line 2\nLine 3';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 1行が削除され1行が追加されたことを確認
        expect(result.stats.additions).toBe(1);
        expect(result.stats.deletions).toBe(1);
      });
    });

    /**
     * ハンク構造のテスト
     */
    describe('ハンク構造', () => {
      it('ハンクにはoldStart, oldLines, newStart, newLinesが含まれる', () => {
        // Given: 差分のあるテキスト
        const oldText = 'Line 1\nLine 2';
        const newText = 'Line 1\nLine 2\nLine 3';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: ハンクの構造を確認
        expect(result.hunks.length).toBeGreaterThan(0);
        const hunk = result.hunks[0];
        expect(hunk).toBeDefined();
        expect(typeof hunk?.oldStart).toBe('number');
        expect(typeof hunk?.oldLines).toBe('number');
        expect(typeof hunk?.newStart).toBe('number');
        expect(typeof hunk?.newLines).toBe('number');
        expect(Array.isArray(hunk?.lines)).toBe(true);
      });

      it('ハンクの行には type と content が含まれる', () => {
        // Given: 差分のあるテキスト
        const oldText = 'Old line';
        const newText = 'New line';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 行の構造を確認
        expect(result.hunks.length).toBeGreaterThan(0);
        const hunk = result.hunks[0];
        expect(hunk?.lines.length).toBeGreaterThan(0);
        const line = hunk?.lines[0];
        expect(['add', 'remove', 'context']).toContain(line?.type);
        expect(typeof line?.content).toBe('string');
      });
    });

    /**
     * unified diff 形式のフォーマットテスト
     */
    describe('unified diff フォーマット', () => {
      it('フォーマット済み文字列が返される', () => {
        // Given: 差分のあるテキスト
        const oldText = 'Hello';
        const newText = 'Goodbye';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: フォーマット済み文字列を確認
        expect(typeof result.formatted).toBe('string');
        expect(result.formatted.length).toBeGreaterThan(0);
      });

      it('追加行は + で始まる', () => {
        // Given: 追加を含むテキスト
        const oldText = '';
        const newText = 'New line';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: + で始まる行が含まれる
        expect(result.formatted).toContain('+');
      });

      it('削除行は - で始まる', () => {
        // Given: 削除を含むテキスト
        const oldText = 'Old line';
        const newText = '';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: - で始まる行が含まれる
        expect(result.formatted).toContain('-');
      });

      it('同一テキストの場合は空文字列を返す', () => {
        // Given: 同一のテキスト
        const oldText = 'Same text';
        const newText = 'Same text';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 空文字列を確認
        expect(result.formatted).toBe('');
      });
    });

    /**
     * 差分統計のテスト
     */
    describe('差分統計', () => {
      it('changes はハンクの数を表す', () => {
        // Given: 1箇所の変更
        const oldText = 'Line 1\nLine 2\nLine 3';
        const newText = 'Line 1\nModified\nLine 3';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: changes がハンク数と一致
        expect(result.stats.changes).toBe(result.hunks.length);
      });

      it('additions は追加行の合計', () => {
        // Given: 複数箇所の追加
        const oldText = 'A\nB\nC';
        const newText = 'A\nX\nB\nY\nC';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 追加行数を確認
        expect(result.stats.additions).toBeGreaterThan(0);
      });

      it('deletions は削除行の合計', () => {
        // Given: 複数箇所の削除
        const oldText = 'A\nX\nB\nY\nC';
        const newText = 'A\nB\nC';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 削除行数を確認
        expect(result.stats.deletions).toBeGreaterThan(0);
      });
    });

    /**
     * コンテキスト行のテスト
     */
    describe('コンテキスト行', () => {
      it('変更箇所の周辺にコンテキスト行が含まれる', () => {
        // Given: コンテキストを含む複数行のテキスト
        const oldText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
        const newText = 'Line 1\nLine 2\nModified\nLine 4\nLine 5';
        const options = { colorEnabled: false, contextLines: 2 };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: コンテキスト行を確認
        expect(result.hunks.length).toBeGreaterThan(0);
        const hunk = result.hunks[0];
        const contextLines = hunk?.lines.filter((l) => l.type === 'context');
        expect(contextLines?.length).toBeGreaterThan(0);
      });
    });

    /**
     * 改行コードのテスト
     */
    describe('改行コード', () => {
      it('LF 改行コードを正しく処理する', () => {
        // Given: LF 改行コードのテキスト
        const oldText = 'Line 1\nLine 2';
        const newText = 'Line 1\nModified';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 正しく差分が検出される
        expect(result.stats.additions).toBe(1);
        expect(result.stats.deletions).toBe(1);
      });

      it('CRLF 改行コードを正しく処理する', () => {
        // Given: CRLF 改行コードのテキスト
        const oldText = 'Line 1\r\nLine 2';
        const newText = 'Line 1\r\nModified';
        const options = { colorEnabled: false };

        // When: 差分を計算する
        const result = diffText(oldText, newText, options);

        // Then: 正しく差分が検出される
        expect(result.stats.additions).toBe(1);
        expect(result.stats.deletions).toBe(1);
      });
    });
  });

  /**
   * Jira changelog の差分表示機能のテスト
   *
   * 各変更のフィールド名、変更前の値、変更後の値を表示し、
   * カラー出力（追加=緑、削除=赤）に対応する。
   */
  describe('formatJiraChangelog', () => {
    /**
     * 空の changelog のテスト
     */
    describe('空の changelog', () => {
      it('changelog が空の場合は空文字列を返す', () => {
        // Given: 空の changelog
        const changelog: readonly JiraChangelogEntry[] = [];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: 空文字列が返される
        expect(result).toBe('');
      });
    });

    /**
     * 基本的なフォーマットのテスト
     */
    describe('基本的なフォーマット', () => {
      it('変更履歴のヘッダーにID、作成者、日時が含まれる', () => {
        // Given: 1件の変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: ヘッダー情報が含まれる
        expect(result).toContain('12345');
        expect(result).toContain('John Doe');
        expect(result).toContain('2024-01-15T10:30:00.000+0900');
      });

      it('変更アイテムのフィールド名、変更前、変更後の値が含まれる', () => {
        // Given: 1件の変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: 変更内容が含まれる
        expect(result).toContain('status');
        expect(result).toContain('Open');
        expect(result).toContain('In Progress');
      });
    });

    /**
     * 複数の変更履歴のテスト
     */
    describe('複数の変更履歴', () => {
      it('複数の変更履歴がすべて表示される', () => {
        // Given: 2件の変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }],
          },
          {
            author: 'Jane Smith',
            created: '2024-01-16T14:00:00.000+0900',
            id: '12346',
            items: [{ field: 'assignee', fromString: null, toString: 'Jane Smith' }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: 両方の変更履歴が含まれる
        expect(result).toContain('12345');
        expect(result).toContain('12346');
        expect(result).toContain('John Doe');
        expect(result).toContain('Jane Smith');
      });

      it('1つの変更履歴に複数のアイテムがある場合すべて表示される', () => {
        // Given: 複数アイテムを含む変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [
              { field: 'status', fromString: 'Open', toString: 'In Progress' },
              { field: 'priority', fromString: 'Low', toString: 'High' },
              { field: 'assignee', fromString: null, toString: 'John Doe' },
            ],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: すべてのアイテムが含まれる
        expect(result).toContain('status');
        expect(result).toContain('priority');
        expect(result).toContain('assignee');
      });
    });

    /**
     * null 値の処理のテスト
     */
    describe('null 値の処理', () => {
      it('fromString が null の場合は「(なし)」と表示される', () => {
        // Given: fromString が null の変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'assignee', fromString: null, toString: 'John Doe' }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: 「(なし)」が含まれる
        expect(result).toContain('(なし)');
        expect(result).toContain('John Doe');
      });

      it('toString が null の場合は「(なし)」と表示される', () => {
        // Given: toString が null の変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'assignee', fromString: 'John Doe', toString: null }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: 「(なし)」が含まれる
        expect(result).toContain('John Doe');
        expect(result).toContain('(なし)');
      });
    });

    /**
     * カラー出力のテスト
     */
    describe('カラー出力', () => {
      it('colorEnabled が true の場合、追加行が緑色でハイライトされる', () => {
        // Given: 追加を含む変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'assignee', fromString: null, toString: 'John Doe' }],
          },
        ];
        const options = { colorEnabled: true };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: ANSI 緑色エスケープシーケンスが含まれる
        expect(result).toContain('\x1b[32m'); // 緑色
        expect(result).toContain('\x1b[0m'); // リセット
      });

      it('colorEnabled が true の場合、削除行が赤色でハイライトされる', () => {
        // Given: 削除を含む変更履歴
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'assignee', fromString: 'John Doe', toString: null }],
          },
        ];
        const options = { colorEnabled: true };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: ANSI 赤色エスケープシーケンスが含まれる
        expect(result).toContain('\x1b[31m'); // 赤色
        expect(result).toContain('\x1b[0m'); // リセット
      });

      it('colorEnabled が false の場合、ANSI エスケープシーケンスが含まれない', () => {
        // Given: 変更を含む changelog
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: ANSI エスケープシーケンスが含まれない
        expect(result).not.toContain('\x1b[');
      });
    });

    /**
     * 差分形式のテスト
     */
    describe('差分形式', () => {
      it('変更前の値に - プレフィックスが付く', () => {
        // Given: 値が変更された changelog
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: - プレフィックスが含まれる
        expect(result).toMatch(/-.*Open/);
      });

      it('変更後の値に + プレフィックスが付く', () => {
        // Given: 値が変更された changelog
        const changelog: readonly JiraChangelogEntry[] = [
          {
            author: 'John Doe',
            created: '2024-01-15T10:30:00.000+0900',
            id: '12345',
            items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }],
          },
        ];
        const options = { colorEnabled: false };

        // When: フォーマットする
        const result = formatJiraChangelog(changelog, options);

        // Then: + プレフィックスが含まれる
        expect(result).toMatch(/\+.*In Progress/);
      });
    });
  });

  /**
   * Confluence バージョン間差分表示機能のテスト
   *
   * バージョン間の本文差分を計算し、unified diff 形式で出力する。
   * カラー出力（追加=緑、削除=赤）に対応する。
   */
  describe('formatConfluenceVersionDiff', () => {
    /**
     * 基本的な差分表示のテスト
     */
    describe('基本的な差分表示', () => {
      it('2つのバージョン間の差分をヘッダー付きで表示する', () => {
        // Given: 2つの Confluence バージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Hello, World!',
          by: 'John Doe',
          message: 'Initial version',
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Hello, Confluence!',
          by: 'Jane Smith',
          message: 'Updated content',
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: ヘッダーにバージョン番号と作成者が含まれる
        expect(result).toContain('v1');
        expect(result).toContain('v2');
      });

      it('本文の差分が unified diff 形式で表示される', () => {
        // Given: 本文が異なる2つのバージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Line 1\nLine 2\nLine 3',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Line 1\nModified Line 2\nLine 3',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 削除行と追加行が含まれる
        expect(result).toContain('-');
        expect(result).toContain('+');
        expect(result).toContain('Line 2');
        expect(result).toContain('Modified Line 2');
      });

      it('変更がない場合は差分なしを示すメッセージを表示する', () => {
        // Given: 同一の本文を持つ2つのバージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Same content',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Same content',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 差分がないことを示すメッセージが含まれる
        expect(result).toContain('変更なし');
      });
    });

    /**
     * バージョン情報ヘッダーのテスト
     */
    describe('バージョン情報ヘッダー', () => {
      it('旧バージョンと新バージョンの情報が表示される', () => {
        // Given: バージョン情報を持つ2つのバージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Old content',
          by: 'Author A',
          message: 'Version 5 message',
          number: 5,
          when: '2024-01-10T09:00:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'New content',
          by: 'Author B',
          message: 'Version 6 message',
          number: 6,
          when: '2024-01-11T10:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 両バージョンの情報が含まれる
        expect(result).toContain('v5');
        expect(result).toContain('v6');
        expect(result).toContain('Author A');
        expect(result).toContain('Author B');
      });

      it('バージョンメッセージが存在する場合は表示される', () => {
        // Given: バージョンメッセージを持つバージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Content',
          by: 'John Doe',
          message: 'Initial commit',
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Content updated',
          by: 'Jane Smith',
          message: 'Fixed typo',
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: バージョンメッセージが含まれる
        expect(result).toContain('Fixed typo');
      });
    });

    /**
     * 本文が undefined の場合のテスト
     */
    describe('本文が undefined の場合', () => {
      it('旧バージョンの本文が undefined の場合は空文字列として扱う', () => {
        // Given: 本文が undefined の旧バージョン
        const oldVersion: ConfluenceVersion = {
          body: undefined,
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'New content',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 追加として差分が表示される
        expect(result).toContain('+');
        expect(result).toContain('New content');
      });

      it('新バージョンの本文が undefined の場合は空文字列として扱う', () => {
        // Given: 本文が undefined の新バージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Old content',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: undefined,
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 削除として差分が表示される
        expect(result).toContain('-');
        expect(result).toContain('Old content');
      });

      it('両バージョンの本文が undefined の場合は変更なし', () => {
        // Given: 両方とも本文が undefined
        const oldVersion: ConfluenceVersion = {
          body: undefined,
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: undefined,
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 変更なしを示すメッセージ
        expect(result).toContain('変更なし');
      });
    });

    /**
     * カラー出力のテスト
     */
    describe('カラー出力', () => {
      it('colorEnabled が true の場合、追加行が緑色でハイライトされる', () => {
        // Given: 追加がある差分
        const oldVersion: ConfluenceVersion = {
          body: 'Line 1',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Line 1\nLine 2',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: true };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: ANSI 緑色エスケープシーケンスが含まれる
        expect(result).toContain('\x1b[32m'); // 緑色
        expect(result).toContain('\x1b[0m'); // リセット
      });

      it('colorEnabled が true の場合、削除行が赤色でハイライトされる', () => {
        // Given: 削除がある差分
        const oldVersion: ConfluenceVersion = {
          body: 'Line 1\nLine 2',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Line 1',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: true };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: ANSI 赤色エスケープシーケンスが含まれる
        expect(result).toContain('\x1b[31m'); // 赤色
        expect(result).toContain('\x1b[0m'); // リセット
      });

      it('colorEnabled が false の場合、ANSI エスケープシーケンスが含まれない', () => {
        // Given: 差分がある2つのバージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Old content',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'New content',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: ANSI エスケープシーケンスが含まれない
        expect(result).not.toContain('\x1b[');
      });
    });

    /**
     * 差分統計のテスト
     */
    describe('差分統計', () => {
      it('追加・削除行数がヘッダーに表示される', () => {
        // Given: 複数行の追加と削除がある差分
        const oldVersion: ConfluenceVersion = {
          body: 'Line 1\nLine 2\nLine 3',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Line 1\nNew Line 2\nLine 3\nLine 4',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: 統計情報が含まれる（+X, -Y の形式）
        expect(result).toMatch(/\+\d+/);
        expect(result).toMatch(/-\d+/);
      });
    });

    /**
     * 複数行の差分テスト
     */
    describe('複数行の差分', () => {
      it('大量の行が追加された場合も正しく表示される', () => {
        // Given: 大量の行が追加されたバージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Header',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Header\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: すべての追加行が含まれる
        expect(result).toContain('Line 1');
        expect(result).toContain('Line 5');
      });

      it('大量の行が削除された場合も正しく表示される', () => {
        // Given: 大量の行が削除されたバージョン
        const oldVersion: ConfluenceVersion = {
          body: 'Header\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5',
          by: 'John Doe',
          message: null,
          number: 1,
          when: '2024-01-15T10:30:00.000+0900',
        };
        const newVersion: ConfluenceVersion = {
          body: 'Header',
          by: 'Jane Smith',
          message: null,
          number: 2,
          when: '2024-01-16T14:00:00.000+0900',
        };
        const options = { colorEnabled: false };

        // When: 差分をフォーマットする
        const result = formatConfluenceVersionDiff(oldVersion, newVersion, options);

        // Then: すべての削除行が含まれる
        expect(result).toContain('Line 1');
        expect(result).toContain('Line 5');
      });
    });
  });
});
