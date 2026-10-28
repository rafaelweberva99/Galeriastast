/**
 * Vista previa de GaleríaStats que corre entera en el navegador (sin servidor).
 * Reutiliza la lógica real de la app (Mufómetro, clásicos, finales, temas de club, lector de correos)
 * y guarda los partidos marcados en el navegador del hincha.
 */
import { clubIdentity, clubStyle, fansLabel, jerseySvg, type ClubIdentity } from "../src/lib/clubTheme.ts";
import { buildCarnet, decidedOutcome, effectiveness, involves, outcomeFor, recordFor, type Verdict } from "../src/lib/domain/stats.ts";
import type { AttendanceMode, AttendedMatch, Match, Rivalry, TeamRecord } from "../src/lib/domain/types.ts";
import { findDates, TeamMentionIndex } from "../src/lib/ingest/tickets.ts";
import { isVisibleClub, MVP_ACTIVE, MVP_CLUBS } from "../src/lib/mvp.ts";

// --- Datos -------------------------------------------------------------------

interface DemoTeam {
  id: string;
  name: string;
  short: string;
  city: string | null;
  colors: [string, string];
  pro: boolean;
}
interface DemoData {
  teams: DemoTeam[];
  competitions: { id: string; name: string; kind: Match["competitionKind"] }[];
  rivalries: Rivalry[];
  /** [fecha, competición, torneo, ronda, local, visita, gl, gv, pl, pv, final] con índices a teams/competitions */
  matches: [string, number, string | null, string | null, number, number, number | null, number | null, number | null, number | null, 0 | 1][];
}

const DATA = JSON.parse(document.getElementById("data")!.textContent!) as DemoData;
const teams = new Map(DATA.teams.map((t) => [t.id, t]));
const MATCHES: Match[] = DATA.matches.map(([date, c, tournament, stage, h, a, hg, ag, hp, ap, fin]) => {
  const home = DATA.teams[h];
  const away = DATA.teams[a];
  const comp = DATA.competitions[c];
  return {
    id: `${date}_${home.id}_${away.id}`,
    date,
    season: Number(date.slice(0, 4)),
    competitionId: comp.id,
    competitionName: comp.name,
    competitionKind: comp.kind,
    tournament,
    stage,
    homeTeamId: home.id,
    homeTeamName: home.name,
    awayTeamId: away.id,
    awayTeamName: away.name,
    homeGoals: hg,
    awayGoals: ag,
    homePens: hp,
    awayPens: ap,
    venueName: null,
    isFinal: fin === 1,
  };
});
const byId = new Map(MATCHES.map((m) => [m.id, m]));
const PRO_CLUBS = DATA.teams.filter((t) => t.pro).sort((a, b) => a.name.localeCompare(b.name, "es"));
// Clubes que se ofrecen para crear carnet (en el MVP, solo los de historial completo).
const PICKABLE = PRO_CLUBS.filter((t) => isVisibleClub(t.id));
const mentionIndex = new TeamMentionIndex(PRO_CLUBS.map((t) => ({ id: t.id, name: t.name, short: t.short })));

const identityOf = (id: string): ClubIdentity => {
  const t = teams.get(id)!;
  return clubIdentity({ id: t.id, shortName: t.short, colorPrimary: t.colors[0], colorSecondary: t.colors[1] });
};
const clubMatches = (clubId: string) => MATCHES.filter((m) => involves(m, clubId));

// --- Estado (guardado en este navegador) ------------------------------------

type View = "inicio" | "partidos" | "carnet" | "importar" | "clubes";
interface Saved {
  clubId: string | null;
  name: string;
  attended: Record<string, AttendanceMode>;
}
const STORE_KEY = "galeriastats-demo-v1";
function load(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { clubId: null, name: "", attended: {}, ...JSON.parse(raw) };
  } catch {
    /* sin almacenamiento: la vista previa funciona igual, sin recordar */
  }
  return { clubId: null, name: "", attended: {} };
}
const saved = load();
// Un carnet guardado de un club que aún no está habilitado vuelve a la elección de club.
if (saved.clubId && !isVisibleClub(saved.clubId)) saved.clubId = null;
function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
  } catch {
    /* ignorar */
  }
}

const VIEWS: View[] = ["inicio", "partidos", "carnet", "importar", "clubes"];
const ui = {
  view: (VIEWS.includes(location.hash.slice(1) as View) ? location.hash.slice(1) : "inicio") as View,
  season: "" as string,
  competition: "",
  rival: "",
  onlyMine: false,
  clubDetail: null as string | null,
  importText: "",
  candidates: null as Match[] | null,
  importError: "",
};
if (!saved.clubId && ui.view !== "clubes") ui.view = "inicio";

// --- Utilidades de render ----------------------------------------------------

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const styleAttr = (vars: Record<string, string>) =>
  esc(Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";"));
