/**
 * ストレージサービスのテスト
 *
 * Jira Issue / Confluence ページをディレクトリ構造で保存する機能のテスト。
 * Given When Then パターンに沿って記述する。
 */

import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_CLI_VERSION } from '../../../tests/helpers/version.js';
import * as filePort from '../../ports/file/file-port.js';
import type { ConfluenceAttachment, ConfluenceVersion } from '../../types/confluence.js';
import type { JiraAttachment, JiraChangelogEntry, JiraComment } from '../../types/jira.js';
import type {
  ConfluenceSaveData,
  ConfluenceStorageOptions,
  JiraSaveData,
  JiraStorageOptions,
} from '../../types/storage.js';
import { saveConfluencePage, saveConfluenceVersions, saveJiraIssue } from './storage-service.js';

describe('saveJiraIssue', () => {
  let testDir: string;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    testDir = join(tmpdir(), `atl-fetch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト後にディレクトリをクリーンアップ
    await rm(testDir, { force: true, recursive: true });
  });

  describe('ディレクトリ構造の生成', () => {
    // テストの目的: Jira Issue を保存すると jira/{ISSUE-KEY}/ 構造でディレクトリが作成されること
    it('Given: 有効な Jira Issue データ, When: saveJiraIssue を呼び出す, Then: jira/{ISSUE-KEY}/ ディレクトリが作成される', async () => {
      // Given: 有効な Jira Issue データ
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'これはテスト用の説明です',
        descriptionPlainText: 'これはテスト用の説明です',
        key: 'TEST-123',
        summary: 'テスト Issue',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-123',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: jira/{ISSUE-KEY}/ ディレクトリが作成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.directory).toBe(join(testDir, 'jira', 'TEST-123'));
      }
    });
  });

  describe('manifest.json の生成', () => {
    // テストの目的: manifest.json が正しいフォーマットで生成されること
    it('Given: 有効な Jira Issue データ, When: saveJiraIssue を呼び出す, Then: manifest.json が生成される', async () => {
      // Given: 有効な Jira Issue データ
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-456',
        summary: 'マニフェストテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: '2.0.0',
        sourceUrl: 'https://example.atlassian.net/browse/TEST-456',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: manifest.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifestPath = join(result.value.directory, 'manifest.json');
        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        expect(manifest.resourceType).toBe('jiraIssue');
        expect(manifest.sourceUrl).toBe('https://example.atlassian.net/browse/TEST-456');
        expect(manifest.cliVersion).toBe('2.0.0');
        expect(manifest.summary.success).toBe(true);
        expect(manifest.summary.resourceId).toBe('TEST-456');
        expect(manifest.summary.title).toBe('マニフェストテスト');
        expect(manifest.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

  describe('issue.json の生成', () => {
    // テストの目的: Issue 全データが JSON 形式で保存されること
    it('Given: コメントと変更履歴を含む Issue データ, When: saveJiraIssue を呼び出す, Then: issue.json に全データが保存される', async () => {
      // Given: コメントと変更履歴を含む Issue データ
      const comments: JiraComment[] = [
        {
          author: 'テストユーザー',
          body: 'これはコメントです',
          bodyAdf: {
            content: [{ content: [{ text: 'これはコメントです', type: 'text' }], type: 'paragraph' }],
            type: 'doc',
            version: 1,
          },
          created: '2024-01-01T12:00:00.000Z',
          id: 'comment-1',
          updated: '2024-01-01T12:00:00.000Z',
        },
      ];
      const changelog: JiraChangelogEntry[] = [
        {
          author: '変更者',
          created: '2024-01-02T10:00:00.000Z',
          id: 'changelog-1',
          items: [
            {
              field: 'status',
              fromString: 'Open',
              toString: 'In Progress',
            },
          ],
        },
      ];
      const data: JiraSaveData = {
        attachments: [],
        changelog,
        comments,
        description: '<p>HTML description</p>',
        descriptionPlainText: 'HTML description',
        key: 'TEST-789',
        summary: 'フルデータテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-789',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: issue.json に全データが保存される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const issuePath = join(result.value.directory, 'issue.json');
        const issueContent = await readFile(issuePath, 'utf-8');
        const issue = JSON.parse(issueContent);

        expect(issue.key).toBe('TEST-789');
        expect(issue.summary).toBe('フルデータテスト');
        expect(issue.description).toBe('<p>HTML description</p>');
        expect(issue.comments).toHaveLength(1);
        expect(issue.comments[0].body).toBe('これはコメントです');
        expect(issue.changelog).toHaveLength(1);
        expect(issue.changelog[0].items[0].field).toBe('status');
      }
    });
  });

  describe('description.txt の生成', () => {
    // テストの目的: 説明文がプレーンテキストとして保存されること
    it('Given: 説明文を含む Issue データ, When: saveJiraIssue を呼び出す, Then: description.txt が生成される', async () => {
      // Given: 説明文を含む Issue データ
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: '<p>これは<strong>リッチ</strong>テキストです</p>',
        descriptionPlainText: 'これはリッチテキストです',
        key: 'TEST-DESC',
        summary: '説明テスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-DESC',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: description.txt が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const descPath = join(result.value.directory, 'description.txt');
        const descContent = await readFile(descPath, 'utf-8');

        expect(descContent).toBe('これはリッチテキストです');
      }
    });

    // テストの目的: 説明文が null の場合は空ファイルが生成されること
    it('Given: 説明文が null の Issue データ, When: saveJiraIssue を呼び出す, Then: description.txt は空ファイル', async () => {
      // Given: 説明文が null の Issue データ
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-NODESC',
        summary: '説明なしテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-NODESC',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: description.txt は空ファイル
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const descPath = join(result.value.directory, 'description.txt');
        const descContent = await readFile(descPath, 'utf-8');

        expect(descContent).toBe('');
      }
    });
  });

  describe('changelog.json の生成', () => {
    // テストの目的: 変更履歴が changelog.json として保存されること
    it('Given: 変更履歴を含む Issue データ, When: saveJiraIssue を呼び出す, Then: changelog.json が生成される', async () => {
      // Given: 変更履歴を含む Issue データ
      const changelog: JiraChangelogEntry[] = [
        {
          author: 'Author1',
          created: '2024-01-01T00:00:00.000Z',
          id: 'cl-1',
          items: [
            { field: 'priority', fromString: 'Low', toString: 'High' },
            { field: 'assignee', fromString: null, toString: 'Developer' },
          ],
        },
        {
          author: 'Author2',
          created: '2024-01-02T00:00:00.000Z',
          id: 'cl-2',
          items: [{ field: 'status', fromString: 'Open', toString: 'Done' }],
        },
      ];
      const data: JiraSaveData = {
        attachments: [],
        changelog,
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-CL',
        summary: '変更履歴テスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-CL',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: changelog.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const clPath = join(result.value.directory, 'changelog.json');
        const clContent = await readFile(clPath, 'utf-8');
        const clData = JSON.parse(clContent);

        expect(clData).toHaveLength(2);
        expect(clData[0].id).toBe('cl-1');
        expect(clData[0].items).toHaveLength(2);
        expect(clData[1].items[0].toString).toBe('Done');
      }
    });
  });

  describe('comments.json の生成', () => {
    // テストの目的: コメント一覧が comments.json として保存されること
    it('Given: コメントを含む Issue データ, When: saveJiraIssue を呼び出す, Then: comments.json が生成される', async () => {
      // Given: コメントを含む Issue データ
      const comments: JiraComment[] = [
        {
          author: 'Commenter1',
          body: '最初のコメント',
          bodyAdf: {
            content: [{ content: [{ text: '最初のコメント', type: 'text' }], type: 'paragraph' }],
            type: 'doc',
            version: 1,
          },
          created: '2024-01-01T10:00:00.000Z',
          id: 'c-1',
          updated: '2024-01-01T10:00:00.000Z',
        },
        {
          author: 'Commenter2',
          body: '返信コメント',
          bodyAdf: {
            content: [{ content: [{ text: '返信コメント', type: 'text' }], type: 'paragraph' }],
            type: 'doc',
            version: 1,
          },
          created: '2024-01-01T11:00:00.000Z',
          id: 'c-2',
          updated: '2024-01-01T12:00:00.000Z',
        },
      ];
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments,
        description: null,
        descriptionPlainText: null,
        key: 'TEST-CMT',
        summary: 'コメントテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-CMT',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: comments.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const cmtPath = join(result.value.directory, 'comments.json');
        const cmtContent = await readFile(cmtPath, 'utf-8');
        const cmtData = JSON.parse(cmtContent);

        expect(cmtData).toHaveLength(2);
        expect(cmtData[0].body).toBe('最初のコメント');
        expect(cmtData[1].author).toBe('Commenter2');
      }
    });
  });

  describe('attachments.json の生成', () => {
    // テストの目的: 添付ファイル一覧メタデータが attachments.json として保存されること
    it('Given: 添付ファイルを含む Issue データ, When: saveJiraIssue を呼び出す, Then: attachments.json が生成される', async () => {
      // Given: 添付ファイルを含む Issue データ
      const attachments: JiraAttachment[] = [
        {
          contentUrl: 'https://example.atlassian.net/secure/attachment/10001/image.png',
          filename: 'image.png',
          id: 'att-1',
          mimeType: 'image/png',
          size: 1024,
        },
        {
          contentUrl: 'https://example.atlassian.net/secure/attachment/10002/document.pdf',
          filename: 'document.pdf',
          id: 'att-2',
          mimeType: 'application/pdf',
          size: 2048,
        },
      ];
      const data: JiraSaveData = {
        attachments,
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ATT',
        summary: '添付ファイルテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ATT',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: attachments.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const attPath = join(result.value.directory, 'attachments.json');
        const attContent = await readFile(attPath, 'utf-8');
        const attData = JSON.parse(attContent);

        expect(attData).toHaveLength(2);
        expect(attData[0].filename).toBe('image.png');
        expect(attData[0].mimeType).toBe('image/png');
        expect(attData[0].size).toBe(1024);
        expect(attData[1].filename).toBe('document.pdf');
      }
    });
  });

  describe('comments.md の生成', () => {
    // テストの目的: コメント一覧が Markdown 形式で保存されること
    it('Given: コメントを含む Issue データ, When: saveJiraIssue を呼び出す, Then: comments.md が生成される', async () => {
      // Given: コメントを含む Issue データ
      const comments: JiraComment[] = [
        {
          author: 'CommentAuthor1',
          body: 'これは最初のコメントです',
          bodyAdf: {
            content: [{ content: [{ text: 'これは最初のコメントです', type: 'text' }], type: 'paragraph' }],
            type: 'doc',
            version: 1,
          },
          created: '2024-01-15T10:30:00.000Z',
          id: 'cmt-1',
          updated: '2024-01-15T10:30:00.000Z',
        },
        {
          author: 'CommentAuthor2',
          body: '返信です',
          bodyAdf: {
            content: [{ content: [{ text: '返信です', type: 'text' }], type: 'paragraph' }],
            type: 'doc',
            version: 1,
          },
          created: '2024-01-16T14:20:00.000Z',
          id: 'cmt-2',
          updated: '2024-01-16T14:20:00.000Z',
        },
      ];
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments,
        description: null,
        descriptionPlainText: null,
        key: 'TEST-CMT-MD',
        summary: 'コメント Markdown テスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-CMT-MD',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: comments.md が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const commentsPath = join(result.value.directory, 'comments.md');
        const commentsContent = await readFile(commentsPath, 'utf-8');

        // タイトルが含まれること
        expect(commentsContent).toContain('# TEST-CMT-MD - Comments');
        // コメント作成者が含まれること
        expect(commentsContent).toContain('CommentAuthor1');
        expect(commentsContent).toContain('CommentAuthor2');
        // コメント本文が含まれること
        expect(commentsContent).toContain('これは最初のコメントです');
        expect(commentsContent).toContain('返信です');
      }
    });

    // テストの目的: コメントがない場合は "No comments" が出力されること
    it('Given: コメントがない Issue データ, When: saveJiraIssue を呼び出す, Then: comments.md に "No comments" が出力される', async () => {
      // Given: コメントがない Issue データ
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-NO-CMT',
        summary: 'コメントなしテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-NO-CMT',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: comments.md に "No comments" が出力される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const commentsPath = join(result.value.directory, 'comments.md');
        const commentsContent = await readFile(commentsPath, 'utf-8');

        expect(commentsContent).toContain('No comments');
      }
    });
  });

  describe('changelog.md の生成', () => {
    // テストの目的: 変更履歴が Markdown 形式で保存されること
    it('Given: 変更履歴を含む Issue データ, When: saveJiraIssue を呼び出す, Then: changelog.md が生成される', async () => {
      // Given: 変更履歴を含む Issue データ
      const changelog: JiraChangelogEntry[] = [
        {
          author: 'ChangeAuthor1',
          created: '2024-01-15T10:00:00.000Z',
          id: 'cl-1',
          items: [
            { field: 'status', fromString: 'Open', toString: 'In Progress' },
            { field: 'assignee', fromString: null, toString: 'Developer' },
          ],
        },
        {
          author: 'ChangeAuthor2',
          created: '2024-01-16T14:00:00.000Z',
          id: 'cl-2',
          items: [{ field: 'priority', fromString: 'Low', toString: 'High' }],
        },
      ];
      const data: JiraSaveData = {
        attachments: [],
        changelog,
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-CL-MD',
        summary: '変更履歴 Markdown テスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-CL-MD',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: changelog.md が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const changelogPath = join(result.value.directory, 'changelog.md');
        const changelogContent = await readFile(changelogPath, 'utf-8');

        // タイトルが含まれること
        expect(changelogContent).toContain('# TEST-CL-MD - Changelog');
        // 変更者が含まれること
        expect(changelogContent).toContain('ChangeAuthor1');
        expect(changelogContent).toContain('ChangeAuthor2');
        // 変更フィールドが含まれること
        expect(changelogContent).toContain('status');
        expect(changelogContent).toContain('Open');
        expect(changelogContent).toContain('In Progress');
        // null 値が (empty) として表示されること
        expect(changelogContent).toContain('(empty)');
        expect(changelogContent).toContain('Developer');
      }
    });

    // テストの目的: 変更履歴がない場合は "No changelog" が出力されること
    it('Given: 変更履歴がない Issue データ, When: saveJiraIssue を呼び出す, Then: changelog.md に "No changelog" が出力される', async () => {
      // Given: 変更履歴がない Issue データ
      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-NO-CL',
        summary: '変更履歴なしテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-NO-CL',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: changelog.md に "No changelog" が出力される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const changelogPath = join(result.value.directory, 'changelog.md');
        const changelogContent = await readFile(changelogPath, 'utf-8');

        expect(changelogContent).toContain('No changelog');
      }
    });
  });

  describe('Manifest の attachments フィールド', () => {
    // テストの目的: 添付ファイルのメタデータが manifest に反映されること（ダウンロード試行後のステータス）
    it('Given: 添付ファイルを含む Issue データ, When: saveJiraIssue を呼び出す, Then: manifest.attachments にダウンロード結果が記録される', async () => {
      // Given: 添付ファイルを含む Issue データ（ダウンロードは失敗する想定）
      const attachments: JiraAttachment[] = [
        {
          contentUrl: 'https://example.atlassian.net/secure/attachment/10001/test.txt',
          filename: 'test.txt',
          id: 'att-1',
          mimeType: 'text/plain',
          size: 100,
        },
      ];
      const data: JiraSaveData = {
        attachments,
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-MANI-ATT',
        summary: 'マニフェスト添付テスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-MANI-ATT',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: manifest.attachments にダウンロード結果が記録される（認証なしでは失敗）
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.manifest.attachments).toHaveLength(1);
        expect(result.value.manifest.attachments[0]?.id).toBe('att-1');
        expect(result.value.manifest.attachments[0]?.filename).toBe('test.txt');
        expect(result.value.manifest.attachments[0]?.mimeType).toBe('text/plain');
        expect(result.value.manifest.attachments[0]?.size).toBe(100);
        // ダウンロードは認証なしでは失敗するため、failed ステータスになる
        expect(result.value.manifest.attachments[0]?.status).toBe('failed');
      }
    });
  });

  describe('エラーハンドリング', () => {
    // テストの目的: ディレクトリ作成失敗時に DIRECTORY_CREATE_FAILED エラーを返すこと
    it('Given: ディレクトリ作成が失敗する状況, When: saveJiraIssue を呼び出す, Then: DIRECTORY_CREATE_FAILED エラーを返す', async () => {
      // Given: ディレクトリ作成が失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValueOnce(err({ message: 'Permission denied' }));

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-DIR',
        summary: 'ディレクトリエラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-DIR',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: DIRECTORY_CREATE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('DIRECTORY_CREATE_FAILED');
        expect(result.error.message).toContain('ディレクトリの作成に失敗しました');
        expect(result.error.message).toContain('Permission denied');
        expect(result.error.path).toContain('jira');
        expect(result.error.path).toContain('TEST-ERR-DIR');
      }

      ensureDirSpy.mockRestore();
    });

    // テストの目的: manifest.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: manifest.json 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: manifest.json 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi.spyOn(filePort, 'writeFileContent').mockResolvedValueOnce(err({ message: 'Disk full' }));

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-MANIFEST',
        summary: 'マニフェストエラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-MANIFEST',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('manifest.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Disk full');
        expect(result.error.path).toContain('manifest.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: issue.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: issue.json 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: issue.json 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(err({ message: 'I/O error' })); // issue.json 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-ISSUE',
        summary: 'Issueエラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-ISSUE',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('issue.json の書き込みに失敗しました');
        expect(result.error.message).toContain('I/O error');
        expect(result.error.path).toContain('issue.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: description.txt 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: description.txt 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: description.txt 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // issue.json 成功
        .mockResolvedValueOnce(err({ message: 'File locked' })); // description.txt 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: 'Test description',
        descriptionPlainText: 'Test description',
        key: 'TEST-ERR-DESC',
        summary: '説明エラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-DESC',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('description.txt の書き込みに失敗しました');
        expect(result.error.message).toContain('File locked');
        expect(result.error.path).toContain('description.txt');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: content.md 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: content.md 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: content.md 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // issue.json 成功
        .mockResolvedValueOnce(ok(undefined)) // description.txt 成功
        .mockResolvedValueOnce(err({ message: 'Markdown write failed' })); // content.md 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-CONTENT-MD',
        summary: 'content.md エラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-CONTENT-MD',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('content.md の書き込みに失敗しました');
        expect(result.error.message).toContain('Markdown write failed');
        expect(result.error.path).toContain('content.md');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: comments.md 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: comments.md 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: comments.md 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // issue.json 成功
        .mockResolvedValueOnce(ok(undefined)) // description.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // content.md 成功
        .mockResolvedValueOnce(err({ message: 'Comments write failed' })); // comments.md 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-COMMENTS-MD',
        summary: 'comments.md エラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-COMMENTS-MD',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('comments.md の書き込みに失敗しました');
        expect(result.error.message).toContain('Comments write failed');
        expect(result.error.path).toContain('comments.md');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: changelog.md 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: changelog.md 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: changelog.md 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // issue.json 成功
        .mockResolvedValueOnce(ok(undefined)) // description.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // content.md 成功
        .mockResolvedValueOnce(ok(undefined)) // comments.md 成功
        .mockResolvedValueOnce(err({ message: 'Changelog write failed' })); // changelog.md 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-CHANGELOG-MD',
        summary: 'changelog.md エラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-CHANGELOG-MD',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('changelog.md の書き込みに失敗しました');
        expect(result.error.message).toContain('Changelog write failed');
        expect(result.error.path).toContain('changelog.md');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: changelog.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: changelog.json 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: changelog.json 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // issue.json 成功
        .mockResolvedValueOnce(ok(undefined)) // description.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // content.md 成功
        .mockResolvedValueOnce(ok(undefined)) // comments.md 成功
        .mockResolvedValueOnce(ok(undefined)) // changelog.md 成功
        .mockResolvedValueOnce(err({ message: 'Network error' })); // changelog.json 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-CL',
        summary: '変更履歴エラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-CL',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('changelog.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Network error');
        expect(result.error.path).toContain('changelog.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: comments.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: comments.json 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: comments.json 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // issue.json 成功
        .mockResolvedValueOnce(ok(undefined)) // description.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // content.md 成功
        .mockResolvedValueOnce(ok(undefined)) // comments.md 成功
        .mockResolvedValueOnce(ok(undefined)) // changelog.md 成功
        .mockResolvedValueOnce(ok(undefined)) // changelog.json 成功
        .mockResolvedValueOnce(err({ message: 'Timeout' })); // comments.json 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-CMT',
        summary: 'コメントエラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-CMT',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('comments.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Timeout');
        expect(result.error.path).toContain('comments.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: attachments.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: attachments.json 書き込みが失敗する状況, When: saveJiraIssue を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: attachments.json 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // issueDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // issue.json 成功
        .mockResolvedValueOnce(ok(undefined)) // description.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // content.md 成功
        .mockResolvedValueOnce(ok(undefined)) // comments.md 成功
        .mockResolvedValueOnce(ok(undefined)) // changelog.md 成功
        .mockResolvedValueOnce(ok(undefined)) // changelog.json 成功
        .mockResolvedValueOnce(ok(undefined)) // comments.json 成功
        .mockResolvedValueOnce(err({ message: 'Quota exceeded' })); // attachments.json 失敗

      const data: JiraSaveData = {
        attachments: [],
        changelog: [],
        comments: [],
        description: null,
        descriptionPlainText: null,
        key: 'TEST-ERR-ATT',
        summary: '添付ファイルエラーテスト',
      };
      const options: JiraStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/browse/TEST-ERR-ATT',
      };

      // When: saveJiraIssue を呼び出す
      const result = await saveJiraIssue(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('attachments.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Quota exceeded');
        expect(result.error.path).toContain('attachments.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });
  });
});

describe('saveConfluencePage', () => {
  let testDir: string;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    testDir = join(tmpdir(), `atl-fetch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト後にディレクトリをクリーンアップ
    await rm(testDir, { force: true, recursive: true });
  });

  describe('ディレクトリ構造の生成', () => {
    // テストの目的: Confluence ページを保存すると confluence/{PAGE-ID}/ 構造でディレクトリが作成されること
    it('Given: 有効な Confluence ページデータ, When: saveConfluencePage を呼び出す, Then: confluence/{PAGE-ID}/ ディレクトリが作成される', async () => {
      // Given: 有効な Confluence ページデータ
      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>これはテスト用の本文です</p>',
        bodyPlainText: 'これはテスト用の本文です',
        currentVersion: 1,
        id: '123456',
        spaceKey: 'TEST',
        title: 'テストページ',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/TEST/pages/123456/Test+Page',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: confluence/{PAGE-ID}/ ディレクトリが作成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.directory).toBe(join(testDir, 'confluence', '123456'));
      }
    });
  });

  describe('manifest.json の生成', () => {
    // テストの目的: manifest.json が正しいフォーマットで生成されること
    it('Given: 有効な Confluence ページデータ, When: saveConfluencePage を呼び出す, Then: manifest.json が生成される', async () => {
      // Given: 有効な Confluence ページデータ
      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>マニフェストテスト</p>',
        bodyPlainText: 'マニフェストテスト',
        currentVersion: 3,
        id: '789012',
        spaceKey: 'DEV',
        title: 'マニフェストテストページ',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: '2.0.0',
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/DEV/pages/789012/Manifest+Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: manifest.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifestPath = join(result.value.directory, 'manifest.json');
        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        expect(manifest.resourceType).toBe('confluencePage');
        expect(manifest.sourceUrl).toBe('https://example.atlassian.net/wiki/spaces/DEV/pages/789012/Manifest+Test');
        expect(manifest.cliVersion).toBe('2.0.0');
        expect(manifest.summary.success).toBe(true);
        expect(manifest.summary.resourceId).toBe('789012');
        expect(manifest.summary.title).toBe('マニフェストテストページ');
        expect(manifest.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

  describe('page.json の生成', () => {
    // テストの目的: ページ全データが JSON 形式で保存されること
    it('Given: バージョンを含むページデータ, When: saveConfluencePage を呼び出す, Then: page.json に全データが保存される', async () => {
      // Given: バージョンを含むページデータ
      const versions: ConfluenceVersion[] = [
        {
          body: '<p>初期バージョン</p>',
          by: 'Author1',
          message: '初回作成',
          number: 1,
          when: '2024-01-01T10:00:00.000Z',
        },
        {
          body: '<p>更新バージョン</p>',
          by: 'Author2',
          message: '内容更新',
          number: 2,
          when: '2024-01-02T15:00:00.000Z',
        },
      ];
      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>最新の本文</p>',
        bodyPlainText: '最新の本文',
        currentVersion: 2,
        id: '111222',
        spaceKey: 'PROJ',
        title: 'フルデータテストページ',
        versions,
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/PROJ/pages/111222/Full+Data',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: page.json に全データが保存される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pagePath = join(result.value.directory, 'page.json');
        const pageContent = await readFile(pagePath, 'utf-8');
        const page = JSON.parse(pageContent);

        expect(page.id).toBe('111222');
        expect(page.title).toBe('フルデータテストページ');
        expect(page.body).toBe('<p>最新の本文</p>');
        expect(page.spaceKey).toBe('PROJ');
        expect(page.currentVersion).toBe(2);
        expect(page.versions).toHaveLength(2);
        expect(page.versions[0].number).toBe(1);
        expect(page.versions[1].message).toBe('内容更新');
      }
    });
  });

  describe('content.txt の生成', () => {
    // テストの目的: 本文がプレーンテキストとして保存されること
    it('Given: 本文を含むページデータ, When: saveConfluencePage を呼び出す, Then: content.txt が生成される', async () => {
      // Given: 本文を含むページデータ
      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<h1>見出し</h1><p>これは<strong>重要な</strong>テキストです</p>',
        bodyPlainText: '見出し\nこれは重要なテキストです',
        currentVersion: 1,
        id: '333444',
        spaceKey: 'DOC',
        title: '本文テスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/DOC/pages/333444/Content+Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: content.txt が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const contentPath = join(result.value.directory, 'content.txt');
        const contentText = await readFile(contentPath, 'utf-8');

        expect(contentText).toBe('見出し\nこれは重要なテキストです');
      }
    });
  });

  describe('versions.json の生成', () => {
    // テストの目的: バージョン一覧が versions.json として保存されること
    it('Given: 複数バージョンを含むページデータ, When: saveConfluencePage を呼び出す, Then: versions.json が生成される', async () => {
      // Given: 複数バージョンを含むページデータ
      const versions: ConfluenceVersion[] = [
        {
          by: 'User1',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
        {
          by: 'User2',
          message: '修正',
          number: 2,
          when: '2024-01-02T00:00:00.000Z',
        },
        {
          by: 'User1',
          message: '追記',
          number: 3,
          when: '2024-01-03T00:00:00.000Z',
        },
      ];
      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>最新版</p>',
        bodyPlainText: '最新版',
        currentVersion: 3,
        id: '555666',
        spaceKey: 'VER',
        title: 'バージョンテスト',
        versions,
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/VER/pages/555666/Versions',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: versions.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const versionsPath = join(result.value.directory, 'versions.json');
        const versionsContent = await readFile(versionsPath, 'utf-8');
        const versionsData = JSON.parse(versionsContent);

        expect(versionsData).toHaveLength(3);
        expect(versionsData[0].number).toBe(1);
        expect(versionsData[0].message).toBeNull();
        expect(versionsData[1].by).toBe('User2');
        expect(versionsData[2].message).toBe('追記');
      }
    });
  });

  describe('attachments.json の生成', () => {
    // テストの目的: 添付ファイル一覧メタデータが attachments.json として保存されること
    it('Given: 添付ファイルを含むページデータ, When: saveConfluencePage を呼び出す, Then: attachments.json が生成される', async () => {
      // Given: 添付ファイルを含むページデータ
      const attachments: ConfluenceAttachment[] = [
        {
          downloadUrl: 'https://example.atlassian.net/wiki/download/attachments/777888/diagram.png',
          fileSize: 2048,
          id: 'att-1',
          mediaType: 'image/png',
          title: 'diagram.png',
        },
        {
          downloadUrl: 'https://example.atlassian.net/wiki/download/attachments/777888/spec.pdf',
          fileSize: 10240,
          id: 'att-2',
          mediaType: 'application/pdf',
          title: 'spec.pdf',
        },
      ];
      const data: ConfluenceSaveData = {
        attachments,
        body: '<p>添付ファイル付き</p>',
        bodyPlainText: '添付ファイル付き',
        currentVersion: 1,
        id: '777888',
        spaceKey: 'ATT',
        title: '添付ファイルテスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/ATT/pages/777888/Attachments',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: attachments.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const attPath = join(result.value.directory, 'attachments.json');
        const attContent = await readFile(attPath, 'utf-8');
        const attData = JSON.parse(attContent);

        expect(attData).toHaveLength(2);
        expect(attData[0].title).toBe('diagram.png');
        expect(attData[0].mediaType).toBe('image/png');
        expect(attData[0].fileSize).toBe(2048);
        expect(attData[1].title).toBe('spec.pdf');
      }
    });
  });

  describe('Manifest の attachments フィールド', () => {
    // テストの目的: 添付ファイルのメタデータが manifest に反映されること（ダウンロードは別タスク）
    it('Given: 添付ファイルを含むページデータ, When: saveConfluencePage を呼び出す, Then: manifest.attachments に skipped ステータスで記録される', async () => {
      // Given: 添付ファイルを含むページデータ
      const attachments: ConfluenceAttachment[] = [
        {
          downloadUrl: 'https://example.atlassian.net/wiki/download/attachments/999000/test.txt',
          fileSize: 100,
          id: 'att-1',
          mediaType: 'text/plain',
          title: 'test.txt',
        },
      ];
      const data: ConfluenceSaveData = {
        attachments,
        body: '<p>マニフェスト添付テスト</p>',
        bodyPlainText: 'マニフェスト添付テスト',
        currentVersion: 1,
        id: '999000',
        spaceKey: 'MAN',
        title: 'マニフェスト添付テストページ',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/MAN/pages/999000/Manifest+Att',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: manifest.attachments にダウンロード結果が記録される（認証なしでは失敗）
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.manifest.attachments).toHaveLength(1);
        expect(result.value.manifest.attachments[0]?.id).toBe('att-1');
        expect(result.value.manifest.attachments[0]?.filename).toBe('test.txt');
        expect(result.value.manifest.attachments[0]?.mimeType).toBe('text/plain');
        expect(result.value.manifest.attachments[0]?.size).toBe(100);
        // ダウンロードは認証なしでは失敗するため、failed ステータスになる
        expect(result.value.manifest.attachments[0]?.status).toBe('failed');
      }
    });
  });

  describe('エラーハンドリング', () => {
    // テストの目的: ディレクトリ作成失敗時に DIRECTORY_CREATE_FAILED エラーを返すこと
    it('Given: ディレクトリ作成が失敗する状況, When: saveConfluencePage を呼び出す, Then: DIRECTORY_CREATE_FAILED エラーを返す', async () => {
      // Given: ディレクトリ作成が失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValueOnce(err({ message: 'Permission denied' }));

      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>エラーテスト</p>',
        bodyPlainText: 'エラーテスト',
        currentVersion: 1,
        id: 'ERR-DIR',
        spaceKey: 'ERR',
        title: 'ディレクトリエラーテスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/ERR/pages/ERR-DIR/Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: DIRECTORY_CREATE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('DIRECTORY_CREATE_FAILED');
        expect(result.error.message).toContain('ディレクトリの作成に失敗しました');
        expect(result.error.message).toContain('Permission denied');
        expect(result.error.path).toContain('confluence');
        expect(result.error.path).toContain('ERR-DIR');
      }

      ensureDirSpy.mockRestore();
    });

    // テストの目的: manifest.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: manifest.json 書き込みが失敗する状況, When: saveConfluencePage を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: manifest.json 書き込みが失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValueOnce(ok(undefined));
      const writeFileSpy = vi.spyOn(filePort, 'writeFileContent').mockResolvedValueOnce(err({ message: 'Disk full' }));

      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>マニフェストエラー</p>',
        bodyPlainText: 'マニフェストエラー',
        currentVersion: 1,
        id: 'ERR-MANIFEST',
        spaceKey: 'ERR',
        title: 'マニフェストエラーテスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/ERR/pages/ERR-MANIFEST/Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('manifest.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Disk full');
        expect(result.error.path).toContain('manifest.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: page.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: page.json 書き込みが失敗する状況, When: saveConfluencePage を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: page.json 書き込みが失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValueOnce(ok(undefined));
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(err({ message: 'I/O error' })); // page.json 失敗

      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>ページエラー</p>',
        bodyPlainText: 'ページエラー',
        currentVersion: 1,
        id: 'ERR-PAGE',
        spaceKey: 'ERR',
        title: 'ページエラーテスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/ERR/pages/ERR-PAGE/Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('page.json の書き込みに失敗しました');
        expect(result.error.message).toContain('I/O error');
        expect(result.error.path).toContain('page.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: content.txt 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: content.txt 書き込みが失敗する状況, When: saveConfluencePage を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: content.txt 書き込みが失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValueOnce(ok(undefined));
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // page.json 成功
        .mockResolvedValueOnce(err({ message: 'File locked' })); // content.txt 失敗

      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>コンテンツエラー</p>',
        bodyPlainText: 'コンテンツエラー',
        currentVersion: 1,
        id: 'ERR-CONTENT',
        spaceKey: 'ERR',
        title: 'コンテンツエラーテスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/ERR/pages/ERR-CONTENT/Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('content.txt の書き込みに失敗しました');
        expect(result.error.message).toContain('File locked');
        expect(result.error.path).toContain('content.txt');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: versions.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: versions.json 書き込みが失敗する状況, When: saveConfluencePage を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: versions.json 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // pageDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // page.json 成功
        .mockResolvedValueOnce(ok(undefined)) // content.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // content.md 成功
        .mockResolvedValueOnce(err({ message: 'Network error' })); // versions.json 失敗

      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>バージョンエラー</p>',
        bodyPlainText: 'バージョンエラー',
        currentVersion: 1,
        id: 'ERR-VERSIONS',
        spaceKey: 'ERR',
        title: 'バージョンエラーテスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/ERR/pages/ERR-VERSIONS/Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('versions.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Network error');
        expect(result.error.path).toContain('versions.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: attachments.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: attachments.json 書き込みが失敗する状況, When: saveConfluencePage を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: attachments.json 書き込みが失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // pageDir 成功
        .mockResolvedValueOnce(ok(undefined)); // attachmentsDir 成功
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // manifest.json 成功
        .mockResolvedValueOnce(ok(undefined)) // page.json 成功
        .mockResolvedValueOnce(ok(undefined)) // content.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // content.md 成功
        .mockResolvedValueOnce(ok(undefined)) // versions.json 成功
        .mockResolvedValueOnce(err({ message: 'Quota exceeded' })); // attachments.json 失敗

      const data: ConfluenceSaveData = {
        attachments: [],
        body: '<p>添付ファイルエラー</p>',
        bodyPlainText: '添付ファイルエラー',
        currentVersion: 1,
        id: 'ERR-ATT',
        spaceKey: 'ERR',
        title: '添付ファイルエラーテスト',
        versions: [],
      };
      const options: ConfluenceStorageOptions = {
        baseDir: testDir,
        cliVersion: TEST_CLI_VERSION,
        sourceUrl: 'https://example.atlassian.net/wiki/spaces/ERR/pages/ERR-ATT/Test',
      };

      // When: saveConfluencePage を呼び出す
      const result = await saveConfluencePage(data, options);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('attachments.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Quota exceeded');
        expect(result.error.path).toContain('attachments.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });
  });
});

describe('saveConfluenceVersions', () => {
  let testDir: string;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    testDir = join(tmpdir(), `atl-fetch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト後にディレクトリをクリーンアップ
    await rm(testDir, { force: true, recursive: true });
  });

  describe('バージョン別ディレクトリ構造の生成', () => {
    // テストの目的: 各バージョンが versions/v{N}/ 構造で保存されること
    it('Given: 複数バージョンを含むページデータ, When: saveConfluenceVersions を呼び出す, Then: versions/v{N}/ ディレクトリが作成される', async () => {
      // Given: 複数バージョンを含むページデータ
      const versions: ConfluenceVersion[] = [
        {
          body: '<p>初版の内容</p>',
          by: 'Author1',
          message: '初回作成',
          number: 1,
          when: '2024-01-01T10:00:00.000Z',
        },
        {
          body: '<p>改訂版の内容</p>',
          by: 'Author2',
          message: '内容を更新',
          number: 2,
          when: '2024-01-02T15:00:00.000Z',
        },
        {
          body: '<p>最新版の内容</p>',
          by: 'Author1',
          message: '追加情報',
          number: 3,
          when: '2024-01-03T09:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', '123456');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: versions/v{N}/ ディレクトリが作成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // 各バージョンディレクトリの存在を確認
        const v1Dir = join(pageDir, 'versions', 'v1');
        const v2Dir = join(pageDir, 'versions', 'v2');
        const v3Dir = join(pageDir, 'versions', 'v3');

        const v1Exists = await readFile(join(v1Dir, 'content.json'), 'utf-8')
          .then(() => true)
          .catch(() => false);
        const v2Exists = await readFile(join(v2Dir, 'content.json'), 'utf-8')
          .then(() => true)
          .catch(() => false);
        const v3Exists = await readFile(join(v3Dir, 'content.json'), 'utf-8')
          .then(() => true)
          .catch(() => false);

        expect(v1Exists).toBe(true);
        expect(v2Exists).toBe(true);
        expect(v3Exists).toBe(true);
      }
    });
  });

  describe('content.json の生成', () => {
    // テストの目的: 各バージョンの全データが content.json として保存されること
    it('Given: バージョンデータ, When: saveConfluenceVersions を呼び出す, Then: content.json にバージョン情報が保存される', async () => {
      // Given: バージョンデータ
      const versions: ConfluenceVersion[] = [
        {
          body: '<h1>見出し</h1><p>本文</p>',
          by: 'TestAuthor',
          message: 'テストコミット',
          number: 1,
          when: '2024-01-15T12:30:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'test-page');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: content.json にバージョン情報が保存される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const contentJsonPath = join(pageDir, 'versions', 'v1', 'content.json');
        const contentJsonStr = await readFile(contentJsonPath, 'utf-8');
        const contentJson = JSON.parse(contentJsonStr);

        expect(contentJson.number).toBe(1);
        expect(contentJson.by).toBe('TestAuthor');
        expect(contentJson.when).toBe('2024-01-15T12:30:00.000Z');
        expect(contentJson.message).toBe('テストコミット');
        expect(contentJson.body).toBe('<h1>見出し</h1><p>本文</p>');
      }
    });
  });

  describe('content.txt の生成', () => {
    // テストの目的: 各バージョンの本文がプレーンテキストとして content.txt に保存されること
    it('Given: 本文を含むバージョンデータ, When: saveConfluenceVersions を呼び出す, Then: content.txt にプレーンテキストが保存される', async () => {
      // Given: 本文を含むバージョンデータ
      const versions: ConfluenceVersion[] = [
        {
          body: '<h1>タイトル</h1><p>これは<strong>重要な</strong>内容です。</p>',
          by: 'Author',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'plain-text-test');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: content.txt にプレーンテキストが保存される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const contentTxtPath = join(pageDir, 'versions', 'v1', 'content.txt');
        const contentTxt = await readFile(contentTxtPath, 'utf-8');

        // HTMLタグが除去されていることを確認
        expect(contentTxt).not.toContain('<');
        expect(contentTxt).not.toContain('>');
        // 主要なテキストが含まれていることを確認
        expect(contentTxt).toContain('タイトル');
        expect(contentTxt).toContain('重要な');
        expect(contentTxt).toContain('内容です');
      }
    });
  });

  describe('diff.txt の生成（v2 以降）', () => {
    // テストの目的: v2 以降のバージョンに前バージョンとの unified diff が生成されること
    it('Given: 2つ以上のバージョン, When: saveConfluenceVersions を呼び出す, Then: v2 以降に diff.txt が生成される', async () => {
      // Given: 2つ以上のバージョン
      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Hello World</p>',
          by: 'Author1',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
        {
          body: '<p>Hello, World!</p>',
          by: 'Author2',
          message: '挨拶を修正',
          number: 2,
          when: '2024-01-02T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'diff-test');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: v2 以降に diff.txt が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // v1 には diff.txt がないこと
        const v1DiffExists = await readFile(join(pageDir, 'versions', 'v1', 'diff.txt'), 'utf-8')
          .then(() => true)
          .catch(() => false);
        expect(v1DiffExists).toBe(false);

        // v2 には diff.txt があること
        const v2DiffPath = join(pageDir, 'versions', 'v2', 'diff.txt');
        const v2Diff = await readFile(v2DiffPath, 'utf-8');

        // unified diff 形式であることを確認
        expect(v2Diff).toContain('@@');
        expect(v2Diff).toContain('-');
        expect(v2Diff).toContain('+');
      }
    });

    // テストの目的: 変更がない場合でも diff.txt が生成されること（「変更なし」を示す）
    it('Given: 内容が同じ2つのバージョン, When: saveConfluenceVersions を呼び出す, Then: diff.txt に変更なしが記録される', async () => {
      // Given: 内容が同じ2つのバージョン
      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Same content</p>',
          by: 'Author1',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
        {
          body: '<p>Same content</p>',
          by: 'Author2',
          message: 'メタデータのみ更新',
          number: 2,
          when: '2024-01-02T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'no-diff-test');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: diff.txt に変更なしが記録される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const v2DiffPath = join(pageDir, 'versions', 'v2', 'diff.txt');
        const v2Diff = await readFile(v2DiffPath, 'utf-8');

        // 変更なしの場合はハンクがない（@@ が含まれない）または空
        expect(v2Diff.includes('@@') || v2Diff === '' || v2Diff.includes('(変更なし)')).toBe(true);
      }
    });
  });

  describe('diff.json の生成（v2 以降）', () => {
    // テストの目的: v2 以降のバージョンに差分メタデータが生成されること
    it('Given: 2つ以上のバージョン, When: saveConfluenceVersions を呼び出す, Then: v2 以降に diff.json が生成される', async () => {
      // Given: 2つ以上のバージョン
      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Line 1</p>\n<p>Line 2</p>',
          by: 'Author1',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
        {
          body: '<p>Line 1</p>\n<p>Line 2 Updated</p>\n<p>Line 3</p>',
          by: 'Author2',
          message: '行を追加',
          number: 2,
          when: '2024-01-02T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'diff-json-test');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: v2 以降に diff.json が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // v1 には diff.json がないこと
        const v1DiffJsonExists = await readFile(join(pageDir, 'versions', 'v1', 'diff.json'), 'utf-8')
          .then(() => true)
          .catch(() => false);
        expect(v1DiffJsonExists).toBe(false);

        // v2 には diff.json があること
        const v2DiffJsonPath = join(pageDir, 'versions', 'v2', 'diff.json');
        const v2DiffJsonStr = await readFile(v2DiffJsonPath, 'utf-8');
        const v2DiffJson = JSON.parse(v2DiffJsonStr);

        // 差分メタデータの構造を確認
        expect(v2DiffJson.fromVersion).toBe(1);
        expect(v2DiffJson.toVersion).toBe(2);
        expect(v2DiffJson.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(v2DiffJson.stats).toBeDefined();
        expect(typeof v2DiffJson.stats.additions).toBe('number');
        expect(typeof v2DiffJson.stats.deletions).toBe('number');
        expect(typeof v2DiffJson.stats.changes).toBe('number');
        expect(Array.isArray(v2DiffJson.hunks)).toBe(true);
      }
    });
  });

  describe('本文が undefined のバージョン', () => {
    // テストの目的: body が undefined のバージョンを適切に処理すること
    it('Given: body が undefined のバージョン, When: saveConfluenceVersions を呼び出す, Then: 空の content.txt が生成される', async () => {
      // Given: body が undefined のバージョン
      const versions: ConfluenceVersion[] = [
        {
          by: 'Author',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
          // body は undefined
        },
      ];
      const pageDir = join(testDir, 'confluence', 'undefined-body-test');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: 空の content.txt が生成される
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const contentTxtPath = join(pageDir, 'versions', 'v1', 'content.txt');
        const contentTxt = await readFile(contentTxtPath, 'utf-8');
        expect(contentTxt).toBe('');
      }
    });
  });

  describe('空のバージョン配列', () => {
    // テストの目的: 空のバージョン配列を渡した場合に適切に処理すること
    it('Given: 空のバージョン配列, When: saveConfluenceVersions を呼び出す, Then: versions ディレクトリが作成されない', async () => {
      // Given: 空のバージョン配列
      const versions: ConfluenceVersion[] = [];
      const pageDir = join(testDir, 'confluence', 'empty-versions-test');
      await mkdir(pageDir, { recursive: true });

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: 正常終了し、versions ディレクトリは作成されない
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const versionsDir = join(pageDir, 'versions');
        const dirExists = await readFile(versionsDir, 'utf-8')
          .then(() => true)
          .catch(() => false);
        expect(dirExists).toBe(false);
      }
    });
  });

  describe('エラーハンドリング', () => {
    // テストの目的: versions ディレクトリ作成失敗時に DIRECTORY_CREATE_FAILED エラーを返すこと
    it('Given: versions ディレクトリ作成が失敗する状況, When: saveConfluenceVersions を呼び出す, Then: DIRECTORY_CREATE_FAILED エラーを返す', async () => {
      // Given: versions ディレクトリ作成が失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValueOnce(err({ message: 'Permission denied' }));

      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Test</p>',
          by: 'Author',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'err-versions-dir');

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: DIRECTORY_CREATE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('DIRECTORY_CREATE_FAILED');
        expect(result.error.message).toContain('versions ディレクトリの作成に失敗しました');
        expect(result.error.message).toContain('Permission denied');
        expect(result.error.path).toContain('versions');
      }

      ensureDirSpy.mockRestore();
    });

    // テストの目的: バージョンディレクトリ作成失敗時に DIRECTORY_CREATE_FAILED エラーを返すこと
    it('Given: v1 ディレクトリ作成が失敗する状況, When: saveConfluenceVersions を呼び出す, Then: DIRECTORY_CREATE_FAILED エラーを返す', async () => {
      // Given: v1 ディレクトリ作成が失敗する状況
      const ensureDirSpy = vi
        .spyOn(filePort, 'ensureDir')
        .mockResolvedValueOnce(ok(undefined)) // versions ディレクトリ成功
        .mockResolvedValueOnce(err({ message: 'Disk quota exceeded' })); // v1 ディレクトリ失敗

      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Test</p>',
          by: 'Author',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'err-v1-dir');

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: DIRECTORY_CREATE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('DIRECTORY_CREATE_FAILED');
        expect(result.error.message).toContain('v1 ディレクトリの作成に失敗しました');
        expect(result.error.message).toContain('Disk quota exceeded');
        expect(result.error.path).toContain('v1');
      }

      ensureDirSpy.mockRestore();
    });

    // テストの目的: content.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: content.json 書き込みが失敗する状況, When: saveConfluenceVersions を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: content.json 書き込みが失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValue(ok(undefined));
      const writeFileSpy = vi.spyOn(filePort, 'writeFileContent').mockResolvedValueOnce(err({ message: 'I/O error' })); // content.json 失敗

      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Test</p>',
          by: 'Author',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'err-content-json');

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('content.json の書き込みに失敗しました');
        expect(result.error.message).toContain('I/O error');
        expect(result.error.path).toContain('content.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: content.txt 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: content.txt 書き込みが失敗する状況, When: saveConfluenceVersions を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: content.txt 書き込みが失敗する状況
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValue(ok(undefined));
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // content.json 成功
        .mockResolvedValueOnce(err({ message: 'File locked' })); // content.txt 失敗

      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Test</p>',
          by: 'Author',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'err-content-txt');

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('content.txt の書き込みに失敗しました');
        expect(result.error.message).toContain('File locked');
        expect(result.error.path).toContain('content.txt');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: diff.txt 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: diff.txt 書き込みが失敗する状況, When: saveConfluenceVersions を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: diff.txt 書き込みが失敗する状況 (v2 以降)
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValue(ok(undefined));
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // v1 content.json 成功
        .mockResolvedValueOnce(ok(undefined)) // v1 content.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // v1 content.md 成功
        .mockResolvedValueOnce(ok(undefined)) // v2 content.json 成功
        .mockResolvedValueOnce(ok(undefined)) // v2 content.txt 成功
        .mockResolvedValueOnce(err({ message: 'Network error' })); // v2 diff.txt 失敗

      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Version 1</p>',
          by: 'Author1',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
        {
          body: '<p>Version 2</p>',
          by: 'Author2',
          message: 'Update',
          number: 2,
          when: '2024-01-02T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'err-diff-txt');

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('diff.txt の書き込みに失敗しました');
        expect(result.error.message).toContain('Network error');
        expect(result.error.path).toContain('diff.txt');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    // テストの目的: diff.json 書き込み失敗時に FILE_WRITE_FAILED エラーを返すこと
    it('Given: diff.json 書き込みが失敗する状況, When: saveConfluenceVersions を呼び出す, Then: FILE_WRITE_FAILED エラーを返す', async () => {
      // Given: diff.json 書き込みが失敗する状況 (v2 以降)
      const ensureDirSpy = vi.spyOn(filePort, 'ensureDir').mockResolvedValue(ok(undefined));
      const writeFileSpy = vi
        .spyOn(filePort, 'writeFileContent')
        .mockResolvedValueOnce(ok(undefined)) // v1 content.json 成功
        .mockResolvedValueOnce(ok(undefined)) // v1 content.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // v1 content.md 成功
        .mockResolvedValueOnce(ok(undefined)) // v2 content.json 成功
        .mockResolvedValueOnce(ok(undefined)) // v2 content.txt 成功
        .mockResolvedValueOnce(ok(undefined)) // v2 diff.txt 成功
        .mockResolvedValueOnce(err({ message: 'Quota exceeded' })); // v2 diff.json 失敗

      const versions: ConfluenceVersion[] = [
        {
          body: '<p>Version 1</p>',
          by: 'Author1',
          message: null,
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
        },
        {
          body: '<p>Version 2</p>',
          by: 'Author2',
          message: 'Update',
          number: 2,
          when: '2024-01-02T00:00:00.000Z',
        },
      ];
      const pageDir = join(testDir, 'confluence', 'err-diff-json');

      // When: saveConfluenceVersions を呼び出す
      const result = await saveConfluenceVersions(versions, pageDir);

      // Then: FILE_WRITE_FAILED エラーを返す
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('FILE_WRITE_FAILED');
        expect(result.error.message).toContain('diff.json の書き込みに失敗しました');
        expect(result.error.message).toContain('Quota exceeded');
        expect(result.error.path).toContain('diff.json');
      }

      ensureDirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });
  });
});
