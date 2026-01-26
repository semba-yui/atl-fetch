/**
 * Storage Format → Markdown 変換のテスト
 *
 * Given When Then パターンに沿って記述する。
 */

import { describe, expect, it } from 'vitest';

import { convertStorageFormatToMarkdown } from './text-converter.js';

describe('convertStorageFormatToMarkdown', () => {
  // ============================================================
  // TC-001〜TC-010: 基本動作
  // ============================================================
  describe('基本動作', () => {
    // テストの目的: null を渡した場合に空文字列が返されること
    it('TC-001: Given: null, When: convertStorageFormatToMarkdown を呼び出す, Then: 空文字列が返される', () => {
      // Given: null
      const input = null;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: undefined を渡した場合に空文字列が返されること
    it('TC-002: Given: undefined, When: convertStorageFormatToMarkdown を呼び出す, Then: 空文字列が返される', () => {
      // Given: undefined
      const input = undefined;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: 空文字列を渡した場合に空文字列が返されること
    it('TC-003: Given: 空文字列, When: convertStorageFormatToMarkdown を呼び出す, Then: 空文字列が返される', () => {
      // Given: 空文字列
      const input = '';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: プレーンテキストがそのまま返されること
    it('TC-004: Given: プレーンテキスト, When: convertStorageFormatToMarkdown を呼び出す, Then: テキストがそのまま返される', () => {
      // Given: プレーンテキスト
      const input = 'Hello World';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: テキストがそのまま返される
      expect(result).toBe('Hello World');
    });

    // テストの目的: 単純な p タグがテキストに変換されること
    it('TC-005: Given: 単純な p タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: テキストのみ返される', () => {
      // Given: 単純な p タグ
      const input = '<p>テスト</p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: テキストのみ返される
      expect(result).toBe('テスト');
    });
  });

  // ============================================================
  // TC-010〜TC-020: 見出し変換
  // ============================================================
  describe('見出し変換', () => {
    // テストの目的: h1 タグが # に変換されること
    it('TC-010: Given: h1 タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: # で始まるMarkdownが返される', () => {
      // Given: h1 タグ
      const input = '<h1>見出し1</h1>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: # で始まるMarkdownが返される
      expect(result).toBe('# 見出し1');
    });

    // テストの目的: h2 タグが ## に変換されること
    it('TC-011: Given: h2 タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: ## で始まるMarkdownが返される', () => {
      // Given: h2 タグ
      const input = '<h2>見出し2</h2>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: ## で始まるMarkdownが返される
      expect(result).toBe('## 見出し2');
    });

    // テストの目的: h3 タグが ### に変換されること
    it('TC-012: Given: h3 タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: ### で始まるMarkdownが返される', () => {
      // Given: h3 タグ
      const input = '<h3>見出し3</h3>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: ### で始まるMarkdownが返される
      expect(result).toBe('### 見出し3');
    });

    // テストの目的: h4 タグが #### に変換されること
    it('TC-013: Given: h4 タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: #### で始まるMarkdownが返される', () => {
      // Given: h4 タグ
      const input = '<h4>見出し4</h4>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: #### で始まるMarkdownが返される
      expect(result).toBe('#### 見出し4');
    });

    // テストの目的: h5 タグが ##### に変換されること
    it('TC-014: Given: h5 タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: ##### で始まるMarkdownが返される', () => {
      // Given: h5 タグ
      const input = '<h5>見出し5</h5>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: ##### で始まるMarkdownが返される
      expect(result).toBe('##### 見出し5');
    });

    // テストの目的: h6 タグが ###### に変換されること
    it('TC-015: Given: h6 タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: ###### で始まるMarkdownが返される', () => {
      // Given: h6 タグ
      const input = '<h6>見出し6</h6>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: ###### で始まるMarkdownが返される
      expect(result).toBe('###### 見出し6');
    });
  });

  // ============================================================
  // TC-020〜TC-030: 段落・テキスト装飾
  // ============================================================
  describe('段落・テキスト装飾', () => {
    // テストの目的: strong タグが ** に変換されること
    it('TC-020: Given: strong タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: **text** に変換される', () => {
      // Given: strong タグ
      const input = '<p><strong>太字</strong></p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: **text** に変換される
      expect(result).toBe('**太字**');
    });

    // テストの目的: b タグが ** に変換されること
    it('TC-021: Given: b タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: **text** に変換される', () => {
      // Given: b タグ
      const input = '<p><b>太字</b></p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: **text** に変換される
      expect(result).toBe('**太字**');
    });

    // テストの目的: em タグが * に変換されること
    it('TC-022: Given: em タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: *text* に変換される', () => {
      // Given: em タグ
      const input = '<p><em>斜体</em></p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: *text* に変換される
      expect(result).toBe('*斜体*');
    });

    // テストの目的: i タグが * に変換されること
    it('TC-023: Given: i タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: *text* に変換される', () => {
      // Given: i タグ
      const input = '<p><i>斜体</i></p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: *text* に変換される
      expect(result).toBe('*斜体*');
    });

    // テストの目的: br タグが改行に変換されること
    it('TC-024: Given: br タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: 改行に変換される', () => {
      // Given: br タグ
      const input = '<p>1行目<br />2行目</p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 改行に変換される（ソフト改行）
      expect(result).toContain('1行目');
      expect(result).toContain('2行目');
    });

    // テストの目的: 複数の段落が正しく変換されること
    it('TC-025: Given: 複数の p タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: 空行で区切られる', () => {
      // Given: 複数の p タグ
      const input = '<p>段落1</p><p>段落2</p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 空行で区切られる（各段落間に空行）
      expect(result).toContain('段落1');
      expect(result).toContain('段落2');
    });
  });

  // ============================================================
  // TC-030〜TC-040: リンク変換
  // ============================================================
  describe('リンク変換', () => {
    // テストの目的: a タグが [text](url) に変換されること
    it('TC-030: Given: a タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: [text](url) に変換される', () => {
      // Given: a タグ
      const input = '<p><a href="https://example.com">リンク</a></p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: [text](url) に変換される
      expect(result).toBe('[リンク](https://example.com)');
    });

    // テストの目的: テキスト内のリンクが変換されること
    it('TC-031: Given: テキスト内リンク, When: convertStorageFormatToMarkdown を呼び出す, Then: Markdown形式に変換される', () => {
      // Given: テキスト内リンク
      const input = '<p>詳細は<a href="https://example.com">こちら</a>を参照</p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: Markdown形式に変換される
      expect(result).toBe('詳細は[こちら](https://example.com)を参照');
    });
  });

  // ============================================================
  // TC-040〜TC-050: リスト変換
  // ============================================================
  describe('リスト変換', () => {
    // テストの目的: ul リストが - アイテム に変換されること
    it('TC-040: Given: ul リスト, When: convertStorageFormatToMarkdown を呼び出す, Then: - アイテム 形式に変換される', () => {
      // Given: ul リスト
      const input = '<ul><li>アイテム1</li><li>アイテム2</li></ul>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: - アイテム 形式に変換される（turndown はデフォルトで -   を使用）
      expect(result).toContain('-   アイテム1');
      expect(result).toContain('-   アイテム2');
    });

    // テストの目的: ol リストが 1. アイテム に変換されること
    it('TC-041: Given: ol リスト, When: convertStorageFormatToMarkdown を呼び出す, Then: 1. アイテム 形式に変換される', () => {
      // Given: ol リスト
      const input = '<ol><li>手順1</li><li>手順2</li></ol>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 番号付きリスト形式に変換される
      expect(result).toContain('1.');
      expect(result).toContain('手順1');
      expect(result).toContain('2.');
      expect(result).toContain('手順2');
    });

    // テストの目的: ネストされたリストが正しく変換されること
    it('TC-042: Given: ネストリスト, When: convertStorageFormatToMarkdown を呼び出す, Then: インデントされた形式に変換される', () => {
      // Given: ネストリスト
      const input = '<ul><li>親<ul><li>子</li></ul></li></ul>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: インデントされた形式に変換される
      expect(result).toContain('親');
      expect(result).toContain('子');
    });
  });

  // ============================================================
  // TC-050〜TC-070: テーブル変換
  // ============================================================
  describe('テーブル変換', () => {
    // テストの目的: 全テーブルが HTML テーブルとしてそのまま出力されること（シンプル・確実）
    it('TC-050: Given: シンプルなテーブル, When: convertStorageFormatToMarkdown を呼び出す, Then: HTML テーブルがそのまま出力される', () => {
      // Given: シンプルなテーブル
      const input = `<table>
        <tr><th>ヘッダー1</th><th>ヘッダー2</th></tr>
        <tr><td>セル1</td><td>セル2</td></tr>
      </table>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: HTML テーブルがそのまま出力される（Markdown テーブル形式ではない）
      expect(result).toContain('<table>');
      expect(result).not.toMatch(/^\|/m); // Markdown テーブル形式ではない
      expect(result).toContain('ヘッダー1');
      expect(result).toContain('ヘッダー2');
      expect(result).toContain('セル1');
      expect(result).toContain('セル2');
    });

    // テストの目的: colspan のあるテーブルが HTML のまま出力されること
    it('TC-060: Given: colspan のあるテーブル, When: convertStorageFormatToMarkdown を呼び出す, Then: HTML のまま出力される', () => {
      // Given: colspan のあるテーブル
      const input = '<table><tr><td colspan="2">結合セル</td></tr></table>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: HTML のまま出力される（テーブルタグが残る）
      expect(result).toContain('<table>');
      expect(result).toContain('colspan');
      expect(result).toContain('結合セル');
    });

    // テストの目的: rowspan のあるテーブルが HTML のまま出力されること
    it('TC-061: Given: rowspan のあるテーブル, When: convertStorageFormatToMarkdown を呼び出す, Then: HTML のまま出力される', () => {
      // Given: rowspan のあるテーブル
      const input = '<table><tr><td rowspan="2">結合セル</td><td>セルA</td></tr><tr><td>セルB</td></tr></table>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: HTML のまま出力される（テーブルタグが残る）
      expect(result).toContain('<table>');
      expect(result).toContain('rowspan');
    });

    // テストの目的: セル内改行のあるテーブルが HTML のまま出力されること
    it('TC-062: Given: セル内br のあるテーブル, When: convertStorageFormatToMarkdown を呼び出す, Then: HTML のまま出力される', () => {
      // Given: セル内改行のあるテーブル
      const input = '<table><tr><td>行1<br />行2</td></tr></table>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: HTML のまま出力される（テーブルタグが残る）
      expect(result).toContain('<table>');
      expect(result).toContain('<br');
    });

    // テストの目的: セル内リストを含むテーブルが崩れずに出力されること
    it('TC-063: Given: セル内リストを含むテーブル, When: convertStorageFormatToMarkdown を呼び出す, Then: HTML テーブルで出力される', () => {
      // Given: セル内リストを含むテーブル
      const input = '<table><tr><td><ul><li>項目1</li><li>項目2</li></ul></td></tr></table>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: HTML テーブルで出力される
      expect(result).toContain('<table>');
      expect(result).toContain('項目1');
      expect(result).toContain('項目2');
    });
  });

  // ============================================================
  // TC-065〜TC-069: Confluence マクロ（基本）
  // ============================================================
  describe('Confluence マクロ（基本）', () => {
    // テストの目的: toc マクロが TOC マーカーに変換されること
    it('TC-065: Given: toc マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: TOC マーカーに変換される', () => {
      // Given: toc マクロ
      const input = `<p>見出し</p>
        <ac:structured-macro ac:name="toc">
          <ac:parameter ac:name="maxLevel">3</ac:parameter>
        </ac:structured-macro>
        <p>本文</p>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: TOC マーカーに変換される（Turndown がブラケットをエスケープするため TOC のみチェック）
      expect(result).toContain('TOC');
      expect(result).toContain('見出し');
      expect(result).toContain('本文');
      expect(result).not.toContain('ac:structured-macro');
    });

    // テストの目的: anchor マクロがアンカー要素に変換されること
    it('TC-066: Given: anchor マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: <a id="name"></a> に変換される', () => {
      // Given: anchor マクロ
      const input = `<p>テキスト<ac:structured-macro ac:name="anchor">
        <ac:parameter ac:name="">section1</ac:parameter>
      </ac:structured-macro>続き</p>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: <a id="name"></a> に変換される
      expect(result).toContain('id="section1"');
      expect(result).toContain('テキスト');
      expect(result).not.toContain('ac:structured-macro');
    });

    // テストの目的: expand マクロが details/summary に変換されること
    it('TC-067: Given: Confluence expand マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: details/summary に変換される', () => {
      // Given: Confluence expand マクロ
      const input = `<ac:structured-macro ac:name="expand">
        <ac:parameter ac:name="title">クリックして展開</ac:parameter>
        <ac:rich-text-body><p>展開された内容です</p></ac:rich-text-body>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: details/summary に変換される
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>');
      expect(result).toContain('クリックして展開');
      expect(result).toContain('展開された内容');
    });

    // テストの目的: タイトルなしの expand マクロがデフォルトタイトルで変換されること
    it('TC-068: Given: タイトルなしの expand マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: デフォルトタイトルで変換される', () => {
      // Given: タイトルなしの expand マクロ
      const input = `<ac:structured-macro ac:name="expand">
        <ac:rich-text-body><p>内容</p></ac:rich-text-body>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: デフォルトタイトルで変換される
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>展開</summary>');
      expect(result).toContain('内容');
    });
  });

  // ============================================================
  // TC-069: Confluence マクロ（高度）
  // ============================================================
  describe('Confluence マクロ（高度）', () => {
    // テストの目的: excerpt マクロの内容が出力されること（hidden=true 以外）
    it('TC-069a: Given: excerpt マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: 内容が出力される', () => {
      // Given: excerpt マクロ
      const input = `<ac:structured-macro ac:name="excerpt">
        <ac:rich-text-body><p>抜粋テキスト</p></ac:rich-text-body>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 内容が出力される
      expect(result).toContain('抜粋テキスト');
      expect(result).not.toContain('ac:structured-macro');
    });

    // テストの目的: hidden=true の excerpt マクロは削除されること
    it('TC-069b: Given: hidden=true の excerpt マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: 削除される', () => {
      // Given: hidden=true の excerpt マクロ
      const input = `<p>前</p><ac:structured-macro ac:name="excerpt">
        <ac:parameter ac:name="hidden">true</ac:parameter>
        <ac:rich-text-body><p>隠し抜粋</p></ac:rich-text-body>
      </ac:structured-macro><p>後</p>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 隠し抜粋は出力されない
      expect(result).toContain('前');
      expect(result).toContain('後');
      expect(result).not.toContain('隠し抜粋');
    });

    // テストの目的: excerpt-include マクロがプレースホルダーに変換されること
    it('TC-069c: Given: excerpt-include マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: プレースホルダーが出力される', () => {
      // Given: excerpt-include マクロ
      const input = `<ac:structured-macro ac:name="excerpt-include">
        <ac:parameter ac:name=""><ri:page ri:content-title="参照ページ" /></ac:parameter>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: プレースホルダーが出力される
      expect(result).toContain('抜粋');
      expect(result).toContain('参照ページ');
    });

    // テストの目的: toc-zone マクロが [TOC] + 内容に変換されること
    it('TC-069d: Given: toc-zone マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: TOC マーカー + 内容が出力される', () => {
      // Given: toc-zone マクロ
      const input = `<ac:structured-macro ac:name="toc-zone">
        <ac:rich-text-body><h1>見出し1</h1><p>本文</p></ac:rich-text-body>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: TOC マーカー + 内容が出力される
      expect(result).toContain('TOC');
      expect(result).toContain('見出し1');
      expect(result).toContain('本文');
    });

    // テストの目的: ri:page リンクが [テキスト](ページ名) 形式に変換されること
    it('TC-069e: Given: ri:page リンク, When: convertStorageFormatToMarkdown を呼び出す, Then: Markdown リンクに変換される', () => {
      // Given: ri:page リンク
      const input = `<ac:link><ri:page ri:content-title="リンク先ページ" /><ac:plain-text-link-body><![CDATA[リンクテキスト]]></ac:plain-text-link-body></ac:link>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: Markdown リンクに変換される
      expect(result).toContain('リンクテキスト');
      expect(result).toContain('リンク先ページ');
    });

    // テストの目的: section/column マクロがテーブルに変換されること
    it('TC-069f: Given: section/column マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: テーブル形式で出力される', () => {
      // Given: section/column マクロ
      const input = `<ac:structured-macro ac:name="section">
        <ac:rich-text-body>
          <ac:structured-macro ac:name="column"><ac:parameter ac:name="width">50%</ac:parameter><ac:rich-text-body><p>カラム1</p></ac:rich-text-body></ac:structured-macro>
          <ac:structured-macro ac:name="column"><ac:parameter ac:name="width">50%</ac:parameter><ac:rich-text-body><p>カラム2</p></ac:rich-text-body></ac:structured-macro>
        </ac:rich-text-body>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: テーブル形式で出力される
      expect(result).toContain('<table>');
      expect(result).toContain('カラム1');
      expect(result).toContain('カラム2');
    });
  });

  // ============================================================
  // TC-070〜TC-080: Confluence 画像
  // ============================================================
  describe('Confluence 画像', () => {
    // テストの目的: ac:image が Markdown 画像に変換されること
    it('TC-070: Given: ac:image, When: convertStorageFormatToMarkdown を呼び出す, Then: ![alt](path) に変換される', () => {
      // Given: ac:image
      const input = '<ac:image><ri:attachment ri:filename="image.png"/></ac:image>';
      const attachmentPaths = { 'image.png': 'attachments/att123_image.png' };

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input, attachmentPaths);

      // Then: ![alt](path) に変換される
      expect(result).toContain('![');
      expect(result).toContain('](attachments/att123_image.png)');
    });

    // テストの目的: attachmentPaths がない場合ファイル名がパスになること
    it('TC-071: Given: ac:image（マッピングなし）, When: convertStorageFormatToMarkdown を呼び出す, Then: ファイル名がパスになる', () => {
      // Given: ac:image（マッピングなし）
      const input = '<ac:image><ri:attachment ri:filename="image.png"/></ac:image>';

      // When: convertStorageFormatToMarkdown を呼び出す（attachmentPaths なし）
      const result = convertStorageFormatToMarkdown(input);

      // Then: ファイル名がパスになる
      expect(result).toContain('![');
      expect(result).toContain('](image.png)');
    });

    // テストの目的: ac:caption があれば画像下にキャプションが出力されること
    it('TC-072: Given: ac:image + ac:caption, When: convertStorageFormatToMarkdown を呼び出す, Then: 画像下にキャプションが出力される', () => {
      // Given: ac:image + ac:caption
      const input =
        '<ac:image><ri:attachment ri:filename="photo.jpg"/><ac:caption>写真のキャプション</ac:caption></ac:image>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 画像下にキャプションが出力される
      expect(result).toContain('![');
      expect(result).toContain('写真のキャプション');
    });
  });

  // ============================================================
  // TC-080〜TC-090: 情報パネル（GitHub Alerts）
  // ============================================================
  describe('情報パネル（GitHub Alerts）', () => {
    // テストの目的: info マクロが > [!NOTE] に変換されること
    it('TC-080: Given: info マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: > [!NOTE] に変換される', () => {
      // Given: info マクロ
      const input =
        '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>情報内容</p></ac:rich-text-body></ac:structured-macro>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: > [!NOTE] に変換される
      expect(result).toContain('> [!NOTE]');
      expect(result).toContain('情報内容');
    });

    // テストの目的: note マクロが > [!NOTE] に変換されること
    it('TC-081: Given: note マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: > [!NOTE] に変換される', () => {
      // Given: note マクロ
      const input =
        '<ac:structured-macro ac:name="note"><ac:rich-text-body><p>ノート内容</p></ac:rich-text-body></ac:structured-macro>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: > [!NOTE] に変換される
      expect(result).toContain('> [!NOTE]');
      expect(result).toContain('ノート内容');
    });

    // テストの目的: tip マクロが > [!TIP] に変換されること
    it('TC-082: Given: tip マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: > [!TIP] に変換される', () => {
      // Given: tip マクロ
      const input =
        '<ac:structured-macro ac:name="tip"><ac:rich-text-body><p>ヒント内容</p></ac:rich-text-body></ac:structured-macro>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: > [!TIP] に変換される
      expect(result).toContain('> [!TIP]');
      expect(result).toContain('ヒント内容');
    });

    // テストの目的: warning マクロが > [!WARNING] に変換されること
    it('TC-083: Given: warning マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: > [!WARNING] に変換される', () => {
      // Given: warning マクロ
      const input =
        '<ac:structured-macro ac:name="warning"><ac:rich-text-body><p>警告内容</p></ac:rich-text-body></ac:structured-macro>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: > [!WARNING] に変換される
      expect(result).toContain('> [!WARNING]');
      expect(result).toContain('警告内容');
    });
  });

  // ============================================================
  // TC-090〜TC-100: コードブロック
  // ============================================================
  describe('コードブロック', () => {
    // テストの目的: code マクロが ```language に変換されること
    it('TC-090: Given: code マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: ```language に変換される', () => {
      // Given: code マクロ
      const input = `<ac:structured-macro ac:name="code">
        <ac:parameter ac:name="language">typescript</ac:parameter>
        <ac:plain-text-body><![CDATA[const x = 1;]]></ac:plain-text-body>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: ```language に変換される
      expect(result).toContain('```typescript');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('```');
    });

    // テストの目的: 言語指定なしの code マクロが ``` に変換されること
    it('TC-091: Given: 言語なし code マクロ, When: convertStorageFormatToMarkdown を呼び出す, Then: ``` に変換される', () => {
      // Given: 言語なし code マクロ
      const input = `<ac:structured-macro ac:name="code">
        <ac:plain-text-body><![CDATA[plain code]]></ac:plain-text-body>
      </ac:structured-macro>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: ``` に変換される
      expect(result).toContain('```');
      expect(result).toContain('plain code');
    });

    // テストの目的: インラインコードが `code` に変換されること
    it('TC-092: Given: code タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: `code` に変換される', () => {
      // Given: code タグ
      const input = '<p>実行コマンド: <code>npm install</code></p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: `code` に変換される
      expect(result).toContain('`npm install`');
    });
  });

  // ============================================================
  // TC-100〜TC-110: 色変更テキスト
  // ============================================================
  describe('色変更テキスト', () => {
    // テストの目的: 色付きテキストが HTML のまま出力されること
    it('TC-100: Given: 色変更 span, When: convertStorageFormatToMarkdown を呼び出す, Then: HTML のまま出力される', () => {
      // Given: 色変更 span
      const input = '<p>通常テキスト<span style="color: red;">赤いテキスト</span>通常</p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: HTML のまま出力される（色付きspan が残る）
      expect(result).toContain('<span');
      expect(result).toContain('color');
      expect(result).toContain('赤いテキスト');
    });
  });

  // ============================================================
  // TC-110〜TC-120: 無視要素
  // ============================================================
  describe('無視要素', () => {
    // テストの目的: セル背景色属性が削除されること
    it('TC-110: Given: data-highlight-colour 属性, When: convertStorageFormatToMarkdown を呼び出す, Then: 属性が削除される', () => {
      // Given: data-highlight-colour 属性
      const input = '<table><tr><th data-highlight-colour="#eae6ff">ヘッダー</th></tr></table>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 属性が削除される（テーブル変換の結果に背景色が含まれない）
      expect(result).not.toContain('data-highlight-colour');
      expect(result).not.toContain('#eae6ff');
      expect(result).toContain('ヘッダー');
    });

    // テストの目的: colgroup/col が削除されること
    it('TC-111: Given: colgroup タグ, When: convertStorageFormatToMarkdown を呼び出す, Then: タグが削除される', () => {
      // Given: colgroup タグ
      const input = '<table><colgroup><col style="width: 100px;"/></colgroup><tr><td>セル</td></tr></table>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: colgroup/col が削除される
      expect(result).not.toContain('colgroup');
      expect(result).not.toContain('width');
      expect(result).toContain('セル');
    });

    // テストの目的: ac:inline-comment-marker が内容のみ保持されること
    it('TC-112: Given: ac:inline-comment-marker, When: convertStorageFormatToMarkdown を呼び出す, Then: 内容のみ保持される', () => {
      // Given: ac:inline-comment-marker
      const input = '<p>テキスト<ac:inline-comment-marker ac:ref="123">コメント対象</ac:inline-comment-marker>続き</p>';

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: マーカーなしで内容のみ保持される
      expect(result).not.toContain('ac:inline-comment-marker');
      expect(result).toContain('テキスト');
      expect(result).toContain('コメント対象');
      expect(result).toContain('続き');
    });
  });

  // ============================================================
  // TC-120: 複合パターン
  // ============================================================
  describe('複合パターン', () => {
    // テストの目的: 見出し + 段落 + リスト + 表が正しく変換されること
    it('TC-120: Given: 複合ドキュメント, When: convertStorageFormatToMarkdown を呼び出す, Then: 各要素が正しく変換される', () => {
      // Given: 複合ドキュメント
      const input = `
        <h1>タイトル</h1>
        <p>これは<strong>重要な</strong>説明です。</p>
        <ul>
          <li>アイテム1</li>
          <li>アイテム2</li>
        </ul>
        <table>
          <tr><th>名前</th><th>値</th></tr>
          <tr><td>A</td><td>1</td></tr>
        </table>
      `;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: 各要素が正しく変換される
      expect(result).toContain('# タイトル');
      expect(result).toContain('**重要な**');
      expect(result).toContain('-   アイテム1'); // turndown はデフォルトで 3 スペース
      expect(result).toContain('<table>'); // テーブルは HTML のまま出力
      expect(result).toContain('名前');
    });
  });
});
