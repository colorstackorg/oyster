import {
  decodeHtmlEntities,
  protectCodeRegions,
  wrapBareLatexSetBraces,
} from './math';

/**
 * Cleans up raw model text before it is parsed: normalizes the math
 * delimiters to `$...$` and `$$...$$` and strips stray HTML. Fenced code is
 * never touched.
 */
export function preprocessContent(text: string): string {
  // Strips a leading filler line.
  text = text.replace(
    /^\s*(?:Here'?s? the answer to your question:?|Here is the answer:?)\s*\n?/i,
    ''
  );

  // Fences are masked first so the conversions below can't reach into code
  // (ie: `A{p < 0.05?} --> B` in a diagram, or `\(` in a regex).
  const fences = protectCodeRegions(text, { fencesOnly: true });

  text = fences.masked;

  // \( ... \) -> $...$ and \[ ... \] -> $$...$$ (can be multi-line).
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, m: string) => {
    return `$${m.trim()}$`;
  });

  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, m: string) => {
    return `$$${m.trim()}$$`;
  });

  // Bare \{ ... \} set braces that the model forgot to wrap in $.
  text = wrapBareLatexSetBraces(text);

  // HTML math that the model sometimes emits -> $ / $$.
  text = text.replace(
    /<span\s+class="math-inline"\s+data-math="([^"]+)"[^>]*>[\s\S]*?<\/span>/g,
    (_, m: string) => `$${decodeHtmlEntities(m)}$`
  );

  text = text.replace(
    /<div\s+class="math-block"\s+data-math="([^"]+)"[^>]*>[\s\S]*?<\/div>/g,
    (_, m: string) => `$$${decodeHtmlEntities(m)}$$`
  );

  // Strips any remaining HTML tags, since the model should only emit markdown.
  text = text.replace(/<\/?[a-zA-Z][^>]*(>|$)/g, '');

  return fences.restore(text);
}
