"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSessionCookie, endAllSessions, endSession, mustAcceptLegal, requireUser, startSession } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { MIN_AGE } from "@/lib/legal.ts";
import {
  acceptLegal,
  AccountError,
  ConsentRequiredError,
  deleteAccount,
  registerUser,
  setPublicProfile,
} from "@/lib/repo/account.ts";
import { analyzeSheet } from "@/lib/ingest/sheet.ts";
import { analyzeTicket, TeamMentionIndex } from "@/lib/ingest/tickets.ts";
import type { Match } from "@/lib/domain/types.ts";
import { getTeam, listClubs } from "@/lib/repo/teams.ts";
import { isVisibleClub } from "@/lib/mvp.ts";
import {
  attendanceModes,
  AttendanceError,
  authenticate,
  removeAttendance,
  setAttendance,
  updateProfile,
  UserExistsError,
} from "@/lib/repo/users.ts";

export interface FormState {
  error?: string;
  ok?: string;
  /** Lo que el hincha escribió (nunca contraseñas), para no vaciar el formulario cuando hay un error. */
  values?: Record<string, string>;
}

const echo = (form: FormData, keys: string[]): Record<string, string> =>
  Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
const CLUB_NOT_YET = "Ese club todavía no está disponible: estamos completando su historial.";
const REGISTER_ECHO = ["username", "email", "clubId", "acceptTerms", "acceptPrivacy", "isAdult", "isPublic"];

/** Casilla obligatoria: el navegador envía "on" solo si está marcada. */
const mustCheck = (message: string) => z.literal("on", { errorMap: () => ({ message }) });

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "El usuario debe tener 3 a 20 caracteres: letras, números o _."),
  email: z.string().trim().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  clubId: z.string().min(1, "Elige tu club."),
  acceptTerms: mustCheck("Debes aceptar los Términos y Condiciones."),
  acceptPrivacy: mustCheck("Debes confirmar que leíste la Política de Privacidad."),
  isAdult: mustCheck(`Debes tener ${MIN_AGE} años o más para crear una cuenta.`),
  isPublic: z.literal("on").optional(),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  const values = echo(form, REGISTER_ECHO);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const db = await getDb();
  const { username, email, password, clubId } = parsed.data;
  if (!(await getTeam(db, clubId))) return { error: "Club desconocido.", values };
  if (!isVisibleClub(clubId)) return { error: CLUB_NOT_YET, values };
  try {
    const user = await registerUser(db, {
      username,
      email,
      password,
      clubId,
      acceptTerms: true,
      acceptPrivacy: true,
      isAdult: true,
      isPublic: parsed.data.isPublic === "on",
    });
    await startSession(user.id);
  } catch (e) {
    if (e instanceof UserExistsError || e instanceof ConsentRequiredError) return { error: e.message, values };
    throw e;
  }
  redirect("/partidos");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const user = await authenticate(await getDb(), String(form.get("login") ?? "").trim(), String(form.get("password") ?? ""));
  if (!user) return { error: "Usuario o contraseña incorrectos.", values: echo(form, ["login"]) };
  await startSession(user.id);
  // Si cambió la versión de los Términos o de la Privacidad, hay que aceptarla antes de seguir.
  redirect((await mustAcceptLegal(user.id)) ? "/aceptar" : "/carnet");
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
  if (!isVisibleClub(clubId) && clubId !== user.clubId) return { error: CLUB_NOT_YET };
  await updateProfile(db, user.id, { clubId });
  revalidatePath("/", "layout");
  redirect("/carnet");
}

// --- Privacidad y datos -----------------------------------------------------

/** Aceptar la versión vigente de los documentos (hinchas antiguos o cuando sube la versión). */
export async function acceptLegalAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser({ allowPendingLegal: true });
  try {
    await acceptLegal(await getDb(), user.id, {
      acceptTerms: form.get("acceptTerms") === "on",
      acceptPrivacy: form.get("acceptPrivacy") === "on",
      isAdult: form.get("isAdult") === "on",
      // Solo se pregunta (y se registra) a quien nunca eligió; el campo oculto indica que se mostró.
      isPublic: form.get("askPublic") === "1" ? form.get("isPublic") === "on" : undefined,
    });
  } catch (e) {
    if (e instanceof ConsentRequiredError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/carnet");
}

/** Cambia la preferencia de perfil público; el cambio queda registrado en consents. */
export async function savePrivacy(_: FormState, form: FormData): Promise<FormState> {
  // Retirar el consentimiento debe ser tan fácil como darlo: hacerse privado se permite incluso con
  // documentos pendientes; hacerse público, solo con las condiciones vigentes aceptadas.
  const user = await requireUser({ allowPendingLegal: true });
  const isPublic = form.get("isPublic") === "on";
  if (isPublic && (await mustAcceptLegal(user.id))) {
    return { error: "Para mostrar tu carnet en público primero acepta las condiciones vigentes." };
  }
  await setPublicProfile(await getDb(), user.id, isPublic);
  revalidatePath("/", "layout");
  return {
    ok: isPublic
      ? "Listo: tu carnet ahora aparece en los rankings y en tu perfil público."
      : "Listo: tu carnet ahora es privado y no aparece en los rankings.",
  };
}

export async function logoutEverywhere(): Promise<void> {
  const user = await requireUser({ allowPendingLegal: true });
  await endAllSessions(user.id);
  redirect("/ingresar?sesiones=cerradas");
}

export async function deleteMyAccount(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser({ allowPendingLegal: true });
  try {
    await deleteAccount(await getDb(), user.id, {
      username: String(form.get("confirmUsername") ?? ""),
      password: String(form.get("password") ?? ""),
    });
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message, values: echo(form, ["confirmUsername"]) };
    throw e;
  }
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/?cuenta=eliminada");
}

