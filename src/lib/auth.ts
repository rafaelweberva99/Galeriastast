import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db/client.ts";
import { createSession, deleteSession, userForSession, type User } from "./repo/users.ts";

const COOKIE = "galeria_session";

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? userForSession(getDb(), token) : null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/ingresar");
  return user;
}

export async function startSession(userId: number): Promise<void> {
  const { token, expiresAt } = createSession(getDb(), userId);
  (await cookies()).set(COOKIE, token, {
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
  if (token) deleteSession(getDb(), token);
  jar.delete(COOKIE);
}
