// Math core for rendering AI output. This module has no KaTeX import, so it
// can be used on the server and in tests.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Drops a duplicated equation tail that models sometimes append after a
 * period (ie: "... = 1. x 2 + y 2").
 */
export function trimSloppyDuplicateEquationSuffix(latex: string): string {
  const parts = latex.split(/\.\s+(?=[a-zA-Z]\s*2\b)/u);

  return parts.length <= 1 ? latex : (parts[0]?.trim() ?? latex);
}

// Unicode Mathematical Alphanumeric ranges (bold, italic, bold italic, sans,
// sans bold, sans italic) mapped to the ASCII letter they start at.
const MATH_LATIN_RANGES: Array<[number, number]> = [
  [0x1d400, 0x41],
  [0x1d41a, 0x61],
  [0x1d434, 0x41],
  [0x1d44e, 0x61],
  [0x1d468, 0x41],
  [0x1d482, 0x61],
  [0x1d5a0, 0x41],
  [0x1d5ba, 0x61],
  [0x1d5d4, 0x41],
  [0x1d5ee, 0x61],
  [0x1d608, 0x41],
  [0x1d622, 0x61],
];

/**
 * Maps Unicode Mathematical Alphanumeric letters (𝑥, 𝐀, 𝗮...) to ASCII.
 */
export function normalizeMathematicalLatinLetters(text: string): string {
  let out = '';

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;

    const range = MATH_LATIN_RANGES.find(([start]) => {
      return cp >= start && cp <= start + 25;
    });

    out += range ? String.fromCharCode(range[1] + (cp - range[0])) : ch;
  }

  return out;
}

/**
 * Cleans LaTeX right before KaTeX: zero-width characters, "++", wrapping
 * quotes, the Unicode minus and "x 2" written instead of "x^2".
 */
export function normalizeLatex(latex: string): string {
  let s = latex
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/\+\s*\+/g, '+')
    // ASCII `'` is left alone, since it is a prime (ie: `A'`, `f''(x)`).
    .replace(/^\s*[‘’`]\s*|\s*[‘’`]\s*$/g, '')
    .trim();

  s = normalizeMathematicalLatinLetters(s);
  s = s.replace(/−/g, '-');
  s = trimSloppyDuplicateEquationSuffix(s);

  let prev = '';

  while (prev !== s) {
    prev = s;
    s = s.replace(/\b([a-zA-Z])\s+2\b/g, '$1^2');
  }

  return s.replace(/\s+/g, ' ').trim();
}

function hasLetterLike(s: string): boolean {
  return /[a-zA-Z]|\p{L}/u.test(s);
}

function hasDigitLike(s: string): boolean {
  return /\d|\p{N}/u.test(s);
}

/**
 * A comparison with an operand on BOTH sides (`2x < 4`), so that `5<` (from
 * `$5<$10`) and `</li>` are excluded.
 */