// --- Importar desde PuntoTicket --------------------------------------------

export interface ImportCandidate {
  id: string;
  date: string;
  label: string;
  detail: string;
  reason: string;
  alreadyMarked: boolean;
}

export interface ImportPreview {
  error?: string;
  candidates?: ImportCandidate[];
  /** Fechas encontradas sin partido del club en la base. */
  unmatchedDates?: string[];
  /** Filas de la planilla que no calzaron con un solo partido (con los partidos posibles, sin marcar). */
  review?: { line: number; text: string; problem: string; options: ImportCandidate[] }[];
  /** Ticketeras reconocidas en los comprobantes. */
  providers?: string[];
}

let mentionIndex: TeamMentionIndex | null = null;

/** Analiza el comprobante de compra y propone partidos. No guarda el texto. */
export async function previewTicketImport(_: ImportPreview, form: FormData): Promise<ImportPreview> {
  const user = await requireUser();
  const text = String(form.get("text") ?? "");
  if (text.trim().length < 10)
    return { error: "Sube una captura de “Mis compras”, el PDF de tu entrada o el correo de confirmación." };
  if (text.length > 2_000_000) return { error: "El archivo es demasiado grande." };
  const db = await getDb();
  mentionIndex ??= new TeamMentionIndex(
    (await listClubs(db)).map((t) => ({ id: t.id, name: t.name, short: t.shortName })),
  );
  const modes = await attendanceModes(db, user.id);
  const { candidates: found, unmatchedDates, providers } = await analyzeTicket(db, user.clubId, text, mentionIndex);
  if (!found.length) {
    return {
      unmatchedDates,
      providers,
      error: unmatchedDates.length
        ? `Leímos ${unmatchedDates.length === 1 ? "la fecha" : "las fechas"} ${unmatchedDates.join(", ")}, pero no hay partidos de tu club ese día en la base.`
        : "No encontramos fechas de partidos en lo que subiste. Prueba con una captura donde se vea el nombre del partido y la fecha.",
    };
  }
  return {
    unmatchedDates,
    providers,
    candidates: found.map(({ match: m, reason }) => toCandidate(m, reason, modes)),
  };
}

function toCandidate(m: Match, reason: string, modes: Map<string, unknown>): ImportCandidate {
  return {
    id: m.id,
    date: m.date,
    label: `${m.homeTeamName} ${m.homeGoals ?? ""}-${m.awayGoals ?? ""} ${m.awayTeamName}`,
    detail: [m.competitionName, m.tournament, m.stage].filter(Boolean).join(" · "),
    reason,
    alreadyMarked: modes.has(m.id),
  };
}

/** Analiza una planilla (Excel copiado y pegado o CSV) y propone los partidos. No guarda el texto. */
export async function previewSheetImport(_: ImportPreview, form: FormData): Promise<ImportPreview> {
  const user = await requireUser();
  const text = String(form.get("text") ?? "");
  if (text.trim().length < 6) return { error: "Pega las filas de tu planilla o sube el archivo CSV." };
  if (text.length > 1_000_000) return { error: "La planilla es demasiado grande (máximo 2.000 filas)." };
  const db = await getDb();
  const teams = (await listClubs(db)).map((t) => ({ id: t.id, name: t.name, short: t.shortName }));
  const modes = await attendanceModes(db, user.id);
  const rows = await analyzeSheet(db, user.clubId, text, teams);
  const seen = new Set<string>();
  const candidates: ImportCandidate[] = [];
  for (const r of rows) {
    if (!r.match || seen.has(r.match.id)) continue;
    seen.add(r.match.id);
    candidates.push(toCandidate(r.match, `fila ${r.line}: ${r.reason}`, modes));
  }
  const review = rows
    .filter((r) => !r.match)
    .map((r) => ({
      line: r.line,
      text: r.text,
      problem: r.problem ?? "no calzó",
      options: (r.options ?? []).filter((m) => !seen.has(m.id)).map((m) => toCandidate(m, `posible para la fila ${r.line}`, modes)),
    }));
  if (!candidates.length && !review.length) return { error: "No encontramos filas con partidos en lo que pegaste." };
  return { candidates: candidates.sort((a, b) => b.date.localeCompare(a.date)), review };
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
