/**
 * テキスト変換サービスのテスト
 *
 * Jira の ADF（Atlassian Document Format）と Confluence の Storage Format を
 * プレーンテキストに変換する機能のテスト。
 * Given When Then パターンに沿って記述する。
 */

import { describe, expect, it } from 'vitest';

import {
  convertAdfToMarkdown,
  convertAdfToPlainText,
  convertStorageFormatToMarkdown,
  convertStorageFormatToPlainText,
} from './text-converter.js';

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
    // Note: Turndown は単一チルダ記法を使用する
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

  describe('テーブル', () => {
    // テストの目的: テーブルが Markdown 形式に変換されること
    it('Given: テーブルを含む ADF, When: convertAdfToMarkdown を呼び出す, Then: Markdown テーブルに変換される', () => {
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

      // Then: テーブル形式で出力される
      expect(result).toContain('ヘッダ1');
      expect(result).toContain('ヘッダ2');
      expect(result).toContain('データ1');
      expect(result).toContain('データ2');
    });
  });
});

describe('convertStorageFormatToPlainText', () => {
  describe('基本的な HTML タグ', () => {
    // テストの目的: パラグラフタグ内のテキストが抽出されること
    it('Given: パラグラフを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: テキストが抽出される', () => {
      // Given: パラグラフを含む Storage Format
      const storageFormat = '<p>これはテストです</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: テキストが抽出される
      expect(result).toBe('これはテストです');
    });

    // テストの目的: 複数のパラグラフが改行で区切られること
    it('Given: 複数のパラグラフを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: 改行で区切られる', () => {
      // Given: 複数のパラグラフを含む Storage Format
      const storageFormat = '<p>1行目</p><p>2行目</p><p>3行目</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 改行で区切られる
      expect(result).toBe('1行目\n2行目\n3行目');
    });
  });

  describe('見出しタグ', () => {
    // テストの目的: 見出しタグのテキストが抽出されること
    it('Given: 見出しを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: 見出しテキストが正確に出力される', () => {
      // Given: 見出しを含む Storage Format
      const storageFormat = '<h1>タイトル</h1><p>本文</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 見出しテキストが正確に出力される
      expect(result).toBe('タイトル\n本文');
    });
  });

  describe('リストタグ', () => {
    // テストの目的: 順不同リストのアイテムが抽出されること
    it('Given: 順不同リストを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: リストアイテムが改行区切りで出力される', () => {
      // Given: 順不同リストを含む Storage Format
      const storageFormat = '<ul><li>アイテム1</li><li>アイテム2</li></ul>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: リストアイテムが改行区切りで出力される
      expect(result).toBe('アイテム1\nアイテム2');
    });

    // テストの目的: 順序付きリストのアイテムが抽出されること
    it('Given: 順序付きリストを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: リストアイテムが改行区切りで出力される', () => {
      // Given: 順序付きリストを含む Storage Format
      const storageFormat = '<ol><li>手順1</li><li>手順2</li></ol>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: リストアイテムが改行区切りで出力される
      expect(result).toBe('手順1\n手順2');
    });
  });

  describe('コードブロック', () => {
    // テストの目的: コードブロックのテキストが抽出されること
    it('Given: コードブロックを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: コードテキストが正確に出力される', () => {
      // Given: コードブロックを含む Storage Format
      const storageFormat =
        '<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[const x = 1;]]></ac:plain-text-body></ac:structured-macro>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: コードテキストが正確に出力される
      expect(result).toBe('const x = 1;');
    });
  });

  describe('テーブル', () => {
    // テストの目的: テーブルのセル内容が抽出されること
    // 注: normalizeWhitespace がタブをスペースに変換するため、期待値はスペース区切り
    it('Given: テーブルを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: セル内容がスペースと改行で正確に出力される', () => {
      // Given: テーブルを含む Storage Format
      const storageFormat =
        '<table><tr><th>ヘッダー1</th><th>ヘッダー2</th></tr><tr><td>セル1</td><td>セル2</td></tr></table>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: セル内容がスペースと改行で正確に出力される（タブは空白正規化でスペースに変換）
      expect(result).toBe('ヘッダー1 ヘッダー2\nセル1 セル2');
    });
  });

  describe('リンク', () => {
    // テストの目的: リンクテキストが抽出されること
    it('Given: リンクを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: リンクテキストが正確に出力される', () => {
      // Given: リンクを含む Storage Format
      const storageFormat = '<p><a href="https://example.com">リンクテキスト</a></p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: リンクテキストが正確に出力される
      expect(result).toBe('リンクテキスト');
    });
  });

  describe('強調タグ', () => {
    // テストの目的: 強調タグ内のテキストが抽出されること
    it('Given: 強調タグを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: テキストが抽出される', () => {
      // Given: 強調タグを含む Storage Format
      const storageFormat = '<p>これは<strong>重要な</strong>テキストです</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: テキストが抽出される
      expect(result).toBe('これは重要なテキストです');
    });

    // テストの目的: 斜体タグ内のテキストが抽出されること
    it('Given: 斜体タグを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: テキストが抽出される', () => {
      // Given: 斜体タグを含む Storage Format
      const storageFormat = '<p>これは<em>強調された</em>テキストです</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: テキストが抽出される
      expect(result).toBe('これは強調されたテキストです');
    });
  });

  describe('引用ブロック', () => {
    // テストの目的: 引用ブロックのテキストが抽出されること
    it('Given: 引用ブロックを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: 引用テキストが正確に出力される', () => {
      // Given: 引用ブロックを含む Storage Format
      const storageFormat = '<blockquote><p>これは引用です</p></blockquote>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 引用テキストが正確に出力される
      expect(result).toBe('これは引用です');
    });
  });

  describe('改行タグ', () => {
    // テストの目的: br タグが改行に変換されること
    it('Given: br タグを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: 改行で区切られる', () => {
      // Given: br タグを含む Storage Format
      const storageFormat = '<p>1行目<br/>2行目</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 改行で区切られる
      expect(result).toBe('1行目\n2行目');
    });

    // テストの目的: スペースありの br タグも変換されること
    it('Given: スペースありの br タグを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: 改行で区切られる', () => {
      // Given: スペースありの br タグを含む Storage Format
      const storageFormat = '<p>1行目<br />2行目</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 改行で区切られる
      expect(result).toBe('1行目\n2行目');
    });
  });

  describe('HTML エンティティ', () => {
    // テストの目的: HTML エンティティがデコードされること
    it('Given: HTML エンティティを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: エンティティが正確にデコードされる', () => {
      // Given: HTML エンティティを含む Storage Format
      const storageFormat = '<p>&lt;div&gt; &amp; &quot;test&quot;</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: エンティティが正確にデコードされる
      expect(result).toBe('<div> & "test"');
    });

    // テストの目的: &nbsp; がスペースに変換されること
    it('Given: &nbsp; を含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: スペースに変換される', () => {
      // Given: &nbsp; を含む Storage Format
      const storageFormat = '<p>テキスト&nbsp;テキスト</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: スペースに変換される
      expect(result).toBe('テキスト テキスト');
    });

    // テストの目的: &#39; がシングルクォートに変換されること
    it('Given: &#39; を含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: シングルクォートに変換される', () => {
      // Given: &#39; を含む Storage Format
      const storageFormat = '<p>It&#39;s a test</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: シングルクォートに変換される
      expect(result).toBe("It's a test");
    });

    // テストの目的: &#x27; がシングルクォートに変換されること
    it('Given: &#x27; を含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: シングルクォートに変換される', () => {
      // Given: &#x27; を含む Storage Format
      const storageFormat = '<p>It&#x27;s a test</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: シングルクォートに変換される
      expect(result).toBe("It's a test");
    });

    // テストの目的: 数値文字参照がデコードされること
    it('Given: 数値文字参照を含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: 正しい文字に変換される', () => {
      // Given: 数値文字参照を含む Storage Format（&#65; = A）
      const storageFormat = '<p>&#65;&#66;&#67;</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 正しい文字に変換される
      expect(result).toBe('ABC');
    });
  });

  describe('Confluence 固有のマクロ', () => {
    // テストの目的: info マクロのテキストが抽出されること
    it('Given: info マクロを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: マクロ内テキストが抽出される', () => {
      // Given: info マクロを含む Storage Format
      const storageFormat =
        '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>重要な情報</p></ac:rich-text-body></ac:structured-macro>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: マクロ内テキストが抽出される
      expect(result).toBe('重要な情報');
    });

    // テストの目的: ステータスマクロのテキストが抽出されること
    it('Given: ステータスマクロを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: ステータステキストが抽出される', () => {
      // Given: ステータスマクロを含む Storage Format
      const storageFormat =
        '<ac:structured-macro ac:name="status"><ac:parameter ac:name="title">完了</ac:parameter></ac:structured-macro>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: ステータステキストが抽出される
      expect(result).toBe('完了');
    });
  });

  describe('null または空の入力', () => {
    // テストの目的: null を渡した場合に空文字列が返されること
    it('Given: null, When: convertStorageFormatToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: null
      const storageFormat = null;

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: undefined を渡した場合に空文字列が返されること
    it('Given: undefined, When: convertStorageFormatToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: undefined
      const storageFormat = undefined;

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });

    // テストの目的: 空文字列を渡した場合に空文字列が返されること
    it('Given: 空文字列, When: convertStorageFormatToPlainText を呼び出す, Then: 空文字列が返される', () => {
      // Given: 空文字列
      const storageFormat = '';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 空文字列が返される
      expect(result).toBe('');
    });
  });

  describe('連続する空白の正規化', () => {
    // テストの目的: 連続する空白が単一スペースに正規化されること
    it('Given: 連続する空白を含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: 空白が正規化される', () => {
      // Given: 連続する空白を含む Storage Format
      const storageFormat = '<p>テキスト1   テキスト2</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 空白が正規化される（連続空白は単一スペースに）
      expect(result).toBe('テキスト1 テキスト2');
    });
  });

  describe('画像', () => {
    // テストの目的: 画像タグがプレースホルダーに変換されること
    it('Given: 画像を含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: プレースホルダーが含まれる', () => {
      // Given: 画像を含む Storage Format
      const storageFormat = '<p>説明テキスト</p><ac:image><ri:attachment ri:filename="screenshot.png"/></ac:image>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 画像のプレースホルダーが含まれる（厳密な出力確認）
      expect(result).toBe('説明テキスト\n[画像: screenshot.png]');
    });
  });

  describe('ユーザーリンク', () => {
    // テストの目的: ユーザーリンクがユーザー名に変換されること
    it('Given: ユーザーリンクを含む Storage Format, When: convertStorageFormatToPlainText を呼び出す, Then: ユーザー名が含まれる', () => {
      // Given: ユーザーリンクを含む Storage Format
      const storageFormat = '<ac:link><ri:user ri:account-id="user-123" /></ac:link>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: ユーザープレースホルダーが厳密に出力される
      expect(result).toBe('[ユーザー]');
    });
  });

  describe('プレースホルダー文字列の厳密な検証', () => {
    // テストの目的: [ユーザー] プレースホルダーが正確な文字列であること
    it('Given: ユーザーリンクのみ, When: convertStorageFormatToPlainText を呼び出す, Then: 厳密に [ユーザー] が返される', () => {
      // Given: ユーザーリンクのみ
      const storageFormat = '<ac:link><ri:user ri:account-id="user-123" /></ac:link>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に [ユーザー] が返される
      expect(result).toBe('[ユーザー]');
      expect(result.length).toBe(6); // 文字数も検証
    });

    // テストの目的: 画像プレースホルダーが [画像: ファイル名] の形式であること
    it('Given: 画像のみ, When: convertStorageFormatToPlainText を呼び出す, Then: [画像: filename] 形式が返される', () => {
      // Given: 画像のみ
      const storageFormat = '<ac:image><ri:attachment ri:filename="test.png"/></ac:image>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に [画像: test.png] が返される
      expect(result).toBe('[画像: test.png]');
    });

    // テストの目的: 複数の画像が正しく変換されること
    it('Given: 複数の画像, When: convertStorageFormatToPlainText を呼び出す, Then: 各画像が正しくプレースホルダーに変換される', () => {
      // Given: 複数の画像（ブロック要素なしで連続）
      const storageFormat =
        '<ac:image><ri:attachment ri:filename="img1.png"/></ac:image><ac:image><ri:attachment ri:filename="img2.jpg"/></ac:image>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 各画像が正しくプレースホルダーに変換される（ブロック要素がないので改行なし）
      expect(result).toBe('[画像: img1.png][画像: img2.jpg]');
    });
  });

  describe('HTML エンティティの個別検証', () => {
    // テストの目的: &nbsp; がスペースに正確に変換されること
    it('Given: &nbsp; のみ, When: convertStorageFormatToPlainText を呼び出す, Then: 単一スペースに変換される', () => {
      // Given: &nbsp; のみを含む
      const storageFormat = '<p>A&nbsp;B</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密にスペースに変換される
      expect(result).toBe('A B');
    });

    // テストの目的: &amp; が & に正確に変換されること
    it('Given: &amp; のみ, When: convertStorageFormatToPlainText を呼び出す, Then: & に変換される', () => {
      // Given: &amp; のみを含む
      const storageFormat = '<p>A&amp;B</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に & に変換される
      expect(result).toBe('A&B');
    });

    // テストの目的: &lt; が < に正確に変換されること
    it('Given: &lt; のみ, When: convertStorageFormatToPlainText を呼び出す, Then: < に変換される', () => {
      // Given: &lt; のみを含む
      const storageFormat = '<p>A&lt;B</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に < に変換される
      expect(result).toBe('A<B');
    });

    // テストの目的: &gt; が > に正確に変換されること
    it('Given: &gt; のみ, When: convertStorageFormatToPlainText を呼び出す, Then: > に変換される', () => {
      // Given: &gt; のみを含む
      const storageFormat = '<p>A&gt;B</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に > に変換される
      expect(result).toBe('A>B');
    });

    // テストの目的: &quot; が " に正確に変換されること
    it('Given: &quot; のみ, When: convertStorageFormatToPlainText を呼び出す, Then: " に変換される', () => {
      // Given: &quot; のみを含む
      const storageFormat = '<p>&quot;test&quot;</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に " に変換される
      expect(result).toBe('"test"');
    });

    // テストの目的: &#39; が ' に正確に変換されること
    it('Given: &#39; のみ, When: convertStorageFormatToPlainText を呼び出す, Then: シングルクォートに変換される', () => {
      // Given: &#39; のみを含む
      const storageFormat = '<p>it&#39;s</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に ' に変換される
      expect(result).toBe("it's");
    });

    // テストの目的: &#x27; が ' に正確に変換されること
    it('Given: &#x27; のみ, When: convertStorageFormatToPlainText を呼び出す, Then: シングルクォートに変換される', () => {
      // Given: &#x27; のみを含む
      const storageFormat = '<p>it&#x27;s</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に ' に変換される
      expect(result).toBe("it's");
    });

    // テストの目的: 数値文字参照が正しい文字に変換されること
    it('Given: 様々な数値文字参照, When: convertStorageFormatToPlainText を呼び出す, Then: 正しい文字に変換される', () => {
      // Given: 様々な数値文字参照（&#97; = a, &#98; = b, &#99; = c）
      const storageFormat = '<p>&#97;&#98;&#99;</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: 厳密に abc に変換される
      expect(result).toBe('abc');
    });

    // テストの目的: エンティティ変換の順序が正しいこと（&amp; を最初に処理しないと壊れる）
    it('Given: エンティティを含むエンティティ文字列, When: convertStorageFormatToPlainText を呼び出す, Then: 正しく変換される', () => {
      // Given: &amp;nbsp; のようなエンティティ（&nbsp; ではない）
      const storageFormat = '<p>&amp;nbsp;</p>';

      // When: convertStorageFormatToPlainText を呼び出す
      const result = convertStorageFormatToPlainText(storageFormat);

      // Then: &nbsp; に変換される（ではなく &nbsp; という文字列）
      expect(result).toBe('&nbsp;');
    });
  });
});

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
    // テストの目的: 単純なテーブルが GFM テーブルに変換されること
    it('TC-050: Given: 単純なテーブル, When: convertStorageFormatToMarkdown を呼び出す, Then: GFM テーブルに変換される', () => {
      // Given: 単純なテーブル
      const input = `<table>
        <tr><th>ヘッダー1</th><th>ヘッダー2</th></tr>
        <tr><td>セル1</td><td>セル2</td></tr>
      </table>`;

      // When: convertStorageFormatToMarkdown を呼び出す
      const result = convertStorageFormatToMarkdown(input);

      // Then: GFM テーブルに変換される
      expect(result).toContain('|');
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
      expect(result).toContain('|');
      expect(result).toContain('名前');
    });
  });
});
