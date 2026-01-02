/**
 * テキスト変換サービス
 *
 * Jira の ADF（Atlassian Document Format）と Confluence の Storage Format を
 * プレーンテキストに変換する機能を提供する。
 * また、Confluence の Storage Format を Markdown に変換する機能も提供する。
 */

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * 添付ファイルパスのマッピング型
 * filename -> savedPath
 */
type AttachmentPathMapping = Record<string, string>;

/**
 * ADF ノードの型定義
 */
interface AdfNode {
  readonly type: string;
  readonly text?: string;
  readonly content?: readonly AdfNode[];
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly marks?: readonly { readonly type: string; readonly attrs?: Readonly<Record<string, unknown>> }[];
}

/**
 * ADF ドキュメントの型定義
 */
interface AdfDocument {
  readonly type: 'doc';
  readonly version: number;
  readonly content: readonly AdfNode[];
}

/**
 * 入力が ADF ドキュメント形式かどうかを判定する
 *
 * @param input 入力値
 * @returns ADF ドキュメント形式の場合 true
 */
const isAdfDocument = (input: unknown): input is AdfDocument => {
  if (typeof input !== 'object' || input === null) {
    return false;
  }
  const doc = input as Record<string, unknown>;
  return doc['type'] === 'doc' && Array.isArray(doc['content']);
};

/**
 * ADF ノードからプレーンテキストを抽出する
 *
 * @param node ADF ノード
 * @returns 抽出されたプレーンテキスト
 */
const extractTextFromAdfNode = (node: AdfNode): string => {
  // テキストノードの場合
  if (node.type === 'text' && node.text !== undefined) {
    return node.text;
  }

  // 硬い改行の場合
  if (node.type === 'hardBreak') {
    return '\n';
  }

  // メンションの場合
  if (node.type === 'mention' && node.attrs !== undefined) {
    const text = node.attrs['text'];
    if (typeof text === 'string') {
      return text;
    }
    return '@ユーザー';
  }

  // 絵文字の場合
  if (node.type === 'emoji' && node.attrs !== undefined) {
    const text = node.attrs['text'];
    const shortName = node.attrs['shortName'];
    if (typeof text === 'string') {
      return text;
    }
    if (typeof shortName === 'string') {
      return shortName;
    }
    return '';
  }

  // メディアの場合
  if (node.type === 'media') {
    return '[添付ファイル]';
  }

  // mediaSingle の場合（メディアコンテナ）
  if (node.type === 'mediaSingle' && node.content !== undefined) {
    return node.content.map(extractTextFromAdfNode).join('');
  }

  // 子ノードがある場合は再帰的に処理
  if (node.content !== undefined && Array.isArray(node.content)) {
    const texts = node.content.map(extractTextFromAdfNode);

    // パラグラフや見出しの後には改行を追加
    if (node.type === 'paragraph' || node.type === 'heading') {
      return texts.join('');
    }

    // リストアイテムの後には改行を追加
    if (node.type === 'listItem') {
      return `${texts.join('')}\n`;
    }

    // テーブルセルとヘッダーはタブで区切る
    if (node.type === 'tableCell' || node.type === 'tableHeader') {
      return `${texts.join('')}\t`;
    }

    // テーブル行は改行で区切る
    if (node.type === 'tableRow') {
      return `${texts.join('').trimEnd()}\n`;
    }

    return texts.join('');
  }

  return '';
};

/**
 * ADF ドキュメントのトップレベルコンテンツを処理する
 *
 * @param content トップレベルのコンテンツ配列
 * @returns プレーンテキスト
 */
const processAdfContent = (content: readonly AdfNode[]): string => {
  const results: string[] = [];

  for (const node of content) {
    const text = extractTextFromAdfNode(node);
    if (text !== '') {
      results.push(text);
    }
  }

  // パラグラフや見出しは改行で結合
  return results.join('\n');
};

/**
 * ADF（Atlassian Document Format）をプレーンテキストに変換する
 *
 * @param adf ADF ドキュメント（オブジェクトまたは JSON 文字列）
 * @returns プレーンテキスト
 */
