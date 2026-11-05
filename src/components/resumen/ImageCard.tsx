/**
 * Imagen 1080×1350 (formato feed/historia) del resumen anual, con next/og + satori.
 * Reglas de satori: todo div con varios hijos lleva display:flex y el texto va en una sola cadena.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { jerseyNumberColor, jerseySvg, luminance, type ClubIdentity } from "@/lib/clubTheme.ts";
import type { Resumen } from "@/lib/domain/resumen.ts";
import { OUTCOME_COLOR, REASON_LABEL, resumenTheme } from "./theme.ts";

export const RESUMEN_SIZE = { width: 1080, height: 1350 };
const DISPLAY = "Oswald";
const BODY = "Barlow";
const JERSEY = 330;

const FONT_FILES = [
  { name: "Oswald", file: "Oswald-Bold.ttf", weight: 700 },
  { name: "Barlow", file: "Barlow-Medium.ttf", weight: 500 },
  { name: "Barlow", file: "Barlow-Bold.ttf", weight: 700 },
] as const;
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 700; style: "normal" }[]> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async (f) => ({
      name: f.name,
      weight: f.weight,
      style: "normal" as const,
      data: await readFile(path.join(process.cwd(), "src/lib/fonts", f.file)),
    })),
  ).catch((err) => {
    fontsPromise = null;
    throw err;
  });
  return fontsPromise;
}

function alpha(hex: string, a: number): string {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const dateEs = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export async function resumenImage(opts: { username: string; club: ClubIdentity; clubName: string; r: Resumen; site: string }) {
  const { username, club, clubName, r, site } = opts;
  const fonts = await loadFonts();
  const t = resumenTheme(club);
  const j = club.jersey;
  const jersey = `data:image/svg+xml;base64,${Buffer.from(jerseySvg(club, JERSEY, undefined, "resumen")).toString("base64")}`;
  const plate = j.motif === "stripes" || j.motif === "hoops" || j.motif === "halves";
  const numberTop = (j.motif === "chest-band" ? 52 : 46) / 64;
  const numberSize = Math.round((17 / 64) * JERSEY * 1.05);
  const medal = Math.abs(luminance(j.body) - luminance(t.bg)) > 0.25 ? alpha("#ffffff", 0.1) : "#ffffff";
  const handle = `@${username}`.toUpperCase();
  const handleSize = Math.max(40, Math.min(64, Math.floor(620 / (handle.length * 0.56))));
  const eff = r.effectiveness === null ? "—" : `${Math.round(r.effectiveness)}%`;
  const mo = r.matchOfYear;
  const titleSize = r.title.label.length > 18 ? 46 : 58;

  const box = (value: string, label: string, color?: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: alpha("#ffffff", 0.08),
        borderRadius: 24,
        padding: "22px 26px",
        marginRight: 0,
      }}
    >
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 84, fontWeight: 700, lineHeight: 1, color: color ?? "#ffffff" }}>{value}</div>
      <div style={{ display: "flex", fontSize: 24, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.75, marginTop: 8 }}>{label}</div>
    </div>
  );

  const row = (label: string, main: string, sub: string, color: string) => (
    <div style={{ display: "flex", alignItems: "center", background: alpha("#ffffff", 0.08), borderRadius: 24, padding: "20px 28px", marginTop: 16 }}>
      <div style={{ display: "flex", width: 10, alignSelf: "stretch", borderRadius: 6, background: color, marginRight: 24 }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.7 }}>{label}</div>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 44, fontWeight: 700, lineHeight: 1.15, marginTop: 4 }}>{main}</div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.8, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );

  const rows = [];
  if (mo)
    rows.push(
      row(
        `Partido del año · ${REASON_LABEL[mo.reason]}`,
        short(`${mo.match.homeTeamName} ${mo.match.homeGoals}-${mo.match.awayGoals} ${mo.match.awayTeamName}`, 34),
        `${dateEs(mo.match.date)} · ${short(mo.match.competitionName, 30)}`,
        OUTCOME_COLOR[mo.outcome],
      ),
    );
  if (r.idol || r.executioner) {
    const half = (label: string, name: string, sub: string, color: string) => (
      <div style={{ display: "flex", flex: 1, alignItems: "center", background: alpha("#ffffff", 0.08), borderRadius: 24, padding: "18px 24px" }}>
        <div style={{ display: "flex", width: 10, alignSelf: "stretch", borderRadius: 6, background: color, marginRight: 20 }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 21, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.7 }}>{label}</div>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 36, fontWeight: 700, lineHeight: 1.15, marginTop: 4 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 24, opacity: 0.8 }}>{sub}</div>
        </div>
      </div>
    );
    const g = (n: number) => `${n} ${n === 1 ? "gol" : "goles"}`;
    rows.push(
      <div key="duo" style={{ display: "flex", marginTop: 16 }}>
        {r.idol ? half("Ídolo del año", short(r.idol.player, 17), g(r.idol.goals), OUTCOME_COLOR.G) : null}
        {r.idol && r.executioner ? <div style={{ display: "flex", width: 16 }} /> : null}
        {r.executioner ? half("Verdugo del año", short(r.executioner.player, 17), g(r.executioner.goals), OUTCOME_COLOR.P) : null}
      </div>,
    );
  } else {
    if (r.bestWin) rows.push(row("Mejor victoria", `${r.bestWin.goalsFor}-${r.bestWin.goalsAgainst} a ${short(r.bestWin.match.homeTeamId === club.id ? r.bestWin.match.awayTeamName : r.bestWin.match.homeTeamName, 24)}`, dateEs(r.bestWin.match.date), OUTCOME_COLOR.G));
    if (r.worstLoss) rows.push(row("Peor derrota", `${r.worstLoss.goalsFor}-${r.worstLoss.goalsAgainst} ante ${short(r.worstLoss.match.homeTeamId === club.id ? r.worstLoss.match.awayTeamName : r.worstLoss.match.homeTeamName, 22)}`, dateEs(r.worstLoss.match.date), OUTCOME_COLOR.P));
  }
  if (rows.length < 2 && r.busiestMonth)
    rows.push(row("Tu mes", r.busiestMonth.name.charAt(0).toUpperCase() + r.busiestMonth.name.slice(1), `${r.busiestMonth.count} ${r.busiestMonth.count === 1 ? "partido" : "partidos"}`, t.hi));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: `linear-gradient(160deg, ${t.bg} 0%, ${t.bgDeep} 100%)`,
          color: "#ffffff",
          fontFamily: BODY,
          fontWeight: 500,
          padding: "72px 70px 56px",
        }}
      >
        {/* Franja del club y círculo de cancha de fondo. */}
        <div style={{ position: "absolute", right: -160, top: 40, width: 560, height: 560, borderRadius: 999, border: `3px solid ${alpha("#ffffff", 0.1)}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 16, background: club.colors.band ?? t.hi }} />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", color: t.hi }}>Tu año en la galería</div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 230, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>{String(r.year)}</div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: handleSize, fontWeight: 700, lineHeight: 1.1 }}>{handle}</div>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.8, marginTop: 6 }}>{clubName}</div>
          </div>
          <div style={{ display: "flex", width: 330, height: 330, marginTop: 20, alignItems: "center", justifyContent: "center", borderRadius: 999, background: medal, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={jersey} width={JERSEY - 40} height={JERSEY - 40} alt="" />
            <div
              style={{
                position: "absolute",
                top: 20 + numberTop * (JERSEY - 40) - numberSize * 0.9 * ((JERSEY - 40) / JERSEY),
                left: 0,
                width: JERSEY,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: DISPLAY,
                  fontSize: Math.round(numberSize * ((JERSEY - 40) / JERSEY)),
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: jerseyNumberColor(club),
                  background: plate ? j.body : "transparent",
                  borderRadius: 8,
                  padding: plate ? "0 8px" : 0,
                }}
              >
                12
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 26 }}>
          <div
            style={{
              display: "flex",
              fontFamily: DISPLAY,
              fontSize: titleSize,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              background: t.hi,
              color: t.hiInk,
              padding: "6px 30px",
              borderRadius: 999,
            }}
          >
            {r.title.label}
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 30 }}>
          <div style={{ display: "flex", flex: 1, marginRight: 16 }}>{box(String(r.played), r.played === 1 ? "partido" : "partidos")}</div>
          <div style={{ display: "flex", flex: 1.35, marginRight: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, background: alpha("#ffffff", 0.08), borderRadius: 24, padding: "22px 26px" }}>
              <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 84, fontWeight: 700, lineHeight: 1 }}>
                <span style={{ color: OUTCOME_COLOR.G }}>{String(r.record.won)}</span>
                <span style={{ opacity: 0.4, margin: "0 10px" }}>-</span>
                <span style={{ color: OUTCOME_COLOR.E }}>{String(r.record.drawn)}</span>
                <span style={{ opacity: 0.4, margin: "0 10px" }}>-</span>
                <span style={{ color: OUTCOME_COLOR.P }}>{String(r.record.lost)}</span>
              </div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.75, marginTop: 8 }}>ganados · empates · perdidos</div>
            </div>
          </div>
          <div style={{ display: "flex", flex: 1 }}>{box(eff, "Mufómetro", t.hi)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>{rows}</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 52, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>GaluchaStats</div>
            <div style={{ display: "flex", fontSize: 26, opacity: 0.8 }}>{`Crea tu carnet en ${site.replace(/^https?:\/\//, "")}`}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: t.hi, paddingBottom: 6 }}>¿Cábala o yeta?</div>
        </div>
      </div>
    ),
    { ...RESUMEN_SIZE, fonts },
  );
}
