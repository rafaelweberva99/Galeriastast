/** Textos de los correos (puros, sin red): aviso de nuevo registro y recordatorio a los 7 días. */
import { createHmac, timingSafeEqual } from "node:crypto";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Aviso para el dueño: quién se registró (solo usuario y club, sin correo). */
export function newFanNotice(opts: { username: string; clubName: string; total: number }) {
  const { username, clubName, total } = opts;
  return {
    subject: `Nuevo hincha: @${username} (${clubName})`,
    text: `Se registró @${username}, hincha de ${clubName}.\nYa son ${total} ${total === 1 ? "hincha registrado" : "hinchas registrados"} en GaluchaStats.`,
  };
}

/** Recordatorio a quien se registró hace una semana y no marcó ningún partido. */
export function reminderMail(opts: { username: string; clubName: string; url: string; unsubscribeUrl: string }) {
  const { username, clubName, url, unsubscribeUrl } = opts;
  const subject = `@${username}, tu Galería de ${clubName} quedó a medias ⚽`;
  const text = [
    `Hola @${username},`,
    "",
    `Hace una semana creaste tu cuenta en GaluchaStats, pero todavía no marcas ningún partido de ${clubName}.`,
    "Con solo unos cuantos partidos ya puedes ver tu efectividad, el goleador que más viste y el que más te hizo sufrir.",
    "",
    `Marca los que viste: ${url}`,
    "",
    "¿Compraste las entradas en línea? Es más rápido subir una captura de tus entradas y se cargan solas.",
    "",
    "GaluchaStats · hecho por hinchas, solo para entretención.",
    `Si no quieres recibir más recordatorios: ${unsubscribeUrl}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111;line-height:1.5">
<p>Hola <strong>@${esc(username)}</strong>,</p>
<p>Hace una semana creaste tu cuenta en GaluchaStats, pero todavía no marcas ningún partido de <strong>${esc(clubName)}</strong>.</p>
<p>Con solo unos cuantos partidos ya puedes ver tu efectividad, el goleador que más viste y el que más te hizo sufrir.</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#0b3a9c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">Marcar mis partidos</a></p>
<p style="color:#555;font-size:14px">¿Compraste las entradas en línea? Es más rápido subir una captura de tus entradas y se cargan solas.</p>
<hr style="border:none;border-top:1px solid #ddd">
<p style="color:#777;font-size:12px">GaluchaStats · hecho por hinchas, solo para entretención.<br><a href="${esc(unsubscribeUrl)}">No quiero recibir más recordatorios</a></p>
</div>`;
  return { subject, text, html };
}

// --- Enlace de baja firmado (sin guardar tokens): HMAC del id de usuario. ---

function secret(): string {
  const s = process.env.MAIL_SECRET || process.env.CRON_SECRET;
  if (!s) throw new Error("Falta MAIL_SECRET (o CRON_SECRET) para firmar los enlaces de baja.");
  return s;
}

export function unsubscribeToken(userId: number): string {
  const sig = createHmac("sha256", secret()).update(`baja:${userId}`).digest("base64url").slice(0, 32);
  return `${userId}.${sig}`;
}

/** Devuelve el id de usuario si el token es válido; si no, null. */
export function verifyUnsubscribeToken(token: string): number | null {
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const expected = unsubscribeToken(Number(m[1])).split(".")[1];
  const a = Buffer.from(m[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? Number(m[1]) : null;
}