export const convertAdfToPlainText = (adf: unknown): string => {
  // null または undefined の場合は空文字列を返す
  if (adf === null || adf === undefined) {
    return '';
  }

  // 文字列の場合は JSON としてパースを試みる
  if (typeof adf === 'string') {
    try {
      const parsed = JSON.parse(adf);
      if (isAdfDocument(parsed)) {
        return processAdfContent(parsed.content);
      }
    } catch {
      // JSON パースに失敗した場合は元の文字列を返す
      return adf;
    }
    // パースできたが ADF 形式でない場合は元の文字列を返す
    return adf;
  }

  // オブジェクトの場合は ADF ドキュメントとして処理
  if (isAdfDocument(adf)) {
    return processAdfContent(adf.content);
  }

  return '';
};

/**
 * HTML エンティティをデコードする
 *
 * @param text エンコードされた文字列
 * @returns デコードされた文字列
 */
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)));
};

/**
 * CDATA セクションからテキストを抽出する
 *
 * @param html HTML 文字列
 * @returns CDATA セクションを処理した文字列
 */
const extractCdata = (html: string): string => {
  return html.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
};

/**
 * Confluence マクロのパラメータからテキストを抽出する
 *
 * @param html HTML 文字列
 * @returns 処理された文字列
 */
const extractMacroParameters = (html: string): string => {
  // ac:parameter タグから title などのテキストを抽出
  return html.replace(/<ac:parameter[^>]*ac:name="title"[^>]*>([^<]*)<\/ac:parameter>/g, '$1');
};

/**
 * 画像タグをプレースホルダーに変換する
 *
 * @param html HTML 文字列
 * @returns 処理された文字列
 */
