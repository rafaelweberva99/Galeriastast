/** Imagen 1200×630 del cara a cara (next/og + satori: todo div con varios hijos lleva display:flex). */
import { ImageResponse } from "next/og";
import { clubIdentity, jerseySvg, type ClubIdentity } from "./clubTheme.ts";
import type { Duelo } from "./comparar.ts";
import { duelVerdict, headline, type FanSide } from "./domain/comparar.ts";
import { loadFonts, SHARE_SIZE } from "./shareCard.tsx";

const DISPLAY = "Oswald";
const BODY = "Barlow";

function panel(fan: FanSide, club: ClubIdentity, winner: boolean) {
  const jersey = `data:image/svg+xml;base64,${Buffer.from(jerseySvg(club, 170, undefined, `cmp-${fan.memberId}`)).toString("base64")}`;
  const handle = `@${fan.username}`;
  const size = Math.max(34, Math.min(54, Math.floor(430 / (handle.length * 0.56))));
  const eff = fan.effectiveness === null ? "—" : `${Math.round(fan.effectiveness)}%`;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 600,
        height: 470,
        background: club.colors.card,
        color: club.colors.ink,
        padding: "0 20px",
        borderBottom: winner ? `10px solid ${club.colors.band ?? club.colors.ink}` : "10px solid transparent",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={jersey} width={170} height={170} alt="" />
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: size, fontWeight: 700, marginTop: 6 }}>{handle}</div>
      <div style={{ display: "flex", fontSize: 26, fontWeight: 500 }}>{fan.clubName}</div>
      <div style={{ display: "flex", alignItems: "flex-end", marginTop: 8 }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 104, fontWeight: 700, lineHeight: 1 }}>{eff}</div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 14, marginBottom: 12, fontSize: 22, fontWeight: 700 }}>
          <div style={{ display: "flex" }}>{`${fan.total} ${fan.total === 1 ? "partido" : "partidos"}`}</div>
          <div style={{ display: "flex", textTransform: "uppercase" }}>{fan.verdictLabel}</div>
        </div>
      </div>
    </div>
  );
}

export async function duelImage(d: Duelo, site: string) {
  const fonts = await loadFonts();
  const [ia, ib] = [clubIdentity(d.clubA), clubIdentity(d.clubB)];
  const v = duelVerdict(d.a, d.b);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#10161a", color: "#ffffff", fontFamily: BODY, position: "relative" }}>
        <div style={{ display: "flex" }}>
          {panel(d.a, ia, v.winner === "a")}
          {panel(d.b, ib, v.winner === "b")}
        </div>
        <div
          style={{
            position: "absolute",
            left: 600 - 55,
            top: 235 - 55,
            width: 110,
            height: 110,
            borderRadius: 999,
            background: "#10161a",
            border: "5px solid #ffffff",
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
            fontFamily: DISPLAY,
            fontSize: 52,
            fontWeight: 700,
          }}
        >
          VS
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 40, fontWeight: 700 }}>{headline(d.a, d.b)}</div>
            <div style={{ display: "flex", fontSize: 24, opacity: 0.85 }}>{`${v.title}${d.common.count ? ` · ${d.common.count} ${d.common.count === 1 ? "partido" : "partidos"} en común` : ""}`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 32, fontWeight: 700, textTransform: "uppercase" }}>GaluchaStats</div>
            <div style={{ display: "flex", fontSize: 20, opacity: 0.8 }}>{site.replace(/^https?:\/\//, "")}</div>
          </div>
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts },
  );
}
