import { describe, expect, test } from 'bun:test';

import { safeKatexRender } from './katex';

describe(safeKatexRender.name, () => {
  test('Should render valid LaTeX.', () => {
    const html = safeKatexRender('x^2 + y^2 = z^2', false);

    expect(html).toContain('class="katex"');
  });

  test('Should render display math.', () => {
    const html = safeKatexRender('\\int_{a}^{b} f(x) \\, dx', true);

    expect(html).toContain('katex-display');
  });

  test('Should show the escaped source instead of the KaTeX error.', () => {
    const html = safeKatexRender('\\frac{', false);

    expect(html).toEqual('<span class="math-fallback">\\frac{</span>');
    expect(html).not.toContain('#cc0000');
    expect(html).not.toContain('parse-error');
  });

  test('Should escape HTML in the fallback.', () => {
    const html = safeKatexRender('\\notacommand{<script>}', false);

    expect(html).toContain('math-fallback');
    expect(html).not.toContain('<script>');
  });

  test('Should drop a stray closing brace and render.', () => {
    const html = safeKatexRender('w = abba \\in \\Sigma^*}', false);

    expect(html).toContain('class="katex"');
    expect(html).not.toContain('math-fallback');
  });
});
