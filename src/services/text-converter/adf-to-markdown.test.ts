/**
 * ADF → Markdown 変換のテスト
 *
 * Given When Then パターンに沿って記述する。
 */

import { describe, expect, it } from 'vitest';

import { convertAdfToMarkdown } from './text-converter.js';

describe('convertAdfToMarkdown', () => {
  describe('基本的なテキストノード', () => {
    // テストの目的: 単純なテキストノードを Markdown に変換できること
    it('Given: 単純なテキストを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: Markdown テキストが返される', () => {
      // Given: 単純なテキストを含む ADF
      const adf = {
        content: [
          {
            content: [{ text: 'これはテストです', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: テキストが返される
      expect(result).toBe('これはテストです');
    });

    // テストの目的: 複数のパラグラフが正しく変換されること
    it('Given: 複数のパラグラフを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: 各パラグラフが改行で区切られる', () => {
      // Given: 複数のパラグラフを含む ADF
      const adf = {
        content: [
          { content: [{ text: '1行目', type: 'text' }], type: 'paragraph' },
          { content: [{ text: '2行目', type: 'text' }], type: 'paragraph' },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 各パラグラフが改行で区切られる
      expect(result).toContain('1行目');
      expect(result).toContain('2行目');
    });
  });

  describe('テキスト装飾（マーク）', () => {
    // テストの目的: 太字マークが Markdown の強調記法に変換されること
    it('Given: 太字テキストを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: **太字** 形式に変換される', () => {
      // Given: 太字テキストを含む ADF
      const adf = {
        content: [
          {
            content: [{ marks: [{ type: 'strong' }], text: '太字テキスト', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: **太字** 形式に変換される
      expect(result).toBe('**太字テキスト**');
    });

    // テストの目的: 斜体マークが Markdown の強調記法に変換されること
    it('Given: 斜体テキストを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: *斜体* 形式に変換される', () => {
      // Given: 斜体テキストを含む ADF
      const adf = {
        content: [
          {
            content: [{ marks: [{ type: 'em' }], text: '斜体テキスト', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: *斜体* 形式に変換される
      expect(result).toBe('*斜体テキスト*');
    });

    // テストの目的: コードマークが Markdown のインラインコード記法に変換されること
    it('Given: インラインコードを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: `コード` 形式に変換される', () => {
      // Given: インラインコードを含む ADF
      const adf = {
        content: [
          {
            content: [{ marks: [{ type: 'code' }], text: 'const x = 1', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: `コード` 形式に変換される
      expect(result).toBe('`const x = 1`');
    });

    // テストの目的: リンクマークが Markdown のリンク記法に変換されること
    it('Given: リンクを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: [テキスト](URL) 形式に変換される', () => {
      // Given: リンクを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                marks: [{ attrs: { href: 'https://example.com' }, type: 'link' }],
                text: 'リンクテキスト',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: [テキスト](URL) 形式に変換される
      expect(result).toBe('[リンクテキスト](https://example.com)');
    });

    // テストの目的: 取り消し線マークが Markdown の取り消し線記法に変換されること
    it('Given: 取り消し線テキストを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: ~テキスト~ 形式に変換される', () => {
      // Given: 取り消し線テキストを含む ADF
      const adf = {
        content: [
          {
            content: [{ marks: [{ type: 'strike' }], text: '取り消し', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: ~テキスト~ 形式に変換される（Turndown は単一チルダを使用）
      expect(result).toBe('~取り消し~');
    });
  });

  describe('見出しノード', () => {
    // テストの目的: 見出しレベル1が # に変換されること
    it('Given: 見出しレベル1を含む ADF, When: convertAdfToMarkdown を呼び出す, Then: # 見出し 形式に変換される', () => {
      // Given: 見出しレベル1を含む ADF
      const adf = {
        content: [
          {
            attrs: { level: 1 },
            content: [{ text: '見出し1', type: 'text' }],
            type: 'heading',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: # 見出し 形式に変換される
      expect(result).toBe('# 見出し1');
    });

    // テストの目的: 見出しレベル3が ### に変換されること
    it('Given: 見出しレベル3を含む ADF, When: convertAdfToMarkdown を呼び出す, Then: ### 見出し 形式に変換される', () => {
      // Given: 見出しレベル3を含む ADF
      const adf = {
        content: [
          {
            attrs: { level: 3 },
            content: [{ text: '見出し3', type: 'text' }],
            type: 'heading',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: ### 見出し 形式に変換される
      expect(result).toBe('### 見出し3');
    });
  });

  describe('リストノード', () => {
    // テストの目的: 箇条書きリストが - 記法に変換されること
    it('Given: 箇条書きリストを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: - 記法に変換される', () => {
      // Given: 箇条書きリストを含む ADF
      const adf = {
        content: [
          {
            content: [
              { content: [{ content: [{ text: '項目1', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
              { content: [{ content: [{ text: '項目2', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
            ],
            type: 'bulletList',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: - 記法に変換される（Turndown のスペーシングは実装依存）
      expect(result).toMatch(/-\s+項目1/);
      expect(result).toMatch(/-\s+項目2/);
    });

    // テストの目的: 番号付きリストが 1. 記法に変換されること
    it('Given: 番号付きリストを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: 番号. 記法に変換される', () => {
      // Given: 番号付きリストを含む ADF
      const adf = {
        content: [
          {
            content: [
              { content: [{ content: [{ text: '項目1', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
              { content: [{ content: [{ text: '項目2', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
            ],
            type: 'orderedList',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 番号. 記法に変換される（Turndown のスペーシングは実装依存）
      expect(result).toMatch(/1\.\s+項目1/);
      expect(result).toMatch(/2\.\s+項目2/);
    });
  });

  describe('コードブロック', () => {
    // テストの目的: コードブロックがフェンスドコードブロックに変換されること
    it('Given: コードブロックを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: ```言語 形式に変換される', () => {
      // Given: コードブロックを含む ADF
      const adf = {
        content: [
          {
            attrs: { language: 'javascript' },
            content: [{ text: 'const x = 1;', type: 'text' }],
            type: 'codeBlock',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: ```言語 形式に変換される
      expect(result).toContain('```javascript');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('```');
    });
  });

  describe('引用ブロック', () => {
    // テストの目的: 引用ブロックが > 記法に変換されること
    it('Given: 引用ブロックを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: > 記法に変換される', () => {
      // Given: 引用ブロックを含む ADF
      const adf = {
        content: [
          {
            content: [{ content: [{ text: '引用テキスト', type: 'text' }], type: 'paragraph' }],
            type: 'blockquote',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: > 記法に変換される
      expect(result).toContain('> 引用テキスト');
    });
  });

  describe('メンションとインライン要素', () => {
    // テストの目的: メンションノードがテキストとして出力されること
    it('Given: メンションを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: メンションテキストが出力される', () => {
      // Given: メンションを含む ADF
      const adf = {
        content: [
          {
            content: [
              { text: 'Hello ', type: 'text' },
              { attrs: { id: 'user123', text: '@田中太郎' }, type: 'mention' },
              { text: '!', type: 'text' },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: メンションテキストが出力される
      expect(result).toContain('Hello');
      expect(result).toContain('@田中太郎');
    });

    // テストの目的: 絵文字ノードが出力されること
    it('Given: 絵文字を含む ADF, When: convertAdfToMarkdown を呼び出す, Then: 絵文字が出力される', () => {
      // Given: 絵文字を含む ADF
      const adf = {
        content: [
          {
            content: [
              { text: 'いいね！', type: 'text' },
              { attrs: { shortName: ':thumbsup:', text: '👍' }, type: 'emoji' },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 絵文字が出力される
      expect(result).toContain('いいね！');
      expect(result).toContain('👍');
    });
  });

  describe('null / undefined / 空文字列のハンドリング', () => {
    // テストの目的: null 値で空文字列が返されること
    it('Given: null, When: convertAdfToMarkdown を呼び出す, Then: 空文字列が返される', () => {
      // Given: null
      const adf = null;

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: undefined 値で空文字列が返されること
    it('Given: undefined, When: convertAdfToMarkdown を呼び出す, Then: 空文字列が返される', () => {
      // Given: undefined
      const adf = undefined;

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: 空文字列で空文字列が返されること
    it('Given: 空文字列, When: convertAdfToMarkdown を呼び出す, Then: 空文字列が返される', () => {
      // Given: 空文字列
      const adf = '';

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });
  });

  describe('JSON 文字列入力', () => {
    // テストの目的: JSON 文字列が正しくパースされて Markdown に変換されること
    it('Given: JSON 文字列形式の ADF, When: convertAdfToMarkdown を呼び出す, Then: Markdown に変換される', () => {
      // Given: JSON 文字列形式の ADF
      const adf = JSON.stringify({
        content: [{ content: [{ text: 'JSONからの変換', type: 'text' }], type: 'paragraph' }],
        type: 'doc',
        version: 1,
      });

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: Markdown に変換される
      expect(result).toBe('JSONからの変換');
    });

    // テストの目的: 無効な JSON 文字列は元の文字列が返されること
    it('Given: 無効な JSON 文字列, When: convertAdfToMarkdown を呼び出す, Then: 元の文字列が返される', () => {
      // Given: 無効な JSON 文字列
      const adf = 'これはプレーンテキストです';

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 元の文字列が返される
      expect(result).toBe('これはプレーンテキストです');
    });
  });

  describe('date ノード', () => {
    // テストの目的: date ノードが YYYY-MM-DD 形式で出力されること
    it('Given: timestamp を持つ date ノード, When: convertAdfToMarkdown を呼び出す, Then: YYYY-MM-DD 形式で出力される', () => {
      // Given: timestamp を持つ date ノード（2020-02-19 のタイムスタンプ）
      const adf = {
        content: [
          {
            content: [
              { text: '期限: ', type: 'text' },
              { attrs: { timestamp: '1582070400000' }, type: 'date' },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: YYYY-MM-DD 形式で出力される
      expect(result).toContain('2020-02-19');
    });

    // テストの目的: 無効な timestamp の場合は空文字列を出力すること
    it('Given: 無効な timestamp を持つ date ノード, When: convertAdfToMarkdown を呼び出す, Then: 空文字列が出力される', () => {
      // Given: 無効な timestamp を持つ date ノード
      const adf = {
        content: [
          {
            content: [{ attrs: { timestamp: 'invalid' }, type: 'date' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 空文字列または無効な表示にならない
      expect(result).not.toContain('Invalid');
      expect(result).not.toContain('NaN');
    });

    // テストの目的: timestamp がない date ノードは空文字列を出力すること
    it('Given: timestamp がない date ノード, When: convertAdfToMarkdown を呼び出す, Then: 空文字列が出力される', () => {
      // Given: timestamp がない date ノード
      const adf = {
        content: [
          {
            content: [{ attrs: {}, type: 'date' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 余分な出力がない
      expect(result.trim()).toBe('');
    });
  });

  describe('status ノード', () => {
    // テストの目的: status ノードが色付き絵文字とテキストで出力されること
    it('Given: yellow の status ノード, When: convertAdfToMarkdown を呼び出す, Then: [🟡 テキスト] 形式で出力される', () => {
      // Given: yellow の status ノード
      const adf = {
        content: [
          {
            content: [{ attrs: { color: 'yellow', text: 'In Progress' }, type: 'status' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: [🟡 テキスト] 形式で出力される
      expect(result).toContain('🟡');
      expect(result).toContain('In Progress');
    });

    // テストの目的: 各色が正しい絵文字にマッピングされること
    it.each([
      ['neutral', '⚪'],
      ['purple', '🟣'],
      ['blue', '🔵'],
      ['red', '🔴'],
      ['yellow', '🟡'],
      ['green', '🟢'],
    ])('Given: %s の status ノード, When: convertAdfToMarkdown を呼び出す, Then: %s が出力される', (color, emoji) => {
      // Given: 指定色の status ノード
      const adf = {
        content: [
          {
            content: [{ attrs: { color, text: 'Status' }, type: 'status' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: 正しい絵文字が出力される
      expect(result).toContain(emoji);
    });

    // テストの目的: 未知の色はデフォルト色（⚪）が出力されること
    it('Given: 未知の色の status ノード, When: convertAdfToMarkdown を呼び出す, Then: デフォルト色 ⚪ が出力される', () => {
      // Given: 未知の色の status ノード
      const adf = {
        content: [
          {
            content: [{ attrs: { color: 'unknown', text: 'Test' }, type: 'status' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: デフォルト色 ⚪ が出力される
      expect(result).toContain('⚪');
    });
  });

  describe('backgroundColor マーク', () => {
    // テストの目的: backgroundColor マークが span タグとして出力されること
    it('Given: backgroundColor マークを持つテキスト, When: convertAdfToMarkdown を呼び出す, Then: background-color スタイル付きで出力される', () => {
      // Given: backgroundColor マークを持つテキスト
      const adf = {
        content: [
          {
            content: [
              {
                marks: [{ attrs: { color: '#ffff00' }, type: 'backgroundColor' }],
                text: 'ハイライト',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: background-color スタイル付きで出力される
      expect(result).toContain('background-color');
      expect(result).toContain('#ffff00');
      expect(result).toContain('ハイライト');
    });
  });

  describe('expand/nestedExpand ノード', () => {
    // テストの目的: expand ノードが details/summary タグに変換されること
    it('Given: タイトル付き expand ノード, When: convertAdfToMarkdown を呼び出す, Then: details/summary タグに変換される', () => {
      // Given: タイトル付き expand ノード
      const adf = {
        content: [
          {
            attrs: { title: '詳細を見る' },
            content: [{ content: [{ text: '展開された内容', type: 'text' }], type: 'paragraph' }],
            type: 'expand',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: details/summary タグに変換される
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>');
      expect(result).toContain('詳細を見る');
      expect(result).toContain('展開された内容');
      expect(result).toContain('</details>');
    });

    // テストの目的: タイトルなしの expand ノードはデフォルトタイトルが使われること
    it('Given: タイトルなしの expand ノード, When: convertAdfToMarkdown を呼び出す, Then: デフォルトタイトル「展開」が使われる', () => {
      // Given: タイトルなしの expand ノード
      const adf = {
        content: [
          {
            content: [{ content: [{ text: '内容', type: 'text' }], type: 'paragraph' }],
            type: 'expand',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: デフォルトタイトル「展開」が使われる
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>展開</summary>');
    });

    // テストの目的: nestedExpand ノードも同様に変換されること
    it('Given: nestedExpand ノード, When: convertAdfToMarkdown を呼び出す, Then: details/summary タグに変換される', () => {
      // Given: nestedExpand ノード
      const adf = {
        content: [
          {
            attrs: { title: 'ネスト展開' },
            content: [{ content: [{ text: 'ネストされた内容', type: 'text' }], type: 'paragraph' }],
            type: 'nestedExpand',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: details/summary タグに変換される
      expect(result).toContain('<details>');
      expect(result).toContain('ネスト展開');
      expect(result).toContain('ネストされた内容');
    });
  });

  describe('mediaInline ノード', () => {
    // テストの目的: mediaInline ノードがインライン画像として処理されること
    it('Given: mediaInline ノード, When: convertAdfToMarkdown を呼び出す, Then: インライン画像として出力される', () => {
      // Given: mediaInline ノード
      const adf = {
        content: [
          {
            content: [
              { text: 'テキスト ', type: 'text' },
              { attrs: { id: 'inline-123', type: 'file' }, type: 'mediaInline' },
              { text: ' の続き', type: 'text' },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };
      const attachmentPaths = { 'inline-123': 'attachments/inline.png' };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf, attachmentPaths);

      // Then: インライン画像として出力される
      expect(result).toContain('![');
      expect(result).toContain('attachments/inline.png');
    });

    // テストの目的: マッピングがない場合はプレースホルダーが出力されること
    it('Given: マッピングなしの mediaInline ノード, When: convertAdfToMarkdown を呼び出す, Then: プレースホルダーが出力される', () => {
      // Given: マッピングなしの mediaInline ノード
      const adf = {
        content: [
          {
            content: [{ attrs: { id: 'unknown-123', type: 'file' }, type: 'mediaInline' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: プレースホルダーが出力される（Turndown がブラケットをエスケープ）
      expect(result).toContain('添付ファイル');
    });
  });

  describe('border マーク', () => {
    // テストの目的: border マーク付きの media ノードがボーダースタイル付きで出力されること
    it('Given: border マーク付きの media ノード, When: convertAdfToMarkdown を呼び出す, Then: border スタイル付きで出力される', () => {
      // Given: border マーク付きの media ノード
      const adf = {
        content: [
          {
            content: [
              {
                attrs: { id: 'media-123', type: 'file' },
                marks: [{ attrs: { color: '#091e42', size: 2 }, type: 'border' }],
                type: 'media',
              },
            ],
            type: 'mediaSingle',
          },
        ],
        type: 'doc',
        version: 1,
      };
      const attachmentPaths = { 'media-123': 'attachments/image.png' };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf, attachmentPaths);

      // Then: border スタイル付きで出力される
      expect(result).toContain('border');
      expect(result).toContain('#091e42');
      expect(result).toContain('attachments/image.png');
    });
  });

  describe('テーブル', () => {
    // テストの目的: テーブルが HTML テーブルとして出力されること（全テーブル HTML 出力方針）
    it('Given: テーブルを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: HTML テーブルとして出力される', () => {
      // Given: テーブルを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                content: [
                  {
                    content: [{ content: [{ text: 'ヘッダ1', type: 'text' }], type: 'paragraph' }],
                    type: 'tableHeader',
                  },
                  {
                    content: [{ content: [{ text: 'ヘッダ2', type: 'text' }], type: 'paragraph' }],
                    type: 'tableHeader',
                  },
                ],
                type: 'tableRow',
              },
              {
                content: [
                  { content: [{ content: [{ text: 'データ1', type: 'text' }], type: 'paragraph' }], type: 'tableCell' },
                  { content: [{ content: [{ text: 'データ2', type: 'text' }], type: 'paragraph' }], type: 'tableCell' },
                ],
                type: 'tableRow',
              },
            ],
            type: 'table',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToMarkdown を呼び出す
      const result = convertAdfToMarkdown(adf);

      // Then: HTML テーブル形式で出力される
      expect(result).toContain('<table>');
      expect(result).not.toMatch(/^\|/m); // Markdown テーブル形式ではない
      expect(result).toContain('ヘッダ1');
      expect(result).toContain('ヘッダ2');
      expect(result).toContain('データ1');
      expect(result).toContain('データ2');
    });
  });
});
