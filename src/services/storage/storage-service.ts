/**
 * ストレージサービス
 *
 * Jira Issue / Confluence ページをディレクトリ構造で保存する。
 * design.md の Output Directory Structure に従って保存する。
 */

import { join } from 'node:path';

import { err, ok, type Result } from 'neverthrow';

import { ensureDir, writeFileContent } from '../../ports/file/file-port.js';
import type { ConfluenceVersion } from '../../types/confluence.js';
import type { DiffHunk } from '../../types/diff.js';
import type {
  AttachmentResult,
  ConfluenceSaveData,
  ConfluenceSaveResult,
  ConfluenceStorageOptions,
  JiraSaveData,
  JiraSaveResult,
  JiraStorageOptions,
  Manifest,
  StorageError,
  VersionDiff,
} from '../../types/storage.js';
import { downloadConfluenceAttachment } from '../confluence/confluence-service.js';
import { diffText } from '../diff/diff-service.js';
import { downloadJiraAttachment } from '../jira/jira-service.js';
import { convertAdfToMarkdown, convertStorageFormatToMarkdown } from '../text-converter/text-converter.js';

/**
 * 現在時刻を ISO 8601 形式で取得する
 *
 * @returns ISO 8601 形式の日時文字列
 */
const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Jira Issue 用の Manifest を生成する
 *
 * @param data 保存データ
 * @param options 保存オプション
 * @param attachmentResults 添付ファイルのダウンロード結果
 * @returns Manifest オブジェクト
 */
const createJiraManifest = (
  data: JiraSaveData,
  options: JiraStorageOptions,
  attachmentResults: readonly AttachmentResult[],
): Manifest => {
  return {
    attachments: [...attachmentResults],
    cliVersion: options.cliVersion,
    fetchedAt: getCurrentTimestamp(),
    issues: [],
    resourceType: 'jiraIssue',
    sourceUrl: options.sourceUrl,
    summary: {
      resourceId: data.key,
      success: true,
      title: data.summary,
    },
  };
};

/**
 * Jira Issue をディレクトリ構造で保存する
 *
 * 以下のディレクトリ構造で保存する:
 * ```
 * {baseDir}/jira/{ISSUE-KEY}/
 * ├── manifest.json          # 取得メタデータ
 * ├── issue.json             # Issue 全データ（JSON 形式）
 * ├── description.txt        # 説明文のプレーンテキスト
 * ├── content.md             # Markdown 形式（Description + Attachments）
 * ├── comments.md            # コメント一覧（Markdown 形式）
 * ├── changelog.md           # 変更履歴（Markdown 形式）
 * ├── changelog.json         # 変更履歴（JSON 形式）
 * ├── comments.json          # コメント一覧（JSON 形式）
 * ├── attachments.json       # 添付ファイル一覧メタデータ
 * └── attachments/           # 添付ファイル実体
 *     └── {id}_{filename}
 * ```
 *
 * @param data 保存データ
 * @param options 保存オプション
 * @returns 成功時は Ok(JiraSaveResult)、失敗時は Err(StorageError)
 */
