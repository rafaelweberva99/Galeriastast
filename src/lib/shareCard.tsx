/**
 * Imagen para compartir el carnet (1200×630, formato de tarjeta de X/Twitter, WhatsApp, etc.).
 * Sin datos personales más allá del nombre de usuario, el N° de socio y las cifras del carnet.
 * Tipografías: Oswald y Barlow (SIL OFL, ver src/lib/fonts/), recortadas a Latin-1 y empaquetadas
 * con el proyecto para no depender de la red al generar la imagen.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { ClubIdentity } from "./clubTheme.ts";
import { jerseyNumberColor, jerseySvg, luminance, mix } from "./clubTheme.ts";
import { tierFor, type TierKey } from "./domain/achievements.ts";
import { CENTENARIO_GOAL } from "./domain/centenario.ts";
import type { Carnet } from "./domain/stats.ts";

export const SHARE_SIZE = { width: 1200, height: 630 };

const FONT_DIR = path.join(process.cwd(), "src/lib/fonts");
const FONT_FILES = [
  { name: "Oswald", file: "Oswald-Bold.ttf", weight: 700 },
  { name: "Barlow", file: "Barlow-Medium.ttf", weight: 500 },
  { name: "Barlow", file: "Barlow-Bold.ttf", weight: 700 },
] as const;

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 700; style: "normal" }[]> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async (f) => ({ name: f.name, weight: f.weight, style: "normal" as const, data: await readFile(path.join(FONT_DIR, f.file)) })),
  ).catch((err) => {
    fontsPromise = null;
    throw err;
  });
  return fontsPromise;
}

/** "#rrggbb" + opacidad -> "rgba(...)" (satori no entiende color-mix). */
function alpha(hex: string, a: number): string {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

/** Degradados metálicos de cada nivel del carnet (como en el sitio). */
const METAL: Record<Exclude<TierKey, "socio">, { bg: string; solid: string; ink: string }> = {
  bronce: { bg: "linear-gradient(135deg, #7a4a22, #e0a36b 35%, #8a5426 55%, #f0bf8a 80%, #7a4a22)", solid: "#c4834a", ink: "#3b2210" },
  plata: { bg: "linear-gradient(135deg, #7d858c, #f2f5f7 35%, #9aa3ab 55%, #ffffff 80%, #7d858c)", solid: "#c9d0d5", ink: "#2b3136" },
  oro: { bg: "linear-gradient(135deg, #8a6514, #f6d77a 35%, #b8871f 55%, #fff1b8 80%, #8a6514)", solid: "#e0b43f", ink: "#3d2b05" },
  leyenda: { bg: "linear-gradient(135deg, #111111, #7b5cff 25%, #00d1c1 50%, #ff4fa3 75%, #111111)", solid: "#7b5cff", ink: "#ffffff" },
};

const DISPLAY = "Oswald";
const BODY = "Barlow";
const JERSEY = 250;
const MEDAL = 300;

export async function shareCardImage(opts: {
  username: string;
  memberId: number;
  club: ClubIdentity;
  clubName: string;
  carnet: Carnet;
  site: string;
}) {
  const { username, memberId, club, clubName, carnet: c, site } = opts;
  const fonts = await loadFonts();
  const ink = club.colors.ink;
  const j = club.jersey;
  // En base64: satori no muestra los SVG "utf8" con caracteres no ASCII (p. ej. "Concepción" en el aria-label).
  const jersey = `data:image/svg+xml;base64,${Buffer.from(jerseySvg(club, JERSEY, undefined, "share")).toString("base64")}`;
  const unlocked = c.total >= CENTENARIO_GOAL;
  const tier = tierFor(c.total);
  const metal = tier.key === "socio" ? null : METAL[tier.key];
  const toShirt = Math.min(c.total, CENTENARIO_GOAL);
  const eff = c.effectiveness === null ? "—" : `${Math.round(c.effectiveness)}%`;
  const handle = `@${username}`.toUpperCase();
  // Oswald en mayúsculas mide ~0,55 em por carácter: achica los usuarios largos para que quepan en 700 px.
  const handleSize = Math.max(56, Math.min(104, Math.floor(700 / (handle.length * 0.56))));
  // La camiseta va sobre un medallón; si su color se confunde con el fondo, el medallón es sólido.
  const bodyLum = luminance(j.body);
  const medal =
    Math.abs(bodyLum - luminance(club.colors.primary)) > 0.3
      ? alpha(ink, 0.12)
      : Math.abs(bodyLum - luminance(ink)) > 0.3
        ? ink
        : mix(club.colors.primary, -0.5);
  const plate = j.motif === "stripes" || j.motif === "hoops" || j.motif === "halves";
  const numberTop = (j.motif === "chest-band" ? 52 : 46) / 64;
  const numberSize = Math.round((17 / 64) * JERSEY * 1.05);

  const stat = (value: string, label: string, divider: boolean) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        paddingRight: 32,
        marginRight: 32,
        borderRight: divider ? `2px solid ${alpha(ink, 0.3)}` : "none",
      }}
    >
      <div style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.85, marginTop: 8 }}>
        {label}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: club.colors.card,
          color: ink,
          fontFamily: BODY,
          fontWeight: 500,
          padding: "52px 60px 48px",
          position: "relative",
          // Nivel del carnet: borde del color del metal (Bronce, Plata, Oro, Leyenda).
          border: metal ? `12px solid ${metal.solid}` : "none",
        }}
      >
        {/* Líneas de cancha: mitad y círculo central detrás de la camiseta, como en el carnet del sitio. */}
        <div style={{ position: "absolute", left: 959, top: 0, width: 2, height: 630, background: alpha(ink, 0.12) }} />
        <div
          style={{
            position: "absolute",
            left: 960 - 210,
            top: 210 - 210,
            width: 420,
            height: 420,
            borderRadius: 999,
            border: `2px solid ${alpha(ink, 0.12)}`,
          }}
        />
        {club.colors.band && (
          <div
            style={{
              position: "absolute",
              right: 300,
              top: -60,
              width: 64,
              height: 780,
              background: club.colors.band,
              transform: "rotate(18deg)",
              opacity: 0.9,
            }}
          />
        )}
        {/* Franja inferior tipo carnet. */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 12, background: club.colors.band ?? ink, opacity: 0.95 }} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {metal && (
                <div
                  style={{
                    display: "flex",
                    background: metal.bg,
                    color: metal.ink,
                    fontFamily: DISPLAY,
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    padding: "4px 14px",
                    borderRadius: 6,
                    marginRight: 16,
                  }}
                >
                  {tier.label.replace("Carnet ", "")}
                </div>
              )}
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase", opacity: 0.85 }}>
                {`Carnet de hincha · ${club.nickname}`}
              </div>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: handleSize, fontWeight: 700, lineHeight: 1.05, marginTop: 6 }}>{handle}</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: DISPLAY,
                  fontSize: 28,
                  letterSpacing: 2,
                  padding: "4px 14px",
                  borderRadius: 8,
                  border: `3px solid ${ink}`,
                  marginRight: 18,
                }}
              >
                {`SOCIO N° ${String(memberId).padStart(6, "0")}`}
              </div>
              <div style={{ fontSize: 30, opacity: 0.92 }}>{clubName}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {stat(String(c.total), c.total === 1 ? "partido en la galería" : "partidos en la galería", true)}
            {stat(eff, "efectividad cuando va", false)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 620 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: DISPLAY,
                  fontSize: 30,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  background: ink,
                  color: club.colors.primary,
                  padding: "4px 20px",
                  borderRadius: 999,
                  marginRight: 18,
                }}
              >
                {c.effectiveness === null ? "Sin partidos aún" : c.verdict.label}
              </div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700, opacity: 0.92 }}>
                {unlocked ? "Camiseta de los 100: ¡desbloqueada!" : `Camiseta de los 100: ${toShirt}/100`}
              </div>
            </div>
            <div style={{ display: "flex", width: 620, height: 14, borderRadius: 999, background: alpha(ink, 0.25), marginTop: 16 }}>
              <div style={{ width: `${(toShirt / CENTENARIO_GOAL) * 100}%`, height: 14, borderRadius: 999, background: ink }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: 360 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: MEDAL,
              height: MEDAL,
              borderRadius: 999,
              background: medal,
              marginTop: 8,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={jersey} width={JERSEY} height={JERSEY} alt="" />
            {/* El número va como texto de la imagen: dentro del SVG no hay fuentes. */}
            <div
              style={{
                position: "absolute",
                top: (MEDAL - JERSEY) / 2 + numberTop * JERSEY - numberSize * 0.98,
                left: 0,
                width: MEDAL,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: DISPLAY,
                  fontSize: numberSize,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: jerseyNumberColor(club),
                  background: plate ? j.body : "transparent",
                  borderRadius: 10,
                  padding: plate ? "0 10px" : 0,
                }}
              >
                12
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", alignSelf: "flex-end", marginBottom: 8 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 42, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              GaluchaStats
            </div>
            <div style={{ fontSize: 22, opacity: 0.85 }}>{site.replace(/^https?:\/\//, "")}</div>
          </div>
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts },
  );
}
