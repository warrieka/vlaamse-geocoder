export interface ParsedSheet {
  fields: string[];
  rows: Record<string, any>[];
}

/** True when the file is a modern .xlsx workbook (as opposed to .csv/.txt). */
export function isXlsx(file: File): boolean {
  return (
    /\.xlsx$/i.test(file.name) ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

/**
 * Build a de-duplicated list of column headers from the first spreadsheet row.
 * Blank cells become "kolom_<n>"; duplicates are suffixed.
 */
function buildHeaders(rawHeaders: any[]): string[] {
  const used = new Map<string, number>();
  return rawHeaders.map((h, i) => {
    let base = h == null ? '' : String(h).trim();
    if (!base) base = `kolom_${i + 1}`;
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

/**
 * Read the first worksheet of an .xlsx file into a header row + data rows.
 * The SheetJS library is loaded on demand so it does not bloat the base bundle.
 */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Er is geen eerste werkblad gevonden.');
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('Het werkblad kon niet worden gelezen.');
  }

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });

  if (!matrix || matrix.length === 0) {
    throw new Error('Het eerste werkblad is leeg.');
  }

  const fields = buildHeaders(matrix[0]);
  const rows = matrix.slice(1).map((r) => {
    const record: Record<string, any> = {};
    fields.forEach((f, i) => {
      const v = r[i];
      record[f] = v == null ? '' : v;
    });
    return record;
  });

  return { fields, rows };
}