export const saveJiraIssue = async (
  data: JiraSaveData,
  options: JiraStorageOptions,
): Promise<Result<JiraSaveResult, StorageError>> => {
  // 保存先ディレクトリのパスを構築
  const issueDir = join(options.baseDir, 'jira', data.key);

  // ディレクトリを作成
  const mkdirResult = await ensureDir(issueDir);
  if (mkdirResult.isErr()) {
    return err({
      kind: 'DIRECTORY_CREATE_FAILED',
      message: `ディレクトリの作成に失敗しました: ${mkdirResult.error.message}`,
      path: issueDir,
    });
  }

  // 添付ファイルディレクトリを作成
  const attachmentsDir = join(issueDir, 'attachments');
  const attachmentsDirResult = await ensureDir(attachmentsDir);
  if (attachmentsDirResult.isErr()) {
    return err({
      kind: 'DIRECTORY_CREATE_FAILED',
      message: `attachments ディレクトリの作成に失敗しました: ${attachmentsDirResult.error.message}`,
      path: attachmentsDir,
    });
  }

  // 各添付ファイルをダウンロード
  const attachmentResults: AttachmentResult[] = await Promise.all(
    data.attachments.map(async (att): Promise<AttachmentResult> => {
      // ファイル名を安全な形式に変換（ID_ファイル名）
      const safeFilename = `${att.id}_${att.filename}`;
      const destPath = join(attachmentsDir, safeFilename);

      const downloadResult = await downloadJiraAttachment(att, destPath);

      if (downloadResult.isOk()) {
        return {
          filename: att.filename,
          id: att.id,
          mimeType: att.mimeType,
          savedPath: `attachments/${safeFilename}`,
          size: att.size,
          status: 'success',
        };
      }
      return {
        error: downloadResult.error.message,
        filename: att.filename,
        id: att.id,
        mimeType: att.mimeType,
        size: att.size,
        status: 'failed',
      };
    }),
  );

  // Manifest を生成
  const manifest = createJiraManifest(data, options, attachmentResults);

  // manifest.json を保存
  const manifestPath = join(issueDir, 'manifest.json');
  const manifestWriteResult = await writeFileContent(manifestPath, JSON.stringify(manifest, null, 2));
  if (manifestWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `manifest.json の書き込みに失敗しました: ${manifestWriteResult.error.message}`,
      path: manifestPath,
    });
  }

  // issue.json を保存（Issue 全データ）
  const issueData = {
    attachments: data.attachments,
    changelog: data.changelog,
    comments: data.comments,
    description: data.description,
    key: data.key,
    summary: data.summary,
  };
  const issuePath = join(issueDir, 'issue.json');
  const issueWriteResult = await writeFileContent(issuePath, JSON.stringify(issueData, null, 2));
  if (issueWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `issue.json の書き込みに失敗しました: ${issueWriteResult.error.message}`,
      path: issuePath,
    });
  }

  // description.txt を保存（プレーンテキスト）
  const descPath = join(issueDir, 'description.txt');
  const descWriteResult = await writeFileContent(descPath, data.descriptionPlainText ?? '');
  if (descWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `description.txt の書き込みに失敗しました: ${descWriteResult.error.message}`,
      path: descPath,
    });
  }

  // content.md を保存（Markdown 形式：Description + Attachments）
  const markdownContent = formatJiraIssueAsMarkdown(data, attachmentResults);
  const markdownPath = join(issueDir, 'content.md');
  const markdownWriteResult = await writeFileContent(markdownPath, markdownContent);
  if (markdownWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `content.md の書き込みに失敗しました: ${markdownWriteResult.error.message}`,
      path: markdownPath,
    });
  }

  // comments.md を保存（Markdown 形式）
  const commentsMarkdownContent = formatCommentsAsMarkdown(data, attachmentResults);
  const commentsMarkdownPath = join(issueDir, 'comments.md');
  const commentsMarkdownWriteResult = await writeFileContent(commentsMarkdownPath, commentsMarkdownContent);
  if (commentsMarkdownWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `comments.md の書き込みに失敗しました: ${commentsMarkdownWriteResult.error.message}`,
      path: commentsMarkdownPath,
    });
  }

  // changelog.md を保存（Markdown 形式）
  const changelogMarkdownContent = formatChangelogAsMarkdown(data);
  const changelogMarkdownPath = join(issueDir, 'changelog.md');
  const changelogMarkdownWriteResult = await writeFileContent(changelogMarkdownPath, changelogMarkdownContent);
  if (changelogMarkdownWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `changelog.md の書き込みに失敗しました: ${changelogMarkdownWriteResult.error.message}`,
      path: changelogMarkdownPath,
    });
  }

  // changelog.json を保存
  const changelogPath = join(issueDir, 'changelog.json');
  const changelogWriteResult = await writeFileContent(changelogPath, JSON.stringify(data.changelog, null, 2));
  if (changelogWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `changelog.json の書き込みに失敗しました: ${changelogWriteResult.error.message}`,
      path: changelogPath,
    });
  }

  // comments.json を保存
  const commentsPath = join(issueDir, 'comments.json');
  const commentsWriteResult = await writeFileContent(commentsPath, JSON.stringify(data.comments, null, 2));
  if (commentsWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `comments.json の書き込みに失敗しました: ${commentsWriteResult.error.message}`,
      path: commentsPath,
    });
  }

  // attachments.json を保存（メタデータのみ）
  const attachmentsPath = join(issueDir, 'attachments.json');
  const attachmentsWriteResult = await writeFileContent(attachmentsPath, JSON.stringify(data.attachments, null, 2));
  if (attachmentsWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `attachments.json の書き込みに失敗しました: ${attachmentsWriteResult.error.message}`,
      path: attachmentsPath,
    });
  }

  return ok({
    directory: issueDir,
    manifest,
  });
};

/**
 * Jira Issue を Markdown 形式にフォーマットする（ファイル保存用）
 *
 * ADF (Atlassian Document Format) を Markdown に変換して保存する。
 * Confluence と同様に構造を保持した Markdown を生成する。
 *
 * @param data 保存データ
 * @param attachmentResults 添付ファイルのダウンロード結果
 * @returns Markdown 文字列
 */