const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const fdate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(0)}%`);
const recLine = (r: TeamRecord) => `${r.won}G ${r.drawn}E ${r.lost}P`;

let jerseySeq = 0;
const jersey = (c: ClubIdentity, size = 48, num?: string) => jerseySvg(c, size, num, `${c.id}-${jerseySeq++}`);

const BALL = `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="M16 9.5 L21.5 13.5 L19.4 20 L12.6 20 L10.5 13.5 Z" fill="#111"/><path d="M16 9.5 V3 M21.5 13.5 L27.6 11.3 M19.4 20 L23.3 25.4 M12.6 20 L8.7 25.4 M10.5 13.5 L4.4 11.3" stroke="#111" stroke-width="1.5"/></svg>`;

function mufometro(value: number | null, verdict: Verdict) {
  const r = 80, cx = 100, cy = 95;
  const pt = (p: number) => {
    const a = Math.PI * (1 - p / 100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const arc = (f: number, t: number) => {
    const [x1, y1] = pt(f);
    const [x2, y2] = pt(t);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const shown = verdict.key === "sin-datos" ? null : value;
  const [nx, ny] = pt(shown ?? 50);
  return `<svg viewBox="0 0 200 120" width="220" role="img" aria-label="Mufómetro: ${esc(verdict.label)}" style="max-width:100%">
    <path d="${arc(0, 40)}" stroke="#d64545" stroke-width="14" fill="none"/>
    <path d="${arc(40, 60)}" stroke="#c9a227" stroke-width="14" fill="none"/>
    <path d="${arc(60, 100)}" stroke="#1f9d55" stroke-width="14" fill="none"/>
    ${shown === null ? "" : `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#121a15" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" fill="#121a15"/>`}
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="18" font-weight="800" fill="#121a15">${shown === null ? "?" : `${shown.toFixed(0)}%`}</text></svg>`;
}

function recordBar(r: TeamRecord) {
  if (!r.played) return `<div class="recordbar"></div>`;
  const w = (n: number) => `${(n / r.played) * 100}%`;
  return `<div class="recordbar" role="img" aria-label="${r.won} ganados, ${r.drawn} empatados, ${r.lost} perdidos"><span style="width:${w(r.won)};background:var(--win)"></span><span style="width:${w(r.drawn)};background:var(--draw)"></span><span style="width:${w(r.lost)};background:var(--loss)"></span></div>`;
}

function score(m: Match) {
  if (m.homeGoals === null || m.awayGoals === null)
    return `<span class="scoreboard">${m.homePens !== null ? `${m.homePens}-${m.awayPens} pen.` : "vs"}</span>`;
  const pens = m.homePens !== null ? `<small>(${m.homePens}-${m.awayPens} pen.)</small>` : "";
  return `<span class="scoreboard">${m.homeGoals}<small>-</small>${m.awayGoals}${pens}</span>`;
}

function matchRow(m: Match, highlight: string | null, extra = "") {
  const name = (id: string, label: string) => (id === highlight ? `<strong>${esc(label)}</strong>` : `<span>${esc(label)}</span>`);
  const o = highlight ? outcomeFor(m, highlight) : null;
  const meta = [m.competitionName, m.tournament, m.stage].filter(Boolean).map(esc).join(" · ");
  return `<div class="match ${o ?? ""}"><div class="match-date">${fdate(m.date)}</div>
    <div class="match-teams">${name(m.homeTeamId, m.homeTeamName)}${score(m)}${name(m.awayTeamId, m.awayTeamName)}
    <span class="match-meta">${meta}${m.isFinal ? ` <span class="match-final">· 🏆 Final</span>` : ""}</span></div><div>${extra}</div></div>`;
}

function toggle(m: Match) {
  const cur = saved.attended[m.id] ?? "ninguno";
  const b = (v: string, label: string, cls = "") =>
    `<button type="button" class="${cls}" data-action="att" data-match="${esc(m.id)}" data-mode="${v}" aria-pressed="${cur === v}">${label}</button>`;
  return `<div class="toggle" role="group" aria-label="¿Fuiste a este partido?">${b("ninguno", "No fui")}${b("propia", "Fui")}${b("infiltrado", "Infiltrado", "inf")}</div>`;
}

const sectionTitle = (t: string, extra = "") => `<h2 class="section-title" ${extra}>${esc(t)}</h2>`;

// --- Vistas -----------------------------------------------------------------

function viewInicio() {
  const big = (MVP_ACTIVE ? [...MVP_CLUBS] : ["colo-colo", "universidad-de-chile", "universidad-catolica"]).map(identityOf);
  const seasons = MATCHES.map((m) => m.season);
  const features = [
    ["Mufómetro", "Tu efectividad en los partidos que viste desde la galería. Más de 60%: cábala. Menos de 40%: yeta."],
    ["Clásicos", "Superclásico, Clásico Universitario, albos contra cruzados… ¿cómo le va a tu club cuando tú vas?"],
    ["Finales", "Las finales a las que fuiste, con penales incluidos. ¿Viste dar la vuelta o te tocó llorar?"],
    ["Modo Infiltrado", "¿Fuiste escondido a la galería rival? También cuenta, y lo separamos aparte."],
    ["Impacto real", "Comparamos tu efectividad con la de tu club en esas mismas temporadas: ¿sumas o restas?"],
    ["Importa tus entradas", "Pega el correo de compra de PuntoTicket y marcamos tus partidos solos."],
  ];
  return `
  <section class="pitch bleed hero"><div class="container">
    <p class="display kicker-hero">Carnet de hincha · Fútbol chileno</p>
    <h1>¿Eres cábala o yeta?</h1>
    <p class="lead">Marca los partidos a los que fuiste al estadio y descubre si tu club gana más cuando estás en la galería. Con ${MATCHES.length.toLocaleString("es-CL")} partidos reales desde ${Math.min(...seasons)}.</p>
    <div class="pick-club">${big
      .map(
        (c) => `<button type="button" class="pick-card" data-action="pick" data-club="${c.id}" style="${styleAttr(clubStyle(c))}">
        ${jersey(c, 64, "12")}<div><div class="small" style="opacity:.85">Soy</div><p class="display">${esc(c.nickname)}</p><div class="small" style="opacity:.85">${esc(c.short)}</div></div></button>`,
      )
      .join("")}</div>
    ${MVP_ACTIVE ? `<p class="small" style="margin-top:14px;opacity:.9">Partimos con los clubes cuyo historial en Primera ya está completo y verificado. Colo-Colo, la U, la UC y el resto llegan pronto.</p>` : ""}
    <div class="other-club"><label for="other-club">¿Eres de otro club?</label>
      <select id="other-club" data-action="pick-select"><option value="">Elige tu club…</option>${PICKABLE.map(
        (t) => `<option value="${t.id}" ${saved.clubId === t.id ? "selected" : ""}>${esc(t.name)}</option>`,
      ).join("")}</select></div>
  </div></section>
  <section class="section"><h2 class="section-title">Cómo funciona</h2><div class="grid grid-3">${features
    .map(([t, d]) => `<div class="card"><h3>${t}</h3><p class="muted" style="margin:0">${d}</p></div>`)
    .join("")}</div></section>`;
}

function viewPartidos(clubId: string) {
  const club = identityOf(clubId);
  const all = clubMatches(clubId);
  const seasons = [...new Set(all.map((m) => m.season))].sort((a, b) => b - a);
  if (!ui.season) ui.season = String(seasons[0]);
  const comps = [...new Map(all.map((m) => [m.competitionId, m.competitionName])).entries()];
  const rivals = PRO_CLUBS.filter((t) => t.id !== clubId);
  let list = all.filter(
    (m) =>
      (ui.season === "todas" || m.season === Number(ui.season)) &&
      (!ui.competition || m.competitionId === ui.competition) &&
      (!ui.rival || involves(m, ui.rival)) &&
      (!ui.onlyMine || saved.attended[m.id]),
  );
  list = list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 400);
  const marked = Object.keys(saved.attended).filter((id) => byId.has(id) && involves(byId.get(id)!, clubId)).length;
  return `
  <div class="club-banner row">${jersey(club, 72, "12")}<div><div class="small">Fecha a fecha · ${esc(teams.get(clubId)!.name)}</div>
    <h1>¿Dónde estuviste?</h1><p class="muted" style="margin:0">${marked} partidos marcados · <a href="#carnet" data-nav="carnet">ver mi carnet</a> · <a href="#importar" data-nav="importar">importar desde PuntoTicket</a></p></div></div>
  <div class="card filters">
    <div class="field"><label for="f-season">Temporada</label><select id="f-season" data-filter="season"><option value="todas" ${ui.season === "todas" ? "selected" : ""}>Todas</option>${seasons
      .map((s) => `<option value="${s}" ${String(s) === ui.season ? "selected" : ""}>${s}</option>`)
      .join("")}</select></div>
    <div class="field"><label for="f-comp">Competición</label><select id="f-comp" data-filter="competition"><option value="">Todas</option>${comps
      .map(([id, n]) => `<option value="${id}" ${id === ui.competition ? "selected" : ""}>${esc(n)}</option>`)
      .join("")}</select></div>
    <div class="field"><label for="f-rival">Rival</label><select id="f-rival" data-filter="rival"><option value="">Todos</option>${rivals
      .map((t) => `<option value="${t.id}" ${t.id === ui.rival ? "selected" : ""}>${esc(t.name)}</option>`)
      .join("")}</select></div>
    <label class="row small" for="f-mine"><input type="checkbox" id="f-mine" data-filter="onlyMine" ${ui.onlyMine ? "checked" : ""}> Solo los que marqué</label>
  </div>
  <div class="card">${list.length ? list.map((m) => matchRow(m, clubId, toggle(m))).join("") : `<p class="muted">No hay partidos con esos filtros.</p>`}</div>`;
}

function breakdownTable(rows: { key: string; label: string; record: TeamRecord; effectiveness: number | null }[], label: string) {
  if (!rows.length) return `<p class="muted">Sin datos todavía.</p>`;
  return `<div class="table-wrap"><table><thead><tr><th>${label}</th><th class="num">PJ</th><th class="num">G</th><th class="num">E</th><th class="num">P</th><th class="num">Efect.</th></tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr><td>${esc(r.label)}</td><td class="num">${r.record.played}</td><td class="num">${r.record.won}</td><td class="num">${r.record.drawn}</td><td class="num">${r.record.lost}</td><td class="num">${pct(r.effectiveness)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}

