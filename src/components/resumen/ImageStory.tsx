/**
 * Imagen vertical 1080×1920 (historias de Instagram / estados de WhatsApp / TikTok) del resumen anual,
 * al estilo "Wrapped": una cifra gigante, el ídolo, el verdugo y el estadio del año.
 * Reglas de satori: todo div con varios hijos lleva display:flex y el texto va en una sola cadena.
 */
import { ImageResponse } from "next/og";
import { jerseyNumberColor, jerseySvg, luminance, type ClubIdentity } from "@/lib/clubTheme.ts";
import type { Resumen } from "@/lib/domain/resumen.ts";
import { alpha, loadFonts } from "./ImageCard.tsx";
import { OUTCOME_COLOR, resumenTheme } from "./theme.ts";

export const STORY_SIZE = { width: 1080, height: 1920 };
const DISPLAY = "Oswald";
const BODY = "Barlow";
const JERSEY = 250;

const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export async function storyImage(opts: { username: string; club: ClubIdentity; clubName: string; r: Resumen; site: string }) {
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
  const handleSize = Math.max(38, Math.min(60, Math.floor(600 / (handle.length * 0.56))));
  const eff = r.effectiveness === null ? null : Math.round(r.effectiveness);
  const goalsTotal = r.goalsSeenFor + r.goalsSeenAgainst;
  const g = (n: number) => `${n} ${n === 1 ? "gol" : "goles"}`;

  const card = (label: string, main: string, sub: string, color: string) => (
    <div style={{ display: "flex", alignItems: "center", background: alpha("#ffffff", 0.09), borderRadius: 30, padding: "24px 32px", marginTop: 22 }}>
      <div style={{ display: "flex", width: 12, alignSelf: "stretch", borderRadius: 6, background: color, marginRight: 28 }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, opacity: 0.72 }}>{label}</div>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: main.length > 24 ? 44 : 54, fontWeight: 700, lineHeight: 1.1, marginTop: 2, textTransform: "uppercase" }}>{main}</div>
        <div style={{ display: "flex", fontSize: 28, opacity: 0.85, marginTop: 0 }}>{sub}</div>
      </div>
    </div>
  );

  const cards = [];
  if (r.idol) cards.push(card("Tu ídolo del año", short(r.idol.player, 22), `Le viste ${g(r.idol.goals)} en cancha`, OUTCOME_COLOR.G));
  if (r.executioner) cards.push(card("Tu verdugo del año", short(r.executioner.player, 22), `Te hizo ${g(r.executioner.goals)} en vivo`, OUTCOME_COLOR.P));
  if (r.topVenue)
    cards.push(
      card(
        "Tu estadio del año",
        short(r.topVenue.name, 34),
        r.topVenue.distinct > 1 ? `${r.topVenue.count} partidos · pasaste por ${r.topVenue.distinct} estadios` : `${r.topVenue.count} ${r.topVenue.count === 1 ? "partido" : "partidos"}`,
        t.hi,
      ),
    );
  if (cards.length < 3 && r.topRival) cards.push(card("Tu rival más visto", short(r.topRival.name, 24), `${r.topRival.count} ${r.topRival.count === 1 ? "partido" : "partidos"}`, t.hi));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: `linear-gradient(170deg, ${t.bg} 0%, ${t.bgDeep} 100%)`,
          color: "#ffffff",
          fontFamily: BODY,
          fontWeight: 500,
          padding: "70px 76px 56px",
        }}
      >
        <div style={{ position: "absolute", left: -240, top: 560, width: 760, height: 760, borderRadius: 999, border: `4px solid ${alpha("#ffffff", 0.08)}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20, background: club.colors.band ?? t.hi }} />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 620 }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: 7, textTransform: "uppercase", color: t.hi }}>Tu año en la galería</div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 200, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>{String(r.year)}</div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: handleSize, fontWeight: 700, lineHeight: 1.1 }}>{handle}</div>
            <div style={{ display: "flex", fontSize: 32, opacity: 0.8, marginTop: 4 }}>{clubName}</div>
          </div>
          <div style={{ display: "flex", width: JERSEY, height: JERSEY, marginTop: 20, alignItems: "center", justifyContent: "center", borderRadius: 999, background: medal, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={jersey} width={JERSEY - 36} height={JERSEY - 36} alt="" />
            <div style={{ position: "absolute", top: 18 + numberTop * (JERSEY - 36) - numberSize * 0.9 * ((JERSEY - 36) / JERSEY), left: 0, width: JERSEY, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: DISPLAY,
                  fontSize: Math.round(numberSize * ((JERSEY - 36) / JERSEY)),
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

        <div style={{ display: "flex", marginTop: 20, alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 300, fontWeight: 700, lineHeight: 0.9, color: t.hi }}>{String(r.played)}</div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 26, paddingBottom: 18 }}>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 62, fontWeight: 700, textTransform: "uppercase", lineHeight: 1 }}>{r.played === 1 ? "partido" : "partidos"}</div>
            <div style={{ display: "flex", fontSize: 32, opacity: 0.85, marginTop: 6 }}>{`de ${short(clubName, 22)} en la cancha`}</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 18, alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 80, fontWeight: 700, lineHeight: 1 }}>
            <span style={{ color: OUTCOME_COLOR.G }}>{String(r.record.won)}</span>
            <span style={{ opacity: 0.4, margin: "0 12px" }}>-</span>
            <span style={{ color: OUTCOME_COLOR.E }}>{String(r.record.drawn)}</span>
            <span style={{ opacity: 0.4, margin: "0 12px" }}>-</span>
            <span style={{ color: OUTCOME_COLOR.P }}>{String(r.record.lost)}</span>
          </div>
          {eff !== null ? (
            <div style={{ display: "flex", marginLeft: 40, alignItems: "baseline" }}>
              <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 80, fontWeight: 700, lineHeight: 1, color: t.hi }}>{`${eff}%`}</div>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.8, marginLeft: 12 }}>Mufómetro</div>
            </div>
          ) : null}
        </div>
        {goalsTotal > 0 ? (
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, marginTop: 14, opacity: 0.92 }}>
            {`Viste ${g(goalsTotal)} en la cancha: ${r.goalsSeenFor} a favor, ${r.goalsSeenAgainst} en contra`}
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              fontFamily: DISPLAY,
              fontSize: r.title.label.length > 18 ? 44 : 54,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              background: t.hi,
              color: t.hiInk,
              padding: "8px 36px",
              borderRadius: 999,
            }}
          >
            {r.title.label}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>{cards}</div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 14 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, opacity: 0.9 }}>¿Cábala o yeta? Descubre el tuyo</div>
          <div style={{ display: "flex", marginTop: 14, background: "#ffd23f", color: "#111111", borderRadius: 22, padding: "6px 50px", fontFamily: DISPLAY, fontSize: 62, fontWeight: 700 }}>
            {site.replace(/^https?:\/\//, "")}
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginTop: 14, opacity: 0.9 }}>#GaluchaStats #FútbolChileno</div>
        </div>
      </div>
    ),
    { ...STORY_SIZE, fonts },
  );
}
