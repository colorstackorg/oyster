import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extracts the text content from a PDF file.
 *
 * @param file - The PDF file to extract text from.
 * @returns The text content of the PDF file.
 */
export async function getTextFromPDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const document = await getDocument({ data }).promise;

  let result = '';

  // Tracks the y-coordinate of the last text item, which will help us
  // determine whether or not to render a newline character (multiple items
  // could be on the same line)
  let lastY = 0;

  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const content = await page.getTextContent();

    content.items.filter((item) => {
      // We're only interested in text items, not marked content or images.
      if (!('str' in item)) {
        return;
      }

      // The transform matrix is an array of 6 numbers that represent the
      // transformation matrix required to position the text on the page. The
      // 5th and 6th numbers are the x and y coordinates of the text.
      const y = item.transform[5];

      // If the y coordinate has changed, we're on a new line, so add a newline
      // character. Note that it doesn't have to be exact...
      if (Math.round(y) !== Math.round(lastY)) {
        result += '\n';
      }

      // The actual content of the text item gets added.
      result += item.str;

      // If the text item has an EOL (end of line) property, add a newline
      // character.
      if (item.hasEOL) {
        result += '\n';
      }

      lastY = y;
    });
  }

  return result;
}
