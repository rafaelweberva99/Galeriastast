/**
 * Lectura de comprobantes de entradas en el navegador (nada se sube a ningún servidor externo):
 *  - capturas de pantalla / fotos: OCR con Tesseract (español), servido desde /vendor/tesseract
 *  - PDF de la entrada: texto con pdf.js; si el PDF es una imagen, se le aplica OCR
 *  - correos (.eml, .html, .txt): texto tal cual (el servidor decodifica el .eml)
 * Los archivos de las librerías los copia scripts/copy-vendor.mjs a public/vendor.
 */

type Progress = (label: string, ratio: number | null) => void;

interface TesseractWorker {
  recognize(image: HTMLCanvasElement): Promise<{ data: { text: string } }>;
  terminate(): Promise<void>;
}
interface TesseractGlobal {
  createWorker(
    lang: string,
    oem: number,
    options: Record<string, unknown>,
  ): Promise<TesseractWorker>;
}

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src;
        el.async = true;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
        document.head.appendChild(el);
      }),
    );
  }
  return scripts.get(src)!;
}

async function imageToCanvas(source: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(source);
  // Las capturas pequeñas se agrandan: Tesseract lee mejor letras de ~30 px.
  const scale = bitmap.width < 1400 ? 2 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return prepareForOcr(canvas);
}

/** Escala de grises y, si la captura está en modo oscuro, invierte colores (texto oscuro sobre claro). */
function prepareForOcr(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
    sum += y;
  }
  const invert = sum / (d.length / 4) < 110;
  if (invert) for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
  ctx.putImageData(img, 0, 0);
  return canvas;
}

let workerPromise: Promise<TesseractWorker> | null = null;
let progressSink: Progress = () => {};

async function ocrWorker(): Promise<TesseractWorker> {
  workerPromise ??= (async () => {
    await loadScript("/vendor/tesseract/tesseract.min.js");
    const T = (window as unknown as { Tesseract: TesseractGlobal }).Tesseract;
    return T.createWorker("spa", 1, {
      workerPath: "/vendor/tesseract/worker.min.js",
      corePath: "/vendor/tesseract/core",
      langPath: "/vendor/tesseract/lang",
      gzip: true,
      logger: (m: { status: string; progress: number }) =>
        progressSink(m.status === "recognizing text" ? "Leyendo la imagen" : "Preparando el lector", m.progress),
    });
  })().catch((e) => {
    workerPromise = null;
    throw e;
  });
  return workerPromise;
}

async function ocr(canvas: HTMLCanvasElement, onProgress: Progress): Promise<string> {
  progressSink = onProgress;
  const worker = await ocrWorker();
  const { data } = await worker.recognize(canvas);
  return data.text;
}

interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(src: { data: ArrayBuffer; isEvalSupported?: boolean }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: { str?: string }[] }>;
        getViewport(o: { scale: number }): { width: number; height: number };
        render(o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
      }>;
    }>;
  };
}

async function pdfToText(file: Blob, onProgress: Progress): Promise<string> {
  onProgress("Abriendo el PDF", null);
  const pdfjs = (await import(/* webpackIgnore: true */ "/vendor/pdfjs/pdf.min.mjs" as string)) as PdfJs;
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  // Sin eval: la CSP del sitio no lo permite (pdf.js usa otro camino para dibujar las fuentes).
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const pages = Math.min(doc.numPages, 10);
  let text = "";
  for (let n = 1; n <= pages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    text += content.items.map((i) => i.str ?? "").join(" ") + "\n";
  }
  if (text.replace(/\s/g, "").length > 20) return text;
  // PDF escaneado o con la entrada como imagen: se dibuja y se lee con OCR.
  for (let n = 1; n <= Math.min(pages, 3); n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    text += (await ocr(prepareForOcr(canvas), onProgress)) + "\n";
  }
  return text;
}

/** Devuelve el texto de un comprobante (captura, foto, PDF o correo). */
export async function readTicketFile(file: Blob & { name?: string }, onProgress: Progress): Promise<string> {
  const name = (file.name ?? "").toLowerCase();
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|heic|gif)$/.test(name)) {
    onProgress("Preparando la imagen", null);
    return ocr(await imageToCanvas(file), onProgress);
  }
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return pdfToText(file, onProgress);
  return file.text();
}

export async function releaseOcr(): Promise<void> {
  const w = workerPromise;
  workerPromise = null;
  if (w) await (await w).terminate();
}
