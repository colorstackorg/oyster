import { describe, expect, test } from 'bun:test';

import {
  balanceLatexBraces,
  decodeHtmlEntities,
  escapeHtml,
  findInlineMathDollarSpans,
  isInlineMathSpan,
  isKaTeXErrorOutput,
  isPlainNumericMathContent,
  looksLikeLatex,
  normalizeLatex,
  protectCodeRegions,
  replaceInlineMathDollarSpans,
  wrapBareLatexSetBraces,
} from './math';

function mathIn(text: string): string[] {
  return findInlineMathDollarSpans(text).map((span) => span.inner);
}

describe(findInlineMathDollarSpans.name, () => {
  test('Should only find math between prices, not the prices themselves.', () => {
    expect(mathIn('Costs $5, $10, $20 and $x$.')).toEqual(['x']);
  });

  test.each([
    '$5 and $10',
    '$5-$10',
    '$100,000 is twice $50,000',
    'It costs $5 or $10 per month.',
  ])('Should treat "%s" as currency.', (text) => {
    expect(mathIn(text)).toEqual([]);
  });

  test.each([
    ['$3x$', '3x'],
    ['$f(x)$', 'f(x)'],
    ["$f''(t)$", "f''(t)"],
    ['$|x - 3|$', '|x - 3|'],
    ["$A'$", "A'"],
    ['$2x < 4$', '2x < 4'],
    ['$x >= 0$', 'x >= 0'],
    ['$a != b$', 'a != b'],
    ['$O(n \\log n)$', 'O(n \\log n)'],
  ])('Should treat "%s" as math.', (text, inner) => {
    expect(mathIn(text)).toEqual([inner]);
  });

  test.each(['$x-axis$', '$p-value$', '$low-level$'])(
    'Should treat "%s" as prose.',
    (text) => {
      expect(mathIn(text)).toEqual([]);
    }
  );

  test('A hard math signal should win over the spacing rule.', () => {
    expect(mathIn('$ E = mc^2 $')).toEqual([' E = mc^2 ']);
  });

  test('A padded simple span should stay literal (same as pandoc).', () => {
    expect(mathIn('$ x $')).toEqual([]);
  });

  test('A lone price on one line should not stop math on later lines.', () => {
    expect(mathIn('It costs $5.\nSolve $x^2 = 4$.')).toEqual(['x^2 = 4']);
  });

  test('Should skip escaped dollar signs and display math.', () => {
    expect(mathIn('\\$x\\$ and $$y^2$$')).toEqual([]);
  });
});

describe(replaceInlineMathDollarSpans.name, () => {
  test('Should replace only the math and keep the currency as is.', () => {
    const result = replaceInlineMathDollarSpans(
      'Pay $5 to get $x^2$.',
      (latex) => `[${latex}]`
    );

    expect(result).toEqual('Pay $5 to get [x^2].');
  });
});

describe(isInlineMathSpan.name, () => {
  test('A span containing an HTML tag is never math.', () => {
    expect(isInlineMathSpan('5</li><li>', undefined)).toBe(false);
  });

  test('A digit right after the closer means it is currency.', () => {
    expect(isInlineMathSpan('x', '1')).toBe(false);
  });
});

describe(looksLikeLatex.name, () => {
  test('A sentence is not LaTeX.', () => {
    expect(looksLikeLatex('this is just a long sentence')).toBe(false);
  });

  test('A bare number is only math when allowed.', () => {
    expect(looksLikeLatex('12')).toBe(false);
    expect(looksLikeLatex('12', { allowBareNumbers: true })).toBe(true);
  });

  test('An interval is LaTeX.', () => {
    expect(looksLikeLatex('(0, 1]')).toBe(true);
  });
});

describe(isPlainNumericMathContent.name, () => {
  test.each(['7.23', '1,234.56', ' 10 '])('"%s" is a number.', (value) => {
    expect(isPlainNumericMathContent(value)).toBe(true);
  });

  test.each(['', '3x', '1/2'])('"%s" is not a number.', (value) => {
    expect(isPlainNumericMathContent(value)).toBe(false);
  });
});

describe(normalizeLatex.name, () => {
  test('Should map Unicode math letters to ASCII.', () => {
    expect(normalizeLatex('𝑥 + 𝐀')).toEqual('x + A');
  });

  test('Should fix "x 2" written instead of "x^2".', () => {
    expect(normalizeLatex('x 2 + y 2 = 1')).toEqual('x^2 + y^2 = 1');
  });

  test('Should replace the Unicode minus and collapse "++".', () => {
    expect(normalizeLatex('a −  b ++ c')).toEqual('a - b + c');
  });

  test('Should drop a duplicated equation tail.', () => {
    expect(normalizeLatex('x^2 + y^2 = 1. x 2 + y 2')).toEqual('x^2 + y^2 = 1');
  });

  test('Should keep primes.', () => {
    expect(normalizeLatex("A'")).toEqual("A'");
  });
});

describe(balanceLatexBraces.name, () => {
  test('Should drop a stray closing brace.', () => {
    expect(balanceLatexBraces('w = abba \\in \\Sigma^*}')).toEqual(
      'w = abba \\in \\Sigma^*'
    );
  });

  test('Should close an unclosed group.', () => {
    expect(balanceLatexBraces('\\frac{1}{2')).toEqual('\\frac{1}{2}');
  });

  test('Should ignore escaped braces.', () => {
    expect(balanceLatexBraces('\\{1, 2\\}')).toEqual('\\{1, 2\\}');
  });
});

describe(wrapBareLatexSetBraces.name, () => {
  test('Should wrap bare set braces in $.', () => {
    expect(wrapBareLatexSetBraces('S = \\{1, 2\\}')).toEqual(
      'S = $\\{1, 2\\}$'
    );
  });

  test('Should leave wrapped set braces alone.', () => {
    expect(wrapBareLatexSetBraces('$\\{1, 2\\}$')).toEqual('$\\{1, 2\\}$');
  });
});

describe(protectCodeRegions.name, () => {
  test('Should mask code so math passes cannot touch it.', () => {
    const text = 'Use `price = $5` and\n```\n$x$\n```\nthen $y^2$.';
    const code = protectCodeRegions(text);

    expect(code.hasCode).toBe(true);
    expect(code.masked).not.toContain('price');
    expect(mathIn(code.masked)).toEqual(['y^2']);
    expect(code.restore(code.masked)).toEqual(text);
  });

  test('Should only mask fences when asked to.', () => {
    const code = protectCodeRegions('`a` and\n```\nb\n```', {
      fencesOnly: true,
    });

    expect(code.masked).toStartWith('`a` and\n');
  });
});

describe(escapeHtml.name, () => {
  test('Should escape HTML and decode back to the same text.', () => {
    const text = `<a href="x">Tom's & Jerry's</a>`;

    expect(escapeHtml(text)).not.toContain('<');
    expect(decodeHtmlEntities(escapeHtml(text))).toEqual(text);
  });
});

describe(isKaTeXErrorOutput.name, () => {
  test('Should detect KaTeX error markup.', () => {
    expect(isKaTeXErrorOutput('<span style="color:#cc0000">')).toBe(true);
    expect(isKaTeXErrorOutput('<span class="katex">')).toBe(false);
  });
});
