/**
 * Identidad visual y de lenguaje por club. Los tres grandes (albo, azul y cruzado) tienen
 * identidad propia; el resto se deriva de los colores del catálogo.
 * Solo se usan colores y motivos genéricos de camiseta, nunca escudos ni marcas registradas.
 */

export type JerseyMotif = "plain" | "chest-band" | "stripes";

export interface ClubIdentity {
  id: string;
  short: string;
  /** "ALBO", "AZUL", "CRUZADO" o el nombre corto del club. */
  nickname: string;
  /** "albos", "azules", "cruzados", o null para clubes sin gentilicio propio. */
  fansPlural: string | null;
  alias: string | null;
  stadium: string | null;
  cheer: string;
  /** Frase para el veredicto del Mufómetro. */
  needsYou: string;
  colors: {
    primary: string;
    secondary: string;
    /** Texto sobre el color principal. */
    ink: string;
    /** Color de acción sobre fondo claro / oscuro. */
    accent: string;
    accentDark: string;
    /** Fondo del carnet de socio. */
    card: string;
    /** Franja decorativa que cruza el carnet (null = sin franja). */
    band: string | null;
  };
  jersey: { body: string; sleeves: string; collar: string; trim: string; motif: JerseyMotif; motifColor: string };
}

const BIG_THREE: Record<string, Omit<ClubIdentity, "id">> = {
  "colo-colo": {
    short: "Colo-Colo",
    nickname: "ALBO",
    fansPlural: "albos",
    alias: "El Cacique",
    stadium: "Estadio Monumental",
    cheer: "¡Vamos Albo!",
    needsYou: "El Monumental te necesita en cada partido.",
    colors: {
      primary: "#111111",
      secondary: "#ffffff",
      ink: "#ffffff",
      accent: "#111111",
      accentDark: "#f2f2f2",
      card: "linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 55%, #0a0a0a 100%)",
      band: "#ffffff",
    },
    jersey: { body: "#ffffff", sleeves: "#ffffff", collar: "#111111", trim: "#111111", motif: "plain", motifColor: "#111111" },
  },
  "universidad-de-chile": {
    short: "U. de Chile",
    nickname: "AZUL",
    fansPlural: "azules",
    alias: "El Romántico Viajero",
    stadium: "Estadio Nacional",
    cheer: "¡Vamos la U!",
    needsYou: "La U te necesita en cada partido.",
    colors: {
      primary: "#0033a0",
      secondary: "#d52b1e",
      ink: "#ffffff",
      accent: "#0033a0",
      accentDark: "#6f95ff",
      card: "linear-gradient(135deg, #001f66 0%, #0033a0 55%, #0a46c4 100%)",
      band: "#d52b1e",
    },
    jersey: { body: "#0033a0", sleeves: "#0033a0", collar: "#d52b1e", trim: "#ffffff", motif: "plain", motifColor: "#d52b1e" },
  },
  "universidad-catolica": {
    short: "U. Católica",
    nickname: "CRUZADO",
    fansPlural: "cruzados",
    alias: "Los Cruzados",
    stadium: "Claro Arena",
    cheer: "¡Vamos Católica!",
    needsYou: "Los Cruzados te necesitan en cada partido.",
    colors: {
      primary: "#1c4fa1",
      secondary: "#ffffff",
      ink: "#ffffff",
      accent: "#1c4fa1",
      accentDark: "#7aa6f0",
      card: "linear-gradient(135deg, #12367a 0%, #1c4fa1 55%, #2a63c4 100%)",
      band: "#ffffff",
    },
    jersey: { body: "#ffffff", sleeves: "#ffffff", collar: "#1c4fa1", trim: "#d52b1e", motif: "chest-band", motifColor: "#1c4fa1" },
  },
};

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mezcla un color con blanco (0..1) para que se lea sobre fondo oscuro. */
function lighten(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const mix = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${mix.join("")}`;
}

export interface TeamColors {
  id: string;
  shortName: string;
  colorPrimary: string;
  colorSecondary: string;
}

export function clubIdentity(team: TeamColors): ClubIdentity {
  const big = BIG_THREE[team.id];
  if (big) return { id: team.id, ...big };
  const primary = team.colorPrimary;
  const secondary = team.colorSecondary;
  const darkPrimary = luminance(primary) < 0.4;
  return {
    id: team.id,
    short: team.shortName,
    nickname: team.shortName.toUpperCase(),
    fansPlural: null,
    alias: null,
    stadium: null,
    cheer: `¡Vamos ${team.shortName}!`,
    needsYou: `${team.shortName} te necesita en cada partido.`,
    colors: {
      primary,
      secondary,
      ink: darkPrimary ? "#ffffff" : "#111111",
      accent: luminance(primary) > 0.6 ? "#1f2937" : primary,
      accentDark: luminance(primary) < 0.25 ? lighten(primary, 0.45) : primary,
      card: `linear-gradient(135deg, ${primary} 0%, ${primary} 60%, ${secondary} 140%)`,
      band: secondary,
    },
    jersey: { body: primary, sleeves: primary, collar: secondary, trim: secondary, motif: "plain", motifColor: secondary },
  };
}

/** Variables CSS para aplicar el tema del club a un elemento (y sus hijos). */
export function clubStyle(c: ClubIdentity): Record<string, string> {
  const inkFor = (bg: string) => (luminance(bg) > 0.45 ? "#111111" : "#ffffff");
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
