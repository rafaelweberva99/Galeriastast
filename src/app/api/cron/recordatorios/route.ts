import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db/client.ts";
import { mailConfigured, sendMail } from "@/lib/mail.ts";
import { reminderMail, unsubscribeToken } from "@/lib/mailTemplates.ts";
import { fansToRemind, markReminded } from "@/lib/repo/emails.ts";
import { siteUrl } from "@/lib/site.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tope por corrida: Gmail limita los envíos diarios y la función tiene tiempo acotado. */
const MAX_PER_RUN = 25;

/**
 * Recordatorio diario (Vercel Cron, ver vercel.json): a quien se registró hace 7-30 días y no marcó
 * ningún partido, un solo correo. Vercel manda `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("No autorizado", { status: 401 });
  if (!mailConfigured()) return Response.json({ enviados: 0, error: "Correo no configurado (GMAIL_USER / GMAIL_APP_PASSWORD)" }, { status: 503 });

  const db = await getDb();
  const fans = await fansToRemind(db, new Date(), MAX_PER_RUN);
  let sent = 0;
  for (const f of fans) {
    const mail = reminderMail({
      username: f.username,
      clubName: f.clubName,
      url: `${siteUrl()}/partidos`,
      unsubscribeUrl: `${siteUrl()}/baja?t=${unsubscribeToken(f.id)}`,
    });
    if (await sendMail({ to: f.email, ...mail, unsubscribeUrl: `${siteUrl()}/baja?t=${unsubscribeToken(f.id)}` })) {
      await markReminded(db, f.id);
      sent++;
    }
  }
  return Response.json({ candidatos: fans.length, enviados: sent });
}
