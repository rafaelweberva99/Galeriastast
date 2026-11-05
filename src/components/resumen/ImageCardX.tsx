/**
 * Imagen horizontal 1200×630 (X, Facebook, WhatsApp) del resumen anual. Mismo lenguaje que ImageCard (1080×1350).
 * Reglas de satori: todo div con varios hijos lleva display:flex; sin fragmentos.
 */
import { ImageResponse } from "next/og";
import { jerseyNumberColor, jerseySvg, luminance, type ClubIdentity } from "@/lib/clubTheme.ts";
import type { Resumen } from "@/lib/domain/resumen.ts";
import { alpha, loadFonts } from "./ImageCard.tsx";
import { OUTCOME_COLOR, resumenTheme } from "./theme.ts";

export const RESUMEN_X_SIZE = { width: 1200, height: 630 };
const DISPLAY = "Oswald";
const BODY = "Barlow";
const JERSEY = 300;

const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export async function resumenImageX(opts: { username: string; club: ClubIdentity; clubName: string; r: Resumen; site: string }) {
  const { username, club, clubName, r, site } = opts;
  const fonts = await loadFonts();
  const t = resumenTheme(club);
  const j = club.jersey;
  const jersey = `data:image/svg+xml;base64,${Buffer.from(jerseySvg(club, JERSEY, undefined, "resumen-x")).toString("base64")}`;
  const plate = j.motif === "stripes" || j.motif === "hoops" || j.motif === "halves";
  const numberTop = (j.motif === "chest-band" ? 52 : 46) / 64;
  const inner = JERSEY - 40;
  const numberSize = Math.round((17 / 64) * JERSEY * 1.05);
  const medal = Math.abs(luminance(j.body) - luminance(t.bg)) > 0.25 ? alpha("#ffffff", 0.1) : "#ffffff";
  const handle = `@${username}`.toUpperCase();
  const handleSize = Math.max(34, Math.min(54, Math.floor(640 / (handle.length * 0.56))));
  const eff = r.effectiveness === null ? "—" : `${Math.round(r.effectiveness)}%`;
  const titleSize = r.title.label.length > 18 ? 34 : 42;

  const box = (value: string, label: string, color?: string) => (
    <div style={{ display: "flex", flexDirection: "column", background: alpha("#ffffff", 0.08), borderRadius: 20, padding: "16px 22px", marginRight: 14 }}>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1, color: color ?? "#ffffff" }}>{value}</div>
      <div style={{ display: "flex", fontSize: 19, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.75, marginTop: 6 }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `linear-gradient(160deg, ${t.bg} 0%, ${t.bgDeep} 100%)`,
          color: "#ffffff",
          fontFamily: BODY,
          fontWeight: 500,
          padding: "48px 64px 44px",
        }}
      >
        <div style={{ position: "absolute", right: -140, top: -120, width: 520, height: 520, borderRadius: 999, border: `3px solid ${alpha("#ffffff", 0.1)}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: club.colors.band ?? t.hi }} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", color: t.hi }}>Tu año en la galería</div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 168, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>{String(r.year)}</div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: handleSize, fontWeight: 700, lineHeight: 1.1 }}>{handle}</div>
            <div style={{ display: "flex", fontSize: 26, opacity: 0.8, marginTop: 2 }}>{short(clubName, 36)}</div>
            <div style={{ display: "flex", marginTop: 18 }}>
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
                  padding: "4px 24px",
                  borderRadius: 999,
                }}
              >
                {r.title.label}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 40, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>GaluchaStats</div>
              <div style={{ display: "flex", fontSize: 22, opacity: 0.8 }}>{`Crea tu carnet en ${site.replace(/^https?:\/\//, "")}`}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", width: 440 }}>
          <div style={{ display: "flex", width: JERSEY, height: JERSEY, alignItems: "center", justifyContent: "center", borderRadius: 999, background: medal, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={jersey} width={inner} height={inner} alt="" />
            <div
              style={{
                position: "absolute",
                top: 20 + numberTop * inner - numberSize * 0.9 * (inner / JERSEY),
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
                  fontSize: Math.round(numberSize * (inner / JERSEY)),
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

          <div style={{ display: "flex", marginTop: 14 }}>
            {box(String(r.played), r.played === 1 ? "partido" : "partidos")}
            <div style={{ display: "flex", flexDirection: "column", background: alpha("#ffffff", 0.08), borderRadius: 20, padding: "16px 22px", marginRight: 14 }}>
              <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1 }}>
                <span style={{ color: OUTCOME_COLOR.G }}>{String(r.record.won)}</span>
                <span style={{ opacity: 0.4, margin: "0 6px" }}>-</span>
                <span style={{ color: OUTCOME_COLOR.E }}>{String(r.record.drawn)}</span>
                <span style={{ opacity: 0.4, margin: "0 6px" }}>-</span>
                <span style={{ color: OUTCOME_COLOR.P }}>{String(r.record.lost)}</span>
              </div>
              <div style={{ display: "flex", fontSize: 19, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.75, marginTop: 6 }}>G · E · P</div>
            </div>
            <div style={{ display: "flex", marginRight: 0 }}>{box(eff, "Mufómetro", t.hi)}</div>
          </div>
        </div>
      </div>
    ),
    { ...RESUMEN_X_SIZE, fonts },
  );
}
