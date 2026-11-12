"use server";

import { after } from "next/server";
import { sendMail } from "@/lib/mail.ts";
import { newFanNotice } from "@/lib/mailTemplates.ts";
import { countFans } from "@/lib/repo/emails.ts";
import { NoteError, saveNote } from "@/lib/repo/notes.ts";
import { countMarked } from "@/lib/repo/onboarding.ts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSessionCookie, clientIp, endAllSessions, endSession, mustAcceptLegal, requireUser, startSession } from "@/lib/auth.ts";
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
import { getTeam, listClubs, SELECCION_ID } from "@/lib/repo/teams.ts";
import { isVisibleClub } from "@/lib/mvp.ts";
import {
  attendanceModes,
  AttendanceError,
  authenticate,
  MAX_PASSWORD_LENGTH,
  removeAttendance,
  setAttendance,
  setSecondClub,
  updateProfile,
  UserExistsError,
} from "@/lib/repo/users.ts";
import { clearFailures, lockedMessage, lockedUntil, recordFailure, throttleKey } from "@/lib/repo/throttle.ts";

export interface FormState {
  error?: string;
  ok?: string;
  /** Lo que el hincha escribió (nunca contraseñas), para no vaciar el formulario cuando hay un error. */
  values?: Record<string, string>;
}

const echo = (form: FormData, keys: string[]): Record<string, string> =>
  Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
const CLUB_NOT_YET = "Ese club todavía no está disponible: estamos completando su historial.";
const REGISTER_ECHO = ["username", "email", "clubId", "acceptTerms", "acceptPrivacy", "isAdult"];

/** Casilla obligatoria: el navegador envía "on" solo si está marcada. */
const mustCheck = (message: string) => z.literal("on", { errorMap: () => ({ message }) });

const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{3,20}$/, "El usuario debe tener 3 a 20 caracteres: letras, números o _.");

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().max(254, "Correo inválido.").email("Correo inválido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(MAX_PASSWORD_LENGTH, `La contraseña puede tener hasta ${MAX_PASSWORD_LENGTH} caracteres.`),
  clubId: z.string().min(1, "Elige tu club.").max(64, "Club desconocido."),
  acceptTerms: mustCheck("Debes aceptar los Términos y Condiciones."),
  acceptPrivacy: mustCheck("Debes confirmar que leíste la Política de Privacidad."),
  isAdult: mustCheck(`Debes tener ${MIN_AGE} años o más para crear una cuenta.`),
});

/** Avisa al dueño por correo de cada registro (usuario y club; nunca el correo del hincha). No bloquea ni rompe el registro. */
function notifyNewFan(db: Awaited<ReturnType<typeof getDb>>, username: string, clubId: string) {
  after(async () => {
    try {
      const [club, total] = await Promise.all([getTeam(db, clubId), countFans(db)]);
      const to = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER;
      if (!to) return;
      await sendMail({ to, ...newFanNotice({ username, clubName: club?.name ?? clubId, total }) });
    } catch (e) {
      console.error("[mail] aviso de registro falló:", (e as Error).message);
    }
  });
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  const values = echo(form, REGISTER_ECHO);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const db = await getDb();
  const { username, email, password, clubId } = parsed.data;
  if (!(await getTeam(db, clubId))) return { error: "Club desconocido.", values };
  if (clubId === SELECCION_ID) return { error: "La Selección tiene su propia sección: elige un club de la liga.", values };
  if (!isVisibleClub(clubId)) return { error: CLUB_NOT_YET, values };
  // Límite de cuentas por IP: cada intento que llega a la base (creado o con usuario/correo repetido) cuenta.
  const ipKey = throttleKey("register", await clientIp());
  const until = await lockedUntil(db, [ipKey]);
  if (until) return { error: lockedMessage(until), values };
  await recordFailure(db, ipKey);
  try {
    const user = await registerUser(db, {
      username,
      email,
      password,
      clubId,
      acceptTerms: true,
      acceptPrivacy: true,
      isAdult: true,
      isPublic: true, // la Galería es pública para todos (Términos 1.2 y Privacidad 1.2, aceptados al registrarse)
    });
    await startSession(user.id);
    notifyNewFan(db, user.username, clubId);
  } catch (e) {
    if (e instanceof UserExistsError || e instanceof ConsentRequiredError) return { error: e.message, values };
    throw e;
  }
  // Paso 2: directo a cargar partidos (captura, a mano o Excel).
  redirect("/bienvenida");
}

