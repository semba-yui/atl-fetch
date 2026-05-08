/**
 * Markdown 変換ユーティリティ
 *
 * TurndownService の設定と前処理を提供する
 */

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

import type { AttachmentPathMapping } from './types.js';

/**
 * 前処理: 無視する要素を削除し、Confluence 固有タグを処理
 *
 * @param html HTML 文字列
 * @param attachmentPaths 添付ファイルマッピング
 * @returns 前処理済み HTML
 */
export const preprocessHtmlForMarkdown = (html: string, attachmentPaths?: AttachmentPathMapping): string => {
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

  // ac:structured-macro name="toc" を [TOC] マーカーに変換（markdown-toc 互換形式）
  // toc は body を持たないため、Confluence は self-closing 形式 `<ac:structured-macro ac:name="toc" ... />`
  // でも出力する。両形式に対応する。
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="toc"[^>]*?(?:\/>|>[\s\S]*?<\/ac:structured-macro>)/gi,
    '<p>[TOC]</p>',
  );

  // ac:structured-macro name="anchor" を <a id="name"></a> に変換
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="anchor"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, innerContent: string) => {
      // パラメータの値を抽出（ac:name="" または ac:name="..." 両方対応）
      const paramMatch = innerContent.match(/<ac:parameter[^>]*>([^<]*)<\/ac:parameter>/i);
      const anchorName = paramMatch?.[1]?.trim() || '';
      return anchorName ? `<a id="${anchorName}"></a>` : '';
    },
  );

  // ac:structured-macro name="expand" を <details><summary>...</summary>...</details> に変換
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="expand"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, innerContent: string) => {
      // title パラメータを抽出
      const titleMatch = innerContent.match(/<ac:parameter[^>]*ac:name="title"[^>]*>([^<]*)<\/ac:parameter>/i);
      const title = titleMatch?.[1] || '展開';

      // rich-text-body の内容を抽出
      const bodyMatch = innerContent.match(/<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>/i);
      const body = bodyMatch?.[1] || '';

      return `<details><summary>${title}</summary>${body}</details>`;
    },
  );

  // ac:structured-macro name="excerpt" を処理（hidden=true は削除、それ以外は内容を出力）
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="excerpt"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, innerContent: string) => {
      // hidden パラメータをチェック
      const hiddenMatch = innerContent.match(/<ac:parameter[^>]*ac:name="hidden"[^>]*>([^<]*)<\/ac:parameter>/i);
      const isHidden = hiddenMatch?.[1]?.toLowerCase() === 'true';

      if (isHidden) {
        return ''; // hidden=true の場合は削除
      }

      // rich-text-body の内容を抽出
      const bodyMatch = innerContent.match(/<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>/i);
      return bodyMatch?.[1] || '';
    },
  );

  // ac:structured-macro name="excerpt-include" をプレースホルダーに変換
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="excerpt-include"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, innerContent: string) => {
      // ページ名を抽出
      const pageMatch = innerContent.match(/ri:content-title="([^"]*)"/i);
      const pageName = pageMatch?.[1] || '不明なページ';
      return `<p>[抜粋: ${pageName}]</p>`;
    },
  );

  // ac:structured-macro name="toc-zone" を [TOC] + 内容に変換
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="toc-zone"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, innerContent: string) => {
      // rich-text-body の内容を抽出
      const bodyMatch = innerContent.match(/<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>/i);
      const body = bodyMatch?.[1] || '';
      return `<p>[TOC]</p>${body}`;
    },
  );

  // ac:link + ri:page を Markdown リンクに変換（CDATA 処理後のパターンも対応）
  result = result.replace(
    /<ac:link[^>]*>[\s\S]*?<ri:page[^>]*ri:content-title="([^"]*)"[^>]*\/>[\s\S]*?<ac:plain-text-link-body[^>]*>([^<]*)<\/ac:plain-text-link-body>[\s\S]*?<\/ac:link>/gi,
    (_match, pageTitle: string, linkText: string) => {
      return `<a href="${pageTitle}">${linkText}</a>`;
    },
  );

  // ac:link + ri:page（リンクテキストなし）を処理
  result = result.replace(
    /<ac:link[^>]*>[\s\S]*?<ri:page[^>]*ri:content-title="([^"]*)"[^>]*\/>[\s\S]*?<\/ac:link>/gi,
    (_match, pageTitle: string) => {
      return `<a href="${pageTitle}">${pageTitle}</a>`;
    },
  );

  // ac:structured-macro name="column" を td タグに変換（先に処理）
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="column"[^>]*>[\s\S]*?<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>[\s\S]*?<\/ac:structured-macro>/gi,
    (_match, columnBody: string) => {
      return `<td>${columnBody}</td>`;
    },
  );

  // ac:structured-macro name="section" をテーブルに変換（column 処理後）
  result = result.replace(
    /<ac:structured-macro[^>]*ac:name="section"[^>]*>[\s\S]*?<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>[\s\S]*?<\/ac:structured-macro>/gi,
    (_match, sectionBody: string) => {
      // td タグがあればテーブルとして出力
      if (sectionBody.includes('<td>')) {
        return `<table><tr>${sectionBody.trim()}</tr></table>`;
      }
      return sectionBody;
    },
  );

  return result;
};

