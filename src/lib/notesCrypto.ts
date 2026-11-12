/**
 * Cifrado de las notas personales (AES-256-GCM). La clave sale de NOTES_SECRET (o, si no existe, de MAIL_SECRET /
 * CRON_SECRET) y se deriva por hincha con HKDF: la misma nota cifrada con otra clave o de otro hincha no se abre.
 * Si no hay ninguna clave configurada, las notas quedan desactivadas (nunca se guardan en claro).
 * Cambiar la clave vuelve ilegibles las notas ya guardadas.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

function secret(): string | null {
  return process.env.NOTES_SECRET || process.env.MAIL_SECRET || process.env.CRON_SECRET || null;
}

export function notesEnabled(): boolean {
  return !!secret();
}

function keyFor(userId: number): Buffer {
  const s = secret();
  if (!s) throw new Error("Las notas están desactivadas: falta NOTES_SECRET.");
  return Buffer.from(hkdfSync("sha256", s, `usuario:${userId}`, "galuchastats-notas-v1", 32));
}

/** "v1.<iv>.<etiqueta>.<texto>" en base64url. */
export function encryptNote(userId: number, text: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyFor(userId), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** Devuelve el texto, o null si no se puede abrir (clave distinta, dato dañado o de otro hincha). */
export function decryptNote(userId: number, enc: string): string | null {
  try {
    const [v, iv, tag, body] = enc.split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", keyFor(userId), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
