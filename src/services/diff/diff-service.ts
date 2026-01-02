import { type StructuredPatchHunk, structuredPatch } from 'diff';
import type { ConfluenceVersion } from '../../types/confluence.js';
import type { DiffHunk, DiffLine, DiffLineType, DiffOptions, DiffResult, DiffStats } from '../../types/diff.js';
import type { JiraChangelogEntry } from '../../types/jira.js';

/** ANSI カラーコード */
const ANSI_COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
} as const;

/**
 * 差分ハンクから差分行を抽出する
 *
 * diff ライブラリの StructuredPatchHunk から DiffLine 配列に変換する。
 * 行のプレフィックス（+, -, 空白）から行の種別を判定する。
 *
 * @param hunk - diff ライブラリの StructuredPatchHunk
 * @returns 差分行の配列
 */
function extractDiffLines(hunk: StructuredPatchHunk): readonly DiffLine[] {
  return hunk.lines.map((line) => {
    const prefix = line.charAt(0);
    let type: DiffLineType;
    let content: string;

    switch (prefix) {
      case '+':
        type = 'add';
        content = line.substring(1);
        break;
      case '-':
        type = 'remove';
        content = line.substring(1);
        break;
      default:
        type = 'context';
        content = prefix === ' ' ? line.substring(1) : line;
        break;
    }

    return { content, type };
  });
}

/**
 * diff ライブラリの StructuredPatchHunk を DiffHunk に変換する
 *
 * @param hunk - diff ライブラリの StructuredPatchHunk
 * @returns DiffHunk
 */
function convertToDiffHunk(hunk: StructuredPatchHunk): DiffHunk {
  return {
    lines: extractDiffLines(hunk),
    newLines: hunk.newLines,
    newStart: hunk.newStart,
    oldLines: hunk.oldLines,
    oldStart: hunk.oldStart,
  };
}

/**
 * ハンクから差分統計を計算する
 *
 * @param hunks - DiffHunk の配列
 * @returns DiffStats
 */
function calculateStats(hunks: readonly DiffHunk[]): DiffStats {
  let additions = 0;
  let deletions = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') {
        additions++;
      } else if (line.type === 'remove') {
        deletions++;
      }
    }
  }

  return {
    additions,
    changes: hunks.length,
    deletions,
  };
}

/**
 * ハンクを unified diff 形式の文字列にフォーマットする
 *
 * @param hunks - DiffHunk の配列
 * @returns unified diff 形式の文字列
 */
function formatUnifiedDiff(hunks: readonly DiffHunk[]): string {
  if (hunks.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const hunk of hunks) {
    // ハンクヘッダー
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);

    // 差分行
    for (const line of hunk.lines) {
      switch (line.type) {
        case 'add':
          lines.push(`+${line.content}`);
          break;
        case 'remove':
          lines.push(`-${line.content}`);
          break;
        case 'context':
          lines.push(` ${line.content}`);
          break;
      }
    }
  }

  return lines.join('\n');
}

/**
 * 2つのテキスト間の差分を計算する
 *
 * unified diff 形式で差分を出力し、差分統計を計算する。
 * diff ライブラリを使用して行単位の差分を検出する。
 *
 * @param oldText - 変更前のテキスト
 * @param newText - 変更後のテキスト
 * @param options - 差分オプション
 * @returns 差分結果
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const result = diffText('Hello', 'Goodbye', { colorEnabled: false });
 * console.log(result.formatted);
 * // @@ -1,1 +1,1 @@
 * // -Hello
 * // +Goodbye
 * ```
 *
 * @example
 * ```typescript
 * // 差分統計の確認
 * const result = diffText('A\nB\nC', 'A\nX\nC', { colorEnabled: false });
 * console.log(result.stats.additions); // 1
 * console.log(result.stats.deletions); // 1
 * ```
 */
export function diffText(oldText: string, newText: string, options: DiffOptions): DiffResult {
  const contextLines = options.contextLines ?? 3;

  // diff ライブラリで差分を計算
  const patch = structuredPatch('old', 'new', oldText, newText, undefined, undefined, {
    context: contextLines,
  });

  // ハンクを変換
  const hunks = patch.hunks.map(convertToDiffHunk);

  // 統計を計算
  const stats = calculateStats(hunks);

  // フォーマット
  const formatted = formatUnifiedDiff(hunks);

  return {
    formatted,
    hunks,
    stats,
  };
}