const OUT_LABEL = { G: "Ganado", E: "Empate", P: "Perdido" } as const;

function memorable(title: string, m: Match | null) {
  return `<div class="card"><div class="stat-label">${title}</div>${
    m
      ? `<div style="font-weight:700">${esc(m.homeTeamName)} ${m.homeGoals}-${m.awayGoals} ${esc(m.awayTeamName)}</div><div class="muted small">${fdate(m.date)} · ${esc(m.competitionName)}</div>`
      : `<div class="muted">—</div>`
  }</div>`;
}

function viewCarnet(clubId: string) {
  const id = identityOf(clubId);
  const team = teams.get(clubId)!;
  const attended: AttendedMatch[] = Object.entries(saved.attended)
    .map(([mid, mode]) => (byId.has(mid) ? { ...byId.get(mid)!, mode } : null))
    .filter((m): m is AttendedMatch => m !== null);
  const c = buildCarnet(attended, clubId, DATA.rivalries, clubMatches(clubId));
  const phrase =
    c.verdict.key === "cabala" || c.verdict.key === "cabala-absoluta"
      ? id.needsYou
      : c.verdict.key === "yeta" || c.verdict.key === "yeta-total"
        ? "Quizás conviene verlo por la tele…"
        : c.verdict.description;
  const name = saved.name.trim() || "hincha";
  const impact = c.impact;
  const mine = attended.filter((m) => involves(m, clubId)).sort((a, b) => b.date.localeCompare(a.date));

  const empty = c.total === 0
    ? `<div class="card notice"><strong>Tu carnet está vacío.</strong> Marca los partidos a los que fuiste en <a href="#partidos" data-nav="partidos">Marcar partidos</a>, pega un correo de compra en <a href="#importar" data-nav="importar">Importar entradas</a>, o <button type="button" class="linklike" data-action="example">carga un ejemplo</button> para ver cómo se ve.</div>`
    : "";

  return `${empty}
  <section class="socio-card">
    <div class="row" style="align-items:center;gap:20px">${jersey(id, 110, "12")}<div>
      <div class="socio-kicker">Carnet de hincha · ${esc(id.nickname)}</div>
      <div class="socio-name"><label class="sr-only" for="fan-name">Tu nombre de hincha</label>@<input id="fan-name" class="name-input" value="${esc(name)}" maxlength="20" data-action="name" aria-label="Tu nombre de hincha"></div>
      <div class="socio-meta">${esc(team.name)}${id.stadium ? ` · ${esc(id.stadium)}` : ""}</div>
      <div class="socio-meta">${c.first ? `En la galería desde ${c.first.season}` : "Toca tu nombre para cambiarlo"}</div>
      <div class="cheer">${esc(id.cheer)}</div></div></div>
    <div class="mufometro-panel"><div class="socio-kicker" style="opacity:.6">Mufómetro</div>${mufometro(c.effectiveness, c.verdict)}
      <p class="verdict">${esc(c.verdict.label)}</p><p class="small" style="margin:4px 0 0;max-width:240px;color:#56655c">${esc(phrase)}</p></div>
  </section>
  <section class="grid grid-4">
    <div class="card stat"><span class="stat-value">${c.total}</span><span class="stat-label">partidos en la galería</span></div>
    <div class="card stat"><span class="stat-value">${pct(c.effectiveness)}</span><span class="stat-label">efectividad cuando vas</span></div>
    <div class="card stat"><span class="stat-value" style="color:${impact === null ? "inherit" : impact >= 0 ? "var(--win)" : "var(--loss)"}">${impact === null ? "—" : `${impact >= 0 ? "+" : ""}${impact.toFixed(1)} pts`}</span><span class="stat-label">vs. tu club esas temporadas (${pct(c.baselineEffectiveness)})</span></div>
    <div class="card stat"><span class="stat-value sm">${recLine(c.record)}</span><span class="stat-label">goles ${c.record.goalsFor}-${c.record.goalsAgainst}</span>${recordBar(c.record)}</div>
  </section>
  <section class="grid grid-3">
    <div class="card"><h3>De local</h3><p class="muted">${recLine(c.home)} · ${pct(effectiveness(c.home))}</p>${recordBar(c.home)}</div>
    <div class="card"><h3>De visita</h3><p class="muted">${recLine(c.away)} · ${pct(effectiveness(c.away))}</p>${recordBar(c.away)}</div>
    <div class="card"><h3><span class="pill infiltrado">Modo Infiltrado</span></h3><p class="muted">${
      c.infiltrado.played ? `${c.infiltrado.played} ${c.infiltrado.played === 1 ? "partido" : "partidos"} escondido en la galería rival · ${recLine(c.infiltrado)}` : "¿Fuiste escondido a la galería rival? También cuenta."
    }</p>${recordBar(c.infiltrado)}</div>
  </section>
  <section class="grid grid-2">
    <div class="card">${sectionTitle("Clásicos")}${
      c.classics.length
        ? `<div class="table-wrap"><table><thead><tr><th>Clásico</th><th class="num">PJ</th><th class="num">G-E-P</th><th class="num">Efect.</th></tr></thead><tbody>${c.classics
            .map((k) => `<tr><td>${esc(k.rivalry.name)}</td><td class="num">${k.record.played}</td><td class="num">${k.record.won}-${k.record.drawn}-${k.record.lost}</td><td class="num">${pct(k.effectiveness)}</td></tr>`)
            .join("")}</tbody></table></div>`
        : `<p class="muted">Tu club no tiene clásicos registrados.</p>`
    }</div>
    <div class="card">${sectionTitle("Finales")}${
      c.finals.length
        ? c.finals
            .map(({ match: m, outcome }) => `<div class="final-row"><span>${esc(m.homeTeamName)} ${m.homeGoals ?? ""}-${m.awayGoals ?? ""} ${esc(m.awayTeamName)}<span class="muted small"> · ${esc(m.tournament)}</span></span>${outcome ? `<span class="pill ${outcome}">${OUT_LABEL[outcome]}</span>` : ""}</div>`)
            .join("")
        : `<p class="muted">Todavía no marcas ninguna final.</p>`
    }</div>
  </section>
  <section class="grid grid-4">
    <div class="card stat"><span class="stat-value">${c.streaks.longestWin}</span><span class="stat-label">racha más larga ganando</span></div>
    <div class="card stat"><span class="stat-value">${c.streaks.longestUnbeaten}</span><span class="stat-label">racha más larga invicto</span></div>
    <div class="card stat"><span class="stat-value">${c.streaks.longestWinless}</span><span class="stat-label">racha más larga sin ganar</span></div>
    <div class="card stat"><span class="stat-value">${c.streaks.current ? `${c.streaks.current.length} ${c.streaks.current.outcome}` : "—"}</span><span class="stat-label">racha actual</span></div>
  </section>
  <section class="grid grid-4">${memorable("Mayor goleada vista", c.biggestWin)}${memorable("Peor derrota vista", c.worstDefeat)}${memorable("Primer partido", c.first)}${memorable("Último partido", c.last)}</section>
  <section class="grid grid-2">
    <div class="card">${sectionTitle("Por temporada")}${breakdownTable(c.bySeason, "Año")}</div>
    <div class="card">${sectionTitle("Por competición")}${breakdownTable(c.byCompetition, "Competición")}<h2 class="section-title section">Rivales más vistos</h2>${breakdownTable(c.byOpponent.slice(0, 10), "Rival")}</div>
  </section>
  <section class="card"><div class="row" style="justify-content:space-between">${sectionTitle("Partidos a los que fuiste", 'style="margin:0"')}<a class="btn btn-ghost" href="#partidos" data-nav="partidos">Marcar más partidos</a></div>
    ${mine.length ? mine.map((m) => matchRow(m, clubId, m.mode === "infiltrado" ? `<span class="pill infiltrado">Infiltrado</span>` : "")).join("") : `<p class="muted">Aún no hay partidos marcados.</p>`}
    ${c.total ? `<p class="small muted" style="margin-top:12px"><button type="button" class="linklike" data-action="reset">Borrar mis partidos marcados</button></p>` : ""}</section>`;
}