const convertImagesToPlaceholders = (html: string): string => {
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
const convertUserLinksToPlaceholders = (html: string): string => {
  // ri:user タグをプレースホルダーに変換
  return html.replace(/<ac:link[^>]*>[\s\S]*?<ri:user[^>]*\/>[\s\S]*?<\/ac:link>/g, '[ユーザー]');
};

/**
 * ブロック要素のタグを処理して改行を適切に挿入する
 *
 * @param html HTML 文字列
 * @returns 処理された文字列
 */
const processBlockElements = (html: string): string => {
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
const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * 連続する空白を正規化する
 *
 * @param text テキスト
 * @returns 正規化されたテキスト
 */
const normalizeWhitespace = (text: string): string => {
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

/**
 * テーブルが Markdown に変換可能か判定する
 * - セル結合（colspan/rowspan）がないこと
 * - セル内改行（<br>）がないこと
 *
 * @param tableHtml テーブルの HTML 文字列
 * @returns 変換可能な場合 true
 */
const isTableConvertibleToMarkdown = (tableHtml: string): boolean => {
  // colspan/rowspan 属性チェック
  const hasCellMerge = /\b(colspan|rowspan)\s*=/i.test(tableHtml);

  // セル内 <br> チェック（<td> または <th> 内の <br>）
  const hasCellBreak = /<t[dh][^>]*>[\s\S]*?<br[\s/]*>[\s\S]*?<\/t[dh]>/i.test(tableHtml);

  return !hasCellMerge && !hasCellBreak;
};

/**
 * 前処理: 無視する要素を削除し、Confluence 固有タグを処理
 *
 * @param html HTML 文字列
 * @param attachmentPaths 添付ファイルマッピング
 * @returns 前処理済み HTML
 */
const preprocessHtmlForMarkdown = (html: string, attachmentPaths?: AttachmentPathMapping): string => {
  let result = html;

  // colgroup/col を削除
  result = result.replace(/<colgroup[\s\S]*?<\/colgroup>/gi, '');
  result = result.replace(/<col[^>]*\/?>/gi, '');

  // data-highlight-colour 属性を削除
  result = result.replace(/\s*data-highlight-colour="[^"]*"/gi, '');

  // ac:local-id, local-id 属性を削除
  result = result.replace(/\s*(ac:)?local-id="[^"]*"/gi, '');

  // ac:inline-comment-marker を内容のみに置換
  result = result.replace(/<ac:inline-comment-marker[^>]*>([\s\S]*?)<\/ac:inline-comment-marker>/gi, '$1');

  // CDATA セクションを処理
  result = result.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');

  // --------------------------------------------------
  // Confluence 固有タグを標準 HTML タグに変換（turndown が認識できる形式へ）
  // --------------------------------------------------

  // ac:image + ac:caption を <img> + <figcaption> に変換（キャプション付きを先に処理）
  result = result.replace(
    /<ac:image[^>]*>[\s\S]*?<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*\/?>[\s\S]*?<ac:caption>([^<]*)<\/ac:caption>[\s\S]*?<\/ac:image>/gi,
    (_match, filename: string, caption: string) => {
      const localPath = attachmentPaths?.[filename] || filename;
      return `<figure><img src="${localPath}" alt="${filename}"><figcaption>${caption}</figcaption></figure>`;
    },
  );

  // ac:image を <img> に変換（キャプションなしの残り）
  result = result.replace(
    /<ac:image[^>]*>[\s\S]*?<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*\/?>[\s\S]*?<\/ac:image>/gi,
    (_match, filename: string) => {
      const localPath = attachmentPaths?.[filename] || filename;
      return `<img src="${localPath}" alt="${filename}">`;
    },
  );

  // ac:structured-macro name="code" を <pre><code> に変換
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="code"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, innerContent: string) => {
      // language パラメータを抽出
      const langMatch = innerContent.match(/<ac:parameter[^>]*ac:name="language"[^>]*>([^<]*)<\/ac:parameter>/i);
      const lang = langMatch?.[1] || '';

      // plain-text-body の内容を抽出
      const bodyMatch = innerContent.match(/<ac:plain-text-body[^>]*>([\s\S]*?)<\/ac:plain-text-body>/i);
      const code = bodyMatch?.[1] || '';

      // turndown が認識できる形式に変換
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${code}</code></pre>`;
    },
  );

  // ac:structured-macro name="info/note/tip/warning" を GitHub Alerts 形式の blockquote に変換
  const alertMacros = ['info', 'note', 'tip', 'warning'];
  const alertTypeMap: Record<string, string> = {
    info: 'NOTE',
    note: 'NOTE',
    tip: 'TIP',
    warning: 'WARNING',
  };

  for (const macroName of alertMacros) {
    const pattern = new RegExp(
      `<ac:structured-macro[^>]*ac:name="${macroName}"[^>]*>[\\s\\S]*?<ac:rich-text-body>([\\s\\S]*?)<\\/ac:rich-text-body>[\\s\\S]*?<\\/ac:structured-macro>`,
      'gi',
    );
    result = result.replace(pattern, (_match, content: string) => {
      const alertType = alertTypeMap[macroName] || 'NOTE';
      // 専用のマーカー属性を持つ blockquote に変換
      return `<blockquote data-github-alert="${alertType}">${content}</blockquote>`;
    });
  }

  return result;
};

/**
 * Confluence Storage Format（XHTML）を Markdown に変換する
 *
 * @param storageFormat Storage Format 文字列（HTML/XHTML）
 * @param attachmentPaths 添付ファイル名 → ローカルパスのマッピング
 * @returns Markdown 文字列
 */
export const convertStorageFormatToMarkdown = (
  storageFormat: string | null | undefined,
  attachmentPaths?: AttachmentPathMapping,
): string => {
  // null または undefined の場合は空文字列を返す
  if (storageFormat === null || storageFormat === undefined || storageFormat === '') {
    return '';
  }

  // 前処理
  const preprocessedHtml = preprocessHtmlForMarkdown(storageFormat, attachmentPaths);

  // Turndown インスタンス作成
  const turndownService = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
    strongDelimiter: '**',
  });

  // GFM プラグイン（テーブル、取り消し線など）を使用
  turndownService.use(gfm);

  // --------------------------------------------------
  // カスタムルール: キャプション付き画像（<figure>）
  // --------------------------------------------------
  turndownService.addRule('figureWithCaption', {
    filter: (node) => {
      return node.nodeName === 'FIGURE';
    },
    replacement: (_content, node) => {
      const element = node as Element;
      const img = element.querySelector('img');
      const figcaption = element.querySelector('figcaption');

      if (img) {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        let result = `![${alt}](${src})`;

        if (figcaption) {
          const captionText = figcaption.textContent?.trim() || '';
          if (captionText) {
            result += `\n\n*${captionText}*`;
          }
        }
        return result;
      }
      return '';
    },
  });

  // --------------------------------------------------
  // カスタムルール: GitHub Alerts（<blockquote data-github-alert="...">）
  // --------------------------------------------------
  turndownService.addRule('githubAlerts', {
    filter: (node) => {
      if (node.nodeName !== 'BLOCKQUOTE') return false;
      return (node as Element).hasAttribute('data-github-alert');
    },
    replacement: (content, node) => {
      const element = node as Element;
      const alertType = element.getAttribute('data-github-alert') || 'NOTE';

      // 内容を再帰的に Markdown 変換
      const innerMarkdown = content.trim();

      // 各行に > プレフィックス付加
      const lines = innerMarkdown.split('\n');
      const quotedContent = lines.map((line) => `> ${line}`).join('\n');

      return `\n> [!${alertType}]\n${quotedContent}\n`;
    },
  });

  // --------------------------------------------------
  // カスタムルール: 色変更テキスト（HTML のまま出力）
  // --------------------------------------------------
  turndownService.addRule('coloredText', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false;
      const style = (node as Element).getAttribute('style') || '';
      return style.includes('color:') || style.includes('color :');
    },
    replacement: (_content, node) => {
      // HTML のまま出力
      return (node as Element).outerHTML;
    },
  });

  // --------------------------------------------------
  // カスタムルール: セル結合/セル内改行のあるテーブル（HTML のまま出力）
  // --------------------------------------------------
  turndownService.addRule('complexTable', {
    filter: (node) => {
      if (node.nodeName !== 'TABLE') return false;
      const tableHtml = (node as Element).outerHTML;
      return !isTableConvertibleToMarkdown(tableHtml);
    },
    replacement: (_content, node) => {
      // HTML のまま出力
      return (node as Element).outerHTML;
    },
  });

  // Markdown に変換
  const markdown = turndownService.turndown(preprocessedHtml);

  // 末尾の空白を除去
  return markdown.trim();
};

// ============================================================
// In-source Testing（プライベート関数のテスト）
// ============================================================
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe('extractTextFromAdfNode (in-source testing)', () => {
    // テストの目的: hardBreak が正確に '\n' を返すこと
    describe('hardBreak の戻り値検証', () => {
      it('Given: hardBreak ノード, When: extractTextFromAdfNode を呼び出す, Then: 厳密に "\\n" が返される', () => {
        // Given: hardBreak ノード
        const node = { type: 'hardBreak' };

        // When: extractTextFromAdfNode を呼び出す
        const result = extractTextFromAdfNode(node);

        // Then: 厳密に '\n' が返される
        expect(result).toBe('\n');
        expect(result.length).toBe(1);
        expect(result.charCodeAt(0)).toBe(10); // LF のコードポイント
      });
    });

    // テストの目的: media ノードが '[添付ファイル]' を返すこと
    describe('media の戻り値検証', () => {
      it('Given: media ノード, When: extractTextFromAdfNode を呼び出す, Then: 厳密に "[添付ファイル]" が返される', () => {
        // Given: media ノード
        const node = { attrs: { id: 'test-123' }, type: 'media' };

        // When: extractTextFromAdfNode を呼び出す
        const result = extractTextFromAdfNode(node);

        // Then: 厳密に '[添付ファイル]' が返される
        expect(result).toBe('[添付ファイル]');
        expect(result.length).toBe(8);
      });
    });

    // テストの目的: mention で text がない場合 '@ユーザー' を返すこと
    describe('mention のデフォルトプレースホルダー検証', () => {
      it('Given: text のない mention, When: extractTextFromAdfNode を呼び出す, Then: 厳密に "@ユーザー" が返される', () => {
        // Given: text のない mention
        const node = { attrs: { id: 'user-123' }, type: 'mention' };

        // When: extractTextFromAdfNode を呼び出す
        const result = extractTextFromAdfNode(node);

        // Then: 厳密に '@ユーザー' が返される
        expect(result).toBe('@ユーザー');
        expect(result.length).toBe(5);
      });
    });

    // テストの目的: listItem が末尾に改行を追加すること
    describe('listItem の末尾改行検証', () => {
      it('Given: listItem ノード, When: extractTextFromAdfNode を呼び出す, Then: 末尾に改行が付く', () => {
        // Given: listItem ノード
        const node = {
          content: [{ content: [{ text: 'アイテム', type: 'text' }], type: 'paragraph' }],
          type: 'listItem',
        };

        // When: extractTextFromAdfNode を呼び出す
        const result = extractTextFromAdfNode(node);

        // Then: 末尾に改行が付く
        expect(result).toBe('アイテム\n');
        expect(result.endsWith('\n')).toBe(true);
      });
    });

    // テストの目的: tableCell がタブで終わること
    describe('tableCell の末尾タブ検証', () => {
      it('Given: tableCell ノード, When: extractTextFromAdfNode を呼び出す, Then: 末尾にタブが付く', () => {
        // Given: tableCell ノード
        const node = {
          content: [{ content: [{ text: 'セル', type: 'text' }], type: 'paragraph' }],
          type: 'tableCell',
        };

        // When: extractTextFromAdfNode を呼び出す
        const result = extractTextFromAdfNode(node);

        // Then: 末尾にタブが付く
        expect(result).toBe('セル\t');
        expect(result.endsWith('\t')).toBe(true);
      });
    });

    // テストの目的: tableRow が末尾の空白を削除して改行を追加すること
    describe('tableRow の処理検証', () => {
      it('Given: tableRow ノード, When: extractTextFromAdfNode を呼び出す, Then: 末尾のタブが削除されて改行が付く', () => {
        // Given: tableRow ノード
        const node = {
          content: [
            { content: [{ content: [{ text: 'A', type: 'text' }], type: 'paragraph' }], type: 'tableCell' },
            { content: [{ content: [{ text: 'B', type: 'text' }], type: 'paragraph' }], type: 'tableCell' },
          ],
          type: 'tableRow',
        };

        // When: extractTextFromAdfNode を呼び出す
        const result = extractTextFromAdfNode(node);

        // Then: 末尾の空白が削除されて改行が付く
        expect(result).toBe('A\tB\n');
      });
    });

    // テストの目的: 未知のノードタイプが空文字列を返すこと
    describe('未知のノードタイプの処理', () => {
      it('Given: 未知のノードタイプ, When: extractTextFromAdfNode を呼び出す, Then: 空文字列が返される', () => {
        // Given: 未知のノードタイプ
        const node = { type: 'unknownType' };

        // When: extractTextFromAdfNode を呼び出す
        const result = extractTextFromAdfNode(node);

        // Then: 空文字列が返される
        expect(result).toBe('');
      });
    });
  });

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

  describe('isAdfDocument (in-source testing)', () => {
    // テストの目的: ADF ドキュメント判定が正しく動作すること
    describe('ADF 判定の検証', () => {
      it('Given: 有効な ADF, When: isAdfDocument を呼び出す, Then: true が返される', () => {
        const doc = { content: [], type: 'doc', version: 1 };
        expect(isAdfDocument(doc)).toBe(true);
      });

      it('Given: type が doc でない, When: isAdfDocument を呼び出す, Then: false が返される', () => {
        const doc = { content: [], type: 'paragraph' };
        expect(isAdfDocument(doc)).toBe(false);
      });

      it('Given: content がない, When: isAdfDocument を呼び出す, Then: false が返される', () => {
        const doc = { type: 'doc', version: 1 };
        expect(isAdfDocument(doc)).toBe(false);
      });

      it('Given: content が配列でない, When: isAdfDocument を呼び出す, Then: false が返される', () => {
        const doc = { content: 'string', type: 'doc', version: 1 };
        expect(isAdfDocument(doc)).toBe(false);
      });

      it('Given: null, When: isAdfDocument を呼び出す, Then: false が返される', () => {
        expect(isAdfDocument(null)).toBe(false);
      });

      it('Given: プリミティブ値, When: isAdfDocument を呼び出す, Then: false が返される', () => {
        expect(isAdfDocument('string')).toBe(false);
        expect(isAdfDocument(123)).toBe(false);
        expect(isAdfDocument(true)).toBe(false);
      });
    });
  });
}
