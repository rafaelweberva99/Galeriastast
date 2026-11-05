"use client";

import Link from "next/link";
import { useState } from "react";

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M18.244 2H21.5l-7.1 8.13L22.75 22h-6.54l-5.12-6.7L5.2 22H1.94l7.6-8.7L1.5 2h6.7l4.63 6.12L18.244 2Zm-1.14 18h1.8L7.2 3.9H5.27L17.104 20Z" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 1 1 6.97 3.85Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42h-.47c-.16 0-.43.06-.65.3-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.16 1.73 2.64 4.2 3.7 1.56.67 2.17.73 2.95.62.48-.07 1.46-.6 1.67-1.17.2-.58.2-1.07.14-1.17-.06-.1-.23-.16-.47-.28Z" />
  </svg>
);

/** Botones de compartir (X, WhatsApp, menú del teléfono, copiar link y descargar imagen), compartidos por el carnet y el resumen. */
export function ShareButtons({
  text,
  url,
  shareTitle,
  downloadHref,
  downloadLabel = "Descargar imagen",
}: {
  text: string;
  url: string;
  shareTitle: string;
  downloadHref: string;
  downloadLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=GaluchaStats`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="share-actions">
      <a className="btn" href={tweet} target="_blank" rel="noopener noreferrer">
        <XIcon /> Compartir en X
      </a>
      <a className="btn btn-wa" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp">
        <WhatsAppIcon /> WhatsApp
      </a>
      {canNativeShare && (
        <button type="button" className="btn btn-ghost" onClick={() => navigator.share({ title: shareTitle, text, url }).catch(() => {})}>
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
      <a className="btn btn-ghost" href={downloadHref}>
        {downloadLabel}
      </a>
    </div>
  );
}

/** Compartir el carnet: X, WhatsApp, menú del teléfono, copiar link y descargar la imagen. */
export function ShareCarnet({ username, isPublic, text, url }: { username: string; isPublic: boolean; text: string; url: string }) {
  const image = `/hincha/${encodeURIComponent(username)}/tarjeta`;
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
          <ShareButtons text={text} url={url} shareTitle="Mi carnet de hincha" downloadHref={`${image}?descargar=1`} />
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
