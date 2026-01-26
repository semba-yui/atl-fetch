/**
 * Confluence Storage Format → PlainText 変換
 */

/**
 * HTML エンティティをデコードする
 *
 * @param text エンコードされた文字列
 * @returns デコードされた文字列
 */
export const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code as string, 10)));
};

/**
 * CDATA セクションからテキストを抽出する
 *
 * @param html HTML 文字列
 * @returns CDATA セクションを処理した文字列
 */
export const extractCdata = (html: string): string => {
  return html.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
};

/**
 * Confluence マクロのパラメータからテキストを抽出する
 *
 * @param html HTML 文字列
 * @returns 処理された文字列
 */
export const extractMacroParameters = (html: string): string => {
  // ac:parameter タグから title などのテキストを抽出
  return html.replace(/<ac:parameter[^>]*ac:name="title"[^>]*>([^<]*)<\/ac:parameter>/g, '$1');
};

/**
 * 画像タグをプレースホルダーに変換する
 *
 * @param html HTML 文字列
 * @returns 処理された文字列
 */
export const convertImagesToPlaceholders = (html: string): string => {
  // ac:image タグと ri:attachment から画像ファイル名を抽出
  return html.replace(
    /<ac:image[^>]*>[\s\S]*?<ri:attachment\s+ri:filename="([^"]*)"[^>]*\/>[\s\S]*?<\/ac:image>/g,
    '[画像: $1]',
  );
};

/**
 * ユーザーリンクをプレースホルダーに変換する
 *
 * @param html HTML 文字列
 * @returns 処理された文字列
 */
export const convertUserLinksToPlaceholders = (html: string): string => {
  // ri:user タグをプレースホルダーに変換
  return html.replace(/<ac:link[^>]*>[\s\S]*?<ri:user[^>]*\/>[\s\S]*?<\/ac:link>/g, '[ユーザー]');
};

/**
 * ブロック要素のタグを処理して改行を適切に挿入する
 *
 * @param html HTML 文字列
 * @returns 処理された文字列
 */
export const processBlockElements = (html: string): string => {
  // 閉じタグの前後に改行マーカーを追加
  let result = html;

  // パラグラフと見出しの後に改行
  result = result.replace(/<\/(p|h[1-6])>/gi, '</$1>\n');

  // リストアイテムの後に改行
  result = result.replace(/<\/li>/gi, '</li>\n');

  // テーブル行の後に改行
  result = result.replace(/<\/tr>/gi, '</tr>\n');

  // テーブルセルの後にタブ
  result = result.replace(/<\/(td|th)>/gi, '\t</$1>');

  // br タグを改行に変換
  result = result.replace(/<br\s*\/?>/gi, '\n');

  // blockquote の後に改行
  result = result.replace(/<\/blockquote>/gi, '</blockquote>\n');

  return result;
};

/**
 * HTML タグを除去する
 *
 * @param html HTML 文字列
 * @returns タグを除去した文字列
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * 連続する空白を正規化する
 *
 * @param text テキスト
 * @returns 正規化されたテキスト
 */
export const normalizeWhitespace = (text: string): string => {
  // 行ごとに処理
  const lines = text.split('\n');
  const normalizedLines = lines.map((line) => {
    // 行内の連続する空白を単一スペースに
    return line.replace(/[ \t]+/g, ' ').trim();
  });

  // 空行を除去して結合
  return normalizedLines.filter((line) => line !== '').join('\n');
};

/**
 * Confluence の Storage Format（XHTML）をプレーンテキストに変換する
 *
 * @param storageFormat Storage Format 文字列
 * @returns プレーンテキスト
 */
export const convertStorageFormatToPlainText = (storageFormat: string | null | undefined): string => {
  // null または undefined の場合は空文字列を返す
  if (storageFormat === null || storageFormat === undefined || storageFormat === '') {
    return '';
  }

  let result = storageFormat;

  // CDATA セクションを処理
  result = extractCdata(result);

  // マクロパラメータからテキストを抽出
  result = extractMacroParameters(result);

  // 画像をプレースホルダーに変換
  result = convertImagesToPlaceholders(result);

  // ユーザーリンクをプレースホルダーに変換
  result = convertUserLinksToPlaceholders(result);

  // ブロック要素を処理
  result = processBlockElements(result);

  // HTML タグを除去
  result = stripHtmlTags(result);

  // HTML エンティティをデコード
  result = decodeHtmlEntities(result);

  // 空白を正規化
  result = normalizeWhitespace(result);

  return result;
};

