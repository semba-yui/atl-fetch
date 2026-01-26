/**
 * ADF → PlainText 変換のテスト
 *
 * Given When Then パターンに沿って記述する。
 */

import { describe, expect, it } from 'vitest';
import { extractTextFromAdfNode } from './adf-to-plain-text.js';
import { convertAdfToPlainText } from './text-converter.js';

describe('convertAdfToPlainText', () => {
  describe('基本的なテキストノード', () => {
    // テストの目的: 単純なテキストノードをプレーンテキストに変換できること
    it('Given: 単純なテキストを含む ADF, When: convertAdfToPlainText を呼び出す, Then: プレーンテキストが返される', () => {
      // Given: 単純なテキストを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                text: 'これはテストです',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: プレーンテキストが返される
      expect(result).toBe('これはテストです');
    });

    // テストの目的: 複数のパラグラフが改行で区切られること
    it('Given: 複数のパラグラフを含む ADF, When: convertAdfToPlainText を呼び出す, Then: 各パラグラフが改行で区切られる', () => {
      // Given: 複数のパラグラフを含む ADF
      const adf = {
        content: [
          {
            content: [{ text: '1行目', type: 'text' }],
            type: 'paragraph',
          },
          {
            content: [{ text: '2行目', type: 'text' }],
            type: 'paragraph',
          },
          {
            content: [{ text: '3行目', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 各パラグラフが改行で区切られる
      expect(result).toBe('1行目\n2行目\n3行目');
    });
  });

  describe('見出しノード', () => {
    // テストの目的: 見出しがプレーンテキストに変換されること
    it('Given: 見出しを含む ADF, When: convertAdfToPlainText を呼び出す, Then: 見出しテキストが含まれる', () => {
      // Given: 見出しを含む ADF
      const adf = {
        content: [
          {
            attrs: { level: 1 },
            content: [{ text: 'タイトル', type: 'text' }],
            type: 'heading',
          },
          {
            content: [{ text: '本文', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 見出しテキストが厳密に含まれる
      expect(result).toBe('タイトル\n本文');
    });
  });

  describe('リストノード', () => {
    // テストの目的: 箇条書きリストがプレーンテキストに変換されること
    it('Given: 箇条書きリストを含む ADF, When: convertAdfToPlainText を呼び出す, Then: リストアイテムが改行区切りで出力される', () => {
      // Given: 箇条書きリストを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                content: [
                  {
                    content: [{ text: 'アイテム1', type: 'text' }],
                    type: 'paragraph',
                  },
                ],
                type: 'listItem',
              },
              {
                content: [
                  {
                    content: [{ text: 'アイテム2', type: 'text' }],
                    type: 'paragraph',
                  },
                ],
                type: 'listItem',
              },
            ],
            type: 'bulletList',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: リストアイテムが改行区切りで出力される（末尾改行を含む）
      expect(result).toBe('アイテム1\nアイテム2\n');
    });

    // テストの目的: 番号付きリストがプレーンテキストに変換されること
    it('Given: 番号付きリストを含む ADF, When: convertAdfToPlainText を呼び出す, Then: リストアイテムが改行区切りで出力される', () => {
      // Given: 番号付きリストを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                content: [
                  {
                    content: [{ text: '手順1', type: 'text' }],
                    type: 'paragraph',
                  },
                ],
                type: 'listItem',
              },
              {
                content: [
                  {
                    content: [{ text: '手順2', type: 'text' }],
                    type: 'paragraph',
                  },
                ],
                type: 'listItem',
              },
            ],
            type: 'orderedList',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: リストアイテムが改行区切りで出力される（末尾改行を含む）
      expect(result).toBe('手順1\n手順2\n');
    });
  });

  describe('コードブロック', () => {
    // テストの目的: コードブロックがプレーンテキストに変換されること
    it('Given: コードブロックを含む ADF, When: convertAdfToPlainText を呼び出す, Then: コードテキストが正確に出力される', () => {
      // Given: コードブロックを含む ADF
      const adf = {
        content: [
          {
            attrs: { language: 'typescript' },
            content: [{ text: 'const x = 1;', type: 'text' }],
            type: 'codeBlock',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: コードテキストが正確に出力される
      expect(result).toBe('const x = 1;');
    });
  });

  describe('インラインコード', () => {
    // テストの目的: インラインコードがプレーンテキストに変換されること
    it('Given: インラインコードを含む ADF, When: convertAdfToPlainText を呼び出す, Then: 文全体が正確に出力される', () => {
      // Given: インラインコードを含む ADF
      const adf = {
        content: [
          {
            content: [
              { text: 'コマンド ', type: 'text' },
              { marks: [{ type: 'code' }], text: 'npm install', type: 'text' },
              { text: ' を実行', type: 'text' },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 文全体が正確に出力される
      expect(result).toBe('コマンド npm install を実行');
    });
  });

  describe('リンク', () => {
    // テストの目的: リンクのテキストがプレーンテキストに含まれること
    it('Given: リンクを含む ADF, When: convertAdfToPlainText を呼び出す, Then: リンクテキストが正確に出力される', () => {
      // Given: リンクを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                marks: [{ attrs: { href: 'https://atlassian.com' }, type: 'link' }],
                text: 'Atlassian',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: リンクテキストが正確に出力される
      expect(result).toBe('Atlassian');
    });
  });

  describe('テーブル', () => {
    // テストの目的: テーブルのセル内容がプレーンテキストに変換されること
    it('Given: テーブルを含む ADF, When: convertAdfToPlainText を呼び出す, Then: セル内容がタブと改行で区切られる', () => {
      // Given: テーブルを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                content: [
                  {
                    content: [
                      {
                        content: [{ text: 'ヘッダー1', type: 'text' }],
                        type: 'paragraph',
                      },
                    ],
                    type: 'tableHeader',
                  },
                  {
                    content: [
                      {
                        content: [{ text: 'ヘッダー2', type: 'text' }],
                        type: 'paragraph',
                      },
                    ],
                    type: 'tableHeader',
                  },
                ],
                type: 'tableRow',
              },
              {
                content: [
                  {
                    content: [
                      {
                        content: [{ text: 'セル1', type: 'text' }],
                        type: 'paragraph',
                      },
                    ],
                    type: 'tableCell',
                  },
                  {
                    content: [
                      {
                        content: [{ text: 'セル2', type: 'text' }],
                        type: 'paragraph',
                      },
                    ],
                    type: 'tableCell',
                  },
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

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: セル内容がタブと改行で区切られる（末尾改行を含む）
      expect(result).toBe('ヘッダー1\tヘッダー2\nセル1\tセル2\n');
    });
  });

  describe('メンション', () => {
    // テストの目的: メンションがプレーンテキストに変換されること
    it('Given: メンションを含む ADF, When: convertAdfToPlainText を呼び出す, Then: メンション名が正確に出力される', () => {
      // Given: メンションを含む ADF
      const adf = {
        content: [
          {
            content: [
              { text: 'CC: ', type: 'text' },
              {
                attrs: {
                  id: 'user-123',
                  text: '@田中太郎',
                },
                type: 'mention',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: メンション名が正確に出力される
      expect(result).toBe('CC: @田中太郎');
    });

    // テストの目的: text 属性がない場合はデフォルトのプレースホルダーが返されること
    it('Given: text 属性がないメンション, When: convertAdfToPlainText を呼び出す, Then: @ユーザー が返される', () => {
      // Given: text 属性がないメンション
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  id: 'user-123',
                },
                type: 'mention',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: @ユーザー が返される
      expect(result).toBe('@ユーザー');
    });

    // テストの目的: text 属性が文字列以外の場合はデフォルトプレースホルダーが返されること
    it('Given: text 属性が数値のメンション, When: convertAdfToPlainText を呼び出す, Then: @ユーザー が返される', () => {
      // Given: text 属性が数値のメンション
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  id: 'user-123',
                  text: 12345,
                },
                type: 'mention',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: @ユーザー が返される
      expect(result).toBe('@ユーザー');
    });

    // テストの目的: attrs が undefined の場合はデフォルトプレースホルダーが返されること
    it('Given: attrs がないメンション, When: convertAdfToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: attrs がないメンション
      const adf = {
        content: [
          {
            content: [
              {
                type: 'mention',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される（attrs がないのでそのまま空）
      expect(result).toBe('');
    });
  });

  describe('絵文字', () => {
    // テストの目的: 絵文字の text 属性が優先されること
    it('Given: text 属性を持つ絵文字, When: convertAdfToPlainText を呼び出す, Then: text が正確に出力される', () => {
      // Given: text 属性を持つ絵文字
      const adf = {
        content: [
          {
            content: [
              { text: '完了 ', type: 'text' },
              {
                attrs: {
                  shortName: ':check_mark:',
                  text: '✅',
                },
                type: 'emoji',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: text が正確に出力される（text 属性が優先）
      expect(result).toBe('完了 ✅');
    });

    // テストの目的: text がなく shortName のみの場合は shortName が表示されること
    it('Given: shortName のみを持つ絵文字, When: convertAdfToPlainText を呼び出す, Then: shortName が出力される', () => {
      // Given: shortName のみを持つ絵文字
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  shortName: ':thumbsup:',
                },
                type: 'emoji',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: shortName が出力される
      expect(result).toBe(':thumbsup:');
    });

    // テストの目的: text も shortName もない場合は空文字列が返されること
    it('Given: text も shortName もない絵文字, When: convertAdfToPlainText を呼び出す, Then: 空文字列が出力される', () => {
      // Given: text も shortName もない絵文字
      const adf = {
        content: [
          {
            content: [
              { text: '絵文字:', type: 'text' },
              {
                attrs: {
                  id: 'emoji-123',
                },
                type: 'emoji',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 絵文字部分は空文字列になる
      expect(result).toBe('絵文字:');
    });

    // テストの目的: attrs が undefined の場合は空文字列が返されること
    it('Given: attrs がない絵文字, When: convertAdfToPlainText を呼び出す, Then: 空文字列が出力される', () => {
      // Given: attrs がない絵文字
      const adf = {
        content: [
          {
            content: [
              {
                type: 'emoji',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: text が数値の場合は shortName が使用されること
    it('Given: text が数値で shortName が文字列の絵文字, When: convertAdfToPlainText を呼び出す, Then: shortName が出力される', () => {
      // Given: text が数値で shortName が文字列の絵文字
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  shortName: ':smile:',
                  text: 123,
                },
                type: 'emoji',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: shortName が出力される
      expect(result).toBe(':smile:');
    });

    // テストの目的: text も shortName も文字列でない場合は空文字列が返されること
    it('Given: text も shortName も数値の絵文字, When: convertAdfToPlainText を呼び出す, Then: 空文字列が出力される', () => {
      // Given: text も shortName も数値の絵文字
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  shortName: 456,
                  text: 123,
                },
                type: 'emoji',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });
  });

  describe('引用ブロック', () => {
    // テストの目的: 引用ブロックがプレーンテキストに変換されること
    it('Given: 引用ブロックを含む ADF, When: convertAdfToPlainText を呼び出す, Then: 引用テキストが正確に出力される', () => {
      // Given: 引用ブロックを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                content: [{ text: 'これは引用です', type: 'text' }],
                type: 'paragraph',
              },
            ],
            type: 'blockquote',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 引用テキストが正確に出力される
      expect(result).toBe('これは引用です');
    });
  });

  describe('null または不正な入力', () => {
    // テストの目的: null を渡した場合に空文字列が返されること
    it('Given: null, When: convertAdfToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: null
      const adf = null;

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: undefined を渡した場合に空文字列が返されること
    it('Given: undefined, When: convertAdfToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: undefined
      const adf = undefined;

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: 文字列を渡した場合にそのまま返されること（JSON 解析を試みる）
    it('Given: JSON 文字列の ADF, When: convertAdfToPlainText を呼び出す, Then: プレーンテキストが返される', () => {
      // Given: JSON 文字列の ADF
      const adf = JSON.stringify({
        content: [
          {
            content: [{ text: 'JSON文字列入力', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      });

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: プレーンテキストが返される
      expect(result).toBe('JSON文字列入力');
    });

    // テストの目的: 不正な JSON 文字列の場合はそのまま返されること
    it('Given: 不正な JSON 文字列, When: convertAdfToPlainText を呼び出す, Then: 元の文字列が返される', () => {
      // Given: 不正な JSON 文字列
      const adf = 'これは普通のテキストです';

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 元の文字列が返される
      expect(result).toBe('これは普通のテキストです');
    });

    // テストの目的: content が空の場合に空文字列が返されること
    it('Given: content が空の ADF, When: convertAdfToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: content が空の ADF
      const adf = {
        content: [],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });
  });

  describe('硬い改行（hardBreak）', () => {
    // テストの目的: hardBreak が改行に変換されること
    it('Given: hardBreak を含む ADF, When: convertAdfToPlainText を呼び出す, Then: 改行が正確に出力される', () => {
      // Given: hardBreak を含む ADF
      const adf = {
        content: [
          {
            content: [{ text: '1行目', type: 'text' }, { type: 'hardBreak' }, { text: '2行目', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 改行が正確に出力される
      expect(result).toBe('1行目\n2行目');
    });

    // テストの目的: 複数の連続する hardBreak が複数の改行に変換されること
    it('Given: 複数の連続する hardBreak, When: convertAdfToPlainText を呼び出す, Then: 複数の改行が出力される', () => {
      // Given: 複数の連続する hardBreak
      const adf = {
        content: [
          {
            content: [
              { text: '1行目', type: 'text' },
              { type: 'hardBreak' },
              { type: 'hardBreak' },
              { text: '3行目', type: 'text' },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 複数の改行が出力される
      expect(result).toBe('1行目\n\n3行目');
    });

    // テストの目的: hardBreak のみの場合は改行のみが返されること
    it('Given: hardBreak のみのパラグラフ, When: convertAdfToPlainText を呼び出す, Then: 改行のみが出力される', () => {
      // Given: hardBreak のみのパラグラフ
      const adf = {
        content: [
          {
            content: [{ type: 'hardBreak' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 改行のみが出力される
      expect(result).toBe('\n');
    });
  });

  describe('パネル', () => {
    // テストの目的: パネル内のテキストがプレーンテキストに変換されること
    it('Given: パネルを含む ADF, When: convertAdfToPlainText を呼び出す, Then: パネル内テキストが正確に出力される', () => {
      // Given: パネルを含む ADF
      const adf = {
        content: [
          {
            attrs: { panelType: 'info' },
            content: [
              {
                content: [{ text: '重要な情報', type: 'text' }],
                type: 'paragraph',
              },
            ],
            type: 'panel',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: パネル内テキストが正確に出力される
      expect(result).toBe('重要な情報');
    });
  });

  describe('メディア', () => {
    // テストの目的: メディアノードがプレースホルダーに変換されること
    it('Given: メディアを含む ADF, When: convertAdfToPlainText を呼び出す, Then: プレースホルダーが正確に出力される', () => {
      // Given: メディアを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  collection: 'attachments',
                  id: 'media-123',
                  type: 'file',
                },
                type: 'media',
              },
            ],
            type: 'mediaSingle',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 添付ファイルのプレースホルダーが正確に出力される
      expect(result).toBe('[添付ファイル]');
    });

    // テストの目的: 複数のメディアノードが連結されること
    it('Given: 複数のメディアを含む ADF, When: convertAdfToPlainText を呼び出す, Then: 複数のプレースホルダーが出力される', () => {
      // Given: 複数のメディアを含む ADF
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  collection: 'attachments',
                  id: 'media-1',
                  type: 'file',
                },
                type: 'media',
              },
            ],
            type: 'mediaSingle',
          },
          {
            content: [
              {
                attrs: {
                  collection: 'attachments',
                  id: 'media-2',
                  type: 'file',
                },
                type: 'media',
              },
            ],
            type: 'mediaSingle',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 複数のプレースホルダーが改行区切りで出力される
      expect(result).toBe('[添付ファイル]\n[添付ファイル]');
    });

    // テストの目的: media ノードが直接存在する場合もプレースホルダーに変換されること
    it('Given: media ノードのみ（mediaSingle なし）, When: convertAdfToPlainText を呼び出す, Then: プレースホルダーが出力される', () => {
      // Given: media ノードのみ
      const adf = {
        content: [
          {
            content: [
              {
                attrs: {
                  collection: 'attachments',
                  id: 'media-123',
                  type: 'file',
                },
                type: 'media',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: プレースホルダーが出力される
      expect(result).toBe('[添付ファイル]');
    });
  });

  describe('不正なオブジェクト入力', () => {
    // テストの目的: ADF 形式でないオブジェクトは空文字列を返すこと
    it('Given: type が doc でないオブジェクト, When: convertAdfToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: type が doc でないオブジェクト
      const adf = {
        content: [],
        type: 'paragraph',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: content がないオブジェクトは空文字列を返すこと
    it('Given: content がないオブジェクト, When: convertAdfToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: content がないオブジェクト
      const adf = {
        type: 'doc',
        version: 1,
      };

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: 有効な JSON だが ADF 形式でない文字列はそのまま返されること
    it('Given: ADF 形式でない JSON 文字列, When: convertAdfToPlainText を呼び出す, Then: 元の文字列が返される', () => {
      // Given: ADF 形式でない JSON 文字列
      const adf = JSON.stringify({ name: 'test', value: 123 });

      // When: convertAdfToPlainText を呼び出す
      const result = convertAdfToPlainText(adf);

      // Then: 元の文字列が返される
      expect(result).toBe(adf);
    });
  });
});

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
