import { findInlineMathDollarSpans, protectCodeRegions } from './math';

export type InlineToken =
  | { type: 'bold'; children: InlineToken[] }
  | { type: 'code'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'math'; latex: string }
  | { type: 'ref'; number: number }
  | { type: 'text'; content: string };

type Match = {
  end: number;
  start: number;
  token: InlineToken;
};

const BOLD_REGEX = /\*\*(.+?)\*\*/g;

// `$$2x+3=11$$` written in the middle of a sentence.
const INLINE_DISPLAY_MATH_REGEX = /\$\$([^$\n]+)\$\$/g;

// A bare number wrapped for emphasis (ie: "the mean was $7.23$").
const BARE_NUMBER_REGEX = /(?<![\w$])\$(\d+(?:[.,]\d+)*)\$(?![\d$])/g;

const CODE_SENTINEL_REGEX = /CODEREGION\d+ENDCODEREGION/g;

const REF_REGEX = /\[ref:(\d+)\]/g;

const LINK_REGEX = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

// Flanking and digit guards, so that `5 * 3 * 2` stays multiplication.
const ITALIC_REGEX =
  /(?<![*\d])\*(?![\s*])((?:[^*\n])+?)(?<![\s*])\*(?![*\d])/g;

/**
 * Parses a single run of text (ie: a paragraph, heading or table cell) into
 * inline tokens: bold, math, italic, code, links and `[ref:N]` citations.
 */
export function parseInline(text: string): InlineToken[] {
  // Typographic asterisks are folded into `*`, but NOT `∗` (U+2217), which is
  // a multiplication operator.
  text = text.replace(/[﹡＊]/g, '*');

  // Code is masked first, so that no other pass can touch its contents.
  const code = protectCodeRegions(text);

  function restoreCode(sentinel: string): string {
    return code.restore(sentinel).replace(/^(`+|~~~)|(`+|~~~)$/g, '');
  }

  return parseBold(code.masked, restoreCode);
}

type RestoreCode = (sentinel: string) => string;

/**
 * Bold is parsed first and outermost, so that `**solve $x$**` keeps both the
 * bold and the math.
 */
function parseBold(text: string, restoreCode: RestoreCode): InlineToken[] {
  const tokens: InlineToken[] = [];

  let cursor = 0;

  for (const match of text.matchAll(BOLD_REGEX)) {
    tokens.push(...parseFlat(text.slice(cursor, match.index), restoreCode));

    tokens.push({
      type: 'bold',
      children: parseFlat(match[1]!, restoreCode),
    });

    cursor = match.index! + match[0].length;
  }

  tokens.push(...parseFlat(text.slice(cursor), restoreCode));

  return tokens;
}

function parseFlat(text: string, restoreCode: RestoreCode): InlineToken[] {
  if (!text) {
    return [];
  }

  const matches: Match[] = [];

  function add(start: number, end: number, token: InlineToken) {
    const overlaps = matches.some((m) => start < m.end && end > m.start);

    if (!overlaps) {
      matches.push({ end, start, token });
    }
  }

  function addAll(
    regex: RegExp,
    toToken: (match: RegExpMatchArray) => InlineToken
  ) {
    for (const match of text.matchAll(regex)) {
      add(match.index!, match.index! + match[0].length, toToken(match));
    }
  }

  // Single `$` math comes from the scanner, never from a regex.
  for (const span of findInlineMathDollarSpans(text)) {
    add(span.start, span.end + 1, { type: 'math', latex: span.inner.trim() });
  }

  addAll(INLINE_DISPLAY_MATH_REGEX, (m) => ({ type: 'math', latex: m[1]! }));
  addAll(BARE_NUMBER_REGEX, (m) => ({ type: 'text', content: m[1]! }));

  addAll(CODE_SENTINEL_REGEX, (m) => ({
    type: 'code',
    content: restoreCode(m[0]),
  }));

  addAll(REF_REGEX, (m) => ({ type: 'ref', number: Number(m[1]) }));
  addAll(LINK_REGEX, (m) => ({ type: 'link', text: m[1]!, url: m[2]! }));
  addAll(ITALIC_REGEX, (m) => ({ type: 'italic', content: m[1]! }));

  matches.sort((a, b) => a.start - b.start);

  const tokens: InlineToken[] = [];

  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      tokens.push({ type: 'text', content: text.slice(cursor, match.start) });
    }

    tokens.push(match.token);
    cursor = match.end;
  }

  if (cursor < text.length) {
    tokens.push({ type: 'text', content: text.slice(cursor) });
  }

  return tokens;
}
