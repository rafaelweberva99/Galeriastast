/**
 * Versiones vigentes de los documentos legales y de los consentimientos.
 * Al publicar un cambio relevante en /terminos o /privacidad, sube la versión correspondiente:
 * todos los hinchas deberán aceptarla de nuevo en /aceptar antes de seguir usando las páginas privadas.
 */

export const TERMS_VERSION = "1.1";
export const PRIVACY_VERSION = "1.1";
/** Fecha de la última versión publicada (yyyy-mm-dd). */
export const LEGAL_DATE = "2026-10-29";
/** Edad mínima para crear una cuenta sin intervención de padres o tutores. */
export const MIN_AGE = 14;
/** "Versión" de la declaración de edad: la edad mínima declarada. */
export const AGE_VERSION = `${MIN_AGE}+`;

export const CONSENT_KINDS = ["terms", "privacy", "age", "public_profile"] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** Documentos que el hincha debe tener aceptados en su versión vigente. */
export const REQUIRED_DOCS = { terms: TERMS_VERSION, privacy: PRIVACY_VERSION } as const;
export type RequiredDoc = keyof typeof REQUIRED_DOCS;

export const CONSENT_LABELS: Record<ConsentKind, string> = {
  terms: "Términos y Condiciones",
  privacy: "Política de Privacidad",
  age: `Declaración de tener ${MIN_AGE} años o más`,
  public_profile: "Mostrar mi carnet en los rankings y en mi perfil público",
};

/** Dónde se aloja el servicio y se guardan los datos (Términos §6 y Privacidad §6). */
export const HOSTING = {
  database: "Neon Inc. (PostgreSQL)",
  app: "Vercel Inc.",
  region: "Estados Unidos (costa este)",
} as const;

/** Correo de contacto, sugerencias y ejercicio de derechos. */
export const CONTACT_EMAIL = "galuchastats@gmail.com";

/** Marcadores a completar por el responsable antes de publicar. */
/** Responsable del tratamiento: el equipo de GaluchaStats, ubicable en su correo de contacto. */
export const CONTROLLER = {
  name: "el equipo de GaluchaStats",
  email: CONTACT_EMAIL,
} as const;

export function legalVersionLabel(version: string): string {
  return `${version} — ${LEGAL_DATE}`;
}