function viewImportar(clubId: string) {
  const team = teams.get(clubId)!;
  const cands = ui.candidates;
  return `
  <h1 class="section-title">Importar desde PuntoTicket</h1>
  <p class="muted" style="max-width:720px">¿Compraste tus entradas en PuntoTicket? Pega el correo de confirmación de la compra (o sube el archivo .eml) y buscamos los partidos de ${esc(team.name)} que coinciden. Tú confirmas cuáles marcar. El correo no sale de tu teléfono.</p>
  <form class="card stack" data-form="import">
    <div class="field"><label for="import-text">Correo de confirmación de PuntoTicket</label>
      <textarea id="import-text" rows="7" placeholder="Ej.: Evento: Colo-Colo vs. Universidad de Chile · Fecha: domingo 10 de marzo de 2024, 18:00 hrs · Recinto: Estadio Monumental">${esc(ui.importText)}</textarea></div>
    <div class="row"><label class="btn btn-ghost" for="import-file">Subir .eml</label><input id="import-file" type="file" accept=".eml,.txt,.html,message/rfc822" multiple hidden data-action="import-file">
      <button class="btn" type="submit">Buscar partidos</button>
      <button class="btn btn-ghost" type="button" data-action="import-sample">Probar con un correo de ejemplo</button></div>
    ${ui.importError ? `<p class="error">${esc(ui.importError)}</p>` : ""}
  </form>
  ${
    cands
      ? `<form class="card stack" data-form="import-confirm"><h2 style="margin:0">Encontramos ${cands.length} ${cands.length === 1 ? "partido" : "partidos"}</h2>
      ${cands
        .map(
          (m) => `<label class="match" style="cursor:pointer"><span class="match-date">${fdate(m.date)}</span><span class="match-teams"><strong>${esc(m.homeTeamName)} ${m.homeGoals}-${m.awayGoals} ${esc(m.awayTeamName)}</strong><span class="match-meta">${[m.competitionName, m.tournament, m.stage].filter(Boolean).map(esc).join(" · ")}${saved.attended[m.id] ? " · ya estaba marcado" : ""}</span></span><input type="checkbox" name="matchId" value="${esc(m.id)}" ${saved.attended[m.id] ? "" : "checked"}></label>`,
        )
        .join("")}
      <div class="row"><select id="import-mode" aria-label="¿Dónde estuviste?"><option value="propia">Fui a la galería de mi club</option><option value="infiltrado">Fui de infiltrado</option></select><button class="btn" type="submit">Marcar seleccionados</button></div></form>`
      : ""
  }
  <div class="card small muted"><strong>¿Cómo exporto el correo?</strong> Busca “PuntoTicket” en tu correo y abre la confirmación de compra. En Gmail: menú ⋮ → “Descargar mensaje” para obtener el .eml, o copia y pega el texto. Puedes pegar varios correos seguidos.</div>`;
}

