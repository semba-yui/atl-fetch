/**
 * 差分計算に関する型定義
 *
 * DiffService で使用する型を定義する。
 * unified diff 形式での出力、差分統計の計算に対応。
 */

/**
 * 差分オプション
 *
 * 差分計算時の設定を指定する。
 */
export interface DiffOptions {
  /** カラー出力を有効にするか */
  readonly colorEnabled: boolean;
  /** コンテキスト行数（デフォルト: 3） */
  readonly contextLines?: number;
}

/**
 * 差分行の種別
 */
export type DiffLineType = 'add' | 'remove' | 'context';

/**
 * 差分行
 *
 * 1行分の差分情報を表す。
 */
export interface DiffLine {
  /** 行の種別 */
  readonly type: DiffLineType;
  /** 行の内容 */
  readonly content: string;
}

/**
 * 差分ハンク
 *
 * 連続した差分行のグループを表す。
 * unified diff 形式の @@ -start,lines +start,lines @@ に対応。
 */
export interface DiffHunk {
  /** 変更前テキストでの開始行番号 */
  readonly oldStart: number;
  /** 変更前テキストでの行数 */
  readonly oldLines: number;
  /** 変更後テキストでの開始行番号 */
  readonly newStart: number;
  /** 変更後テキストでの行数 */
  readonly newLines: number;
  /** 差分行のリスト */
  readonly lines: readonly DiffLine[];
}

/**
 * 差分統計
 *
 * 差分の追加・削除行数を集計した情報。
 */
export interface DiffStats {
  /** 追加された行数 */
  readonly additions: number;
  /** 削除された行数 */
  readonly deletions: number;
  /** 変更があったハンクの数 */
  readonly changes: number;
}

/**
 * 差分結果
 *
 * 差分計算の結果を表す。
 * ハンクのリストとフォーマット済み文字列を含む。
 */
export interface DiffResult {
  /** 差分ハンクのリスト */
  readonly hunks: readonly DiffHunk[];
  /** unified diff 形式でフォーマットされた文字列 */
  readonly formatted: string;
  /** 差分統計 */
  readonly stats: DiffStats;
}