/**
 * null 値を「(なし)」に変換する
 *
 * @param value - 値
 * @returns 値または「(なし)」
 */
function formatNullableValue(value: string | null): string {
  return value ?? '(なし)';
}

/**
 * 削除行（変更前の値）をフォーマットする
 *
 * @param field - フィールド名
 * @param value - 値
 * @param colorEnabled - カラー出力を有効にするか
 * @returns フォーマットされた文字列
 */
function formatRemoveLine(field: string, value: string | null, colorEnabled: boolean): string {
  const formattedValue = formatNullableValue(value);
  const line = `- ${field}: ${formattedValue}`;
  if (colorEnabled) {
    return `${ANSI_COLORS.red}${line}${ANSI_COLORS.reset}`;
  }
  return line;
}

/**
 * 追加行（変更後の値）をフォーマットする
 *
 * @param field - フィールド名
 * @param value - 値
 * @param colorEnabled - カラー出力を有効にするか
 * @returns フォーマットされた文字列
 */
function formatAddLine(field: string, value: string | null, colorEnabled: boolean): string {
  const formattedValue = formatNullableValue(value);
  const line = `+ ${field}: ${formattedValue}`;
  if (colorEnabled) {
    return `${ANSI_COLORS.green}${line}${ANSI_COLORS.reset}`;
  }
  return line;
}

/**
 * Jira changelog を差分形式でフォーマットする
 *
 * 各変更のフィールド名、変更前の値、変更後の値を表示する。
 * カラー出力が有効な場合、追加行を緑、削除行を赤でハイライトする。
 *
 * @param changelog - Jira の変更履歴
 * @param options - 差分オプション
 * @returns フォーマットされた差分文字列
 *
 * @example
 * ```typescript
 * const changelog = [{
 *   id: '12345',
 *   author: 'John Doe',
 *   created: '2024-01-15T10:30:00.000+0900',
 *   items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }]
 * }];
 * const result = formatJiraChangelog(changelog, { colorEnabled: false });
 * // Changelog #12345 by John Doe at 2024-01-15T10:30:00.000+0900
 * //   [status]
 * //   - status: Open
 * //   + status: In Progress
 * ```
 */
export function formatJiraChangelog(changelog: readonly JiraChangelogEntry[], options: DiffOptions): string {
  if (changelog.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const entry of changelog) {
    // ヘッダー行
    lines.push(`Changelog #${entry.id} by ${entry.author} at ${entry.created}`);

    // 変更アイテム
    for (const item of entry.items) {
      lines.push(`  [${item.field}]`);
      lines.push(`  ${formatRemoveLine(item.field, item.fromString, options.colorEnabled)}`);
      lines.push(`  ${formatAddLine(item.field, item.toString, options.colorEnabled)}`);
    }

    lines.push(''); // 空行で区切る
  }

  // 末尾の空行を削除
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

/**
 * 差分行をカラー付きでフォーマットする
 *
 * @param line - 差分行（プレフィックス付き）
 * @param type - 行の種別
 * @param colorEnabled - カラー出力を有効にするか
 * @returns フォーマットされた文字列
 */
function formatDiffLineWithColor(line: string, type: DiffLineType, colorEnabled: boolean): string {
  if (!colorEnabled) {
    return line;
  }

  switch (type) {
    case 'add':
      return `${ANSI_COLORS.green}${line}${ANSI_COLORS.reset}`;
    case 'remove':
      return `${ANSI_COLORS.red}${line}${ANSI_COLORS.reset}`;
    default:
      return line;
  }
}

/**
 * DiffLine をプレフィックス付きの行文字列に変換する
 *
 * @param line - 差分行
 * @returns プレフィックス付きの行文字列
 */
function diffLineToString(line: DiffLine): string {
  switch (line.type) {
    case 'add':
      return `+${line.content}`;
    case 'remove':
      return `-${line.content}`;
    case 'context':
      return ` ${line.content}`;
  }
}

/**
 * 差分ハンクをカラー付きの文字列配列に変換する
 *
 * @param hunks - 差分ハンクの配列
 * @param colorEnabled - カラー出力を有効にするか
 * @returns フォーマットされた行の配列
 */
function formatHunksWithColor(hunks: readonly DiffHunk[], colorEnabled: boolean): string[] {
  const lines: string[] = [];

  for (const hunk of hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);

    for (const line of hunk.lines) {
      const lineStr = diffLineToString(line);
      lines.push(formatDiffLineWithColor(lineStr, line.type, colorEnabled));
    }
  }

  return lines;
}

