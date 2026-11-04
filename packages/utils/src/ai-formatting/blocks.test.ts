import { describe, expect, test } from 'bun:test';

import { parseAiMarkdown } from './blocks';

function text(content: string) {
  return { type: 'text' as const, content };
}

describe(parseAiMarkdown.name, () => {
  test('Should parse paragraphs and skip blank lines.', () => {
    expect(parseAiMarkdown('First.\n\nSecond.')).toEqual([
      { type: 'paragraph', children: [text('First.')] },
      { type: 'paragraph', children: [text('Second.')] },
    ]);
  });

  test('Should parse headings, longest prefix first.', () => {
    expect(parseAiMarkdown('# One\n#### Four')).toEqual([
      { type: 'heading', children: [text('One')], level: 1 },
      { type: 'heading', children: [text('Four')], level: 4 },
    ]);
  });

  test('Should parse unordered and ordered lists.', () => {
    expect(parseAiMarkdown('- a\n* b\n• c\n\n3. d\n4. e')).toEqual([
      {
        type: 'list',
        items: [[text('a')], [text('b')], [text('c')]],
        ordered: false,
        start: 1,
      },
      {
        type: 'list',
        items: [[text('d')], [text('e')]],
        ordered: true,
        start: 3,
      },
    ]);
  });

  test('Should parse references inside list items.', () => {
    expect(parseAiMarkdown('1. **Apply early** [ref:2]')).toEqual([
      {
        type: 'list',
        items: [
          [
            { type: 'bold', children: [text('Apply early')] },
            text(' '),
            { type: 'ref', number: 2 },
          ],
        ],
        ordered: true,
        start: 1,
      },
    ]);
  });

  test('Should parse fenced code verbatim.', () => {
    expect(parseAiMarkdown('```python\nx = $x$ * 2\n```')).toEqual([
      { type: 'code', content: 'x = $x$ * 2', language: 'python' },
    ]);
  });

  test('Should keep mermaid source unchanged and drop empty fences.', () => {
    expect(
      parseAiMarkdown('```mermaid\nA[Mean ($\\mu$)]\n```\n```\n\n```')
    ).toEqual([
      { type: 'code', content: 'A[Mean ($\\mu$)]', language: 'mermaid' },
    ]);
  });

  test('Should parse display math on one line, with trailing text.', () => {
    expect(parseAiMarkdown('$$x^2$$ is a square.')).toEqual([
      { type: 'math', latex: 'x^2' },
      { type: 'paragraph', children: [text('is a square.')] },
    ]);
  });

  test('Should parse display math across lines.', () => {
    expect(parseAiMarkdown('$$\na + b\n= c\n$$ done')).toEqual([
      { type: 'math', latex: 'a + b\n= c' },
      { type: 'paragraph', children: [text('done')] },
    ]);
  });

  test('Should parse \\[ \\] as display math.', () => {
    expect(parseAiMarkdown('\\[ \\int f \\]')).toEqual([
      { type: 'math', latex: '\\int f' },
    ]);
  });

  test('Should parse blockquotes and start a new one on > ".', () => {
    expect(parseAiMarkdown('> a\n>\n> b\n> "c"')).toEqual([
      { type: 'quote', lines: [[text('a')], [text('b')]] },
      { type: 'quote', lines: [[text('"c"')]] },
    ]);
  });

  test('Should parse horizontal rules.', () => {
    expect(parseAiMarkdown('a\n---\n***\n___')).toEqual([
      { type: 'paragraph', children: [text('a')] },
      { type: 'hr' },
      { type: 'hr' },
      { type: 'hr' },
    ]);
  });

  test('Should show images as links.', () => {
    expect(parseAiMarkdown('![Logo](https://x.com/a.png)')).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'link', text: 'Logo', url: 'https://x.com/a.png' }],
      },
    ]);
  });

  test('Should parse tables, with math in the cells.', () => {
    expect(
      parseAiMarkdown(
        '| Algo | Time |\n|---|:---:|\n| Merge sort | $O(n \\log n)$ |'
      )
    ).toEqual([
      {
        type: 'table',
        header: [[text('Algo')], [text('Time')]],
        rows: [
          [[text('Merge sort')], [{ type: 'math', latex: 'O(n \\log n)' }]],
        ],
      },
    ]);
  });

  test('Should parse a table without a separator row as body rows.', () => {
    expect(parseAiMarkdown('| a | b |')).toEqual([
      { type: 'table', header: [], rows: [[[text('a')], [text('b')]]] },
    ]);
  });
});
