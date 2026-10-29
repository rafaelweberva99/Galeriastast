"use client";

import Link from "next/link";
import { useState } from "react";

/** Compartir el carnet: X/Twitter, menú del teléfono, copiar link y descargar la imagen. */
export function ShareCarnet({ username, isPublic, text, url }: { username: string; isPublic: boolean; text: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const image = `/hincha/${encodeURIComponent(username)}/tarjeta`;
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=GaluchaStats`;
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <section className="card share" aria-labelledby="share-title">
      <div className="share-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Vista previa de la imagen para compartir tu carnet" width={1200} height={630} loading="lazy" />
      </div>
      <div className="stack" style={{ gap: 10, flex: 1, minWidth: 240 }}>
        <h2 id="share-title" className="section-title" style={{ margin: 0 }}>
          Comparte tu carnet
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
                onClick={() => navigator.share({ title: "Mi carnet de hincha", text, url }).catch(() => {})}
              >
                Compartir…
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
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
              Tu carnet es privado: descarga la imagen y súbela a X tal cual. Para compartir el link, hazlo público en{" "}
              <Link href="/perfil#privacidad-datos">Privacidad y datos</Link>.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