/**
 * TurndownService インスタンスを作成する（共通設定）
 * Jira ADF と Confluence Storage Format の両方で使用する
 *
 * @returns 設定済みの TurndownService インスタンス
 */
export const createTurndownService = (): TurndownService => {
  const turndownService = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
    strongDelimiter: '**',
  });

  // GFM プラグイン（テーブル、取り消し線など）を使用
  turndownService.use(gfm);

  // カスタムルール: キャプション付き画像（<figure>）
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

  // カスタムルール: GitHub Alerts（<blockquote data-github-alert="...">）
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

  // カスタムルール: 色変更テキスト（HTML のまま出力）
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

  // カスタムルール: アンカータグ（id 属性付き）を HTML のまま出力
  turndownService.addRule('anchorTag', {
    filter: (node) => {
      if (node.nodeName !== 'A') return false;
      return (node as Element).hasAttribute('id');
    },
    replacement: (_content, node) => {
      return (node as Element).outerHTML;
    },
  });

  // カスタムルール: 背景色テキスト（HTML のまま出力）
  turndownService.addRule('highlightedText', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false;
      const style = (node as Element).getAttribute('style') || '';
      return style.includes('background-color');
    },
    replacement: (_content, node) => {
      // HTML のまま出力
      return (node as Element).outerHTML;
    },
  });

  // カスタムルール: date ノード用（<time> タグから日付を抽出）
  turndownService.addRule('dateNode', {
    filter: 'time',
    replacement: (_, node) => {
      return (node as Element).getAttribute('datetime') || '';
    },
  });

  // カスタムルール: expand 用（<details> タグを HTML のまま出力）
  turndownService.addRule('expandDetails', {
    filter: 'details',
    replacement: (content, node) => {
      const element = node as Element;
      const summary = element.querySelector('summary')?.textContent || '展開';
      return `\n<details>\n<summary>${summary}</summary>\n\n${content.trim()}\n\n</details>\n`;
    },
  });

  // カスタムルール: border スタイル付き画像（HTML のまま出力）
  turndownService.addRule('borderedImage', {
    filter: (node) => {
      if (node.nodeName !== 'IMG') return false;
      const style = (node as Element).getAttribute('style') || '';
      return style.includes('border');
    },
    replacement: (_content, node) => {
      return (node as Element).outerHTML;
    },
  });

  // カスタムルール: 全テーブルを HTML のまま出力（シンプル・確実）
  // セル内リスト、画像、複数段落、コードなど全ケースで安定
  // Confluence の複雑なテーブルも確実に表示
  // Markdown 対応ビューアでも HTML テーブルは表示可能
  turndownService.addRule('allTables', {
    filter: 'table',
    replacement: (_content, node) => {
      return '\n\n' + (node as Element).outerHTML + '\n\n';
    },
  });

  return turndownService;
};
