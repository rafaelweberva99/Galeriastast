"use client";

import Link from "next/link";
import { ShareButtons } from "../ShareCarnet.tsx";

/** Compartir el resumen anual: X, menú del teléfono, copiar link y descargar la imagen vertical 1080×1920. */
export function ResumenShare({
  image,
  imageX,
  story,
  text,
  url,
  isPublic,
  year,
}: {
  image: string;
  imageX: string;
  story: string;
  text: string;
  url: string;
  isPublic: boolean;
  year: number;
}) {
  return (
    <section className="card rs-share" aria-labelledby="rs-share-title">
      <div className="rs-share-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story} alt={`Imagen para compartir tu ${year} en la galería`} width={1080} height={1920} loading="lazy" />
      </div>
      <div className="stack" style={{ gap: 10, flex: 1, minWidth: 240 }}>
        <h2 id="rs-share-title" className="section-title" style={{ margin: 0 }}>
          Comparte tu {year}
        </h2>
        <p className="muted small" style={{ margin: 0 }}>
          {text}
        </p>
        {isPublic ? (
          <>
            <ShareButtons text={text} url={url} shareTitle={`Mi ${year} en la galería`} downloadHref={`${story}?descargar=1`} downloadLabel="Para historias" />
            <p className="muted small" style={{ margin: 0 }}>
              También hay una <a href={`${image}?descargar=1`}>versión para feed</a> (1080×1350) y una <a href={`${imageX}?descargar=1`}>horizontal</a> (1200×630) para X y WhatsApp.
            </p>
          </>
        ) : (
          <>
            <div className="share-actions">
              <a className="btn" href={`${story}?descargar=1`}>
                Descargar para historias
              </a>
              <a className="btn" href={`${image}?descargar=1`}>
                Descargar para feed
              </a>
            </div>
            <p className="small" style={{ margin: 0 }}>
              Tu Galería es privada: descarga la imagen y súbela a Instagram o X tal cual. Para compartir el link, hazlo público en{" "}
              <Link href="/perfil#privacidad-datos">Privacidad y datos</Link>.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
