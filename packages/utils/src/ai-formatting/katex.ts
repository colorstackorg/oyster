import katex from 'katex';

import {
  balanceLatexBraces,
  escapeHtml,
  isKaTeXErrorOutput,
  normalizeLatex,
} from './math';

/**
 * Renders LaTeX to HTML with KaTeX. If the formula fails to render, this
 * returns the escaped LaTeX source instead of KaTeX's red error output.
 */
export function safeKatexRender(latex: string, displayMode: boolean): string {
  const normalized = normalizeLatex(balanceLatexBraces(latex));

  try {
    const html = katex.renderToString(normalized, {
      displayMode,
      throwOnError: true,
    });

    if (!isKaTeXErrorOutput(html)) {
      return html;
    }
  } catch {
    // Falls through to the escaped source below.
  }

  return `<span class="math-fallback">${escapeHtml(latex.trim())}</span>`;
}
