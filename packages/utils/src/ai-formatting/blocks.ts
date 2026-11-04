import { type InlineToken, parseInline } from './inline';
import { preprocessContent } from './preprocess';

export type Block =
  | { type: 'code'; content: string; language: string }
  | { type: 'heading'; children: InlineToken[]; level: number }
  | { type: 'hr' }
  | { type: 'list'; items: InlineToken[][]; ordered: boolean; start: number }
  | { type: 'math'; latex: string }
  | { type: 'paragraph'; children: InlineToken[] }
  | { type: 'quote'; lines: InlineToken[][] }
  | { type: 'table'; header: InlineToken[][]; rows: InlineToken[][][] };

const FENCE_REGEX = /^\s*```\s*([\w+-]*)/;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const HR_REGEX = /^(?:-{3,}|\*{3,}|_{3,})$/;
const IMAGE_REGEX = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;
const ORDERED_ITEM_REGEX = /^(\d+)\.\s+(.*)$/;
const TABLE_SEPARATOR_CELL_REGEX = /^[\s\-:]+$/;
const UNORDERED_ITEM_REGEX = /^[-*•]\s+(.*)$/;

/**
 * Parses raw model output (markdown with LaTeX math) into blocks that a
 * renderer can map to elements. Every run of text is parsed with
 * `parseInline`.
 */
export function parseAiMarkdown(raw: string): Block[] {
  const lines = preprocessContent(raw).split('\n');
  const blocks: Block[] = [];

  // The list, table or blockquote that is currently open.
  let list: Extract<Block, { type: 'list' }> | null = null;
  let quote: string[] | null = null;
  let table: string[][] | null = null;

  function flush() {
    if (list) {
      blocks.push(list);
    }

    if (quote) {
      blocks.push({ type: 'quote', lines: quote.map(parseInline) });
    }

    if (table) {
      blocks.push(toTableBlock(table));
    }

    list = null;
    quote = null;
    table = null;
  }

  function pushParagraph(text: string) {
    if (text.trim()) {
      blocks.push({ type: 'paragraph', children: parseInline(text.trim()) });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    // 1. Fenced code: collect lines verbatim until the closing fence.
    const fence = line.match(FENCE_REGEX);

    if (fence) {
      flush();

      const content: string[] = [];

      while (++i < lines.length && !FENCE_REGEX.test(lines[i]!)) {
        content.push(lines[i]!);
      }

      if (content.some((l) => l.trim())) {
        blocks.push({
          type: 'code',
          content: content.join('\n'),
          language: fence[1] || 'text',
        });
      }

      continue;
    }

    // 2. Display math: on one line, with trailing text, or across lines.
    if (line.startsWith('$$')) {
      flush();

      let rest = line.slice(2);
      let close = rest.indexOf('$$');

      const latex: string[] = [];

      while (close < 0 && ++i < lines.length) {
        latex.push(rest);
        rest = lines[i]!;
        close = rest.indexOf('$$');
      }

      latex.push(close < 0 ? rest : rest.slice(0, close));

      blocks.push({ type: 'math', latex: latex.join('\n').trim() });

      if (close >= 0) {
        pushParagraph(rest.slice(close + 2));
      }

      continue;
    }

    // 3. Headings.
    const heading = line.match(HEADING_REGEX);

    if (heading) {
      flush();

      blocks.push({
        type: 'heading',
        children: parseInline(heading[2]!),
        level: heading[1]!.length,
      });

      continue;
    }

    // 4. Blockquotes. A lone `>` keeps the quote open, and `> "` starts a new
    // one.
    if (line.startsWith('>')) {
      const text = line.replace(/^>\s?/, '');

      if (!quote || text.startsWith('"')) {
        flush();
        quote = [];
      }

      if (text) {
        quote.push(text);
      }

      continue;
    }

    // 5. Horizontal rules.
    if (HR_REGEX.test(line)) {
      flush();
      blocks.push({ type: 'hr' });
      continue;
    }

    // 6. Images are shown as links, so that we never load arbitrary images.
    const image = line.match(IMAGE_REGEX);

    if (image) {
      flush();

      blocks.push({
        type: 'paragraph',
        children: [
          { type: 'link', text: image[1] || image[2]!, url: image[2]! },
        ],
      });

      continue;
    }

    // 7. Tables.
    if (line.startsWith('|')) {
      if (!table) {
        flush();
        table = [];
      }

      table.push(line.split('|').slice(1, -1));
      continue;
    }

    // 8. Lists.
    const ordered = line.match(ORDERED_ITEM_REGEX);
    const unordered = line.match(UNORDERED_ITEM_REGEX);

    if (ordered || unordered) {
      const isOrdered = !!ordered;

      if (!list || list.ordered !== isOrdered) {
        flush();

        list = {
          type: 'list',
          items: [],
          ordered: isOrdered,
          start: ordered ? Number(ordered[1]) : 1,
        };
      }

      list.items.push(parseInline(ordered ? ordered[2]! : unordered![1]!));
      continue;
    }

    // 9. Paragraphs. A blank line flushes the open block.
    flush();
    pushParagraph(line);
  }

  flush();

  return blocks;
}

function toTableBlock(rows: string[][]): Block {
  const cells = rows.map((row) => row.map((cell) => parseInline(cell.trim())));

  const hasHeader =
    rows.length > 1 &&
    rows[1]!.every((cell) => TABLE_SEPARATOR_CELL_REGEX.test(cell));

  return hasHeader
    ? { type: 'table', header: cells[0]!, rows: cells.slice(2) }
    : { type: 'table', header: [], rows: cells };
}
