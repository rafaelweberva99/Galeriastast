/**
 * Imagen para compartir el carnet (1200×630, formato de tarjeta de X/Twitter, WhatsApp, etc.).
 * Sin datos personales más allá del nombre de usuario y las cifras del carnet.
 */
import { ImageResponse } from "next/og";
import type { ClubIdentity } from "./clubTheme.ts";
import { jerseyNumberColor, jerseySvg } from "./clubTheme.ts";
import { CENTENARIO_GOAL } from "./domain/centenario.ts";
import type { Carnet } from "./domain/stats.ts";

export const SHARE_SIZE = { width: 1200, height: 630 };

export function shareCardImage(opts: { username: string; club: ClubIdentity; clubName: string; carnet: Carnet; site: string }) {
  const { username, club, clubName, carnet: c, site } = opts;
  const ink = club.colors.ink;
  const jersey = `data:image/svg+xml;utf8,${encodeURIComponent(jerseySvg(club, 330, undefined, "share"))}`;
  const unlocked = c.total >= CENTENARIO_GOAL;
  const toShirt = Math.min(c.total, CENTENARIO_GOAL);
  const eff = c.effectiveness === null ? "—" : `${Math.round(c.effectiveness)}%`;
  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 48 }}>
      <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 26, opacity: 0.85, marginTop: 6 }}>{label}</div>
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
          fontFamily: "sans-serif",
          padding: "56px 64px",
          position: "relative",
        }}
      >
        {club.colors.band && (
          <div
            style={{
              position: "absolute",
              right: 300,
              top: -40,
              width: 70,
              height: 760,
              background: club.colors.band,
              transform: "rotate(18deg)",
              opacity: 0.9,
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85 }}>
              {`Carnet de hincha · ${club.nickname}`}
            </div>
            <div style={{ fontSize: 76, fontWeight: 800, marginTop: 8, lineHeight: 1.05 }}>{`@${username}`}</div>
            <div style={{ fontSize: 30, opacity: 0.9, marginTop: 6 }}>{clubName}</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {stat(String(c.total), c.total === 1 ? "partido en la galería" : "partidos en la galería")}
            {stat(eff, "efectividad cuando va")}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700 }}>
              <div
                style={{
                  display: "flex",
                  background: ink,
                  color: club.colors.primary,
                  padding: "6px 18px",
                  borderRadius: 999,
                  marginRight: 18,
                }}
              >
                {c.effectiveness === null ? "Sin partidos aún" : c.verdict.label}
              </div>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 400, opacity: 0.9 }}>
                {unlocked ? "Camiseta de los 100: desbloqueada" : `Camiseta de los 100: ${toShirt}/100`}
              </div>
            </div>
            <div style={{ display: "flex", width: 640, height: 14, borderRadius: 999, background: "rgba(255,255,255,0.35)", marginTop: 14 }}>
              <div style={{ width: `${(toShirt / CENTENARIO_GOAL) * 100}%`, height: 14, borderRadius: 999, background: ink }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: 360 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{ display: "flex", position: "relative", width: 330, height: 330 }}>
            <img src={jersey} width={330} height={330} alt="" />
            {/* El número va como texto de la imagen: dentro del SVG no hay fuentes. */}
            <div
              style={{
                position: "absolute",
                top: 158,
                left: 0,
                width: 330,
                display: "flex",
                justifyContent: "center",
                fontSize: 92,
                color: jerseyNumberColor(club),
              }}
            >
              12
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", alignSelf: "flex-end" }}>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 1 }}>GaluchaStats</div>
            <div style={{ fontSize: 22, opacity: 0.85 }}>{site.replace(/^https?:\/\//, "")}</div>
          </div>
        </div>
      </div>
    ),
    SHARE_SIZE,
  );
}
