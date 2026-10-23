/**
 * Descarga los archivos de la fuente "wfb" (ver data/sources.json) a data/raw/wfb/.
 * Uso: npm run data:fetch
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readJson } from "../src/lib/ingest/catalog.ts";

interface SourceConfig {
  urlTemplate: string;
  files: Record<string, { seasons: string[] }>;
}

const { wfb } = readJson<{ wfb: SourceConfig }>("sources.json");
const outDir = path.resolve("data/raw/wfb");
mkdirSync(outDir, { recursive: true });

let ok = 0;
let missing = 0;
for (const [code, cfg] of Object.entries(wfb.files)) {
  for (const season of cfg.seasons) {
    const url = wfb.urlTemplate.replace("{season}", season).replace("{code}", code);
    const res = await fetch(url);
    if (res.status === 404) {
      missing++;
      console.warn(`404  ${url}`);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} al descargar ${url}`);
    writeFileSync(path.join(outDir, `${season}_${code}.txt`), await res.text());
    ok++;
  }
}
console.log(`Descargados ${ok} archivos (${missing} inexistentes) en ${outDir}`);
