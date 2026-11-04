import { describe, expect, test } from 'bun:test';

import { preprocessContent } from './preprocess';

describe(preprocessContent.name, () => {
  test('Should convert \\( \\) to inline math.', () => {
    expect(preprocessContent('Solve \\(x^2\\) now.')).toEqual(
      'Solve $x^2$ now.'
    );
  });

  test('Should convert \\[ \\] to display math, across lines.', () => {
    expect(preprocessContent('\\[ \\int f \\]')).toEqual('$$\\int f$$');
    expect(preprocessContent('\\[\na + b\n\\]')).toEqual('$$a + b$$');
  });

  test('Should strip the leading filler line.', () => {
    expect(
      preprocessContent("Here's the answer to your question:\nApply early.")
    ).toEqual('Apply early.');
  });

  test('Should convert HTML math to $ delimiters.', () => {
    const text =
      '<span class="math-inline" data-math="x &lt; 5">x</span> and ' +
      '<div class="math-block" data-math="y^2">y</div>';

    expect(preprocessContent(text)).toEqual('$x < 5$ and $$y^2$$');
  });

  test('Should strip HTML tags but keep comparisons in prose.', () => {
    expect(preprocessContent('<b>Note</b>: 2 < 3 and 5 > 4')).toEqual(
      'Note: 2 < 3 and 5 > 4'
    );
  });

  test('Should not touch fenced code.', () => {
    const text = '```mermaid\ngraph TD\nA{p < 0.05?} --> B\n```';

    expect(preprocessContent(text)).toEqual(text);
  });

  test('Should not convert \\( inside fenced code.', () => {
    const text = '```js\nconst re = /\\(a\\)/;\n```';

    expect(preprocessContent(text)).toEqual(text);
  });
});