/**
 * Confluence バージョンヘッダーを生成する
 *
 * @param oldVersion - 変更前のバージョン
 * @param newVersion - 変更後のバージョン
 * @param stats - 差分統計（null の場合は統計なし）
 * @returns ヘッダー行
 */
function buildVersionHeader(
  oldVersion: ConfluenceVersion,
  newVersion: ConfluenceVersion,
  stats: DiffStats | null,
): string {
  const baseHeader = `v${oldVersion.number} → v${newVersion.number} by ${newVersion.by}`;
  if (stats === null) {
    return baseHeader;
  }
  return `${baseHeader} (+${stats.additions}, -${stats.deletions})`;
}

/**
 * Confluence バージョン間の差分をフォーマットする
 *
 * 2つの Confluence バージョン間の本文差分を計算し、unified diff 形式で出力する。
 * ヘッダーにはバージョン番号、作成者、差分統計が含まれる。
 * カラー出力が有効な場合、追加行を緑、削除行を赤でハイライトする。
 *
 * @param oldVersion - 変更前のバージョン
 * @param newVersion - 変更後のバージョン
 * @param options - 差分オプション
 * @returns フォーマットされた差分文字列
 *
 * @example
 * ```typescript
 * const oldVersion = { number: 1, by: 'John', when: '2024-01-15', message: null, body: 'Hello' };
 * const newVersion = { number: 2, by: 'Jane', when: '2024-01-16', message: 'Updated', body: 'Hello, World!' };
 * const result = formatConfluenceVersionDiff(oldVersion, newVersion, { colorEnabled: false });
 * // v1 → v2 by Jane (+1, -1)
 * // Updated
 * // @@ -1,1 +1,1 @@
 * // -Hello
 * // +Hello, World!
 * ```
 */
export function formatConfluenceVersionDiff(
  oldVersion: ConfluenceVersion,
  newVersion: ConfluenceVersion,
  options: DiffOptions,
): string {
  // 本文を取得（undefined の場合は空文字列として扱う）
  const oldBody = oldVersion.body ?? '';
  const newBody = newVersion.body ?? '';

  // 差分を計算
  const diffResult = diffText(oldBody, newBody, options);

  // 差分がない場合
  if (diffResult.hunks.length === 0) {
    const lines = [buildVersionHeader(oldVersion, newVersion, null)];
    if (newVersion.message !== null) {
      lines.push(newVersion.message);
    }
    lines.push('(変更なし)');
    return lines.join('\n');
  }

  // 出力を構築
  const lines: string[] = [];

  // ヘッダー
  lines.push(buildVersionHeader(oldVersion, newVersion, diffResult.stats));
  lines.push(`  by ${oldVersion.by} → ${newVersion.by}`);

  // バージョンメッセージ
  if (newVersion.message !== null) {
    lines.push(newVersion.message);
  }

  lines.push(''); // 空行

  // 差分内容（カラー対応）
  lines.push(...formatHunksWithColor(diffResult.hunks, options.colorEnabled));

  return lines.join('\n');
}

