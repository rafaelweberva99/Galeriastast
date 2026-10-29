/**
 * Lector mínimo de planillas Excel (.xlsx) en el navegador: devuelve la primera hoja como texto separado
 * por tabuladores (igual que copiar y pegar desde Excel). Las fechas con formato de fecha salen como dd-mm-aaaa.
 */
import { strFromU8, unzipSync } from "fflate";

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

function xml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Número de serie de Excel → dd-mm-aaaa (sistema 1900). */
function excelDate(serial: number): string {
  const d = new Date(Math.round((serial - 25569) * 86_400_000));
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

export function xlsxToTsv(data: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(data));
  const read = (path: string) => (files[path] ? strFromU8(files[path]) : null);

  // Primera hoja según el libro (no siempre es sheet1.xml).
  let sheetPath = "xl/worksheets/sheet1.xml";
  const wb = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels");
  if (wb && rels) {
    const first = xml(wb).getElementsByTagName("sheet")[0];
    const rid = first?.getAttribute("r:id") ?? first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const target = [...xml(rels).getElementsByTagName("Relationship")].find((r) => r.getAttribute("Id") === rid)?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = read(sheetPath);
  if (!sheet) throw new Error("El archivo no tiene hojas legibles.");

  const shared = [...xml(read("xl/sharedStrings.xml") ?? "<sst/>").getElementsByTagName("si")].map((si) =>
    [...si.getElementsByTagName("t")].map((t) => t.textContent ?? "").join(""),
  );

  // Estilos con formato de fecha (para no confundir una fecha con un número).
  const dateStyles = new Set<number>();
  const styles = read("xl/styles.xml");
  if (styles) {
    const doc = xml(styles);
    const custom = new Map(
      [...doc.getElementsByTagName("numFmt")].map((f) => [Number(f.getAttribute("numFmtId")), f.getAttribute("formatCode") ?? ""]),
    );
    const xfs = doc.getElementsByTagName("cellXfs")[0];
    [...(xfs?.getElementsByTagName("xf") ?? [])].forEach((xf, i) => {
      const id = Number(xf.getAttribute("numFmtId") ?? 0);
      const code = custom.get(id) ?? "";
      if (BUILTIN_DATE_FORMATS.has(id) || (/[dy]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, "")) && !/[#0]/.test(code))) dateStyles.add(i);
    });
  }

  const rows: string[][] = [];
  for (const row of xml(sheet).getElementsByTagName("row")) {
    const cells: string[] = [];
    for (const c of row.getElementsByTagName("c")) {
      const type = c.getAttribute("t");
      const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      let value: string;
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = [...c.getElementsByTagName("t")].map((t) => t.textContent ?? "").join("");
      else if (type === "b") value = v === "1" ? "VERDADERO" : "FALSO";
      else if (v && dateStyles.has(Number(c.getAttribute("s") ?? -1)) && Number(v) > 0) value = excelDate(Number(v));
      else value = v;
      cells[colIndex(c.getAttribute("r") ?? "A1")] = value.replace(/[\t\r\n]+/g, " ").trim();
    }
    if (cells.some((x) => x)) rows.push(Array.from(cells, (x) => x ?? ""));
  }
  return rows.map((r) => r.join("\t")).join("\n");
}
