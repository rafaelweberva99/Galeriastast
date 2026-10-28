// Copia a public/vendor los archivos que el navegador carga para leer capturas (OCR) y PDF de entradas.
// Se ejecuta antes de cada build; public/vendor no se versiona.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const out = path.resolve("public/vendor");

const files = [
  [pkgDir("tesseract.js"), "dist/tesseract.min.js", "tesseract/tesseract.min.js"],
  [pkgDir("tesseract.js"), "dist/worker.min.js", "tesseract/worker.min.js"],
  [pkgDir("tesseract.js-core"), "tesseract-core-lstm.wasm.js", "tesseract/core/tesseract-core-lstm.wasm.js"],
  [pkgDir("tesseract.js-core"), "tesseract-core-simd-lstm.wasm.js", "tesseract/core/tesseract-core-simd-lstm.wasm.js"],
  [pkgDir("@tesseract.js-data/spa"), "4.0.0_best_int/spa.traineddata.gz", "tesseract/lang/spa.traineddata.gz"],
  [pkgDir("pdfjs-dist"), "build/pdf.min.mjs", "pdfjs/pdf.min.mjs"],
  [pkgDir("pdfjs-dist"), "build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs"],
];
for (const [base, from, to] of files) {
  const dest = path.join(out, to);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(path.join(base, from), dest);
}
console.log(`public/vendor: ${files.length} archivos`);