// ============================================================
// In-source Testing（プライベート関数のテスト）
// ============================================================
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe('decodeHtmlEntities (in-source testing)', () => {
    // テストの目的: 各エンティティが正確に変換されること
    describe('個別エンティティの変換検証', () => {
      it('Given: &nbsp;, When: decodeHtmlEntities を呼び出す, Then: スペースに変換される', () => {
        expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
      });

      it('Given: &amp;, When: decodeHtmlEntities を呼び出す, Then: & に変換される', () => {
        expect(decodeHtmlEntities('&amp;')).toBe('&');
      });

      it('Given: &lt;, When: decodeHtmlEntities を呼び出す, Then: < に変換される', () => {
        expect(decodeHtmlEntities('&lt;')).toBe('<');
      });

      it('Given: &gt;, When: decodeHtmlEntities を呼び出す, Then: > に変換される', () => {
        expect(decodeHtmlEntities('&gt;')).toBe('>');
      });

      it('Given: &quot;, When: decodeHtmlEntities を呼び出す, Then: " に変換される', () => {
        expect(decodeHtmlEntities('&quot;')).toBe('"');
      });

      it("Given: &#39;, When: decodeHtmlEntities を呼び出す, Then: ' に変換される", () => {
        expect(decodeHtmlEntities('&#39;')).toBe("'");
      });

      it("Given: &#x27;, When: decodeHtmlEntities を呼び出す, Then: ' に変換される", () => {
        expect(decodeHtmlEntities('&#x27;')).toBe("'");
      });

      it('Given: 数値文字参照 &#65;, When: decodeHtmlEntities を呼び出す, Then: A に変換される', () => {
        expect(decodeHtmlEntities('&#65;')).toBe('A');
      });

      it('Given: 数値文字参照 &#12354;, When: decodeHtmlEntities を呼び出す, Then: あ に変換される', () => {
        expect(decodeHtmlEntities('&#12354;')).toBe('あ');
      });
    });

    // テストの目的: 複数のエンティティが正しい順序で変換されること
    describe('変換順序の検証', () => {
      it('Given: &amp;nbsp;, When: decodeHtmlEntities を呼び出す, Then: &nbsp; に変換される（&amp; が先に処理される）', () => {
        // &amp;nbsp; → &nbsp; になること（&nbsp; → スペース にはならない）
        expect(decodeHtmlEntities('&amp;nbsp;')).toBe('&nbsp;');
      });

      it('Given: &amp;lt;, When: decodeHtmlEntities を呼び出す, Then: < に変換される（連鎖的に置換される）', () => {
        // &amp; -> & になり、その後 &lt; -> < になる
        expect(decodeHtmlEntities('&amp;lt;')).toBe('<');
      });
    });
  });

  describe('convertImagesToPlaceholders (in-source testing)', () => {
    // テストの目的: 画像タグが '[画像: ファイル名]' に変換されること
    describe('画像プレースホルダーの検証', () => {
      it('Given: ac:image タグ, When: convertImagesToPlaceholders を呼び出す, Then: [画像: filename] 形式になる', () => {
        const html = '<ac:image><ri:attachment ri:filename="test.png"/></ac:image>';
        const result = convertImagesToPlaceholders(html);
        expect(result).toBe('[画像: test.png]');
      });

      it('Given: 日本語ファイル名の画像, When: convertImagesToPlaceholders を呼び出す, Then: ファイル名がそのまま含まれる', () => {
        const html = '<ac:image><ri:attachment ri:filename="テスト画像.png"/></ac:image>';
        const result = convertImagesToPlaceholders(html);
        expect(result).toBe('[画像: テスト画像.png]');
      });

      it('Given: 空のファイル名, When: convertImagesToPlaceholders を呼び出す, Then: [画像: ] となる', () => {
        const html = '<ac:image><ri:attachment ri:filename=""/></ac:image>';
        const result = convertImagesToPlaceholders(html);
        expect(result).toBe('[画像: ]');
      });
    });
  });

  describe('convertUserLinksToPlaceholders (in-source testing)', () => {
    // テストの目的: ユーザーリンクが '[ユーザー]' に変換されること
    describe('ユーザープレースホルダーの検証', () => {
      it('Given: ri:user タグ, When: convertUserLinksToPlaceholders を呼び出す, Then: [ユーザー] になる', () => {
        const html = '<ac:link><ri:user ri:account-id="123"/></ac:link>';
        const result = convertUserLinksToPlaceholders(html);
        expect(result).toBe('[ユーザー]');
      });

      it('Given: 複数のユーザーリンク, When: convertUserLinksToPlaceholders を呼び出す, Then: それぞれ [ユーザー] になる', () => {
        const html = '<ac:link><ri:user ri:account-id="1"/></ac:link>と<ac:link><ri:user ri:account-id="2"/></ac:link>';
        const result = convertUserLinksToPlaceholders(html);
        expect(result).toBe('[ユーザー]と[ユーザー]');
      });
    });
  });

  describe('normalizeWhitespace (in-source testing)', () => {
    // テストの目的: 連続空白が単一スペースに正規化されること
    describe('空白正規化の検証', () => {
      it('Given: 連続スペース, When: normalizeWhitespace を呼び出す, Then: 単一スペースになる', () => {
        expect(normalizeWhitespace('a    b')).toBe('a b');
      });

      it('Given: 連続タブ, When: normalizeWhitespace を呼び出す, Then: 単一スペースになる', () => {
        expect(normalizeWhitespace('a\t\t\tb')).toBe('a b');
      });

      it('Given: 空行, When: normalizeWhitespace を呼び出す, Then: 空行が削除される', () => {
        expect(normalizeWhitespace('a\n\n\nb')).toBe('a\nb');
      });

      it('Given: 先頭末尾の空白, When: normalizeWhitespace を呼び出す, Then: トリムされる', () => {
        expect(normalizeWhitespace('  a  ')).toBe('a');
      });
    });
  });
}
