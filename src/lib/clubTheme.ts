/**
 * Identidad visual y de lenguaje de cada club de Primera División (data/catalog/identities.json):
 * colores, camiseta titular, apodo, gentilicio de la hinchada, estadio y grito.
 * Los clubes sin identidad en el catálogo se derivan de sus colores.
 * Solo se usan colores y motivos genéricos de camiseta, nunca escudos ni marcas registradas.
 */
import identities from "../../data/catalog/identities.json" with { type: "json" };

export type JerseyMotif = "plain" | "stripes" | "hoops" | "chest-band" | "sash" | "halves" | "vee";

export interface Jersey {
  body: string;
  sleeves: string;
  collar: string;
  trim: string;
  motif: JerseyMotif;
  motifColor: string;
  /** Tercer color de franjas (p. ej. Palestino). */
  motifColor2?: string;
}

export interface ClubIdentity {
  id: string;
  short: string;
  /** "ALBO", "AZUL", "CRUZADO", "PIRATA"… */
  nickname: string;
  /** "albos", "azules", "piratas"…, o null si no hay gentilicio. */
  fansPlural: string | null;
  alias: string | null;
  stadium: string | null;
  cheer: string;
  /** Frase para el veredicto del Mufómetro cuando el hincha es cábala. */
  needsYou: string;
  colors: {
    primary: string;
    secondary: string;
    /** Texto sobre el fondo del carnet. */
    ink: string;
    /** Color de acción sobre fondo claro / oscuro. */
    accent: string;
    accentDark: string;
    /** Fondo del carnet de socio. */
    card: string;
    /** Franja decorativa que cruza el carnet (null = sin franja). */
    band: string | null;
  };
  jersey: Jersey;
}

interface CatalogIdentity {
  id: string;
  nickname: string;
  fansPlural: string | null;
  alias: string | null;
  stadium: string | null;
  cheer: string;
  needsYou?: string;
  colors: { primary: string; secondary: string; band?: string; card?: string; accent?: string };
  jersey: Omit<Jersey, "motifColor" | "motif"> & { motif: string; motifColor?: string; motifColor2?: string };
}

const CATALOG = new Map((identities as CatalogIdentity[]).map((i) => [i.id, i]));

// --- Color ----------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mezcla con blanco (amount > 0) o con negro (amount < 0). */
export function mix(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return `#${rgb(hex)
    .map((c) => Math.round(c + (target - c) * a).toString(16).padStart(2, "0"))
    .join("")}`;
}

const inkFor = (bg: string) => (luminance(bg) > 0.45 ? "#111111" : "#ffffff");

/** Color de acción legible: los colores muy claros (amarillos) se oscurecen o ceden al secundario. */
function readableOn(bgIsLight: boolean, color: string, fallback: string): string {
  const l = luminance(color);
  if (bgIsLight) return l > 0.5 ? (luminance(fallback) < 0.3 ? fallback : mix(color, -0.45)) : color;
  if (l >= 0.2) return color;
  return luminance(fallback) > 0.5 ? fallback : mix(color, 0.45);
}

// --- Identidad ------------------------------------------------------------------

export interface TeamColors {
  id: string;
  shortName: string;
  colorPrimary: string;
  colorSecondary: string;
}

export function clubIdentity(team: TeamColors): ClubIdentity {
  const cat = CATALOG.get(team.id);
  const primary = cat?.colors.primary ?? team.colorPrimary;
  const secondary = cat?.colors.secondary ?? team.colorSecondary;
  const card =
    cat?.colors.card ?? `linear-gradient(135deg, ${mix(primary, -0.35)} 0%, ${primary} 55%, ${mix(primary, 0.15)} 100%)`;
  const alias = cat?.alias ?? null;
  const plural = alias !== null && /^(Los|Las) /.test(alias);
  const accent = cat?.colors.accent ?? readableOn(true, primary, secondary);
  return {
    id: team.id,
    short: team.shortName,
    nickname: cat?.nickname ?? team.shortName.toUpperCase(),
    fansPlural: cat?.fansPlural ?? null,
    alias,
    stadium: cat?.stadium ?? null,
    cheer: cat?.cheer ?? `¡Vamos ${team.shortName}!`,
    needsYou:
      cat?.needsYou ?? (alias ? `${alias} te ${plural ? "necesitan" : "necesita"} en cada partido.` : `${team.shortName} te necesita en cada partido.`),
    colors: {
      primary,
      secondary,
      ink: inkFor(cat?.colors.card ? "#111111" : primary),
      accent,
      accentDark: readableOn(false, primary, secondary),
      card,
      band: cat?.colors.band ?? secondary,
    },
    jersey: cat
      ? {
          ...cat.jersey,
          motif: cat.jersey.motif as JerseyMotif,
          motifColor: cat.jersey.motifColor ?? secondary,
        }
      : { body: primary, sleeves: primary, collar: secondary, trim: secondary, motif: "plain", motifColor: secondary },
  };
}

