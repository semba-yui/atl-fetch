/**
 * Storage Format → PlainText 変換のテスト
 *
 * Given When Then パターンに沿って記述する。
 */

import { describe, expect, it } from 'vitest';

import { convertStorageFormatToPlainText } from './text-converter.js';

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
