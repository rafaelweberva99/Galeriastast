/**
 * Envío de correos por SMTP (hoy: la cuenta de Gmail de GaluchaStats con contraseña de aplicación).
 * Variables de entorno: GMAIL_USER, GMAIL_APP_PASSWORD (SMTP_HOST/SMTP_PORT/SMTP_SECURE solo para pruebas). Sin ellas, no envía y lo avisa en el log
 * (nunca debe romper un registro). Para pasar a otro proveedor basta cambiar `transport`.
 */
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Cabecera List-Unsubscribe (correos a hinchas). */
  unsubscribeUrl?: string;
}

let cached: Transporter | null = null;

export function mailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function transport(): Transporter {
  cached ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "1" : true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return cached;
}

/** Envía un correo. Devuelve true si Gmail lo aceptó; nunca lanza. */
export async function sendMail(m: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    console.warn("[mail] GMAIL_USER / GMAIL_APP_PASSWORD no configurados: correo no enviado:", m.subject);
    return false;
  }
  try {
    await transport().sendMail({
      from: `GaluchaStats <${process.env.GMAIL_USER}>`,
      to: m.to,
      subject: m.subject,
      text: m.text,
      html: m.html,
      headers: m.unsubscribeUrl
        ? { "List-Unsubscribe": `<${m.unsubscribeUrl}>` }
        : undefined,
    });
    return true;
  } catch (e) {
    console.error("[mail] error al enviar:", (e as Error).message);
    return false;
  }
}
