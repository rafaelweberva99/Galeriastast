/** Imagen OG 1200×630 sencilla para las páginas de estadísticas y de club: color del club, nombre y una cifra clave. */
import { ImageResponse } from "next/og";
import { jerseySvg, type ClubIdentity } from "@/lib/clubTheme.ts";
import { alpha, loadFonts } from "@/components/resumen/ImageCard.tsx";
import { resumenTheme } from "@/components/resumen/theme.ts";

export const OG_SIZE = { width: 1200, height: 630 };
const DISPLAY = "Oswald";

export async function clubOgImage(opts: { club: ClubIdentity | null; kicker: string; title: string; figure: string; caption: string; site: string }) {
  const { club, kicker, title, figure, caption, site } = opts;
  const fonts = await loadFonts();
  const bg = club ? resumenTheme(club) : { bg: "#10261a", bgDeep: "#07140d", hi: "#ffd84a", hiInk: "#111111" };
  const jersey = club ? `data:image/svg+xml;base64,${Buffer.from(jerseySvg(club, 300, undefined, "og")).toString("base64")}` : null;
  const titleSize = title.length > 22 ? 64 : 84;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `linear-gradient(160deg, ${bg.bg} 0%, ${bg.bgDeep} 100%)`,
          color: "#ffffff",
          fontFamily: "Barlow",
          fontWeight: 500,
          padding: "52px 64px 48px",
        }}
      >
        <div style={{ position: "absolute", right: -140, top: -120, width: 520, height: 520, borderRadius: 999, border: `3px solid ${alpha("#ffffff", 0.1)}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: club?.colors.band ?? bg.hi }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", color: bg.hi }}>{kicker}</div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: titleSize, fontWeight: 700, lineHeight: 1.05, textTransform: "uppercase", marginTop: 8 }}>{title}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 190, fontWeight: 700, lineHeight: 1, color: bg.hi }}>{figure}</div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: 0.85 }}>{caption}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 38, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>GaluchaStats</div>
            <div style={{ display: "flex", fontSize: 22, opacity: 0.75, marginLeft: 18 }}>{site.replace(/^https?:\/\//, "")}</div>
          </div>
        </div>
        {jersey ? (
          <div style={{ display: "flex", width: 400, alignItems: "center", justifyContent: "flex-end" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={jersey} width={300} height={300} alt="" />
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
