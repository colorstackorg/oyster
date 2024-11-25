import { createCanvas } from 'canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Converts a PDF file to a base64 encoded "image/png" string. This is meant
 * only to be used in a server-side environment.
 *
 * This function uses the "pdf.js" library by Mozilla to render the PDF
 * and the converts that to a canvas, then to an image buffer.
 *
 * Note: This function only converts the first page of the PDF.
 * Note: This relies on the "canvas" package to create a canvas, which for some
 * machines may require additional dependencies to be installed.
 *
 * @see https://github.com/mozilla/pdf.js
 */
export async function convertPdfToImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const document = await getDocument({ data }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });

  const canvas = createCanvas(viewport.width, viewport.height);
  const canvasContext = canvas.getContext('2d');

  await page.render({
    // @ts-expect-error b/c this seems to be working and also the right type...
    canvasContext,
    viewport,
  }).promise;

  const buffer = canvas.toBuffer('image/png');
  const base64 = buffer.toString('base64');

  return base64;
}

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
