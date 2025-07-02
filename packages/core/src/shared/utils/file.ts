import { type Result } from 'pdf-parse';
// @ts-expect-error b/c importing from pdf-parse has this weird bug that tries
// to load some non existent test files...so we go straight to the lib file.
import pdf from 'pdf-parse/lib/pdf-parse';

/**
 * Extracts the text content from a PDF file.
 *
 * @param file - The PDF file to extract text from.
 * @returns The text content of the PDF file.
 */
export async function getTextFromPDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result: Result = await pdf(buffer);

  return result.text;
}
