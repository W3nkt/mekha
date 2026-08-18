const toCsvField = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsvRow = (values: unknown[]): string =>
  values.map(toCsvField).join(",");

export const buildCsv = (
  headers: string[],
  rows: unknown[][],
  commentLines: string[] = [],
): string =>
  [
    ...commentLines,
    toCsvRow(headers),
    ...rows.map((row) => toCsvRow(row)),
  ].join("\r\n");

export const formatDateDMY = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
};