function viewClubes() {
  if (ui.clubDetail) return viewClub(ui.clubDetail);
  return `<h1 class="section-title">Clubes</h1><div class="grid grid-3">${PICKABLE.map(
    (t) => `<button type="button" class="card row club-tile" data-action="club" data-club="${t.id}" style="border-top:5px solid ${t.colors[0]}">${jersey(identityOf(t.id), 40)}<div><div style="font-weight:700">${esc(t.name)}</div><div class="muted small">${esc(t.city ?? "—")} · ${clubMatches(t.id).length} partidos</div></div></button>`,
  ).join("")}</div>`;
}

function viewClub(clubId: string) {
  const id = identityOf(clubId);
  const team = teams.get(clubId)!;
  const ms = clubMatches(clubId);
  const rec = recordFor(ms, clubId);
  const seasons = [...new Set(ms.map((m) => m.season))].sort((a, b) => b - a);
  const rivals = DATA.rivalries.filter((r) => r.teamA === clubId || r.teamB === clubId);
  const finals = ms.filter((m) => m.isFinal).sort((a, b) => b.date.localeCompare(a.date));
  const lbl = { G: "Ganada", E: "Empate", P: "Perdida" } as const;
  return `<div class="stack" style="${styleAttr(clubStyle(id))}">
  <p><button type="button" class="linklike" data-action="club" data-club="">← Todos los clubes</button></p>
  <div class="club-banner row">${jersey(id, 84)}<div><div class="small">${esc([id.alias, id.stadium ?? team.city].filter(Boolean).join(" · "))}</div><h1>${esc(team.name)}</h1><span class="muted">${esc(fansLabel(id))}</span></div></div>
  <section class="grid grid-4">
    <div class="card stat"><span class="stat-value">${rec.played}</span><span class="stat-label">partidos registrados</span></div>
    <div class="card stat"><span class="stat-value">${pct(effectiveness(rec))}</span><span class="stat-label">efectividad histórica</span></div>
    <div class="card stat"><span class="stat-value sm">${recLine(rec)}</span>${recordBar(rec)}</div>
    <div class="card stat"><span class="stat-value">${rec.goalsFor}-${rec.goalsAgainst}</span><span class="stat-label">goles a favor / en contra</span></div>
  </section>
  <section class="grid grid-2">
    <div class="card">${sectionTitle("Clásicos (historial completo)")}${
      rivals.length
        ? rivals
            .map((r) => {
              const rival = r.teamA === clubId ? r.teamB : r.teamA;
              const rr = recordFor(ms.filter((m) => involves(m, rival)), clubId);
              return `<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><strong>${esc(r.name)}</strong><span class="muted small">${rr.played} PJ · ${recLine(rr)} · ${pct(effectiveness(rr))}</span></div>${recordBar(rr)}</div>`;
            })
            .join("")
        : `<p class="muted">Sin clásicos registrados.</p>`
    }</div>
    <div class="card">${sectionTitle("Finales")}${
      finals.length
        ? finals
            .map((m) => {
              const o = decidedOutcome(m, clubId);
              return `<div class="final-row"><span>${esc(m.homeTeamName)} ${m.homeGoals ?? ""}-${m.awayGoals ?? ""} ${esc(m.awayTeamName)}<span class="muted small"> · ${esc(m.tournament)}</span></span>${o ? `<span class="pill ${o}">${lbl[o]}</span>` : ""}</div>`;
            })
            .join("")
        : `<p class="muted">Sin finales registradas.</p>`
    }</div>
  </section>
  <section class="card">${sectionTitle("Por temporada")}<div class="table-wrap"><table><thead><tr><th>Año</th><th class="num">PJ</th><th class="num">G-E-P</th><th class="num">Goles</th><th class="num">Efect.</th></tr></thead><tbody>${seasons
    .map((s) => {
      const r = recordFor(ms.filter((m) => m.season === s), clubId);
      return `<tr><td>${s}</td><td class="num">${r.played}</td><td class="num">${r.won}-${r.drawn}-${r.lost}</td><td class="num">${r.goalsFor}-${r.goalsAgainst}</td><td class="num">${pct(effectiveness(r))}</td></tr>`;
    })
    .join("")}</tbody></table></div></section></div>`;
}

