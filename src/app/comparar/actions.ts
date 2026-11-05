"use server";

import { currentUser } from "@/lib/auth.ts";
import { resolveFan } from "@/lib/comparar.ts";
import { getDb } from "@/lib/db/client.ts";
import { normalizeHandle } from "@/lib/domain/comparar.ts";

export type ValidarResult = { ok: true; href: string } | { ok: false; message: string };

/** Valida al amigo antes de navegar. `from` = tu @usuario (o "yo"). */
export async function validarAmigo(from: string, raw: string): Promise<ValidarResult> {
  const friend = normalizeHandle(raw ?? "");
  if (!friend) return { ok: false, message: "Escribe el @usuario de tu amigo." };
  if (friend.length > 40) return { ok: false, message: "Ese usuario es demasiado largo." };
  const db = await getDb();
  const viewer = await currentUser();
  const a = await resolveFan(db, from || "yo", viewer);
  if ("error" in a) return { ok: false, message: "Ingresa a tu cuenta para compararte." };
  const b = await resolveFan(db, friend, viewer);
  if ("error" in b) return { ok: false, message: `No encontramos a @${friend} o no tiene el carnet público.` };
  if (a.user.id === b.user.id) return { ok: false, message: "Ese eres tú. Busca a un amigo para picarse." };
  return { ok: true, href: `/comparar/${encodeURIComponent(a.user.username)}/${encodeURIComponent(b.user.username)}` };
}
