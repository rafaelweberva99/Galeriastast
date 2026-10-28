/**
 * Genera demo/dist/index.html: la vista previa de GaleríaStats en un solo archivo
 * (datos + lógica + estilos), lista para abrir en cualquier navegador o publicar como página.
 * Requiere la base cargada (npm run data:fetch && npm run data:ingest).
 * Uso: npm run demo:build
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { openDb, type Row } from "../src/lib/db/client.ts";

const db = await openDb();

const pro = new Set(
  (
    await db.all(
      `SELECT DISTINCT team FROM (SELECT home_team_id AS team FROM matches WHERE competition_id = 'primera-division'
       UNION SELECT away_team_id FROM matches WHERE competition_id = 'primera-division') AS pro`,
    )
  ).map((r) => r.team as string),
);
const teamRows = await db.all("SELECT * FROM teams ORDER BY id");
const teamIndex = new Map(teamRows.map((t, i) => [t.id as string, i]));
const compRows = await db.all("SELECT * FROM competitions ORDER BY tier");
const compIndex = new Map(compRows.map((c, i) => [c.id as string, i]));
const matches = (await db.all("SELECT * FROM matches WHERE home_goals IS NOT NULL OR home_pens IS NOT NULL ORDER BY date")).map((m: Row) => [
  m.date,
  compIndex.get(m.competition_id as string),
  m.tournament,
  m.stage,
  teamIndex.get(m.home_team_id as string),
  teamIndex.get(m.away_team_id as string),
  m.home_goals,
  m.away_goals,
  m.home_pens,
  m.away_pens,
  Number(m.is_final),
]);
if (matches.length === 0) throw new Error("La base no tiene partidos: ejecuta npm run data:fetch && npm run data:ingest");

const data = {
  teams: teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    short: t.short_name,
    city: t.city,
    colors: [t.color_primary, t.color_secondary],
    pro: pro.has(t.id as string),
  })),
  competitions: compRows.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
  rivalries: (await db.all("SELECT * FROM rivalries")).map((r) => ({ id: r.id, name: r.name, teamA: r.team_a, teamB: r.team_b })),
  matches,
};

const bundle = await build({
  entryPoints: [path.resolve("demo/app.ts")],
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  write: false,
  platform: "browser",
});
const js = bundle.outputFiles[0].text;

/** Adapta globals.css de la app al contrato de tema de la vista previa (data-theme + prefers-color-scheme). */
function adaptCss(css: string): string {
  const darkRoot = css.match(/@media \(prefers-color-scheme: dark\) \{\n  :root \{([\s\S]*?)\n  \}\n\}/);
  const darkClub = css.match(/@media \(prefers-color-scheme: dark\) \{\n  \[style\*="--club-accent"\] \{([\s\S]*?)\n  \}\n\}/);
  if (!darkRoot || !darkClub) throw new Error("No se encontró el bloque oscuro en globals.css");
  return css
    .replace(darkRoot[0], `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {${darkRoot[1]}\n  }\n}\n:root[data-theme="dark"] {${darkRoot[1]}\n}`)
    .replace(
      darkClub[0],
      `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) [style*="--club-accent"] {${darkClub[1]}\n  }\n}\n:root[data-theme="dark"] [style*="--club-accent"] {${darkClub[1]}\n}`,
    );
}
const css = adaptCss(readFileSync(path.resolve("src/app/globals.css"), "utf8")) + readFileSync(path.resolve("demo/extra.css"), "utf8");

const html = `<title>GaleríaStats</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap">
<style>${css}</style>
<header class="site-header"><div class="container">
  <a href="#inicio" data-nav="inicio" class="brand"><svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="M16 9.5 L21.5 13.5 L19.4 20 L12.6 20 L10.5 13.5 Z" fill="#111"/><path d="M16 9.5 V3 M21.5 13.5 L27.6 11.3 M19.4 20 L23.3 25.4 M12.6 20 L8.7 25.4 M10.5 13.5 L4.4 11.3" stroke="#111" stroke-width="1.5"/></svg>GaleríaStats</a>
  <nav class="nav" id="nav" aria-label="Principal"></nav>
</div></header>
<div class="preview-note"><div class="container">Vista previa: tus partidos marcados se guardan solo en este navegador.</div></div>
<main class="container" id="app"></main>
<footer class="site-footer"><div class="container">Resultados históricos de worldfootball.net (vía yorobot/cache.wfb.txt), con chequeos de calidad propios. GaleríaStats no está afiliado a la ANFP ni a ningún club; los colores se usan solo como referencia de los hinchas.</div></footer>
<script type="application/json" id="data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
`;

mkdirSync(path.resolve("demo/dist"), { recursive: true });
writeFileSync(path.resolve("demo/dist/index.html"), html);
console.log(`demo/dist/index.html: ${(html.length / 1024).toFixed(0)} KB, ${matches.length} partidos`);
