/**
 * ADF（Atlassian Document Format）→ HTML 変換
 *
 * Markdown 変換の中間形式として HTML を生成する
 */

import type { AdfMark, AdfNode, AttachmentPathMapping } from './types.js';

/**
 * HTML 特殊文字をエスケープする
 *
 * @param text エスケープ対象の文字列
 * @returns エスケープ済み文字列
 */
export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * ADF マークを HTML タグで囲む
 *
 * @param text 対象のテキスト
 * @param marks 適用するマーク配列
 * @returns マークを適用した HTML
 */
export const applyMarksToHtml = (text: string, marks: readonly AdfMark[]): string => {
  let result = text;

  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `<strong>${result}</strong>`;
        break;
      case 'em':
        result = `<em>${result}</em>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'link': {
        const href = mark.attrs?.['href'];
        if (typeof href === 'string') {
          result = `<a href="${escapeHtml(href)}">${result}</a>`;
        }
        break;
      }
      case 'textColor': {
        const color = mark.attrs?.['color'];
        if (typeof color === 'string') {
          result = `<span style="color: ${escapeHtml(color)}">${result}</span>`;
        }
        break;
      }
      case 'subsup': {
        const subType = mark.attrs?.['type'];
        if (subType === 'sub') {
          result = `<sub>${result}</sub>`;
        } else if (subType === 'sup') {
          result = `<sup>${result}</sup>`;
        }
        break;
      }
      case 'backgroundColor': {
        const bgColor = mark.attrs?.['color'];
        if (typeof bgColor === 'string') {
          result = `<span style="background-color: ${escapeHtml(bgColor)}">${result}</span>`;
        }
        break;
      }
      // 未知のマークタイプは無視
      default:
        break;
    }
  }

  return result;
};

/**
 * ADF ノードを HTML に変換する
 *
 * @param node ADF ノード
 * @param attachmentPaths 添付ファイル ID → ローカルパスのマッピング
 * @returns HTML 文字列
 */
export const convertAdfNodeToHtml = (node: AdfNode, attachmentPaths?: AttachmentPathMapping): string => {
  // テキストノードの場合
  if (node.type === 'text' && node.text !== undefined) {
    const escapedText = escapeHtml(node.text);
    if (node.marks !== undefined && node.marks.length > 0) {
      return applyMarksToHtml(escapedText, node.marks);
    }
    return escapedText;
  }

  // hardBreak の場合
  if (node.type === 'hardBreak') {
    return '<br>';
  }

  // rule（水平線）の場合
  if (node.type === 'rule') {
    return '<hr>';
  }

  // メンションの場合
  if (node.type === 'mention' && node.attrs !== undefined) {
    const text = node.attrs['text'];
    if (typeof text === 'string') {
      return escapeHtml(text);
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

  // date ノードの場合
  if (node.type === 'date' && node.attrs?.['timestamp'] !== undefined) {
    const timestamp = node.attrs['timestamp'];
    const parsed = Number.parseInt(String(timestamp), 10);
    if (Number.isNaN(parsed)) {
      return '';
    }
    const date = new Date(parsed);
    const formatted = date.toISOString().split('T')[0];
    return `<time datetime="${formatted}">${formatted}</time>`;
  }

  // status ノードの場合
  if (node.type === 'status' && node.attrs !== undefined) {
    const color = node.attrs['color'];
    const text = node.attrs['text'];
    const colorEmojiMap: Record<string, string> = {
      blue: '🔵',
      green: '🟢',
      neutral: '⚪',
      purple: '🟣',
      red: '🔴',
      yellow: '🟡',
    };
    const emoji = typeof color === 'string' && colorEmojiMap[color] !== undefined ? colorEmojiMap[color] : '⚪';
    const statusText = typeof text === 'string' ? text : '';
    return `[${emoji} ${statusText}]`;
  }

  // media ノードの場合（添付ファイル）
  if (node.type === 'media' && node.attrs !== undefined) {
    const mediaId = node.attrs['id'];
    const mediaType = node.attrs['type'];

    // border マークのチェック
    const borderMark = node.marks?.find((m) => m.type === 'border');
    let borderStyle = '';
    if (borderMark?.attrs !== undefined) {
      const borderSize = typeof borderMark.attrs['size'] === 'number' ? borderMark.attrs['size'] : 1;
      const borderColor = typeof borderMark.attrs['color'] === 'string' ? borderMark.attrs['color'] : '#000000';
      borderStyle = ` style="border: ${borderSize}px solid ${escapeHtml(borderColor)}"`;
    }

    if (typeof mediaId === 'string' && attachmentPaths?.[mediaId] !== undefined) {
      const localPath = attachmentPaths[mediaId];
      const alt = typeof node.attrs['alt'] === 'string' ? node.attrs['alt'] : mediaId;
      return `<img src="${escapeHtml(localPath)}" alt="${escapeHtml(alt)}"${borderStyle}>`;
    }

    // 外部リンクの場合
    if (mediaType === 'external' || mediaType === 'link') {
      const url = node.attrs['url'];
      if (typeof url === 'string') {
        return `<img src="${escapeHtml(url)}" alt=""${borderStyle}>`;
      }
    }

    // マッピングがない場合はプレースホルダー
    return '[添付ファイル]';
  }

  // mediaInline ノードの場合（インラインメディア）
  if (node.type === 'mediaInline' && node.attrs !== undefined) {
    const mediaId = node.attrs['id'];

    if (typeof mediaId === 'string' && attachmentPaths?.[mediaId] !== undefined) {
      const localPath = attachmentPaths[mediaId];
      const alt = typeof node.attrs['alt'] === 'string' ? node.attrs['alt'] : mediaId;
      return `<img src="${escapeHtml(localPath)}" alt="${escapeHtml(alt)}">`;
    }

    // マッピングがない場合はプレースホルダー
    return '[添付ファイル]';
  }

  // mediaSingle（メディアコンテナ）の場合
  if (node.type === 'mediaSingle' && node.content !== undefined) {
    return node.content.map((child) => convertAdfNodeToHtml(child, attachmentPaths)).join('');
  }

  // mediaGroup の場合
  if (node.type === 'mediaGroup' && node.content !== undefined) {
    return node.content.map((child) => convertAdfNodeToHtml(child, attachmentPaths)).join('');
  }

  // inlineCard（インラインリンク）の場合
  if (node.type === 'inlineCard' && node.attrs !== undefined) {
    const url = node.attrs['url'];
    if (typeof url === 'string') {
      return `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
    }
    return '';
  }

  // blockCard（ブロックリンク）の場合
  if (node.type === 'blockCard' && node.attrs !== undefined) {
    const url = node.attrs['url'];
    if (typeof url === 'string') {
      return `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
    }
    return '';
  }

  // 子ノードがある場合
  if (node.content !== undefined && Array.isArray(node.content)) {
    const childrenHtml = node.content.map((child) => convertAdfNodeToHtml(child, attachmentPaths)).join('');

    switch (node.type) {
      case 'doc':
        return childrenHtml;

      case 'paragraph':
        return `<p>${childrenHtml}</p>`;

      case 'heading': {
        const level = typeof node.attrs?.['level'] === 'number' ? node.attrs['level'] : 1;
        const safeLevel = Math.max(1, Math.min(6, level));
        return `<h${safeLevel}>${childrenHtml}</h${safeLevel}>`;
      }

      case 'bulletList':
        return `<ul>${childrenHtml}</ul>`;

      case 'orderedList':
        return `<ol>${childrenHtml}</ol>`;

      case 'listItem':
        return `<li>${childrenHtml}</li>`;

      case 'blockquote':
        return `<blockquote>${childrenHtml}</blockquote>`;

      case 'codeBlock': {
        const language = typeof node.attrs?.['language'] === 'string' ? node.attrs['language'] : '';
        const langClass = language ? ` class="language-${escapeHtml(language)}"` : '';
        // コードブロック内のテキストは子ノードから取得
        const codeText = node.content
          .map((child) => (child.type === 'text' && child.text !== undefined ? child.text : ''))
          .join('');
        return `<pre><code${langClass}>${escapeHtml(codeText)}</code></pre>`;
      }

      case 'table':
        return `<table>${childrenHtml}</table>`;

      case 'tableRow':
        return `<tr>${childrenHtml}</tr>`;

      case 'tableHeader':
        return `<th>${childrenHtml}</th>`;

      case 'tableCell':
        return `<td>${childrenHtml}</td>`;

      case 'panel': {
        // panel タイプを GitHub Alerts 形式に変換
        const panelType = typeof node.attrs?.['panelType'] === 'string' ? node.attrs['panelType'] : 'info';
        const alertTypeMap: Record<string, string> = {
          error: 'WARNING',
          info: 'NOTE',
          note: 'NOTE',
          success: 'TIP',
          warning: 'WARNING',
        };
        const alertType = alertTypeMap[panelType] || 'NOTE';
        return `<blockquote data-github-alert="${alertType}">${childrenHtml}</blockquote>`;
      }

      case 'expand':
      case 'nestedExpand': {
        const expandTitle = typeof node.attrs?.['title'] === 'string' ? node.attrs['title'] : '展開';
        return `<details><summary>${escapeHtml(expandTitle)}</summary>${childrenHtml}</details>`;
      }

      // 未知のノードタイプは子ノードの内容を返す
      default:
        return childrenHtml;
    }
  }

  // 子ノードもテキストもない場合は空文字列
  return '';
};

/**
 * ADF ドキュメントを HTML に変換する
 *
 * @param content ADF ドキュメントのコンテンツ配列
 * @param attachmentPaths 添付ファイル ID → ローカルパスのマッピング
 * @returns HTML 文字列
 */
export const convertAdfContentToHtml = (
  content: readonly AdfNode[] | undefined,
  attachmentPaths?: AttachmentPathMapping,
): string => {
  if (content === undefined) {
    return '';
  }
  return content.map((node) => convertAdfNodeToHtml(node, attachmentPaths)).join('');
};

// ============================================================
// In-source Testing（プライベート関数のテスト）
// ============================================================
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe('escapeHtml', () => {
    it('Given: 特殊文字を含む文字列, When: escapeHtml を呼び出す, Then: エスケープされる', () => {
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('>')).toBe('&gt;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#39;');
    });

    it('Given: 複数の特殊文字, When: escapeHtml を呼び出す, Then: すべてエスケープされる', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
  });

  describe('applyMarksToHtml', () => {
    it('Given: strong マーク, When: applyMarksToHtml を呼び出す, Then: <strong> タグで囲まれる', () => {
      const result = applyMarksToHtml('テキスト', [{ type: 'strong' }]);
      expect(result).toBe('<strong>テキスト</strong>');
    });

    it('Given: em マーク, When: applyMarksToHtml を呼び出す, Then: <em> タグで囲まれる', () => {
      const result = applyMarksToHtml('テキスト', [{ type: 'em' }]);
      expect(result).toBe('<em>テキスト</em>');
    });

    it('Given: code マーク, When: applyMarksToHtml を呼び出す, Then: <code> タグで囲まれる', () => {
      const result = applyMarksToHtml('code', [{ type: 'code' }]);
      expect(result).toBe('<code>code</code>');
    });

    it('Given: strike マーク, When: applyMarksToHtml を呼び出す, Then: <s> タグで囲まれる', () => {
      const result = applyMarksToHtml('テキスト', [{ type: 'strike' }]);
      expect(result).toBe('<s>テキスト</s>');
    });

    it('Given: underline マーク, When: applyMarksToHtml を呼び出す, Then: <u> タグで囲まれる', () => {
      const result = applyMarksToHtml('テキスト', [{ type: 'underline' }]);
      expect(result).toBe('<u>テキスト</u>');
    });

    it('Given: link マーク, When: applyMarksToHtml を呼び出す, Then: <a> タグで囲まれる', () => {
      const result = applyMarksToHtml('リンク', [{ attrs: { href: 'https://example.com' }, type: 'link' }]);
      expect(result).toBe('<a href="https://example.com">リンク</a>');
    });

    it('Given: textColor マーク, When: applyMarksToHtml を呼び出す, Then: <span> タグで色が適用される', () => {
      const result = applyMarksToHtml('テキスト', [{ attrs: { color: '#ff0000' }, type: 'textColor' }]);
      expect(result).toBe('<span style="color: #ff0000">テキスト</span>');
    });

    it('Given: subsup マーク（sub）, When: applyMarksToHtml を呼び出す, Then: <sub> タグで囲まれる', () => {
      const result = applyMarksToHtml('2', [{ attrs: { type: 'sub' }, type: 'subsup' }]);
      expect(result).toBe('<sub>2</sub>');
    });

    it('Given: subsup マーク（sup）, When: applyMarksToHtml を呼び出す, Then: <sup> タグで囲まれる', () => {
      const result = applyMarksToHtml('2', [{ attrs: { type: 'sup' }, type: 'subsup' }]);
      expect(result).toBe('<sup>2</sup>');
    });

    it('Given: backgroundColor マーク, When: applyMarksToHtml を呼び出す, Then: 背景色が適用される', () => {
      const result = applyMarksToHtml('テキスト', [{ attrs: { color: '#ffff00' }, type: 'backgroundColor' }]);
      expect(result).toBe('<span style="background-color: #ffff00">テキスト</span>');
    });

    it('Given: 複数のマーク, When: applyMarksToHtml を呼び出す, Then: すべてのタグが適用される', () => {
      const result = applyMarksToHtml('テキスト', [{ type: 'strong' }, { type: 'em' }]);
      expect(result).toBe('<em><strong>テキスト</strong></em>');
    });

    it('Given: 未知のマーク, When: applyMarksToHtml を呼び出す, Then: 無視される', () => {
      const result = applyMarksToHtml('テキスト', [{ type: 'unknown' }]);
      expect(result).toBe('テキスト');
    });
  });

  describe('convertAdfNodeToHtml', () => {
    it('Given: テキストノード, When: convertAdfNodeToHtml を呼び出す, Then: エスケープされたテキストが返される', () => {
      const node = { text: '<script>', type: 'text' };
      expect(convertAdfNodeToHtml(node)).toBe('&lt;script&gt;');
    });

    it('Given: hardBreak, When: convertAdfNodeToHtml を呼び出す, Then: <br> が返される', () => {
      const node = { type: 'hardBreak' };
      expect(convertAdfNodeToHtml(node)).toBe('<br>');
    });

    it('Given: rule, When: convertAdfNodeToHtml を呼び出す, Then: <hr> が返される', () => {
      const node = { type: 'rule' };
      expect(convertAdfNodeToHtml(node)).toBe('<hr>');
    });

    it('Given: mention, When: convertAdfNodeToHtml を呼び出す, Then: メンションテキストが返される', () => {
      const node = { attrs: { text: '@田中' }, type: 'mention' };
      expect(convertAdfNodeToHtml(node)).toBe('@田中');
    });

    it('Given: emoji with text, When: convertAdfNodeToHtml を呼び出す, Then: 絵文字テキストが返される', () => {
      const node = { attrs: { text: '😀' }, type: 'emoji' };
      expect(convertAdfNodeToHtml(node)).toBe('😀');
    });

    it('Given: date, When: convertAdfNodeToHtml を呼び出す, Then: <time> タグが返される', () => {
      const node = { attrs: { timestamp: 1609459200000 }, type: 'date' };
      expect(convertAdfNodeToHtml(node)).toBe('<time datetime="2021-01-01">2021-01-01</time>');
    });

    it('Given: status, When: convertAdfNodeToHtml を呼び出す, Then: ステータスバッジが返される', () => {
      const node = { attrs: { color: 'green', text: '完了' }, type: 'status' };
      expect(convertAdfNodeToHtml(node)).toBe('[🟢 完了]');
    });

    it('Given: media with attachmentPaths, When: convertAdfNodeToHtml を呼び出す, Then: <img> タグが返される', () => {
      const node = { attrs: { id: 'file-123' }, type: 'media' };
      const paths = { 'file-123': '/attachments/image.png' };
      expect(convertAdfNodeToHtml(node, paths)).toBe('<img src="/attachments/image.png" alt="file-123">');
    });

    it('Given: media without mapping, When: convertAdfNodeToHtml を呼び出す, Then: プレースホルダーが返される', () => {
      const node = { attrs: { id: 'file-123' }, type: 'media' };
      expect(convertAdfNodeToHtml(node)).toBe('[添付ファイル]');
    });

    it('Given: inlineCard, When: convertAdfNodeToHtml を呼び出す, Then: <a> タグが返される', () => {
      const node = { attrs: { url: 'https://example.com' }, type: 'inlineCard' };
      expect(convertAdfNodeToHtml(node)).toBe('<a href="https://example.com">https://example.com</a>');
    });

    it('Given: blockCard, When: convertAdfNodeToHtml を呼び出す, Then: <p><a> タグが返される', () => {
      const node = { attrs: { url: 'https://example.com' }, type: 'blockCard' };
      expect(convertAdfNodeToHtml(node)).toBe('<p><a href="https://example.com">https://example.com</a></p>');
    });

    it('Given: paragraph, When: convertAdfNodeToHtml を呼び出す, Then: <p> タグで囲まれる', () => {
      const node = { content: [{ text: 'テスト', type: 'text' }], type: 'paragraph' };
      expect(convertAdfNodeToHtml(node)).toBe('<p>テスト</p>');
    });

    it('Given: heading level 2, When: convertAdfNodeToHtml を呼び出す, Then: <h2> タグで囲まれる', () => {
      const node = { attrs: { level: 2 }, content: [{ text: '見出し', type: 'text' }], type: 'heading' };
      expect(convertAdfNodeToHtml(node)).toBe('<h2>見出し</h2>');
    });

    it('Given: bulletList, When: convertAdfNodeToHtml を呼び出す, Then: <ul> タグで囲まれる', () => {
      const node = {
        content: [
          { content: [{ content: [{ text: 'アイテム', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
        ],
        type: 'bulletList',
      };
      expect(convertAdfNodeToHtml(node)).toBe('<ul><li><p>アイテム</p></li></ul>');
    });

    it('Given: orderedList, When: convertAdfNodeToHtml を呼び出す, Then: <ol> タグで囲まれる', () => {
      const node = {
        content: [
          { content: [{ content: [{ text: 'アイテム', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
        ],
        type: 'orderedList',
      };
      expect(convertAdfNodeToHtml(node)).toBe('<ol><li><p>アイテム</p></li></ol>');
    });

    it('Given: blockquote, When: convertAdfNodeToHtml を呼び出す, Then: <blockquote> タグで囲まれる', () => {
      const node = { content: [{ content: [{ text: '引用', type: 'text' }], type: 'paragraph' }], type: 'blockquote' };
      expect(convertAdfNodeToHtml(node)).toBe('<blockquote><p>引用</p></blockquote>');
    });

    it('Given: codeBlock, When: convertAdfNodeToHtml を呼び出す, Then: <pre><code> タグで囲まれる', () => {
      const node = {
        attrs: { language: 'typescript' },
        content: [{ text: 'const x = 1;', type: 'text' }],
        type: 'codeBlock',
      };
      expect(convertAdfNodeToHtml(node)).toBe('<pre><code class="language-typescript">const x = 1;</code></pre>');
    });

    it('Given: table, When: convertAdfNodeToHtml を呼び出す, Then: <table> 構造が返される', () => {
      const node = {
        content: [
          {
            content: [
              { content: [{ content: [{ text: 'ヘッダー', type: 'text' }], type: 'paragraph' }], type: 'tableHeader' },
            ],
            type: 'tableRow',
          },
        ],
        type: 'table',
      };
      expect(convertAdfNodeToHtml(node)).toBe('<table><tr><th><p>ヘッダー</p></th></tr></table>');
    });

    it('Given: panel, When: convertAdfNodeToHtml を呼び出す, Then: GitHub Alerts 形式の blockquote が返される', () => {
      const node = {
        attrs: { panelType: 'info' },
        content: [{ content: [{ text: '情報', type: 'text' }], type: 'paragraph' }],
        type: 'panel',
      };
      expect(convertAdfNodeToHtml(node)).toBe('<blockquote data-github-alert="NOTE"><p>情報</p></blockquote>');
    });

    it('Given: expand, When: convertAdfNodeToHtml を呼び出す, Then: <details> タグが返される', () => {
      const node = {
        attrs: { title: '詳細' },
        content: [{ content: [{ text: '内容', type: 'text' }], type: 'paragraph' }],
        type: 'expand',
      };
      expect(convertAdfNodeToHtml(node)).toBe('<details><summary>詳細</summary><p>内容</p></details>');
    });
  });
}
