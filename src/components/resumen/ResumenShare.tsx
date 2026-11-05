"use client";

import Link from "next/link";
import { useState } from "react";

/** Compartir el resumen anual: X, menú del teléfono, copiar link y descargar la imagen 1080×1350. */
export function ResumenShare({
  image,
  text,
  url,
  isPublic,
  year,
}: {
  image: string;
  text: string;
  url: string;
  isPublic: boolean;
  year: number;
}) {
  const [copied, setCopied] = useState(false);
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=GaluchaStats`;
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <section className="card rs-share" aria-labelledby="rs-share-title">
      <div className="rs-share-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`Imagen para compartir tu ${year} en la galería`} width={1080} height={1350} loading="lazy" />
      </div>
      <div className="stack" style={{ gap: 10, flex: 1, minWidth: 240 }}>
        <h2 id="rs-share-title" className="section-title" style={{ margin: 0 }}>
          Comparte tu {year}
        </h2>
        <p className="muted small" style={{ margin: 0 }}>
          {text}
        </p>
        {isPublic ? (
          <div className="share-actions">
            <a className="btn" href={tweet} target="_blank" rel="noopener noreferrer">
              Compartir en X
            </a>
            {canNativeShare && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigator.share({ title: `Mi ${year} en la galería`, text, url }).catch(() => {})}
              >
                Compartir…
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
            >
              {copied ? "¡Link copiado!" : "Copiar link"}
            </button>
            <a className="btn btn-ghost" href={`${image}?descargar=1`}>
              Descargar imagen
            </a>
          </div>
        ) : (
          <>
            <div className="share-actions">
              <a className="btn" href={`${image}?descargar=1`}>
                Descargar imagen
              </a>
            </div>
            <p className="small" style={{ margin: 0 }}>
              Tu carnet es privado: descarga la imagen y súbela a Instagram o X tal cual. Para compartir el link, hazlo público en{" "}
              <Link href="/perfil#privacidad-datos">Privacidad y datos</Link>.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