/**
 * In-source testing for private functions
 *
 * vitest の in-source testing 機能を使用して、
 * プライベート関数のテストを実行する。
 */
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  /**
   * extractDiffLines のテスト
   *
   * Note: extractDiffLines は StructuredPatchHunk を取る（lines は string[]）
   */
  describe('extractDiffLines (private)', () => {
    it('Given 追加行、When 抽出すると、Then 追加タイプの DiffLine を返す', () => {
      // Given: 追加行のハンク（StructuredPatchHunk 形式）
      const hunk = {
        lines: ['+added line'],
        newLines: 1,
        newStart: 1,
        oldLines: 0,
        oldStart: 1,
      };

      // When: 行を抽出する
      const lines = extractDiffLines(hunk);

      // Then: 追加タイプの DiffLine を返す
      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({ content: 'added line', type: 'add' });
    });

    it('Given 削除行、When 抽出すると、Then 削除タイプの DiffLine を返す', () => {
      // Given: 削除行のハンク
      const hunk = {
        lines: ['-removed line'],
        newLines: 0,
        newStart: 1,
        oldLines: 1,
        oldStart: 1,
      };

      // When: 行を抽出する
      const lines = extractDiffLines(hunk);

      // Then: 削除タイプの DiffLine を返す
      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({ content: 'removed line', type: 'remove' });
    });

    it('Given コンテキスト行（スペース始まり）、When 抽出すると、Then コンテキストタイプを返す', () => {
      // Given: コンテキスト行のハンク
      const hunk = {
        lines: [' context line'],
        newLines: 1,
        newStart: 1,
        oldLines: 1,
        oldStart: 1,
      };

      // When: 行を抽出する
      const lines = extractDiffLines(hunk);

      // Then: コンテキストタイプの DiffLine を返す
      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({ content: 'context line', type: 'context' });
    });

    it('Given 空行、When 抽出すると、Then 空のコンテキスト行を返す', () => {
      // Given: 空行のハンク
      const hunk = {
        lines: [''],
        newLines: 1,
        newStart: 1,
        oldLines: 1,
        oldStart: 1,
      };

      // When: 行を抽出する
      const lines = extractDiffLines(hunk);

      // Then: 空のコンテキスト行を返す
      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({ content: '', type: 'context' });
    });

    it('Given 未知のプレフィックス、When 抽出すると、Then コンテキストタイプで行全体を保持', () => {
      // Given: 未知のプレフィックスを持つハンク
      const hunk = {
        lines: ['?unknown prefix'],
        newLines: 1,
        newStart: 1,
        oldLines: 1,
        oldStart: 1,
      };

      // When: 行を抽出する
      const lines = extractDiffLines(hunk);

      // Then: コンテキストタイプとして処理され、行全体が保持される（default ケース）
      // Note: prefix === ' ' でない場合、line.substring(1) ではなく line 全体が content になる
      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({ content: '?unknown prefix', type: 'context' });
    });

    it('Given 複数行、When 抽出すると、Then 全ての行が正しく抽出される', () => {
      // Given: 複数行のハンク
      const hunk = {
        lines: [' context', '-old', '+new'],
        newLines: 3,
        newStart: 1,
        oldLines: 2,
        oldStart: 1,
      };

      // When: 行を抽出する
      const lines = extractDiffLines(hunk);

      // Then: 全ての行が正しく抽出される
      expect(lines).toHaveLength(3);
      expect(lines[0]).toEqual({ content: 'context', type: 'context' });
      expect(lines[1]).toEqual({ content: 'old', type: 'remove' });
      expect(lines[2]).toEqual({ content: 'new', type: 'add' });
    });
  });

  /**
   * calculateStats のテスト
   *
   * Note: calculateStats は DiffHunk[] を取る（各 hunk は lines: DiffLine[] を持つ）
   */
  describe('calculateStats (private)', () => {
    it('Given 追加と削除がある DiffHunk、When 統計を計算すると、Then 正しい統計を返す', () => {
      // Given: 追加と削除がある DiffHunk 配列
      const hunks: DiffHunk[] = [
        {
          lines: [
            { content: 'line1', type: 'add' },
            { content: 'line2', type: 'add' },
            { content: 'line3', type: 'remove' },
            { content: 'line4', type: 'context' },
          ],
          newLines: 3,
          newStart: 1,
          oldLines: 2,
          oldStart: 1,
        },
      ];

      // When: 統計を計算する
      const stats = calculateStats(hunks);

      // Then: 正しい統計を返す
      expect(stats.additions).toBe(2);
      expect(stats.deletions).toBe(1);
      expect(stats.changes).toBe(1); // ハンク数
    });

    it('Given 空の DiffHunk 配列、When 統計を計算すると、Then ゼロの統計を返す', () => {
      // Given: 空の DiffHunk 配列
      const hunks: DiffHunk[] = [];

      // When: 統計を計算する
      const stats = calculateStats(hunks);

      // Then: ゼロの統計を返す
      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.changes).toBe(0);
    });

    it('Given コンテキスト行のみの DiffHunk、When 統計を計算すると、Then ゼロの統計を返す', () => {
      // Given: コンテキスト行のみ
      const hunks: DiffHunk[] = [
        {
          lines: [
            { content: 'line1', type: 'context' },
            { content: 'line2', type: 'context' },
          ],
          newLines: 2,
          newStart: 1,
          oldLines: 2,
          oldStart: 1,
        },
      ];

      // When: 統計を計算する
      const stats = calculateStats(hunks);

      // Then: ゼロの統計を返す（コンテキスト行はカウントされない）
      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.changes).toBe(1); // ハンク数は1
    });

    it('Given 複数のハンク、When 統計を計算すると、Then 全ハンクの合計を返す', () => {
      // Given: 複数のハンク
      const hunks: DiffHunk[] = [
        {
          lines: [{ content: 'add1', type: 'add' }],
          newLines: 1,
          newStart: 1,
          oldLines: 1,
          oldStart: 1,
        },
        {
          lines: [
            { content: 'del1', type: 'remove' },
            { content: 'del2', type: 'remove' },
          ],
          newLines: 1,
          newStart: 10,
          oldLines: 1,
          oldStart: 10,
        },
      ];

      // When: 統計を計算する
      const stats = calculateStats(hunks);

      // Then: 全ハンクの合計を返す
      expect(stats.additions).toBe(1);
      expect(stats.deletions).toBe(2);
      expect(stats.changes).toBe(2); // ハンク数
    });
  });

  /**
   * formatNullableValue のテスト
   */
  describe('formatNullableValue (private)', () => {
    it('Given null 値、When フォーマットすると、Then "(なし)" を返す', () => {
      // Given: null 値
      const value = null;

      // When: フォーマットする
      const result = formatNullableValue(value);

      // Then: "(なし)" を返す
      expect(result).toBe('(なし)');
    });

    it('Given 文字列値、When フォーマットすると、Then その値を返す', () => {
      // Given: 文字列値
      const value = 'test value';

      // When: フォーマットする
      const result = formatNullableValue(value);

      // Then: その値を返す
      expect(result).toBe('test value');
    });

    it('Given 空文字列、When フォーマットすると、Then 空文字列を返す', () => {
      // Given: 空文字列
      const value = '';

      // When: フォーマットする
      const result = formatNullableValue(value);

      // Then: 空文字列を返す
      expect(result).toBe('');
    });
  });

  /**
   * diffLineToString のテスト
   */
  describe('diffLineToString (private)', () => {
    it('Given 追加行、When 文字列に変換すると、Then "+" プレフィックスが付く', () => {
      // Given: 追加行
      const line: DiffLine = { content: 'new content', type: 'add' };

      // When: 文字列に変換する
      const result = diffLineToString(line);

      // Then: "+" プレフィックスが付く
      expect(result).toBe('+new content');
    });

    it('Given 削除行、When 文字列に変換すると、Then "-" プレフィックスが付く', () => {
      // Given: 削除行
      const line: DiffLine = { content: 'old content', type: 'remove' };

      // When: 文字列に変換する
      const result = diffLineToString(line);

      // Then: "-" プレフィックスが付く
      expect(result).toBe('-old content');
    });

    it('Given コンテキスト行、When 文字列に変換すると、Then " " プレフィックスが付く', () => {
      // Given: コンテキスト行
      const line: DiffLine = { content: 'unchanged', type: 'context' };

      // When: 文字列に変換する
      const result = diffLineToString(line);

      // Then: " " プレフィックスが付く
      expect(result).toBe(' unchanged');
    });
  });

  /**
   * formatDiffLineWithColor のテスト
   *
   * Note: formatDiffLineWithColor は (line: string, type: DiffLineType, colorEnabled: boolean) を取る
   */
  describe('formatDiffLineWithColor (private)', () => {
    it('Given 追加行とカラー有効、When フォーマットすると、Then 緑色の ANSI コードが付く', () => {
      // Given: 追加行とカラー有効
      const lineStr = '+new';

      // When: カラー付きでフォーマットする
      const result = formatDiffLineWithColor(lineStr, 'add', true);

      // Then: 緑色の ANSI コードが付く
      expect(result).toBe('\x1b[32m+new\x1b[0m');
    });

    it('Given 削除行とカラー有効、When フォーマットすると、Then 赤色の ANSI コードが付く', () => {
      // Given: 削除行とカラー有効
      const lineStr = '-old';

      // When: カラー付きでフォーマットする
      const result = formatDiffLineWithColor(lineStr, 'remove', true);

      // Then: 赤色の ANSI コードが付く
      expect(result).toBe('\x1b[31m-old\x1b[0m');
    });

    it('Given コンテキスト行とカラー有効、When フォーマットすると、Then ANSI コードなし', () => {
      // Given: コンテキスト行とカラー有効
      const lineStr = ' same';

      // When: カラー付きでフォーマットする
      const result = formatDiffLineWithColor(lineStr, 'context', true);

      // Then: ANSI コードなし
      expect(result).toBe(' same');
    });

    it('Given 追加行とカラー無効、When フォーマットすると、Then ANSI コードなし', () => {
      // Given: 追加行とカラー無効
      const lineStr = '+new';

      // When: カラーなしでフォーマットする
      const result = formatDiffLineWithColor(lineStr, 'add', false);

      // Then: ANSI コードなし
      expect(result).toBe('+new');
    });
  });

  /**
   * formatRemoveLine / formatAddLine のテスト
   *
   * Note: これらの関数は (field, value, colorEnabled) の3つのパラメータを取る
   */
  describe('formatRemoveLine / formatAddLine (private)', () => {
    it('Given フィールドと値とカラー有効、When formatRemoveLine すると、Then 赤色で "- field: value" 形式', () => {
      // Given: フィールドと値とカラー有効
      const field = 'status';
      const value = 'Open';

      // When: フォーマットする
      const result = formatRemoveLine(field, value, true);

      // Then: 赤色で "- field: value" 形式
      expect(result).toBe('\x1b[31m- status: Open\x1b[0m');
    });

    it('Given フィールドと値とカラー無効、When formatRemoveLine すると、Then "- field: value" 形式のみ', () => {
      // Given: フィールドと値とカラー無効
      const field = 'status';
      const value = 'Open';

      // When: フォーマットする
      const result = formatRemoveLine(field, value, false);

      // Then: "- field: value" 形式のみ
      expect(result).toBe('- status: Open');
    });

    it('Given フィールドと値とカラー有効、When formatAddLine すると、Then 緑色で "+ field: value" 形式', () => {
      // Given: フィールドと値とカラー有効
      const field = 'status';
      const value = 'Closed';

      // When: フォーマットする
      const result = formatAddLine(field, value, true);

      // Then: 緑色で "+ field: value" 形式
      expect(result).toBe('\x1b[32m+ status: Closed\x1b[0m');
    });

    it('Given フィールドと値とカラー無効、When formatAddLine すると、Then "+ field: value" 形式のみ', () => {
      // Given: フィールドと値とカラー無効
      const field = 'status';
      const value = 'Closed';

      // When: フォーマットする
      const result = formatAddLine(field, value, false);

      // Then: "+ field: value" 形式のみ
      expect(result).toBe('+ status: Closed');
    });

    it('Given null 値、When formatRemoveLine すると、Then "(なし)" が表示される', () => {
      // Given: null 値
      const field = 'assignee';
      const value = null;

      // When: フォーマットする
      const result = formatRemoveLine(field, value, false);

      // Then: "(なし)" が表示される
      expect(result).toBe('- assignee: (なし)');
    });

    it('Given null 値、When formatAddLine すると、Then "(なし)" が表示される', () => {
      // Given: null 値
      const field = 'assignee';
      const value = null;

      // When: フォーマットする
      const result = formatAddLine(field, value, false);

      // Then: "(なし)" が表示される
      expect(result).toBe('+ assignee: (なし)');
    });
  });

  /**
   * buildVersionHeader のテスト
   *
   * Note: 出力フォーマットは `v{old.number} → v{new.number} by {new.by}` 形式
   */
  describe('buildVersionHeader (private)', () => {
    it('Given stats が null、When ヘッダーを構築すると、Then 統計なしのヘッダーを返す', () => {
      // Given: stats が null
      const oldVersion: ConfluenceVersion = {
        body: 'old body',
        by: 'user1',
        message: null,
        number: 1,
        when: '2024-01-01T00:00:00.000Z',
      };
      const newVersion: ConfluenceVersion = {
        body: 'new body',
        by: 'user2',
        message: 'Updated',
        number: 2,
        when: '2024-01-02T00:00:00.000Z',
      };

      // When: ヘッダーを構築する
      const result = buildVersionHeader(oldVersion, newVersion, null);

      // Then: 統計なしのヘッダーを返す（v1 → v2 by user2 形式）
      expect(result).toBe('v1 → v2 by user2');
    });

    it('Given stats がある、When ヘッダーを構築すると、Then 統計付きのヘッダーを返す', () => {
      // Given: stats がある
      const oldVersion: ConfluenceVersion = {
        body: 'old body',
        by: 'user1',
        message: null,
        number: 1,
        when: '2024-01-01T00:00:00.000Z',
      };
      const newVersion: ConfluenceVersion = {
        body: 'new body',
        by: 'user2',
        message: 'Updated',
        number: 2,
        when: '2024-01-02T00:00:00.000Z',
      };
      const stats: DiffStats = { additions: 5, changes: 1, deletions: 3 };

      // When: ヘッダーを構築する
      const result = buildVersionHeader(oldVersion, newVersion, stats);

      // Then: 統計付きのヘッダーを返す（v1 → v2 by user2 (+5, -3) 形式）
      expect(result).toBe('v1 → v2 by user2 (+5, -3)');
    });

    it('Given 同じユーザーによる複数バージョン、When ヘッダーを構築すると、Then 新バージョンの by を使用', () => {
      // Given: 同じユーザーによる複数バージョン
      const oldVersion: ConfluenceVersion = {
        body: 'old body',
        by: 'John Doe',
        message: null,
        number: 5,
        when: '2024-01-01T00:00:00.000Z',
      };
      const newVersion: ConfluenceVersion = {
        body: 'new body',
        by: 'Jane Smith',
        message: null,
        number: 6,
        when: '2024-01-02T00:00:00.000Z',
      };

      // When: ヘッダーを構築する
      const result = buildVersionHeader(oldVersion, newVersion, null);

      // Then: 新バージョンの by を使用
      expect(result).toBe('v5 → v6 by Jane Smith');
    });
  });

  /**
   * formatUnifiedDiff のテスト
   *
   * Note: formatUnifiedDiff は hunks: readonly DiffHunk[] を取り、
   * hunk.lines は DiffLine[] である（文字列ではない）
   */
  describe('formatUnifiedDiff (private)', () => {
    it('Given DiffHunk 配列、When フォーマットすると、Then unified diff 形式の文字列を返す', () => {
      // Given: DiffHunk 配列（lines は DiffLine オブジェクト）
      const hunks: DiffHunk[] = [
        {
          lines: [
            { content: 'old', type: 'remove' },
            { content: 'new', type: 'add' },
          ],
          newLines: 1,
          newStart: 1,
          oldLines: 1,
          oldStart: 1,
        },
      ];

      // When: フォーマットする
      const formatted = formatUnifiedDiff(hunks);

      // Then: unified diff 形式の文字列を返す
      expect(formatted).toContain('@@ -1,1 +1,1 @@');
      expect(formatted).toContain('-old');
      expect(formatted).toContain('+new');
    });

    it('Given 空のハンク配列、When フォーマットすると、Then 空文字列を返す', () => {
      // Given: 空のハンク配列
      const hunks: DiffHunk[] = [];

      // When: フォーマットする
      const formatted = formatUnifiedDiff(hunks);

      // Then: 空文字列を返す
      expect(formatted).toBe('');
    });

    it('Given コンテキスト行を含むハンク、When フォーマットすると、Then 正しくフォーマットされる', () => {
      // Given: コンテキスト行を含むハンク
      const hunks: DiffHunk[] = [
        {
          lines: [
            { content: 'unchanged1', type: 'context' },
            { content: 'old', type: 'remove' },
            { content: 'new', type: 'add' },
            { content: 'unchanged2', type: 'context' },
          ],
          newLines: 3,
          newStart: 1,
          oldLines: 3,
          oldStart: 1,
        },
      ];

      // When: フォーマットする
      const formatted = formatUnifiedDiff(hunks);

      // Then: 正しくフォーマットされる
      expect(formatted).toContain(' unchanged1');
      expect(formatted).toContain('-old');
      expect(formatted).toContain('+new');
      expect(formatted).toContain(' unchanged2');
    });

    it('Given 複数のハンク、When フォーマットすると、Then 全てのハンクが含まれる', () => {
      // Given: 複数のハンク
      const hunks: DiffHunk[] = [
        {
          lines: [{ content: 'first', type: 'remove' }],
          newLines: 1,
          newStart: 1,
          oldLines: 1,
          oldStart: 1,
        },
        {
          lines: [{ content: 'second', type: 'add' }],
          newLines: 1,
          newStart: 10,
          oldLines: 1,
          oldStart: 10,
        },
      ];

      // When: フォーマットする
      const formatted = formatUnifiedDiff(hunks);

      // Then: 全てのハンクが含まれる
      expect(formatted).toContain('@@ -1,1 +1,1 @@');
      expect(formatted).toContain('@@ -10,1 +10,1 @@');
      expect(formatted).toContain('-first');
      expect(formatted).toContain('+second');
    });
  });
}
