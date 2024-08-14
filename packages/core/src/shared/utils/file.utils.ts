import { createCanvas } from 'canvas';
import { getDocument } from 'pdfjs-dist';

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