// --- Montaje ----------------------------------------------------------------

const app = document.getElementById("app")!;
const nav = document.getElementById("nav")!;

function applyTheme() {
  const vars = saved.clubId ? clubStyle(identityOf(saved.clubId)) : {};
  for (const k of ["--club-primary", "--club-secondary", "--club-ink", "--club-accent", "--club-accent-ink", "--club-accent-dark", "--club-accent-dark-ink", "--club-card", "--club-band"]) {
    if (vars[k]) document.body.style.setProperty(k, vars[k]);
    else document.body.style.removeProperty(k);
  }
}

function render() {
  applyTheme();
  const club = saved.clubId;
  const link = (v: View, label: string) => `<a href="#${v}" data-nav="${v}" ${ui.view === v ? 'aria-current="page"' : ""}>${label}</a>`;
  nav.innerHTML = club
    ? `${link("partidos", "Marcar partidos")}${link("importar", "Importar entradas")}${link("carnet", "Mi carnet")}${link("clubes", "Clubes")}<button type="button" data-action="change-club">Cambiar club</button>`
    : `${link("clubes", "Clubes")}<a href="#inicio" data-nav="inicio" class="nav-cta">Crear carnet</a>`;
  const view = !club && ["partidos", "carnet", "importar"].includes(ui.view) ? "inicio" : ui.view;
  app.innerHTML =
    view === "inicio" ? viewInicio()
    : view === "partidos" ? viewPartidos(club!)
    : view === "carnet" ? viewCarnet(club!)
    : view === "importar" ? viewImportar(club!)
    : viewClubes();
}