const LOGIN_FAILED = "Usuario o contraseña incorrectos.";

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("login") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const values = { login: name.slice(0, 254) };
  if (!name || !password || name.length > 254 || password.length > MAX_PASSWORD_LENGTH) return { error: LOGIN_FAILED, values };
  const db = await getDb();
  // Freno a la fuerza bruta: por cuenta (lo escrito) y por IP. El mensaje es igual exista o no la cuenta.
  const accountKey = throttleKey("login", name);
  const ipKey = throttleKey("ip", await clientIp());
  const until = await lockedUntil(db, [accountKey, ipKey]);
  if (until) return { error: lockedMessage(until), values };
  const user = await authenticate(db, name, password);
  if (!user) {
    const a = await recordFailure(db, accountKey);
    const b = await recordFailure(db, ipKey);
    const locked = [a.lockedUntil, b.lockedUntil].filter((d): d is Date => !!d).sort((x, y) => +y - +x)[0];
    return { error: locked ? lockedMessage(locked) : LOGIN_FAILED, values };
  }
  await clearFailures(db, accountKey);
  await startSession(user.id);
  // Si cambió la versión de los Términos o de la Privacidad, hay que aceptarla antes de seguir.
  if (await mustAcceptLegal(user.id)) redirect("/aceptar");
  // Si aún no marca ningún partido, lo llevamos a cargarlos en vez de a un carnet vacío.
  redirect((await countMarked(db, user.id)) === 0 ? "/bienvenida" : "/carnet");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}

const attendanceSchema = z.object({
  matchId: z.string().min(1).max(200),
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
  revalidatePath("/seleccion");
  revalidatePath(`/hincha/${user.username}`);
  return {};
}

const noteSchema = z.object({ matchId: z.string().min(1).max(200), text: z.string().max(5000) });

/** Guarda (o borra, si va vacía) la nota personal del hincha sobre un partido. */
export async function saveNoteAction(form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Solicitud inválida." };
  try {
    await saveNote(await getDb(), user, parsed.data.matchId, parsed.data.text);
  } catch (e) {
    if (e instanceof NoteError) return { error: e.message };
    throw e;
  }
  revalidatePath("/notas");
  return {};
}

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = echo(form, ["username", "clubId", "secondClubId"]);
  const clubId = String(form.get("clubId") ?? "");
  const secondClubId = String(form.get("secondClubId") ?? "");
  const name = usernameSchema.safeParse(String(form.get("username") ?? user.username));
  if (!name.success) return { error: name.error.issues[0].message, values };
  const db = await getDb();
  if (!(await getTeam(db, clubId))) return { error: "Club desconocido.", values };
  if (clubId === SELECCION_ID || secondClubId === SELECCION_ID) return { error: "La Selección tiene su propia sección: elige un club de la liga.", values };
  if (!isVisibleClub(clubId) && clubId !== user.clubId) return { error: CLUB_NOT_YET, values };
  if (secondClubId) {
    if (!(await getTeam(db, secondClubId))) return { error: "Segundo club desconocido.", values };
    if (secondClubId === clubId) return { error: "Tu segundo club tiene que ser distinto de tu club principal.", values };
    if (!isVisibleClub(secondClubId)) return { error: CLUB_NOT_YET, values };
  }
  try {
    await updateProfile(db, user.id, { clubId, username: name.data });
    await setSecondClub(db, { ...user, clubId }, secondClubId || null);
  } catch (e) {
    if (e instanceof UserExistsError || e instanceof AttendanceError) return { error: e.message, values };
    throw e;
  }
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
      // Desde las versiones 1.2 la Galería es pública para todos: aceptar las condiciones lo incluye y queda registrado.
      isPublic: true,
    });
  } catch (e) {
    if (e instanceof ConsentRequiredError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/carnet");
}

export async function logoutEverywhere(): Promise<void> {
  const user = await requireUser({ allowPendingLegal: true });
  await endAllSessions(user.id);
  redirect("/ingresar?sesiones=cerradas");
}

export async function deleteMyAccount(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser({ allowPendingLegal: true });
  const db = await getDb();
  // La contraseña que se pide aquí también tiene freno (una sesión robada no permite adivinarla sin límite).
  const accountKey = throttleKey("login", user.username);
  const until = await lockedUntil(db, [accountKey]);
  if (until) return { error: lockedMessage(until), values: echo(form, ["confirmUsername"]) };
  try {
    await deleteAccount(db, user.id, {
      username: String(form.get("confirmUsername") ?? ""),
      password: String(form.get("password") ?? ""),
    });
  } catch (e) {
    if (e instanceof AccountError) {
      if (/contraseña/.test(e.message)) await recordFailure(db, accountKey);
      return { error: e.message, values: echo(form, ["confirmUsername"]) };
    }
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
  // Tope de partidos por envío (una importación real trae decenas, no miles).
  for (const id of [...new Set(form.getAll("matchId").map(String))].slice(0, 1000)) {
    if (id.length > 200) continue;
    try {
      await setAttendance(db, user, id, mode);
    } catch (e) {
      if (!(e instanceof AttendanceError)) throw e;
    }
  }
  revalidatePath("/carnet");
  redirect("/carnet");
}
