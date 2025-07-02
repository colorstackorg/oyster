import csv from 'csvtojson';

export type CsvRecord<Column extends string = string> = Record<Column, string>;

/**
 * Returns a parsed version of the CSV file.
 *
 * The output is formatted as an array of objects.
 *
 * @param file - CSV file to parse into an array.
 */
export async function parseCsv<Column extends string>(
  file: string | Buffer
): Promise<CsvRecord<Column>[]> {
  let string: string;

  if (file instanceof Buffer) {
    string = file.toString();
  } else {
    string = file as string;
  }

  const result: CsvRecord<Column>[] = await csv().fromString(string);

  return result;
}
