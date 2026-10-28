"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, requireUser, startSession } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { findTicketMatches, TeamMentionIndex } from "@/lib/ingest/tickets.ts";
import { getTeam, listClubs } from "@/lib/repo/teams.ts";
import {
  attendanceModes,
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
  const db = await getDb();
  if (!(await getTeam(db, parsed.data.clubId))) return { error: "Club desconocido." };
  try {
    const user = await createUser(db, parsed.data);
    await startSession(user.id);
  } catch (e) {
    if (e instanceof UserExistsError) return { error: e.message };
    throw e;
  }
  redirect("/partidos");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const user = await authenticate(await getDb(), String(form.get("login") ?? "").trim(), String(form.get("password") ?? ""));
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
  const db = await getDb();
  try {
    if (parsed.data.mode === "ninguno") await removeAttendance(db, user.id, parsed.data.matchId);
    else await setAttendance(db, user, parsed.data.matchId, parsed.data.mode);
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
  const db = await getDb();
  if (!(await getTeam(db, clubId))) return { error: "Club desconocido." };
  await updateProfile(db, user.id, { clubId, isPublic: form.get("isPublic") === "on" });
  revalidatePath("/", "layout");
  redirect("/carnet");
}

// --- Importar desde PuntoTicket --------------------------------------------

export interface ImportPreview {
  error?: string;
  candidates?: {
    id: string;
    date: string;
    label: string;
    detail: string;
    reason: string;
    alreadyMarked: boolean;
  }[];
}

let mentionIndex: TeamMentionIndex | null = null;

/** Analiza el comprobante de compra y propone partidos. No guarda el texto. */
export async function previewTicketImport(_: ImportPreview, form: FormData): Promise<ImportPreview> {
  const user = await requireUser();
  const text = String(form.get("text") ?? "");
  if (text.trim().length < 10) return { error: "Pega el correo de confirmación de tu compra o sube el archivo .eml." };
  if (text.length > 2_000_000) return { error: "El archivo es demasiado grande." };
  const db = await getDb();
  mentionIndex ??= new TeamMentionIndex(
    (await listClubs(db)).map((t) => ({ id: t.id, name: t.name, short: t.shortName })),
  );
  const modes = await attendanceModes(db, user.id);
  const found = await findTicketMatches(db, user.clubId, text, mentionIndex);
  if (!found.length) {
    return {
      error:
        "No encontramos partidos de tu club con esas fechas. Revisa que el correo incluya la fecha del evento; " +
        "por ahora la base cubre partidos hasta mediados de 2024.",
    };
  }
  return {
    candidates: found.map(({ match: m, reason }) => ({
      id: m.id,
      date: m.date,
      label: `${m.homeTeamName} ${m.homeGoals ?? ""}-${m.awayGoals ?? ""} ${m.awayTeamName}`,
      detail: [m.competitionName, m.tournament, m.stage].filter(Boolean).join(" · "),
      reason,
      alreadyMarked: modes.has(m.id),
    })),
  };
}

/** Marca de una vez los partidos confirmados por el hincha. */
export async function confirmTicketImport(form: FormData): Promise<void> {
  const user = await requireUser();
  const mode = form.get("mode") === "infiltrado" ? "infiltrado" : "propia";
  const db = await getDb();
  for (const id of form.getAll("matchId").map(String)) {
    try {
      await setAttendance(db, user, id, mode);
    } catch (e) {
      if (!(e instanceof AttendanceError)) throw e;
    }
  }
  revalidatePath("/carnet");
  redirect("/carnet");
}