function go(view: View) {
  ui.view = view;
  try {
    history.replaceState(null, "", `#${view}`);
  } catch {
    /* ignorar */
  }
  render();
  window.scrollTo({ top: 0 });
}

function pickClub(id: string) {
  if (!teams.has(id)) return;
  saved.clubId = id;
  persist();
  ui.season = "";
  ui.rival = "";
  ui.competition = "";
  ui.candidates = null;
  go("partidos");
}

function emailToText(raw: string): string {
  let text = raw;
  for (const [, b64] of raw.matchAll(/Content-Transfer-Encoding:\s*base64\s*\r?\n(?:[\w-]+:.*\r?\n)*\r?\n([A-Za-z0-9+/=\r\n]+)/gi)) {
    try {
      const bin = atob(b64.replace(/\s+/g, ""));
      text += "\n" + new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    } catch {
      /* parte ilegible */
    }
  }
  if (/quoted-printable/i.test(raw)) {
    const joined = text.replace(/=\r?\n/g, "");
    const bytes: number[] = [];
    for (let i = 0; i < joined.length; i++) {
      const hex = joined.slice(i + 1, i + 3);
      if (joined[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
      } else bytes.push(...new TextEncoder().encode(joined[i]));
    }
    text = new TextDecoder().decode(new Uint8Array(bytes));
  }
  const doc = new DOMParser().parseFromString(text, "text/html");
  return doc.body?.textContent ?? text;
}

function findImport(clubId: string, raw: string): Match[] {
  const plain = emailToText(raw);
  const dates = findDates(plain);
  const rivals = mentionIndex.find(plain).filter((id) => id !== clubId);
  if (!dates.length) return [];
  const pad = (n: number) => String(n).padStart(2, "0");
  const found = new Map<string, Match>();
  for (const d of dates) {
    for (const m of clubMatches(clubId)) {
      const rival = m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId;
      if (rivals.length && !rivals.includes(rival)) continue;
      const ok =
        d.year !== null
          ? Math.abs(Date.parse(m.date) - Date.parse(`${d.year}-${pad(d.month)}-${pad(d.day)}`)) <= 86_400_000
          : rivals.length > 0 && m.date.slice(5) === `${pad(d.month)}-${pad(d.day)}`;
      if (ok) found.set(m.id, m);
    }
  }
  return [...found.values()].sort((a, b) => b.date.localeCompare(a.date));
}

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Correo de ejemplo armado con un partido real del club (de preferencia un clásico). */
function sampleEmail(clubId: string): string {
  const rivals = new Set(DATA.rivalries.flatMap((r) => (r.teamA === clubId ? [r.teamB] : r.teamB === clubId ? [r.teamA] : [])));
  const ms = clubMatches(clubId)
    .filter((m) => m.homeGoals !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const m = ms.find((x) => rivals.has(x.homeTeamId === clubId ? x.awayTeamId : x.homeTeamId)) ?? ms[0];
  if (!m) return "";
  const [y, mo, d] = m.date.split("-").map(Number);
  return [
    "PuntoTicket - Confirmación de compra (correo de ejemplo)",
    `Evento: ${m.homeTeamName} vs. ${m.awayTeamName}${m.stage ? ` - ${m.stage}` : ""}`,
    `Fecha: ${d} de ${MONTHS_ES[mo - 1]} de ${y}, 20:00 hrs`,
    "Cantidad: 1 entrada",
  ].join("\n");
}

document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-nav],[data-action]");
  if (!el) return;
  if (el.dataset.nav) {
    e.preventDefault();
    if (el.dataset.nav === "clubes") ui.clubDetail = null;
    go(el.dataset.nav as View);
    return;
  }
  const a = el.dataset.action;
  if (a === "pick") pickClub(el.dataset.club!);
  else if (a === "change-club") {
    saved.clubId = null;
    persist();
    go("inicio");
  } else if (a === "att") {
    const id = el.dataset.match!;
    const mode = el.dataset.mode!;
    if (mode === "ninguno") delete saved.attended[id];
    else saved.attended[id] = mode as AttendanceMode;
    persist();
    const group = el.parentElement!;
    group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
  } else if (a === "club") {
    ui.clubDetail = el.dataset.club || null;
    ui.view = "clubes";
    render();
    window.scrollTo({ top: 0 });
  } else if (a === "example") {
    const club = saved.clubId!;
    const ms = clubMatches(club).filter((m) => m.homeGoals !== null);
    const season = [...new Set(ms.map((m) => m.season))].sort((x, y) => y - x)[1] ?? ms[0]?.season;
    ms.filter((m) => m.season === season).slice(0, 10).forEach((m, i) => (saved.attended[m.id] = i === 3 ? "infiltrado" : "propia"));
    persist();
    render();
  } else if (a === "reset") {
    saved.attended = {};
    persist();
    render();
  } else if (a === "import-sample") {
    ui.importText = sampleEmail(saved.clubId!);
    ui.candidates = null;
    ui.importError = "";
    render();
  }
});

