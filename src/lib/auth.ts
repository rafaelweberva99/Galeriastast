import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db/client.ts";
import { legalStatus, needsAcceptance } from "./repo/account.ts";
import { createSession, deleteSession, deleteUserSessions, userForSession, type User } from "./repo/users.ts";

const COOKIE = "galeria_session";

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? userForSession(await getDb(), token) : null;
}

/**
 * Exige sesión. Si el hincha tiene pendiente aceptar una versión nueva de los Términos o de la
 * Política de Privacidad, lo manda a /aceptar (salvo en las acciones que deben funcionar igual,
 * como eliminar la cuenta o descargar sus datos: allowPendingLegal).
 */
export async function requireUser(opts: { allowPendingLegal?: boolean } = {}): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/ingresar");
  if (!opts.allowPendingLegal && (await mustAcceptLegal(user.id))) redirect("/aceptar");
  return user;
}

export async function mustAcceptLegal(userId: number): Promise<boolean> {
  return needsAcceptance(await legalStatus(await getDb(), userId));
}

/** Al ingresar siempre se crea un token nuevo y se invalida el que hubiera en el navegador. */
export async function startSession(userId: number): Promise<void> {
  const db = await getDb();
  const jar = await cookies();
  const previous = jar.get(COOKIE)?.value;
  if (previous) await deleteSession(db, previous);
  const { token, expiresAt } = await createSession(db, userId);
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  jar.delete(COOKIE);
}

/** Cierra todas las sesiones del hincha (todos sus dispositivos), incluida la actual. */
export async function endAllSessions(userId: number): Promise<void> {
  await deleteUserSessions(await getDb(), userId);
  (await cookies()).delete(COOKIE);
}

/** Borra la cookie de sesión (por ejemplo, después de eliminar la cuenta). */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * IP del visitante para el freno a la fuerza bruta. En Vercel, x-real-ip y x-forwarded-for los pone la
 * plataforma (no los puede falsificar el cliente); fuera de Vercel se confía en el proxy que haya delante.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? ip.slice(0, 64) : "desconocida";
}
