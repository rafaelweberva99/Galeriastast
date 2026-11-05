"use client";

import { useState } from "react";

/** Compartir el duelo: X, WhatsApp, menú del teléfono, copiar link y descargar la imagen. */
export function CompartirDuelo({ text, url, image }: { text: string; url: string; image: string }) {
  const [copied, setCopied] = useState(false);
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=GaluchaStats`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  return (
    <section className="card share" aria-labelledby="cmp-share-title">
      <div className="share-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Vista previa de la imagen para compartir el cara a cara" width={1200} height={630} loading="lazy" />
      </div>
      <div className="stack" style={{ gap: 10, flex: 1, minWidth: 240 }}>
        <h2 id="cmp-share-title" className="section-title" style={{ margin: 0 }}>
          Compártelo y pícate
        </h2>
        <p className="muted small" style={{ margin: 0 }}>
          {text}
        </p>
        <div className="share-actions">
          <a className="btn" href={x} target="_blank" rel="noopener noreferrer">
            Compartir en X
          </a>
          <a className="btn btn-ghost" href={wa} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                window.prompt("Copia el link:", url);
              }
            }}
          >
            {copied ? "¡Link copiado!" : "Copiar link"}
          </button>
          <a className="btn btn-ghost" href={`${image}?descargar=1`}>
            Descargar imagen
          </a>
        </div>
      </div>
    </section>
  );
}