/** Variables CSS para aplicar el tema del club a un elemento (y sus hijos). */
export function clubStyle(c: ClubIdentity): Record<string, string> {
  return {
    "--club-primary": c.colors.primary,
    "--club-secondary": c.colors.secondary,
    "--club-ink": c.colors.ink,
    "--club-accent": c.colors.accent,
    "--club-accent-ink": inkFor(c.colors.accent),
    "--club-accent-dark": c.colors.accentDark,
    "--club-accent-dark-ink": inkFor(c.colors.accentDark),
    "--club-card": c.colors.card,
    "--club-band": c.colors.band ?? "transparent",
  };
}

/** "Ranking de hinchas albos" / "Ranking de hinchas de Everton". */
export function fansLabel(c: ClubIdentity): string {
  return c.fansPlural ? `hinchas ${c.fansPlural}` : `hinchas de ${c.short}`;
}

// --- Camiseta -------------------------------------------------------------------

const BODY = "M20 6 L26 4 Q32 10 38 4 L44 6 L58 17 L51 28 L46 24 L46 60 L18 60 L18 24 L13 28 L6 17 Z";

function motifSvg(j: Jersey): string {
  const c1 = j.motifColor;
  const c2 = j.motifColor2;
  switch (j.motif) {
    case "stripes": {
      // Franjas verticales; con dos colores de motivo alterna c1 / c2 (tricolor).
      const xs = [16, 24, 32, 40, 48];
      return xs.map((x, i) => `<rect x="${x - 2}" y="0" width="4.5" height="64" fill="${c2 && i % 2 ? c2 : c1}"/>`).join("");
    }
    case "hoops":
      return [14, 26, 38, 50].map((y) => `<rect x="0" y="${y}" width="64" height="6" fill="${c1}"/>`).join("");
    case "chest-band":
      return `<rect x="0" y="25" width="64" height="11" fill="${c1}"/>`;
    case "sash":
      return `<path d="M14 0 L26 0 L58 64 L46 64 Z" fill="${c1}"/>`;
    case "halves":
      return `<rect x="32" y="0" width="32" height="64" fill="${c1}"/>`;
    case "vee":
      return `<path d="M20 3 L32 31 L44 3 L38.5 3 L32 19 L25.5 3 Z" fill="${c1}"/>`;
    default:
      return "";
  }
}

/** Camiseta genérica del club en SVG. `number` va en el pecho (el 12 es la hinchada). */
export function jerseySvg(club: ClubIdentity, size: number, number?: string, uid = club.id): string {
  const j = club.jersey;
  const clip = `jc-${uid.replace(/[^a-z0-9-]/gi, "")}-${size}`;
  const numberFill = (() => {
    const bg = j.motif === "chest-band" ? j.motifColor : j.body;
    const candidates = [j.collar, j.trim, j.motifColor, "#111111", "#ffffff"];
    return candidates.find((c) => Math.abs(luminance(c) - luminance(bg)) > 0.35) ?? inkFor(bg);
  })();
  const plate =
    number && (j.motif === "stripes" || j.motif === "hoops" || j.motif === "halves")
      ? `<rect x="22" y="33" width="20" height="17" rx="3" fill="${j.body}"/>`
      : "";
  const num = number
    ? `${plate}<text x="32" y="${j.motif === "chest-band" ? 52 : 46}" text-anchor="middle" font-size="17" font-weight="700" font-family="var(--font-display), Oswald, 'Arial Narrow', sans-serif" fill="${numberFill}">${number}</text>`
    : "";
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Camiseta de ${club.short.replace(/"/g, "")}" style="flex-shrink:0;display:block">
<defs><clipPath id="${clip}"><path d="${BODY}"/></clipPath></defs>
<path d="${BODY}" fill="${j.body}"/>
<g clip-path="url(#${clip})">${motifSvg(j)}
<path d="M20 6 L6 17 L13 28 L18 24 L18 12 Z" fill="${j.sleeves}"/><path d="M44 6 L58 17 L51 28 L46 24 L46 12 Z" fill="${j.sleeves}"/>
<path d="M6 17 L13 28" stroke="${j.trim}" stroke-width="3"/><path d="M58 17 L51 28" stroke="${j.trim}" stroke-width="3"/></g>
<path d="M26 4 Q32 10 38 4" fill="none" stroke="${j.collar}" stroke-width="3.5" stroke-linecap="round"/>
<path d="${BODY}" fill="none" stroke="rgb(0 0 0 / 0.35)" stroke-width="1.2" stroke-linejoin="round"/>${num}</svg>`;
}