function hasComparisonWithOperands(s: string): boolean {
  return /(?:[A-Za-z0-9)\]}]|\p{L}|\p{N})\s*(?:<=|>=|!=|[<>≤≥≠])\s*(?:[-+]?(?:[A-Za-z0-9([{\\]|\p{L}|\p{N}))/u.test(
    s
  );
}

/**
 * Returns true for a plain number (ie: `7.23`, `1,234.56`), which is not
 * LaTeX.
 */
export function isPlainNumericMathContent(content: string): boolean {
  const t = content.trim();

  return !!t && /^\d+(?:[.,]\d+)*$/.test(t);
}

export type InlineMathOptions = {
  /**
   * Treats a paired bare number (`$12$`) as math rather than currency. Only
   * use this for math-heavy documents.
   */
  allowBareNumbers?: boolean;

  /**
   * Classifies the entity-decoded text (ie: for stored HTML like `$3 &lt; 5$`).
   */
  decodeEntities?: boolean;
};

/**
 * Returns true if the content between a `$` pair looks like LaTeX rather than
 * prose or currency.
 */
export function looksLikeLatex(
  content: string,
  options?: InlineMathOptions
): boolean {
  const t = content.trim();

  if (!t) {
    return false;
  }

  // Unicode math letters, or LaTeX syntax: \cmd, ^, _, {}.
  if (/[\u{1D400}-\u{1D7FF}]/u.test(t) || /\\|[\^_{}]/.test(t)) {
    return true;
  }

  // Hyphenated words: "low-level", "x-axis", "p-value".
  if (/[a-zA-Z]{2,}-[a-zA-Z]+|[a-zA-Z]+-[a-zA-Z]{2,}/.test(t)) {
    return false;
  }

  // A sentence.
  if (t.split(/\s+/).filter((w) => /^[a-zA-Z]{3,}$/.test(w)).length >= 4) {
    return false;
  }

  // Prose with an equals sign: "the mean is 5 when...".
  if (/=/.test(t) && /\b[a-zA-Z]{4,}\b/.test(t)) {
    return false;
  }

  if (
    /^\p{L}{1,3}$/u.test(t) || // x, sin, KE
    /^\d+(?:\.\d+)?\s*\p{L}$/u.test(t) || // 3x
    /^[a-zA-Z]\s*[\^_]\s*\{?[^}]*\}?$/.test(t) ||
    /^[a-zA-Z]{1,8}(?:['′″]+|_\w+|_\{[^}]+\}|\^\w+|\^\{[^}]+\})*\s*\([^()\n]{0,60}\)\s*$/.test(
      t
    ) // f(x), f'(x)
  ) {
    return true;
  }

  // |x - 3|
  if (/^\|[^|\n]{1,24}\|$/.test(t) && (hasLetterLike(t) || hasDigitLike(t))) {
    return true;
  }

  // "$10" is currency.
  if (isPlainNumericMathContent(t)) {
    return options?.allowBareNumbers === true;
  }

  if (/=/.test(t) && (hasLetterLike(t) || hasDigitLike(t))) {
    return true;
  }

  if (hasComparisonWithOperands(t)) {
    return true;
  }

  if (hasLetterLike(t) && /[+\-*/=−]/.test(t)) {
    return true;
  }

  if (hasDigitLike(t) && /[+\-*/−]/.test(t)) {
    return true;
  }

  // Intervals: [a, b], (0, 1].
  return /^[[(].*[\])]$/.test(t) && (hasLetterLike(t) || hasDigitLike(t));
}

const HTML_TAG_IN_SPAN =
  /<\/[A-Za-z][\w:-]*\s*>|<[A-Za-z][\w:-]*(?:\s[^<>]*)?\/?>/;

const HARD_MATH_SIGNAL = /[\\^_{}]|[\u{1D400}-\u{1D7FF}]/u;

/**
 * Returns true if the text between a `$` pair is math.
 *
 * @param inner - NOT trimmed, since the spacing is a signal (same flanking
 * rules as pandoc and markdown-it-texmath).
 * @param after - The character right after the closing `$`.
 */
export function isInlineMathSpan(
  inner: string,
  after?: string,
  options?: InlineMathOptions
): boolean {
  if (!inner) {
    return false;
  }

  const probe = options?.decodeEntities ? decodeHtmlEntities(inner) : inner;

  // A span containing an HTML tag is never math.
  if (HTML_TAG_IN_SPAN.test(probe)) {
    return false;
  }

  // `$ E = mc^2 $` still works.
  if (HARD_MATH_SIGNAL.test(probe)) {
    return true;
  }

  // A', f''
  if (/^[A-Za-z]'+$/.test(probe)) {
    return true;
  }

  // "$5 and $10"
  if (/^\s/.test(probe) || /\s$/.test(probe)) {
    return false;
  }

  // "$5-$10": the closer is really the next amount's opener.
  if (after !== undefined && /\d/.test(after)) {
    return false;
  }

  return looksLikeLatex(probe.trim(), options);
}

export type InlineMathSpan = {
  end: number;
  inner: string;
  start: number;
};

/**
 * Finds real `$...$` math spans. This is a scanner and not a regex replace,
 * because a rejected span must re-anchor at `open + 1` so that its closing
 * `$` can serve as the next span's opener (ie: `Costs $5, $10 and $x$.` must
 * still find `$x$`).
 *
 * `$$` is skipped (display math has its own pass), and `\$` is a literal
 * dollar sign.
 */
export function findInlineMathDollarSpans(
  text: string,
  options?: InlineMathOptions
): InlineMathSpan[] {
  const spans: InlineMathSpan[] = [];

  let i = 0;

  while (i < text.length) {
    const open = text.indexOf('$', i);

    if (open < 0) {
      break;
    }

    if (text[open - 1] === '\\') {
      i = open + 1;
      continue;
    }

    if (text[open + 1] === '$') {
      i = open + 2;
      continue;
    }

    let close = -1;
    let lineEnd = -1;

    for (let j = open + 1; j < text.length; j++) {
      // Inline math never spans lines.
      if (text[j] === '\n') {
        lineEnd = j;
        break;
      }

      if (text[j] === '$' && text[j - 1] !== '\\') {
        close = j;
        break;
      }
    }

    if (close < 0) {
      if (lineEnd < 0) {
        break;
      }

      // A lone price: skip the rest of the line, but keep scanning.
      i = lineEnd + 1;
      continue;
    }

    const inner = text.slice(open + 1, close);

    if (isInlineMathSpan(inner, text[close + 1], options)) {
      spans.push({ end: close, inner, start: open });
      i = close + 1;
    } else {
      // Re-anchor, and do NOT skip the closer.
      i = open + 1;
    }
  }

  return spans;
}

/**
 * Renders the accepted math spans. Every other character (including currency
 * `$`) stays the same.
 */
export function replaceInlineMathDollarSpans(
  text: string,
  render: (inner: string) => string,
  options?: InlineMathOptions
): string {
  const spans = findInlineMathDollarSpans(text, options);

  if (!spans.length) {
    return text;
  }

  let out = '';
  let cursor = 0;

  for (const span of spans) {
    out += text.slice(cursor, span.start) + render(span.inner.trim());
    cursor = span.end + 1;
  }

  return out + text.slice(cursor);
}

/**
 * Wraps `\{ ... \}` in `$` when the model omitted the delimiters.
 */
export function wrapBareLatexSetBraces(text: string): string {
  return text.replace(/(?<!\$)\\\{([\s\S]*?)\\\}(?!\$)/g, (full) => {
    return `$${full}$`;
  });
}

/**
 * Balances `{}` groups by dropping stray closers and closing unclosed groups.
 * Escaped `\{` and `\}` are ignored.
 */
export function balanceLatexBraces(latex: string): string {
  let depth = 0;
  const strays: number[] = [];

  for (let i = 0; i < latex.length; i++) {
    const c = latex[i];

    if (c === '\\') {
      i++;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      if (depth === 0) {
        strays.push(i);
      } else {
        depth--;
      }
    }
  }

  if (!strays.length && depth === 0) {
    return latex;
  }

  let out = '';
  let cursor = 0;

  for (const i of strays) {
    out += latex.slice(cursor, i);
    cursor = i + 1;
  }

  return out + latex.slice(cursor) + '}'.repeat(depth);
}

// Code regions are where `$`, `*`, `_` and `<` are literal.
const CODE_REGION_PATTERNS: RegExp[] = [
  /```[\s\S]*?```/g,
  /~~~[\s\S]*?~~~/g,
  /<pre\b[\s\S]*?<\/pre>/gi,
  /<code\b[\s\S]*?<\/code>/gi,
  /`[^`\n]*`/g,
];

// Letters and digits only, so that no math pass mistakes it for notation.
function sentinel(i: number): string {
  return `CODEREGION${i}ENDCODEREGION`;
}

/**
 * Masks code fences and inline code with sentinels, so that math and HTML
 * passes can't touch them. Call `restore` on the processed text afterwards.
 */
export function protectCodeRegions(
  text: string,
  options?: { fencesOnly?: boolean }
) {
  const stash: string[] = [];

  const patterns = options?.fencesOnly
    ? CODE_REGION_PATTERNS.slice(0, 2)
    : CODE_REGION_PATTERNS;

  let masked = text;

  for (const pattern of patterns) {
    masked = masked.replace(pattern, (match) => {
      stash.push(match);

      return sentinel(stash.length - 1);
    });
  }

  return {
    hasCode: stash.length > 0,
    masked,
    restore(processed: string): string {
      let out = processed;

      // Outermost first, since later regions can be nested in earlier ones.
      for (let i = stash.length - 1; i >= 0; i--) {
        out = out.split(sentinel(i)).join(stash[i]!);
      }

      return out;
    },
  };
}

export function isKaTeXErrorOutput(html: string): boolean {
  return (
    html.includes('parse-error') ||
    html.includes('#cc0000') ||
    html.includes('in math mode at position')
  );
}
