import { describe, expect, it } from 'vitest';
import { parseUrl } from './url-parser.js';

describe('UrlParser', () => {
  describe('Jira Issue URL の解析', () => {
    /**
     * Jira Issue URL の /browse/{key} 形式をパースして
     * 組織名、プロジェクトキー、Issue キーを抽出できることを確認する
     */
    describe('/browse/{key} 形式のパース', () => {
      it('標準的な Jira Issue URL から組織名と Issue キーを抽出する', () => {
        // Given: 標準的な Jira Issue URL
        const url = 'https://mycompany.atlassian.net/browse/PROJ-123';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 組織名、リソースタイプ、Issue キー、プロジェクトキーが抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual({
            organization: 'mycompany',
            projectKey: 'PROJ',
            resourceId: 'PROJ-123',
            type: 'jira',
          });
        }
      });

      it('複数の単語を含む組織名でも正しく抽出する', () => {
        // Given: ハイフンを含む組織名の Jira Issue URL
        const url = 'https://my-company-name.atlassian.net/browse/ABC-1';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 組織名が正しく抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.organization).toBe('my-company-name');
          expect(result.value.resourceId).toBe('ABC-1');
          expect(result.value.projectKey).toBe('ABC');
        }
      });

      it('大文字小文字が混在する Issue キーでも正しく抽出する', () => {
        // Given: 大文字のプロジェクトキーを含む URL
        const url = 'https://example.atlassian.net/browse/TEST-9999';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: Issue キーがそのまま抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.resourceId).toBe('TEST-9999');
        }
      });
    });

    /**
     * Jira Software ボードの URL からも Issue キーを抽出できることを確認する
     * 例: /jira/software/projects/.../boards/...?selectedIssue={key}
     */
    describe('/jira/software/projects/.../boards/...?selectedIssue={key} 形式のパース', () => {
      it('ボード URL から selectedIssue パラメータの Issue キーを抽出する', () => {
        // Given: Jira Software ボードの URL
        const url = 'https://mycompany.atlassian.net/jira/software/projects/PROJ/boards/1?selectedIssue=PROJ-456';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: selectedIssue の Issue キーが抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual({
            organization: 'mycompany',
            projectKey: 'PROJ',
            resourceId: 'PROJ-456',
            type: 'jira',
          });
        }
      });

      it('クエリパラメータに他のパラメータが含まれていても正しく抽出する', () => {
        // Given: 複数のクエリパラメータを含む URL
        const url =
          'https://example.atlassian.net/jira/software/projects/ABC/boards/2?view=board&selectedIssue=ABC-789&filter=123';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: selectedIssue の値が正しく抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.resourceId).toBe('ABC-789');
        }
      });
    });

    /**
     * 最小長・境界値のテスト
     */
    describe('Issue キーの境界値テスト', () => {
      // テストの目的: 最小長の Issue キー (A-1) を正しくパースできること
      it('Given: 最小長の Issue キー (A-1), When: parseUrl を呼び出す, Then: 成功する', () => {
        // Given: 最小長の Issue キー
        const url = 'https://example.atlassian.net/browse/A-1';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 成功し、プロジェクトキーが正しく抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.projectKey).toBe('A');
          expect(result.value.resourceId).toBe('A-1');
        }
      });

      // テストの目的: 英字と数字が混在するプロジェクトキーを正しくパースできること
      it('Given: 英字と数字が混在するプロジェクトキー (A1B2-999), When: parseUrl を呼び出す, Then: 成功する', () => {
        // Given: 英字と数字が混在するプロジェクトキー
        const url = 'https://example.atlassian.net/browse/A1B2-999';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 成功する
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.projectKey).toBe('A1B2');
          expect(result.value.resourceId).toBe('A1B2-999');
        }
      });

      // テストの目的: 数字で始まる Issue キーはエラーになること
      it('Given: 数字で始まる Issue キー (123-ABC), When: parseUrl を呼び出す, Then: INVALID_FORMAT エラー', () => {
        // Given: 数字で始まる Issue キー
        const url = 'https://example.atlassian.net/browse/123-ABC';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe(
            '無効な Issue キー形式です: 123-ABC。形式は PROJECT-123 のようにしてください。',
          );
        }
      });

      // テストの目的: ハイフンがない Issue キーはエラーになること
      it('Given: ハイフンがない Issue キー (PROJ123), When: parseUrl を呼び出す, Then: INVALID_FORMAT エラー', () => {
        // Given: ハイフンがない Issue キー
        const url = 'https://example.atlassian.net/browse/PROJ123';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe(
            '無効な Issue キー形式です: PROJ123。形式は PROJECT-123 のようにしてください。',
          );
        }
      });

      // テストの目的: 複数のハイフンを含む Issue キーはエラーになること
      it('Given: 複数のハイフンを含む Issue キー (PROJ-123-456), When: parseUrl を呼び出す, Then: INVALID_FORMAT エラー', () => {
        // Given: 複数のハイフンを含む Issue キー
        const url = 'https://example.atlassian.net/browse/PROJ-123-456';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe(
            '無効な Issue キー形式です: PROJ-123-456。形式は PROJECT-123 のようにしてください。',
          );
        }
      });
    });

    /**
     * 不正な URL に対して明確なエラーを返すことを確認する
     */
    describe('エラーハンドリング', () => {
      it('空文字列の場合は INVALID_FORMAT エラーを返す', () => {
        // Given: 空の URL
        const url = '';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe('URL が空です。有効な Atlassian Cloud URL を指定してください。');
        }
      });

      // テストの目的: 空白のみの URL でエラーになること（trim() の検証）
      it('Given: 空白のみの URL, When: parseUrl を呼び出す, Then: INVALID_FORMAT エラー', () => {
        // Given: 空白のみの URL
        const urls = ['   ', '\t\t', '\n\n', ' \t \n '];

        for (const url of urls) {
          // When: URL をパースする
          const result = parseUrl(url);

          // Then: INVALID_FORMAT エラーが返される
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.kind).toBe('INVALID_FORMAT');
            expect(result.error.message).toBe('URL が空です。有効な Atlassian Cloud URL を指定してください。');
          }
        }
      });

      it('Atlassian Cloud 以外の URL の場合は UNSUPPORTED_HOST エラーを返す', () => {
        // Given: Atlassian Cloud 以外の URL
        const url = 'https://example.com/browse/PROJ-123';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: UNSUPPORTED_HOST エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('UNSUPPORTED_HOST');
          expect(result.error.message).toBe('Atlassian Cloud 以外の URL はサポートされていません: example.com');
        }
      });

      it('Jira Server/Data Center の URL の場合は UNSUPPORTED_HOST エラーを返す', () => {
        // Given: Jira Server の URL（atlassian.net ではない）
        const url = 'https://jira.mycompany.com/browse/PROJ-123';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: UNSUPPORTED_HOST エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('UNSUPPORTED_HOST');
          expect(result.error.message).toBe('Atlassian Cloud 以外の URL はサポートされていません: jira.mycompany.com');
        }
      });

      it('Issue キーが含まれない URL の場合は MISSING_RESOURCE_ID エラーを返す', () => {
        // Given: Issue キーがない URL
        const url = 'https://mycompany.atlassian.net/browse/';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: MISSING_RESOURCE_ID エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_RESOURCE_ID');
          expect(result.error.message).toBe('Issue キーが指定されていません。');
        }
      });

      it('無効な Issue キー形式の場合は INVALID_FORMAT エラーを返す', () => {
        // Given: 無効な形式の Issue キー（ハイフンと数字がない）
        const url = 'https://mycompany.atlassian.net/browse/invalid';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe(
            '無効な Issue キー形式です: invalid。形式は PROJECT-123 のようにしてください。',
          );
        }
      });

      it('selectedIssue パラメータがない場合は MISSING_RESOURCE_ID エラーを返す', () => {
        // Given: selectedIssue がない URL
        const url = 'https://mycompany.atlassian.net/jira/software/projects/PROJ/boards/1';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: MISSING_RESOURCE_ID エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_RESOURCE_ID');
          expect(result.error.message).toBe('selectedIssue パラメータが見つかりません。');
        }
      });

      it('不正な URL 形式の場合は INVALID_FORMAT エラーを返す', () => {
        // Given: URL として不正な文字列
        const url = 'not-a-valid-url';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe('無効な URL 形式です: not-a-valid-url');
        }
      });
    });
  });

  describe('Confluence ページ URL の解析', () => {
    /**
     * Confluence ページ URL の /wiki/spaces/{space}/pages/{id}/{title} 形式をパースして
     * 組織名、スペースキー、ページ ID を抽出できることを確認する
     */
    describe('/wiki/spaces/{space}/pages/{id}/{title} 形式のパース', () => {
      it('標準的な Confluence ページ URL から組織名、スペースキー、ページ ID を抽出する', () => {
        // Given: 標準的な Confluence ページ URL
        const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/123456789/Getting+Started';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 組織名、リソースタイプ、ページ ID、スペースキーが抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual({
            organization: 'mycompany',
            resourceId: '123456789',
            spaceKey: 'DOCS',
            type: 'confluence',
          });
        }
      });

      it('タイトルなしの Confluence ページ URL から情報を抽出する', () => {
        // Given: タイトルなしの Confluence ページ URL
        const url = 'https://example.atlassian.net/wiki/spaces/TEAM/pages/987654321';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: ページ ID とスペースキーが抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual({
            organization: 'example',
            resourceId: '987654321',
            spaceKey: 'TEAM',
            type: 'confluence',
          });
        }
      });

      it('複数の単語を含むスペースキーでも正しく抽出する', () => {
        // Given: 複数単語のスペースキーを含む URL
        const url = 'https://mycompany.atlassian.net/wiki/spaces/MY-SPACE/pages/111222333/My+Document';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: スペースキーが正しく抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.spaceKey).toBe('MY-SPACE');
          expect(result.value.resourceId).toBe('111222333');
        }
      });

      it('小文字のスペースキーでも正しく抽出する', () => {
        // Given: 小文字のスペースキーを含む URL
        const url = 'https://example.atlassian.net/wiki/spaces/docs/pages/555666777/Page';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: スペースキーがそのまま抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.spaceKey).toBe('docs');
        }
      });

      it('日本語を含むタイトルの URL でも正しく抽出する', () => {
        // Given: 日本語エンコードされたタイトルを含む URL
        const url = 'https://mycompany.atlassian.net/wiki/spaces/DEV/pages/123456/はじめに';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: ページ ID が正しく抽出される（タイトルは無視）
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.resourceId).toBe('123456');
          expect(result.value.spaceKey).toBe('DEV');
        }
      });
    });

    /**
     * ページ ID の境界値テスト
     */
    describe('ページ ID の境界値テスト', () => {
      // テストの目的: 単一数字のページ ID を正しくパースできること
      it('Given: 単一数字のページ ID (1), When: parseUrl を呼び出す, Then: 成功する', () => {
        // Given: 単一数字のページ ID
        const url = 'https://example.atlassian.net/wiki/spaces/DOCS/pages/1/Title';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 成功し、ページ ID が正しく抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.resourceId).toBe('1');
          expect(result.value.type).toBe('confluence');
        }
      });

      // テストの目的: 先頭ゼロのページ ID を正しくパースできること
      it('Given: 先頭ゼロのページ ID (001), When: parseUrl を呼び出す, Then: 成功する', () => {
        // Given: 先頭ゼロのページ ID
        const url = 'https://example.atlassian.net/wiki/spaces/DOCS/pages/001/Title';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 成功し、ページ ID がそのまま抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.resourceId).toBe('001');
        }
      });

      // テストの目的: 非常に大きなページ ID を正しくパースできること
      it('Given: 非常に大きなページ ID, When: parseUrl を呼び出す, Then: 成功する', () => {
        // Given: 非常に大きなページ ID
        const url = 'https://example.atlassian.net/wiki/spaces/DOCS/pages/999999999999999/Title';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: 成功し、ページ ID がそのまま抽出される
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.resourceId).toBe('999999999999999');
        }
      });

      // テストの目的: 英字を含むページ ID はエラーになること
      it('Given: 英字を含むページ ID (123abc), When: parseUrl を呼び出す, Then: INVALID_FORMAT エラー', () => {
        // Given: 英字を含むページ ID
        const url = 'https://example.atlassian.net/wiki/spaces/DOCS/pages/123abc/Title';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe(
            '無効なページ ID 形式です: 123abc。ページ ID は数字のみで構成される必要があります。',
          );
        }
      });

      // テストの目的: ハイフンを含むページ ID はエラーになること
      it('Given: ハイフンを含むページ ID (123-456), When: parseUrl を呼び出す, Then: INVALID_FORMAT エラー', () => {
        // Given: ハイフンを含むページ ID
        const url = 'https://example.atlassian.net/wiki/spaces/DOCS/pages/123-456/Title';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
        }
      });
    });

    /**
     * 不正な Confluence URL に対して明確なエラーを返すことを確認する
     */
    describe('エラーハンドリング', () => {
      it('ページ ID がない Confluence URL の場合は MISSING_RESOURCE_ID エラーを返す', () => {
        // Given: ページ ID がない URL
        const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: MISSING_RESOURCE_ID エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_RESOURCE_ID');
          expect(result.error.message).toBe(
            'サポートされている Confluence URL 形式ではありません。/wiki/spaces/{SPACE}/pages/{PAGE-ID} 形式を使用してください。',
          );
        }
      });

      it('スペースキーがない Confluence URL の場合は MISSING_RESOURCE_ID エラーを返す', () => {
        // Given: スペースキーがない URL（正規表現にマッチしないため一般的なエラーになる）
        const url = 'https://mycompany.atlassian.net/wiki/spaces//pages/123456789';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: MISSING_RESOURCE_ID エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_RESOURCE_ID');
          expect(result.error.message).toBe(
            'サポートされている Confluence URL 形式ではありません。/wiki/spaces/{SPACE}/pages/{PAGE-ID} 形式を使用してください。',
          );
        }
      });

      it('ページ ID が数字でない場合は INVALID_FORMAT エラーを返す', () => {
        // Given: ページ ID が数字でない URL
        const url = 'https://mycompany.atlassian.net/wiki/spaces/DOCS/pages/not-a-number/Title';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: INVALID_FORMAT エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('INVALID_FORMAT');
          expect(result.error.message).toBe(
            '無効なページ ID 形式です: not-a-number。ページ ID は数字のみで構成される必要があります。',
          );
        }
      });

      it('Confluence Server/Data Center の URL の場合は UNSUPPORTED_HOST エラーを返す', () => {
        // Given: Confluence Server の URL（atlassian.net ではない）
        const url = 'https://confluence.mycompany.com/wiki/spaces/DOCS/pages/123456789';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: UNSUPPORTED_HOST エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('UNSUPPORTED_HOST');
          expect(result.error.message).toBe(
            'Atlassian Cloud 以外の URL はサポートされていません: confluence.mycompany.com',
          );
        }
      });

      it('サポートされていない Confluence URL パスの場合は MISSING_RESOURCE_ID エラーを返す', () => {
        // Given: /wiki/display/ 形式の URL（古い形式）
        const url = 'https://mycompany.atlassian.net/wiki/display/DOCS/Page+Title';

        // When: URL をパースする
        const result = parseUrl(url);

        // Then: MISSING_RESOURCE_ID エラーが返される
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.kind).toBe('MISSING_RESOURCE_ID');
          expect(result.error.message).toBe(
            'サポートされている Confluence URL 形式ではありません。/wiki/spaces/{SPACE}/pages/{PAGE-ID} 形式を使用してください。',
          );
        }
      });
    });
  });
});
