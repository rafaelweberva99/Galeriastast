/** Lee un archivo de planilla (Excel .xlsx, CSV o TSV) como texto separado por tabuladores o comas. */
export async function readSheetFile(file: File): Promise<string> {
  if (/\.xlsx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const { xlsxToTsv } = await import("./xlsx.ts");
    return xlsxToTsv(await file.arrayBuffer());
  }
  if (/\.xls$/i.test(file.name)) {
    throw new Error("Ese Excel es del formato antiguo (.xls). Ábrelo y guárdalo como .xlsx o CSV, o copia y pega las filas.");
  }
  return file.text();
}

export const SHEET_ACCEPT =
  ".xlsx,.xls,.csv,.tsv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export const isSheetFile = (f: File) =>
  /\.(xlsx|xls|csv|tsv)$/i.test(f.name) ||
  ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"].includes(f.type);