const formatJiraIssueAsMarkdown = (data: JiraSaveData, attachmentResults: readonly AttachmentResult[]): string => {
  // 添付ファイル ID → savedPath のマッピングを生成
  const attachmentPaths: Record<string, string> = {};
  for (const att of attachmentResults) {
    if (att.status === 'success' && att.savedPath !== undefined) {
      attachmentPaths[att.id] = att.savedPath;
    }
  }

  const lines: string[] = [];

  // Title
  lines.push(`# ${data.key}`);
  lines.push('');
  lines.push(`**${data.summary}**`);
  lines.push('');

  // Description - ADF を Markdown に変換
  lines.push('## Description');
  lines.push('');
  if (data.description !== null && data.description !== undefined) {
    const descriptionMarkdown = convertAdfToMarkdown(data.description, attachmentPaths);
    lines.push(descriptionMarkdown || '(No description)');
  } else {
    lines.push('(No description)');
  }
  lines.push('');

  // Attachments
  lines.push('## Attachments');
  lines.push('');
  if (attachmentResults.length === 0) {
    lines.push('No attachments');
  } else {
    for (const att of attachmentResults) {
      const sizeKB = (att.size / 1024).toFixed(1);
      if (att.status === 'success' && att.savedPath !== undefined) {
        // 画像の場合は Markdown 画像参照
        if (att.mimeType.startsWith('image/')) {
          lines.push(`![${att.filename}](${att.savedPath})`);
        } else {
          lines.push(`- [${att.filename}](${att.savedPath}) (${att.mimeType}, ${sizeKB} KB)`);
        }
      } else {
        lines.push(`- **${att.filename}** (${att.mimeType}, ${sizeKB} KB) - ダウンロード失敗`);
      }
    }
  }

  return lines.join('\n');
};

/**
 * Jira コメントを Markdown 形式にフォーマットする（ファイル保存用）
 *
 * @param data 保存データ
 * @param attachmentResults 添付ファイルのダウンロード結果
 * @returns Markdown 文字列
 */
const formatCommentsAsMarkdown = (data: JiraSaveData, attachmentResults: readonly AttachmentResult[]): string => {
  // 添付ファイル ID → savedPath のマッピングを生成
  const attachmentPaths: Record<string, string> = {};
  for (const att of attachmentResults) {
    if (att.status === 'success' && att.savedPath !== undefined) {
      attachmentPaths[att.id] = att.savedPath;
    }
  }

  const lines: string[] = [];

  lines.push(`# ${data.key} - Comments`);
  lines.push('');

  if (data.comments.length === 0) {
    lines.push('No comments');
  } else {
    for (const comment of data.comments) {
      lines.push(`## ${comment.author} (${comment.created})`);
      lines.push('');
      // コメント本文も ADF 形式なので Markdown に変換
      const commentMarkdown = convertAdfToMarkdown(comment.bodyAdf, attachmentPaths);
      lines.push(commentMarkdown || comment.body);
      lines.push('');
    }
  }

  return lines.join('\n');
};

/**
 * Jira 変更履歴を Markdown 形式にフォーマットする（ファイル保存用）
 *
 * @param data 保存データ
 * @returns Markdown 文字列
 */
