/**
 * ストレージサービスに関する型定義
 *
 * Jira Issue / Confluence ページをディレクトリ構造で保存するための型を定義する。
 */

import type { Result } from 'neverthrow';

import type { ConfluenceAttachment, ConfluenceVersion } from './confluence.js';
import type { DiffHunk, DiffStats } from './diff.js';
import type { JiraAttachment, JiraChangelogEntry, JiraComment } from './jira.js';

/**
 * Manifest のリソースタイプ
 */
export type ManifestResourceType = 'jiraIssue' | 'confluencePage';

/**
 * Manifest の問題レベル
 */
export type ManifestIssueLevel = 'error' | 'warning';

/**
 * Manifest の問題
 */
export interface ManifestIssue {
  /** 問題レベル */
  readonly level: ManifestIssueLevel;
  /** エラーコード */
  readonly code: string;
  /** エラーメッセージ */
  readonly message: string;
  /** 追加コンテキスト */
  readonly context?: Record<string, unknown>;
}

/**
 * 添付ファイルダウンロード結果のステータス
 */
export type AttachmentResultStatus = 'success' | 'failed' | 'skipped';

/**
 * 添付ファイルダウンロード結果
 */
export interface AttachmentResult {
  /** 添付ファイル ID */
  readonly id: string;
  /** ファイル名 */
  readonly filename: string;
  /** MIME タイプ */
  readonly mimeType: string;
  /** ファイルサイズ（バイト） */
  readonly size: number;
  /** ダウンロード結果ステータス */
  readonly status: AttachmentResultStatus;
  /** 保存先パス（成功時のみ） */
  readonly savedPath?: string;
  /** エラーメッセージ（失敗時のみ） */
  readonly error?: string;
}

/**
 * Manifest（取得メタデータ）
 */
export interface Manifest {
  /** 取得対象の種別 */
  readonly resourceType: ManifestResourceType;
  /** 入力URL（正規化後） */
  readonly sourceUrl: string;
  /** 取得時刻（ISO 8601 形式） */
  readonly fetchedAt: string;
  /** CLI バージョン */
  readonly cliVersion: string;
  /** 取得結果サマリ */
  readonly summary: {
    readonly success: boolean;
    readonly resourceId: string;
    readonly title: string;
  };
  /** エラー・警告一覧 */
  readonly issues: readonly ManifestIssue[];
  /** 添付ファイル取得結果 */
  readonly attachments: readonly AttachmentResult[];
}

/**
 * Jira Issue 保存オプション
 */
export interface JiraStorageOptions {
  /** 出力先ベースディレクトリ */
  readonly baseDir: string;
  /** 入力 URL */
  readonly sourceUrl: string;
  /** CLI バージョン */
  readonly cliVersion: string;
}

/**
 * Jira Issue 保存データ
 */
export interface JiraSaveData {
  /** Issue キー（例: PROJECT-123） */
  readonly key: string;
  /** Issue タイトル（要約） */
  readonly summary: string;
  /** Issue 説明（null の場合は説明なし） */
  readonly description: string | null;
  /** 説明のプレーンテキスト（null の場合は説明なし） */
  readonly descriptionPlainText: string | null;
  /** コメント一覧 */
  readonly comments: readonly JiraComment[];
  /** 変更履歴一覧 */
  readonly changelog: readonly JiraChangelogEntry[];
  /** 添付ファイル一覧 */
  readonly attachments: readonly JiraAttachment[];
}

/**
 * Confluence ページ保存オプション
 */
export interface ConfluenceStorageOptions {
  /** 出力先ベースディレクトリ */
  readonly baseDir: string;
  /** 入力 URL */
  readonly sourceUrl: string;
  /** CLI バージョン */
  readonly cliVersion: string;
}

/**
 * Confluence ページ保存データ
 */
export interface ConfluenceSaveData {
  /** ページ ID */
  readonly id: string;
  /** ページタイトル */
  readonly title: string;
  /** ページ本文（Storage Format） */
  readonly body: string;
  /** ページ本文のプレーンテキスト */
  readonly bodyPlainText: string;
  /** スペースキー */
  readonly spaceKey: string;
  /** 現在のバージョン番号 */
  readonly currentVersion: number;
  /** バージョン一覧 */
  readonly versions: readonly ConfluenceVersion[];
  /** 添付ファイル一覧 */
  readonly attachments: readonly ConfluenceAttachment[];
}

/**
 * ストレージサービスのエラーの型
 */
export type StorageError =
  | { kind: 'DIRECTORY_CREATE_FAILED'; message: string; path: string }
  | { kind: 'FILE_WRITE_FAILED'; message: string; path: string }
  | { kind: 'INVALID_DATA'; message: string };

/**
 * Jira Issue 保存結果
 */
export interface JiraSaveResult {
  /** 保存先ディレクトリパス */
  readonly directory: string;
  /** 生成された Manifest */
  readonly manifest: Manifest;
}

/**
 * Confluence ページ保存結果
 */
export interface ConfluenceSaveResult {
  /** 保存先ディレクトリパス */
  readonly directory: string;
  /** 生成された Manifest */
  readonly manifest: Manifest;
}

/**
 * バージョン間差分メタデータ
 *
 * design.md の Version Diff Schema に準拠
 */
export interface VersionDiff {
  /** 比較元バージョン */
  readonly fromVersion: number;
  /** 比較先バージョン */
  readonly toVersion: number;
  /** 差分生成時刻（ISO 8601 形式） */
  readonly generatedAt: string;
  /** 差分統計 */
  readonly stats: DiffStats;
  /** 差分ハンク一覧 */
  readonly hunks: readonly DiffHunk[];
}

/**
 * ストレージサービスのインターフェース
 */
export interface StorageServiceInterface {
  /**
   * Jira Issue をディレクトリ構造で保存する
   *
   * @param data 保存データ
   * @param options 保存オプション
   * @returns 成功時は Ok(JiraSaveResult)、失敗時は Err(StorageError)
   */
  saveJiraIssue(data: JiraSaveData, options: JiraStorageOptions): Promise<Result<JiraSaveResult, StorageError>>;

  /**
   * Confluence ページをディレクトリ構造で保存する
   *
   * @param data 保存データ
   * @param options 保存オプション
   * @returns 成功時は Ok(ConfluenceSaveResult)、失敗時は Err(StorageError)
   */
  saveConfluencePage(
    data: ConfluenceSaveData,
    options: ConfluenceStorageOptions,
  ): Promise<Result<ConfluenceSaveResult, StorageError>>;
}