document.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.filter) {
    const k = el.dataset.filter as "season" | "competition" | "rival" | "onlyMine";
    if (k === "onlyMine") ui.onlyMine = el.checked;
    else ui[k] = el.value;
    render();
  } else if (el.dataset.action === "pick-select" && el.value) pickClub(el.value);
  else if (el.dataset.action === "name") {
    saved.name = el.value.replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 20);
    persist();
  } else if (el.dataset.action === "import-file" && el.files?.length) {
    Promise.all([...el.files].map((f) => f.text())).then((parts) => {
      ui.importText = parts.join("\n\n");
      ui.candidates = null;
      render();
    });
  }
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  if (form.dataset.form === "import") {
    ui.importText = (form.querySelector("#import-text") as HTMLTextAreaElement).value;
    ui.importError = "";
    ui.candidates = null;
    if (ui.importText.trim().length < 10) ui.importError = "Pega el correo de confirmación de tu compra o sube el archivo .eml.";
    else {
      const found = findImport(saved.clubId!, ui.importText);
      if (found.length) ui.candidates = found;
      else ui.importError = "No encontramos partidos de tu club con esas fechas. Revisa que el correo incluya la fecha del evento; por ahora la base cubre partidos hasta mediados de 2024.";
    }
    render();
  } else if (form.dataset.form === "import-confirm") {
    const mode = (form.querySelector("#import-mode") as HTMLSelectElement).value as AttendanceMode;
    form.querySelectorAll<HTMLInputElement>("input[name=matchId]:checked").forEach((i) => (saved.attended[i.value] = mode));
    persist();
    ui.candidates = null;
    ui.importText = "";
    go("carnet");
  }
});

render();
