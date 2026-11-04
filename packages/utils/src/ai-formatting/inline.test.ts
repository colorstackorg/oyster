import { describe, expect, test } from 'bun:test';

import { parseInline } from './inline';

describe(parseInline.name, () => {
  test('Should keep multiplication asterisks as text.', () => {
    expect(parseInline('5 * 3 * 2')).toEqual([
      { type: 'text', content: '5 * 3 * 2' },
    ]);
  });

  test('Should keep math inside bold.', () => {
    expect(parseInline('**solve $x^2$**')).toEqual([
      {
        type: 'bold',
        children: [
          { type: 'text', content: 'solve ' },
          { type: 'math', latex: 'x^2' },
        ],
      },
    ]);
  });

  test('Should not turn the * in two formulas into italics.', () => {
    expect(
      parseInline('$w \\in \\Sigma^*$ and $L \\subseteq \\Sigma^*$')
    ).toEqual([
      { type: 'math', latex: 'w \\in \\Sigma^*' },
      { type: 'text', content: ' and ' },
      { type: 'math', latex: 'L \\subseteq \\Sigma^*' },
    ]);
  });

  test('Should keep the stray brace inside the math for KaTeX to fix.', () => {
    expect(parseInline('$w = abba \\in \\Sigma^*}$')).toEqual([
      { type: 'math', latex: 'w = abba \\in \\Sigma^*}' },
    ]);
  });

  test('Should show a bare number wrapped in $ as plain text.', () => {
    expect(parseInline('the mean was $7.23$')).toEqual([
      { type: 'text', content: 'the mean was ' },
      { type: 'text', content: '7.23' },
    ]);
  });

  test('Should treat $$ in a sentence as inline math.', () => {
    expect(parseInline('Solve $$2x+3=11$$.')).toEqual([
      { type: 'text', content: 'Solve ' },
      { type: 'math', latex: '2x+3=11' },
      { type: 'text', content: '.' },
    ]);
  });

  test('Should keep prices as text.', () => {
    expect(parseInline('Costs $5, $10, $20 and $x$.')).toEqual([
      { type: 'text', content: 'Costs $5, $10, $20 and ' },
      { type: 'math', latex: 'x' },
      { type: 'text', content: '.' },
    ]);
  });

  test('Should not touch the contents of inline code.', () => {
    expect(parseInline('Run `price = $5` or `**a** *b* $x$`.')).toEqual([
      { type: 'text', content: 'Run ' },
      { type: 'code', content: 'price = $5' },
      { type: 'text', content: ' or ' },
      { type: 'code', content: '**a** *b* $x$' },
      { type: 'text', content: '.' },
    ]);
  });

  test('Should parse italics.', () => {
    expect(parseInline('This is *really* early.')).toEqual([
      { type: 'text', content: 'This is ' },
      { type: 'italic', content: 'really' },
      { type: 'text', content: ' early.' },
    ]);
  });

  test('Should fold typographic asterisks, but not the ∗ operator.', () => {
    expect(parseInline('＊＊bold＊＊ and a ∗ b ∗ c')).toEqual([
      { type: 'bold', children: [{ type: 'text', content: 'bold' }] },
      { type: 'text', content: ' and a ∗ b ∗ c' },
    ]);
  });

  test('Should parse thread references and links.', () => {
    expect(
      parseInline('Apply early [ref:1]. See [the guide](https://x.com/a).')
    ).toEqual([
      { type: 'text', content: 'Apply early ' },
      { type: 'ref', number: 1 },
      { type: 'text', content: '. See ' },
      { type: 'link', text: 'the guide', url: 'https://x.com/a' },
      { type: 'text', content: '.' },
    ]);
  });

  test('Should not parse links that are not http(s).', () => {
    expect(parseInline('[click](javascript:alert(1))')).toEqual([
      { type: 'text', content: '[click](javascript:alert(1))' },
    ]);
  });
});
