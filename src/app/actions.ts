"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, requireUser, startSession } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import {
  AttendanceError,
  authenticate,
  createUser,
  removeAttendance,
  setAttendance,
  updateProfile,
  UserExistsError,
} from "@/lib/repo/users.ts";

export interface FormState {
  error?: string;
}

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "El usuario debe tener 3 a 20 caracteres: letras, números o _."),
  email: z.string().trim().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  clubId: z.string().min(1, "Elige tu club."),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const db = getDb();
  if (!getTeam(db, parsed.data.clubId)) return { error: "Club desconocido." };
  try {
    const user = createUser(db, parsed.data);
    await startSession(user.id);
  } catch (e) {
    if (e instanceof UserExistsError) return { error: e.message };
    throw e;
  }
  redirect("/partidos");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const user = authenticate(getDb(), String(form.get("login") ?? "").trim(), String(form.get("password") ?? ""));
  if (!user) return { error: "Usuario o contraseña incorrectos." };
  await startSession(user.id);
  redirect("/carnet");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}

const attendanceSchema = z.object({
  matchId: z.string().min(1),
  mode: z.enum(["propia", "infiltrado", "ninguno"]),
});

/** Marca / desmarca un partido. mode = 'ninguno' elimina la asistencia. */
export async function toggleAttendance(form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = attendanceSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Solicitud inválida." };
  const db = getDb();
  try {
    if (parsed.data.mode === "ninguno") removeAttendance(db, user.id, parsed.data.matchId);
    else setAttendance(db, user, parsed.data.matchId, parsed.data.mode);
  } catch (e) {
    if (e instanceof AttendanceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/carnet");
  revalidatePath(`/hincha/${user.username}`);
  return {};
}

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const clubId = String(form.get("clubId") ?? "");
  const db = getDb();
  if (!getTeam(db, clubId)) return { error: "Club desconocido." };
  updateProfile(db, user.id, { clubId, isPublic: form.get("isPublic") === "on" });
  revalidatePath("/", "layout");
  redirect("/carnet");
}
