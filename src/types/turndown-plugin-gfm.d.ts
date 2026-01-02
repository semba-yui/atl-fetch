/**
 * turndown-plugin-gfm 型定義
 */

declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';

  /**
   * GFM プラグイン（テーブル、取り消し線、タスクリストを含む）
   */
  export const gfm: TurndownService.Plugin;

  /**
   * テーブルプラグイン
   */
  export const tables: TurndownService.Plugin;

  /**
   * 取り消し線プラグイン
   */
  export const strikethrough: TurndownService.Plugin;

  /**
   * タスクリストプラグイン
   */
  export const taskListItems: TurndownService.Plugin;
}