const formatChangelogAsMarkdown = (data: JiraSaveData): string => {
  const lines: string[] = [];

  lines.push(`# ${data.key} - Changelog`);
  lines.push('');

  if (data.changelog.length === 0) {
    lines.push('No changelog');
  } else {
    for (const entry of data.changelog) {
      lines.push(`## ${entry.author} (${entry.created})`);
      lines.push('');
      for (const item of entry.items) {
        const from = item.fromString ?? '(empty)';
        const to = item.toString ?? '(empty)';
        lines.push(`- **${item.field}**: ${from} → ${to}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
};

/**
 * Confluence ページ用の Manifest を生成する
 *
 * @param data 保存データ
 * @param options 保存オプション
 * @param attachmentResults 添付ファイルのダウンロード結果
 * @returns Manifest オブジェクト
 */
const createConfluenceManifest = (
  data: ConfluenceSaveData,
  options: ConfluenceStorageOptions,
  attachmentResults: readonly AttachmentResult[],
): Manifest => {
  return {
    attachments: [...attachmentResults],
    cliVersion: options.cliVersion,
    fetchedAt: getCurrentTimestamp(),
    issues: [],
    resourceType: 'confluencePage',
    sourceUrl: options.sourceUrl,
    summary: {
      resourceId: data.id,
      success: true,
      title: data.title,
    },
  };
};

/**
 * Confluence ページをディレクトリ構造で保存する
 *
 * 以下のディレクトリ構造で保存する:
 * ```
 * {baseDir}/confluence/{PAGE-ID}/
 * ├── manifest.json          # 取得メタデータ
 * ├── page.json              # ページ全データ（JSON 形式）
 * ├── content.txt            # 本文のプレーンテキスト（最新版）
 * ├── versions.json          # バージョン一覧メタデータ
 * ├── attachments.json       # 添付ファイル一覧メタデータ
 * └── attachments/           # 添付ファイル実体
 *     └── {id}_{filename}
 * ```
 *
 * @param data 保存データ
 * @param options 保存オプション
 * @returns 成功時は Ok(ConfluenceSaveResult)、失敗時は Err(StorageError)
 */
export const saveConfluencePage = async (
  data: ConfluenceSaveData,
  options: ConfluenceStorageOptions,
): Promise<Result<ConfluenceSaveResult, StorageError>> => {
  // 保存先ディレクトリのパスを構築
  const pageDir = join(options.baseDir, 'confluence', data.id);

  // ディレクトリを作成
  const mkdirResult = await ensureDir(pageDir);
  if (mkdirResult.isErr()) {
    return err({
      kind: 'DIRECTORY_CREATE_FAILED',
      message: `ディレクトリの作成に失敗しました: ${mkdirResult.error.message}`,
      path: pageDir,
    });
  }

  // 添付ファイルディレクトリを作成
  const attachmentsDir = join(pageDir, 'attachments');
  const attachmentsDirResult = await ensureDir(attachmentsDir);
  if (attachmentsDirResult.isErr()) {
    return err({
      kind: 'DIRECTORY_CREATE_FAILED',
      message: `attachments ディレクトリの作成に失敗しました: ${attachmentsDirResult.error.message}`,
      path: attachmentsDir,
    });
  }

  // 各添付ファイルをダウンロード
  const attachmentResults: AttachmentResult[] = await Promise.all(
    data.attachments.map(async (att): Promise<AttachmentResult> => {
      // ファイル名を安全な形式に変換（ID_タイトル）
      const safeFilename = `${att.id}_${att.title}`;
      const destPath = join(attachmentsDir, safeFilename);

      const downloadResult = await downloadConfluenceAttachment(att, destPath);

      if (downloadResult.isOk()) {
        return {
          filename: att.title,
          id: att.id,
          mimeType: att.mediaType,
          savedPath: `attachments/${safeFilename}`,
          size: att.fileSize,
          status: 'success',
        };
      }
      return {
        error: downloadResult.error.message,
        filename: att.title,
        id: att.id,
        mimeType: att.mediaType,
        size: att.fileSize,
        status: 'failed',
      };
    }),
  );

  // Manifest を生成
  const manifest = createConfluenceManifest(data, options, attachmentResults);

  // manifest.json を保存
  const manifestPath = join(pageDir, 'manifest.json');
  const manifestWriteResult = await writeFileContent(manifestPath, JSON.stringify(manifest, null, 2));
  if (manifestWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `manifest.json の書き込みに失敗しました: ${manifestWriteResult.error.message}`,
      path: manifestPath,
    });
  }

  // page.json を保存（ページ全データ）
  const pageData = {
    attachments: data.attachments,
    body: data.body,
    currentVersion: data.currentVersion,
    id: data.id,
    spaceKey: data.spaceKey,
    title: data.title,
    versions: data.versions,
  };
  const pagePath = join(pageDir, 'page.json');
  const pageWriteResult = await writeFileContent(pagePath, JSON.stringify(pageData, null, 2));
  if (pageWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `page.json の書き込みに失敗しました: ${pageWriteResult.error.message}`,
      path: pagePath,
    });
  }

  // content.txt を保存（プレーンテキスト）
  const contentPath = join(pageDir, 'content.txt');
  const contentWriteResult = await writeFileContent(contentPath, data.bodyPlainText);
  if (contentWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `content.txt の書き込みに失敗しました: ${contentWriteResult.error.message}`,
      path: contentPath,
    });
  }

  // content.md を保存（Markdown 形式）
  const markdownContent = formatConfluencePageAsMarkdown(data, attachmentResults);
  const markdownPath = join(pageDir, 'content.md');
  const markdownWriteResult = await writeFileContent(markdownPath, markdownContent);
  if (markdownWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `content.md の書き込みに失敗しました: ${markdownWriteResult.error.message}`,
      path: markdownPath,
    });
  }

  // versions.json を保存
  const versionsPath = join(pageDir, 'versions.json');
  const versionsWriteResult = await writeFileContent(versionsPath, JSON.stringify(data.versions, null, 2));
  if (versionsWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `versions.json の書き込みに失敗しました: ${versionsWriteResult.error.message}`,
      path: versionsPath,
    });
  }

  // attachments.json を保存（メタデータのみ）
  const attachmentsPath = join(pageDir, 'attachments.json');
  const attachmentsWriteResult = await writeFileContent(attachmentsPath, JSON.stringify(data.attachments, null, 2));
  if (attachmentsWriteResult.isErr()) {
    return err({
      kind: 'FILE_WRITE_FAILED',
      message: `attachments.json の書き込みに失敗しました: ${attachmentsWriteResult.error.message}`,
      path: attachmentsPath,
    });
  }

  return ok({
    directory: pageDir,
    manifest,
  });
};

/**
 * HTML タグを除去してプレーンテキストに変換する
 *
 * @param html HTML 文字列
 * @returns プレーンテキスト
 */
const stripHtmlTags = (html: string): string => {
  // HTML タグを除去
  let text = html.replace(/<[^>]*>/g, ' ');
  // HTML エンティティをデコード
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // 連続する空白を単一スペースに
  text = text.replace(/\s+/g, ' ');
  // 前後の空白を除去
  text = text.trim();
  return text;
};

/**
 * Confluence ページを Markdown 形式にフォーマットする（ファイル保存用）
 *
 * content.md は本文（body）のみを Markdown 形式で保存する。
 * メタデータ、Version History、Attachments は含めない。
 *
 * @param data 保存データ
 * @param attachmentResults 添付ファイルのダウンロード結果
 * @returns Markdown 文字列
 */
const formatConfluencePageAsMarkdown = (
  data: ConfluenceSaveData,
  attachmentResults: readonly AttachmentResult[],
): string => {
  // 添付ファイルマッピングを生成（filename → savedPath）
  const attachmentPaths: Record<string, string> = {};
  for (const att of attachmentResults) {
    if (att.status === 'success' && att.savedPath !== undefined) {
      attachmentPaths[att.filename] = att.savedPath;
    }
  }

  // HTML → Markdown 変換（本文のみ）
  return convertStorageFormatToMarkdown(data.body, attachmentPaths);
};

/**
 * Confluence バージョンを Markdown 形式にフォーマットする
 *
 * versions/vN/content.md は本文（body）のみを Markdown 形式で保存する。
 * メタデータや差分情報は含めない。
 *
 * @param version バージョン情報
 * @param _diffFormatted 差分テキスト（未使用、互換性のため保持）
 * @returns Markdown 文字列
 */
const formatVersionAsMarkdown = (version: ConfluenceVersion, _diffFormatted: string | undefined): string => {
  // HTML → Markdown 変換（本文のみ）
  // バージョンには添付ファイルマッピングがないため空のオブジェクトを渡す
  return convertStorageFormatToMarkdown(version.body, {});
};

/**
 * Confluence ページの各バージョンをディレクトリ構造で保存する
 *
 * 以下のディレクトリ構造で保存する:
 * ```
 * {pageDir}/versions/
 * ├── v1/
 * │   ├── content.json   # v1 の全データ
 * │   └── content.txt    # v1 のプレーンテキスト
 * ├── v2/
 * │   ├── content.json   # v2 の全データ
 * │   ├── content.txt    # v2 のプレーンテキスト
 * │   ├── diff.txt       # v1 → v2 の差分（unified diff形式）
 * │   └── diff.json      # v1 → v2 の差分メタデータ
 * └── v3/
 *     ├── content.json
 *     ├── content.txt
 *     ├── diff.txt       # v2 → v3 の差分
 *     └── diff.json
 * ```
 *
 * @param versions バージョン配列（バージョン番号順にソートされていることを期待）
 * @param pageDir 保存先のページディレクトリ
 * @returns 成功時は Ok(void)、失敗時は Err(StorageError)
 */
export const saveConfluenceVersions = async (
  versions: readonly ConfluenceVersion[],
  pageDir: string,
): Promise<Result<void, StorageError>> => {
  // 空配列の場合は何もしない
  if (versions.length === 0) {
    return ok(undefined);
  }

  // versions ディレクトリを作成
  const versionsDir = join(pageDir, 'versions');
  const mkdirResult = await ensureDir(versionsDir);
  if (mkdirResult.isErr()) {
    return err({
      kind: 'DIRECTORY_CREATE_FAILED',
      message: `versions ディレクトリの作成に失敗しました: ${mkdirResult.error.message}`,
      path: versionsDir,
    });
  }

  // バージョン番号順にソート
  const sortedVersions = [...versions].sort((a, b) => a.number - b.number);

  // 各バージョンを保存
  for (let i = 0; i < sortedVersions.length; i++) {
    const version = sortedVersions[i];
    if (version === undefined) {
      continue;
    }

    const versionDir = join(versionsDir, `v${version.number}`);

    // バージョンディレクトリを作成
    const versionMkdirResult = await ensureDir(versionDir);
    if (versionMkdirResult.isErr()) {
      return err({
        kind: 'DIRECTORY_CREATE_FAILED',
        message: `v${version.number} ディレクトリの作成に失敗しました: ${versionMkdirResult.error.message}`,
        path: versionDir,
      });
    }

    // content.json を保存
    const contentJsonPath = join(versionDir, 'content.json');
    const contentJsonData = {
      body: version.body ?? '',
      by: version.by,
      message: version.message,
      number: version.number,
      when: version.when,
    };
    const contentJsonResult = await writeFileContent(contentJsonPath, JSON.stringify(contentJsonData, null, 2));
    if (contentJsonResult.isErr()) {
      return err({
        kind: 'FILE_WRITE_FAILED',
        message: `content.json の書き込みに失敗しました: ${contentJsonResult.error.message}`,
        path: contentJsonPath,
      });
    }

    // content.txt を保存（HTML をプレーンテキストに変換）
    const contentTxtPath = join(versionDir, 'content.txt');
    const bodyText = version.body !== undefined ? stripHtmlTags(version.body) : '';
    const contentTxtResult = await writeFileContent(contentTxtPath, bodyText);
    if (contentTxtResult.isErr()) {
      return err({
        kind: 'FILE_WRITE_FAILED',
        message: `content.txt の書き込みに失敗しました: ${contentTxtResult.error.message}`,
        path: contentTxtPath,
      });
    }

    // v2 以降は差分を生成
    let diffFormatted: string | undefined;
    if (i > 0) {
      const prevVersion = sortedVersions[i - 1];
      if (prevVersion !== undefined) {
        const prevBody = prevVersion.body ?? '';
        const currentBody = version.body ?? '';

        // 差分を計算
        const diffResult = diffText(prevBody, currentBody, { colorEnabled: false });
        diffFormatted = diffResult.formatted || '(変更なし)';

        // diff.txt を保存
        const diffTxtPath = join(versionDir, 'diff.txt');
        const diffTxtWriteResult = await writeFileContent(diffTxtPath, diffFormatted);
        if (diffTxtWriteResult.isErr()) {
          return err({
            kind: 'FILE_WRITE_FAILED',
            message: `diff.txt の書き込みに失敗しました: ${diffTxtWriteResult.error.message}`,
            path: diffTxtPath,
          });
        }

        // diff.json を保存
        const diffJsonPath = join(versionDir, 'diff.json');
        const versionDiff: VersionDiff = {
          fromVersion: prevVersion.number,
          generatedAt: getCurrentTimestamp(),
          hunks: diffResult.hunks as readonly DiffHunk[],
          stats: diffResult.stats,
          toVersion: version.number,
        };
        const diffJsonWriteResult = await writeFileContent(diffJsonPath, JSON.stringify(versionDiff, null, 2));
        if (diffJsonWriteResult.isErr()) {
          return err({
            kind: 'FILE_WRITE_FAILED',
            message: `diff.json の書き込みに失敗しました: ${diffJsonWriteResult.error.message}`,
            path: diffJsonPath,
          });
        }
      }
    }

    // content.md を保存（Markdown 形式、差分含む）
    const versionMarkdownContent = formatVersionAsMarkdown(version, diffFormatted);
    const versionMarkdownPath = join(versionDir, 'content.md');
    const versionMarkdownResult = await writeFileContent(versionMarkdownPath, versionMarkdownContent);
    if (versionMarkdownResult.isErr()) {
      return err({
        kind: 'FILE_WRITE_FAILED',
        message: `content.md の書き込みに失敗しました: ${versionMarkdownResult.error.message}`,
        path: versionMarkdownPath,
      });
    }
  }

  return ok(undefined);
};

// In-source testing for private functions
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe('stripHtmlTags (in-source testing)', () => {
    describe('HTML タグの除去', () => {
      // テストの目的: HTML タグが正しく除去されること
      it('Given: 単純な HTML タグ, When: stripHtmlTags を呼び出す, Then: タグが除去される', () => {
        expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
      });

      // テストの目的: 複数の HTML タグが正しく除去されること
      it('Given: 複数の HTML タグ, When: stripHtmlTags を呼び出す, Then: すべてのタグが除去される', () => {
        expect(stripHtmlTags('<h1>Title</h1><p>Body</p>')).toBe('Title Body');
      });

      // テストの目的: ネストした HTML タグが正しく除去されること
      it('Given: ネストした HTML タグ, When: stripHtmlTags を呼び出す, Then: すべてのタグが除去される', () => {
        expect(stripHtmlTags('<div><p><strong>Bold</strong> text</p></div>')).toBe('Bold text');
      });
    });

    describe('HTML エンティティのデコード', () => {
      // テストの目的: &nbsp; が半角スペースに変換されること
      it('Given: &nbsp; エンティティ, When: stripHtmlTags を呼び出す, Then: 半角スペースに変換される', () => {
        expect(stripHtmlTags('Hello&nbsp;World')).toBe('Hello World');
      });

      // テストの目的: &amp; がアンパサンドに変換されること
      it('Given: &amp; エンティティ, When: stripHtmlTags を呼び出す, Then: & に変換される', () => {
        expect(stripHtmlTags('A &amp; B')).toBe('A & B');
      });

      // テストの目的: &lt; が < に変換されること
      it('Given: &lt; エンティティ, When: stripHtmlTags を呼び出す, Then: < に変換される', () => {
        expect(stripHtmlTags('1 &lt; 2')).toBe('1 < 2');
      });

      // テストの目的: &gt; が > に変換されること
      it('Given: &gt; エンティティ, When: stripHtmlTags を呼び出す, Then: > に変換される', () => {
        expect(stripHtmlTags('2 &gt; 1')).toBe('2 > 1');
      });

      // テストの目的: &quot; がダブルクォートに変換されること
      it('Given: &quot; エンティティ, When: stripHtmlTags を呼び出す, Then: " に変換される', () => {
        expect(stripHtmlTags('Say &quot;Hello&quot;')).toBe('Say "Hello"');
      });

      // テストの目的: &#39; がシングルクォートに変換されること
      it("Given: &#39; エンティティ, When: stripHtmlTags を呼び出す, Then: ' に変換される", () => {
        expect(stripHtmlTags('It&#39;s fine')).toBe("It's fine");
      });

      // テストの目的: 複数の HTML エンティティが正しく変換されること
      it('Given: 複数の HTML エンティティ, When: stripHtmlTags を呼び出す, Then: すべて正しく変換される', () => {
        expect(stripHtmlTags('&lt;div&gt; &amp; &quot;test&quot;')).toBe('<div> & "test"');
      });
    });

    describe('連続空白の正規化', () => {
      // テストの目的: 連続する空白が単一スペースに正規化されること
      it('Given: 連続する空白, When: stripHtmlTags を呼び出す, Then: 単一スペースに正規化される', () => {
        expect(stripHtmlTags('Hello    World')).toBe('Hello World');
      });

      // テストの目的: 改行が空白に変換されること
      it('Given: 改行を含む文字列, When: stripHtmlTags を呼び出す, Then: 単一スペースに正規化される', () => {
        expect(stripHtmlTags('Hello\n\nWorld')).toBe('Hello World');
      });

      // テストの目的: タブが空白に変換されること
      it('Given: タブを含む文字列, When: stripHtmlTags を呼び出す, Then: 単一スペースに正規化される', () => {
        expect(stripHtmlTags('Hello\t\tWorld')).toBe('Hello World');
      });
    });

    describe('前後空白の除去', () => {
      // テストの目的: 先頭の空白が除去されること
      it('Given: 先頭に空白がある文字列, When: stripHtmlTags を呼び出す, Then: 先頭の空白が除去される', () => {
        expect(stripHtmlTags('  Hello')).toBe('Hello');
      });

      // テストの目的: 末尾の空白が除去されること
      it('Given: 末尾に空白がある文字列, When: stripHtmlTags を呼び出す, Then: 末尾の空白が除去される', () => {
        expect(stripHtmlTags('Hello  ')).toBe('Hello');
      });

      // テストの目的: 前後の空白が除去されること
      it('Given: 前後に空白がある文字列, When: stripHtmlTags を呼び出す, Then: 前後の空白が除去される', () => {
        expect(stripHtmlTags('  Hello  ')).toBe('Hello');
      });

      // テストの目的: 改行を含む前後の空白が除去されること
      it('Given: 改行を含む前後の空白, When: stripHtmlTags を呼び出す, Then: 前後の空白が除去される', () => {
        expect(stripHtmlTags('\n\nHello\n\n')).toBe('Hello');
      });
    });

    describe('エッジケース', () => {
      // テストの目的: 空文字列を正しく処理すること
      it('Given: 空文字列, When: stripHtmlTags を呼び出す, Then: 空文字列を返す', () => {
        expect(stripHtmlTags('')).toBe('');
      });

      // テストの目的: 空白のみの文字列を正しく処理すること
      it('Given: 空白のみの文字列, When: stripHtmlTags を呼び出す, Then: 空文字列を返す', () => {
        expect(stripHtmlTags('   ')).toBe('');
      });

      // テストの目的: タグのみの文字列を正しく処理すること
      it('Given: タグのみの文字列, When: stripHtmlTags を呼び出す, Then: 空文字列を返す', () => {
        expect(stripHtmlTags('<p></p><div></div>')).toBe('');
      });

      // テストの目的: 複雑な HTML を正しく処理すること
      it('Given: 複雑な HTML, When: stripHtmlTags を呼び出す, Then: プレーンテキストに変換される', () => {
        const html = '<div class="container"><h1>Title</h1><p>Hello &amp; <strong>World</strong>!</p></div>';
        expect(stripHtmlTags(html)).toBe('Title Hello & World !');
      });
    });
  });

  describe('formatCommentsAsMarkdown (in-source testing)', () => {
    // テストの目的: コメントがない場合に "No comments" が出力されること
    it('Given: コメントがない JiraSaveData, When: formatCommentsAsMarkdown を呼び出す, Then: "No comments" が出力される', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-001',
        summary: 'テスト',
      };
      const result = formatCommentsAsMarkdown(data, []);

      expect(result).toContain('# TEST-001 - Comments');
      expect(result).toContain('No comments');
    });

    // テストの目的: コメントが正しくフォーマットされること
    it('Given: コメントを含む JiraSaveData, When: formatCommentsAsMarkdown を呼び出す, Then: コメントが Markdown 形式でフォーマットされる', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [
          {
            author: 'TestUser',
            body: 'テストコメント',
            bodyAdf: null, // bodyAdf が null の場合は body が使用される
            created: '2024-01-15T10:30:00.000Z',
            id: 'cmt-1',
            updated: '2024-01-15T10:30:00.000Z',
          },
        ],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-002',
        summary: 'テスト',
      };
      const result = formatCommentsAsMarkdown(data, []);

      expect(result).toContain('# TEST-002 - Comments');
      expect(result).toContain('## TestUser');
      expect(result).toContain('2024-01-15T10:30:00.000Z');
      expect(result).toContain('テストコメント');
    });

    // テストの目的: 複数のコメントが正しくフォーマットされること
    it('Given: 複数のコメントを含む JiraSaveData, When: formatCommentsAsMarkdown を呼び出す, Then: すべてのコメントが Markdown 形式でフォーマットされる', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [
          {
            author: 'User1',
            body: 'コメント1',
            bodyAdf: null,
            created: '2024-01-15T10:00:00.000Z',
            id: 'cmt-1',
            updated: '2024-01-15T10:00:00.000Z',
          },
          {
            author: 'User2',
            body: 'コメント2',
            bodyAdf: null,
            created: '2024-01-16T11:00:00.000Z',
            id: 'cmt-2',
            updated: '2024-01-16T11:00:00.000Z',
          },
        ],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-003',
        summary: 'テスト',
      };
      const result = formatCommentsAsMarkdown(data, []);

      expect(result).toContain('## User1');
      expect(result).toContain('## User2');
      expect(result).toContain('コメント1');
      expect(result).toContain('コメント2');
    });
  });

  describe('formatChangelogAsMarkdown (in-source testing)', () => {
    // テストの目的: 変更履歴がない場合に "No changelog" が出力されること
    it('Given: 変更履歴がない JiraSaveData, When: formatChangelogAsMarkdown を呼び出す, Then: "No changelog" が出力される', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-001',
        summary: 'テスト',
      };
      const result = formatChangelogAsMarkdown(data);

      expect(result).toContain('# TEST-001 - Changelog');
      expect(result).toContain('No changelog');
    });

    // テストの目的: 変更履歴が正しくフォーマットされること
    it('Given: 変更履歴を含む JiraSaveData, When: formatChangelogAsMarkdown を呼び出す, Then: 変更履歴が Markdown 形式でフォーマットされる', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [
          {
            author: 'ChangeUser',
            created: '2024-01-15T10:00:00.000Z',
            id: 'cl-1',
            items: [{ field: 'status', fromString: 'Open', toString: 'In Progress' }],
          },
        ],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-002',
        summary: 'テスト',
      };
      const result = formatChangelogAsMarkdown(data);

      expect(result).toContain('# TEST-002 - Changelog');
      expect(result).toContain('## ChangeUser');
      expect(result).toContain('2024-01-15T10:00:00.000Z');
      expect(result).toContain('**status**');
      expect(result).toContain('Open');
      expect(result).toContain('In Progress');
    });

    // テストの目的: null 値が (empty) として表示されること
    it('Given: fromString が null の変更履歴, When: formatChangelogAsMarkdown を呼び出す, Then: (empty) が表示される', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [
          {
            author: 'ChangeUser',
            created: '2024-01-15T10:00:00.000Z',
            id: 'cl-1',
            items: [{ field: 'assignee', fromString: null, toString: 'Developer' }],
          },
        ],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-003',
        summary: 'テスト',
      };
      const result = formatChangelogAsMarkdown(data);

      expect(result).toContain('(empty)');
      expect(result).toContain('Developer');
    });

    // テストの目的: toString が null の場合も (empty) として表示されること
    it('Given: toString が null の変更履歴, When: formatChangelogAsMarkdown を呼び出す, Then: (empty) が表示される', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [
          {
            author: 'ChangeUser',
            created: '2024-01-15T10:00:00.000Z',
            id: 'cl-1',
            items: [{ field: 'assignee', fromString: 'Developer', toString: null }],
          },
        ],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-004',
        summary: 'テスト',
      };
      const result = formatChangelogAsMarkdown(data);

      expect(result).toContain('Developer');
      expect(result).toContain('(empty)');
    });

    // テストの目的: 複数の変更項目が正しくフォーマットされること
    it('Given: 複数の変更項目を含む変更履歴, When: formatChangelogAsMarkdown を呼び出す, Then: すべての項目が Markdown 形式でフォーマットされる', () => {
      const data: JiraSaveData = {
        attachments: [],
        changelog: [
          {
            author: 'ChangeUser',
            created: '2024-01-15T10:00:00.000Z',
            id: 'cl-1',
            items: [
              { field: 'status', fromString: 'Open', toString: 'In Progress' },
              { field: 'priority', fromString: 'Low', toString: 'High' },
            ],
          },
        ],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-005',
        summary: 'テスト',
      };
      const result = formatChangelogAsMarkdown(data);

      expect(result).toContain('**status**');
      expect(result).toContain('**priority**');
      expect(result).toContain('Open');
      expect(result).toContain('In Progress');
      expect(result).toContain('Low');
      expect(result).toContain('High');
    });
  });
}
