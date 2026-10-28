#!/usr/bin/env python3
"""
fetch_goals.py - Goleadores por partido para GaleriaStats.

Descarga los goles (jugador, minuto, penal, autogol) de cada partido de la tabla
`matches` y genera:

  goals.csv     match_id,date,home_team_id,away_team_id,scoring_team_id,player,minute,own_goal,penalty,source
  players.csv   player,canonical_name,notes
  coverage.csv  season,competition_id,matches_in_db,matches_with_goals,matches_complete
  mismatches.csv  partidos donde la suma de goles por equipo != marcador de la base

Fuentes (backends), en orden de preferencia (--backends):

  espn  API JSON publica de ESPN (site.api.espn.com/apis/site/v2/sports/soccer/<liga>/scoreboard).
        Ligas: chi.1 (Primera Division), chi.copa_chi (Copa Chile), conmebol.libertadores.
        Cada partido trae `competitions[0].details[]` con scoringPlay/ownGoal/penaltyKick/shootout,
        minuto (clock.displayValue) y jugador (athletesInvolved). Cobertura observada: ~2005 en adelante.
  wfb   worldfootball.net: paginas /all_matches/<slug>/ (slugs de github.com/yorobot/worldfootball)
        y fichas /report/<slug>/ (tabla "goals"). Cubre 2003+. Se usa para lo que ESPN no cubra.
  manual  archivo CSV de goles curados a mano (--manual), mismas columnas que goals.csv.

Solo se emiten goles de partidos que existen en la base. Los goles de tanda de penales se excluyen.
Para autogoles, scoring_team_id es el equipo BENEFICIADO y player es quien lo hizo en contra.

Todas las respuestas HTTP se guardan en --cache (reproducible; --offline usa solo el cache).

Uso:
  python3 -I fetch_goals.py --db data/galeriastats.db --out out/ [--backends espn,wfb] \
      [--seasons 2003-2024] [--competitions primera-division,copa-chile] [--priority] [--offline]

Solo usa la biblioteca estandar de Python (>=3.9).
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import difflib
import gzip
import hashlib
import html
import json
import os
import re
import sqlite3
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

UA = "Mozilla/5.0 (X11; Linux x86_64) GaleriaStats-goals/1.0 (+https://github.com/rafaelweberva99/galeriastast)"

ESPN_LEAGUE = {
    "primera-division": "chi.1",
    "copa-chile": "chi.copa_chi",
    "copa-libertadores": "conmebol.libertadores",
}
ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard?dates={ymd}&limit=200"
ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/summary?event={event}"
ESPN_PUBLIC_URL = "https://www.espn.com/soccer/match/_/gameId/{event}"

WFB_BASE = "https://www.worldfootball.net"
WFB_SLUGS = "https://raw.githubusercontent.com/yorobot/worldfootball/master/slugs/{code}.csv"
WFB_CODE = {"primera-division": "cl.1", "copa-chile": "cl.cup"}

PRIORITY_TEAMS = {"colo-colo", "universidad-de-chile", "universidad-catolica"}

GOAL_FIELDS = ["match_id", "date", "home_team_id", "away_team_id", "scoring_team_id",
               "player", "minute", "own_goal", "penalty", "source"]


# --------------------------------------------------------------------------- utilidades

def log(*a):
    print(*a, file=sys.stderr, flush=True)


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


STOP = {"club", "cd", "csd", "cf", "fc", "sc", "sad", "ss", "de", "del", "la", "el", "deportes", "deportivo",
        "social", "y", "anfp", "chi", "chile", "the"}


def norm_team(s: str) -> str:
    s = strip_accents(s).lower().replace("'", "").replace("’", "")
    s = re.sub(r"\((chi|chl|[a-z]{3})\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\buniv\b|\bu\b", "universidad", s)
    s = re.sub(r"\bcatolica\b", "catolica", s)
    toks = [t for t in s.split() if t not in STOP]
    return " ".join(toks)


def team_sim(a: str, b: str) -> float:
    na, nb = norm_team(a), norm_team(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    ta, tb = set(na.split()), set(nb.split())
    jac = len(ta & tb) / len(ta | tb)
    rat = difflib.SequenceMatcher(None, na, nb).ratio()
    contained = 0.9 if (na in nb or nb in na) else 0.0
    return max(jac, rat, contained)


def parse_minute(text: str) -> str:
    """'45'+2'' -> 45 ; '90+3' -> 90 ; '105'' -> 105 ; '23.' -> 23. Vacio si no hay numero."""
    if not text:
        return ""
    m = re.search(r"(\d{1,3})", str(text))
    if not m:
        return ""
    v = int(m.group(1))
    return str(v) if 0 < v <= 130 else ""


# --------------------------------------------------------------------------- HTTP con cache

class Http:
    def __init__(self, cache_dir: str, offline: bool, delay: float):
        self.cache_dir = cache_dir
        self.offline = offline
        self.delay = delay
        self.last = 0.0
        self.errors = Counter()
        self.host_fail = Counter()   # fallos de conexion consecutivos por host
        self.dead_hosts = set()
        os.makedirs(cache_dir, exist_ok=True)

    def _path(self, url: str) -> str:
        h = hashlib.sha1(url.encode()).hexdigest()
        return os.path.join(self.cache_dir, h[:2], h + ".gz")

    def get(self, url: str) -> str | None:
        p = self._path(url)
        if os.path.exists(p):
            with gzip.open(p, "rt", encoding="utf-8") as f:
                body = f.read()
            return None if body == "\x00404" else body
        host = urllib.parse.urlparse(url).netloc
        if self.offline or host in self.dead_hosts:
            return None
        wait = self.delay - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en,es;q=0.8"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    raw = r.read()
                    if r.headers.get("Content-Encoding") == "gzip":
                        raw = gzip.decompress(raw)
                    body = raw.decode(r.headers.get_content_charset() or "utf-8", "replace")
                self.last = time.time()
                self.host_fail[host] = 0
                break
            except urllib.error.HTTPError as e:
                self.last = time.time()
                if e.code == 404:
                    body = "\x00404"
                    break
                self.errors[f"HTTP {e.code}"] += 1
                if e.code in (403, 407, 429):
                    self.host_fail[host] += 1
                    if self.host_fail[host] >= 5:
                        log(f"  ! host {host} responde {e.code} repetidamente; se omite")
                        self.dead_hosts.add(host)
                        return None
                if attempt == 2:
                    log(f"  ! {e.code} {url}")
                    return None
                time.sleep(2 * (attempt + 1))
            except Exception as e:  # DNS, proxy, timeout
                self.errors[type(e).__name__] += 1
                self.host_fail[host] += 1
                if self.host_fail[host] >= 5:
                    log(f"  ! host {host} inalcanzable ({e}); se omite el resto de sus URLs")
                    self.dead_hosts.add(host)
                    return None
                if attempt == 2:
                    log(f"  ! {type(e).__name__}: {e} {url}")
                    return None
                time.sleep(2 * (attempt + 1))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with gzip.open(p, "wt", encoding="utf-8") as f:
            f.write(body)
        return None if body == "\x00404" else body


# --------------------------------------------------------------------------- base de datos

def load_db(db_path: str):
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    teams = {r["id"]: dict(r) for r in con.execute("SELECT id, name, short_name FROM teams")}
    matches = [dict(r) for r in con.execute(
        "SELECT id, date, season, competition_id, tournament, stage, home_team_id, away_team_id, "
        "home_goals, away_goals, is_final, source_ref FROM matches ORDER BY date, id")]
    con.close()
    return teams, matches


def team_names(teams, catalog_aliases, raw_aliases):
    """id -> conjunto de nombres conocidos (base + catalogo + nombres tal como aparecen en wfb)."""
    names = defaultdict(set)
    for tid, t in teams.items():
        names[tid].update({t["name"], t["short_name"], tid.replace("-", " ")})
    for tid, al in catalog_aliases.items():
        names[tid].update(al)
    for tid, al in raw_aliases.items():
        names[tid].update(al)
    return names


def load_catalog_aliases(path: str | None):
    out = defaultdict(set)
    if path and os.path.exists(path):
        for t in json.load(open(path, encoding="utf-8")):
            out[t["id"]].update([t.get("name", ""), t.get("short", "")] + list(t.get("aliases", [])))
    return out


FBTXT_LINE = re.compile(r"^\s*(?:\d{1,2}[.:]\d{2}\s+)?(.+?)\s{2,}(?:\d+-\d+.*?|v)\s{2,}(.+?)\s*$")


def load_raw_aliases(raw_dir: str | None, matches):
    """Usa source_ref (archivo#Llinea) para saber como escribe worldfootball cada club."""
    out = defaultdict(set)
    if not raw_dir or not os.path.isdir(raw_dir):
        return out
    cache = {}
    for m in matches:
        ref = m.get("source_ref") or ""
        mm = re.match(r"(.+)#L(\d+)$", ref)
        if not mm:
            continue
        fn, ln = mm.group(1), int(mm.group(2))
        if fn not in cache:
            p = os.path.join(raw_dir, fn)
            cache[fn] = open(p, encoding="utf-8").read().splitlines() if os.path.exists(p) else []
        lines = cache[fn]
        if 0 < ln <= len(lines):
            g = FBTXT_LINE.match(lines[ln - 1])
            if g:
                out[m["home_team_id"]].add(clean_spaces(g.group(1)))
                out[m["away_team_id"]].add(clean_spaces(re.sub(r"\s*\(.*$", "", g.group(2))))
    return out


def best_team_score(tid: str, name: str, names) -> float:
    return max((team_sim(n, name) for n in names.get(tid, ()) if n), default=0.0)


def pick_match(cands, home_name, away_name, hg, ag, names, min_sim=0.55):
    """Elige el partido de la base que corresponde a (home_name, away_name, hg, ag)."""
    best, best_s = None, 0.0
    for m in cands:
        s_h = best_team_score(m["home_team_id"], home_name, names)
        s_a = best_team_score(m["away_team_id"], away_name, names)
        s = min(s_h, s_a)
        if hg is not None and ag is not None and m["home_goals"] is not None:
            if (m["home_goals"], m["away_goals"]) == (hg, ag):
                s += 0.2
            else:
                s -= 0.3
        if s > best_s:
            best, best_s = m, s
    return best if best_s >= min_sim else None


# --------------------------------------------------------------------------- backend ESPN

def espn_goals_from_details(details, comp_by_team_id):
    goals = []
    for d in details or []:
        if not d.get("scoringPlay"):
            continue
        if d.get("shootout"):
            continue
        tid = str((d.get("team") or {}).get("id", ""))
        ath = d.get("athletesInvolved") or d.get("participants") or []
        player = ""
        if ath:
            a0 = ath[0].get("athlete", ath[0]) if isinstance(ath[0], dict) else {}
            player = a0.get("displayName") or a0.get("fullName") or a0.get("shortName") or ""
        clock = (d.get("clock") or {}).get("displayValue", "")
        goals.append({
            "side": comp_by_team_id.get(tid),
            "player": clean_spaces(player),
            "minute": parse_minute(clock),
            "own_goal": 1 if d.get("ownGoal") else 0,
            "penalty": 1 if d.get("penaltyKick") else 0,
        })
    return goals


def espn_goals_from_keyevents(key_events, comp_by_team_id):
    goals = []
    for e in key_events or []:
        typ = ((e.get("type") or {}).get("text") or "").lower()
        if not e.get("scoringPlay") and "goal" not in typ:
            continue
        if e.get("shootout") or "shootout" in typ:
            continue
        tid = str((e.get("team") or {}).get("id", ""))
        parts = e.get("participants") or []
        player = ""
        if parts:
            player = (parts[0].get("athlete") or {}).get("displayName", "")
        goals.append({
            "side": comp_by_team_id.get(tid),
            "player": clean_spaces(player),
            "minute": parse_minute((e.get("clock") or {}).get("displayValue", "")),
            "own_goal": 1 if ("own goal" in typ or e.get("ownGoal")) else 0,
            "penalty": 1 if ("penalty" in typ or e.get("penaltyKick")) else 0,
        })
    return goals


def run_espn(http, matches, names, results):
    by_comp_date = defaultdict(list)
    for m in matches:
        if m["competition_id"] in ESPN_LEAGUE:
            by_comp_date[(m["competition_id"], m["date"])].append(m)
    # ESPN fecha en UTC: un partido nocturno en Chile aparece al dia siguiente -> consultar d y d+1.
    queries = defaultdict(set)
    for (comp, d) in by_comp_date:
        day = dt.date.fromisoformat(d)
        for off in (0, 1, -1):
            queries[comp].add((day + dt.timedelta(days=off)).strftime("%Y%m%d"))
    total = sum(len(v) for v in queries.values())
    log(f"[espn] {total} consultas scoreboard")
    n = 0
    for comp, ymds in queries.items():
        league = ESPN_LEAGUE[comp]
        for ymd in sorted(ymds):
            n += 1
            if n % 200 == 0:
                log(f"[espn] {n}/{total}")
            body = http.get(ESPN_SCOREBOARD.format(league=league, ymd=ymd))
            if not body:
                continue
            try:
                data = json.loads(body)
            except ValueError:
                continue
            for ev in data.get("events", []):
                comp0 = (ev.get("competitions") or [{}])[0]
                comps = comp0.get("competitors") or []
                home = next((c for c in comps if c.get("homeAway") == "home"), None)
                away = next((c for c in comps if c.get("homeAway") == "away"), None)
                if not home or not away:
                    continue
                status = ((comp0.get("status") or ev.get("status") or {}).get("type") or {})
                if status and not status.get("completed", True):
                    continue

                def tname(c):
                    t = c.get("team") or {}
                    return t.get("displayName") or t.get("name") or t.get("shortDisplayName") or ""

                try:
                    hg, ag = int(home.get("score")), int(away.get("score"))
                except (TypeError, ValueError):
                    hg = ag = None
                ev_day = dt.datetime.strptime(ymd, "%Y%m%d").date()
                cands = []
                for off in (0, -1, 1):
                    cands += by_comp_date.get((comp, (ev_day + dt.timedelta(days=off)).isoformat()), [])
                m = pick_match(cands, tname(home), tname(away), hg, ag, names)
                if not m or m["id"] in results and results[m["id"]]["backend"] == "espn":
                    continue
                side = {str((home.get("team") or {}).get("id")): "home",
                        str((away.get("team") or {}).get("id")): "away"}
                goals = espn_goals_from_details(comp0.get("details"), side)
                event_id = ev.get("id")
                if (not goals and (hg or ag)) and event_id:
                    sbody = http.get(ESPN_SUMMARY.format(league=league, event=event_id))
                    if sbody:
                        try:
                            sj = json.loads(sbody)
                            hc = ((sj.get("header") or {}).get("competitions") or [{}])[0]
                            goals = espn_goals_from_details(hc.get("details"), side) or \
                                espn_goals_from_keyevents(sj.get("keyEvents"), side)
                        except ValueError:
                            pass
                results[m["id"]] = {"backend": "espn", "goals": goals,
                                    "source": ESPN_PUBLIC_URL.format(event=event_id),
                                    "src_score": (hg, ag)}


# --------------------------------------------------------------------------- backend worldfootball

def wfb_slugs(http, comp, season):
    if comp == "copa-libertadores":
        return [f"copa-libertadores-{season}"]
    code = WFB_CODE.get(comp)
    if not code:
        return []
    body = http.get(WFB_SLUGS.format(code=code))
    if not body:
        return []
    out = []
    for row in csv.DictReader(body.splitlines()):
        lab = row.get("season", "")
        years = [int(y) for y in re.findall(r"(?:19|20)\d{2}", lab)]
        # temporadas cruzadas 2013/2014.. 2016/2017 -> la base usa el anio de inicio o de fin segun
        # el torneo, asi que se aceptan ambos y luego se cruza por fecha.
        if season in years:
            out.append(row["slug"])
    return out


ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.I)
TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S | re.I)
TAG_RE = re.compile(r"<[^>]+>")


def text_of(s):
    return clean_spaces(html.unescape(TAG_RE.sub(" ", s)))


def wfb_schedule(body):
    """Filas (fecha, local, visita, hg, ag, report_path) de /all_matches/<slug>/."""
    out, cur_date = [], None
    for row in ROW_RE.findall(body):
        tds = TD_RE.findall(row)
        if len(tds) < 5:
            continue
        txts = [text_of(t) for t in tds]
        dm = re.search(r"(\d{2})/(\d{2})/(\d{4})", txts[0]) or re.search(r"(\d{2})\.(\d{2})\.(\d{4})", txts[0])
        if dm:
            cur_date = f"{dm.group(3)}-{dm.group(2)}-{dm.group(1)}"
        rep = re.search(r'href="(/(?:report|spielbericht)/[^"]+)"', row)
        team_links = re.findall(r'href="/(?:teams|teams)/[^"]+"[^>]*>(.*?)</a>', row, re.S)
        teams_txt = [text_of(t) for t in team_links if text_of(t)]
        res = re.search(r"(\d+)\s*:\s*(\d+)", text_of(rep and row[row.find(rep.group(1)):] or ""))
        if not rep or len(teams_txt) < 2 or not cur_date:
            continue
        hg, ag = (int(res.group(1)), int(res.group(2))) if res else (None, None)
        out.append((cur_date, teams_txt[0], teams_txt[1], hg, ag, rep.group(1)))
    return out


def wfb_report_goals(body):
    """Goles de una ficha /report/. El lado se deduce de la progresion del marcador (1:0 -> 1:1)."""
    # tabla cuyo encabezado es "goals" (o "Tore" en weltfussball.de)
    start = None
    for mt in re.finditer(r"<th[^>]*>\s*(goals|Tore)\s*</th>", body, re.I):
        start = mt.end()
        break
    if start is None:
        return None
    end = body.find("</table>", start)
    seg = body[start:end if end > 0 else None]
    goals, prev = [], (0, 0)
    for row in ROW_RE.findall(seg):
        tds = TD_RE.findall(row)
        if len(tds) < 2:
            continue
        sc = re.search(r"(\d+)\s*:\s*(\d+)", text_of(tds[0]))
        if not sc:
            continue  # "none" / sin goles
        cur = (int(sc.group(1)), int(sc.group(2)))
        if cur[0] == prev[0] + 1 and cur[1] == prev[1]:
            side = "home"
        elif cur[1] == prev[1] + 1 and cur[0] == prev[0]:
            side = "away"
        else:
            side = None
        prev = cur
        cell = tds[1]
        a = re.search(r"<a[^>]*title=\"([^\"]+)\"[^>]*>", cell) or re.search(r"<a[^>]*>(.*?)</a>", cell, re.S)
        player = text_of(a.group(1)) if a else text_of(cell).split(" ")[0]
        t = text_of(cell)
        after = t[t.find(player) + len(player):] if player in t else t
        mm = re.search(r"(\d{1,3})\s*\.", after)
        low = t.lower()
        goals.append({
            "side": side,
            "player": clean_spaces(player),
            "minute": parse_minute(mm.group(1)) if mm else "",
            "own_goal": 1 if ("own goal" in low or "eigentor" in low) else 0,
            "penalty": 1 if ("penalty" in low or "elfmeter" in low) else 0,
        })
    return goals


def run_wfb(http, matches, names, results, only_missing=True):
    by_cs = defaultdict(list)
    for m in matches:
        by_cs[(m["competition_id"], m["season"])].append(m)
    by_date = defaultdict(list)
    for m in matches:
        by_date[(m["competition_id"], m["date"])].append(m)
    for (comp, season), ms in sorted(by_cs.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        todo = [m for m in ms if not (only_missing and m["id"] in results and results[m["id"]]["ok"])]
        if not todo:
            continue
        todo_ids = {m["id"] for m in todo}
        slugs = wfb_slugs(http, comp, season)
        log(f"[wfb] {comp} {season}: {len(todo)} pendientes, slugs={slugs}")
        for slug in slugs:
            body = http.get(f"{WFB_BASE}/all_matches/{slug}/")
            if not body:
                continue
            for (d, hn, an, hg, ag, rep) in wfb_schedule(body):
                day = dt.date.fromisoformat(d)
                cands = []
                for off in (0, -1, 1):
                    cands += by_date.get((comp, (day + dt.timedelta(days=off)).isoformat()), [])
                m = pick_match(cands, hn, an, hg, ag, names)
                if not m or m["id"] not in todo_ids:
                    continue
                rbody = http.get(WFB_BASE + rep)
                if not rbody:
                    continue
                goals = wfb_report_goals(rbody)
                if goals is None:
                    continue
                prev = results.get(m["id"])
                cand = {"backend": "wfb", "goals": goals, "source": WFB_BASE + rep, "src_score": (hg, ag)}
                check_result(m, cand)
                if not prev or (cand["ok"] and not prev.get("ok")):
                    results[m["id"]] = cand


# --------------------------------------------------------------------------- manual

def run_manual(path, matches, results):
    if not path or not os.path.exists(path):
        return
    ids = {m["id"]: m for m in matches}
    grouped = defaultdict(list)
    src = {}
    for r in csv.DictReader(open(path, encoding="utf-8")):
        if r["match_id"] not in ids:
            continue
        m = ids[r["match_id"]]
        side = "home" if r["scoring_team_id"] == m["home_team_id"] else (
            "away" if r["scoring_team_id"] == m["away_team_id"] else None)
        grouped[r["match_id"]].append({"side": side, "player": clean_spaces(r["player"]),
                                       "minute": r.get("minute", ""), "own_goal": int(r.get("own_goal") or 0),
                                       "penalty": int(r.get("penalty") or 0)})
        src[r["match_id"]] = r.get("source", "manual")
    for mid, goals in grouped.items():
        cand = {"backend": "manual", "goals": goals, "source": src[mid], "src_score": (None, None)}
        check_result(ids[mid], cand)
        if mid not in results or not results[mid].get("ok") or cand["ok"]:
            results[mid] = cand


# --------------------------------------------------------------------------- validacion

def tally(goals):
    c = Counter(g["side"] for g in goals)
    return c.get("home", 0), c.get("away", 0)


def check_result(m, res):
    """Valida suma de goles vs marcador. Si solo cuadra invirtiendo el lado de los autogoles
    (convenciones distintas entre fuentes) se invierte y se anota."""
    goals = res["goals"]
    res["note"] = ""
    if m["home_goals"] is None:
        res["ok"] = False
        return res
    target = (m["home_goals"], m["away_goals"])
    if any(g["side"] is None for g in goals):
        res["ok"] = False
        res["note"] = "lado de gol desconocido"
        return res
    if tally(goals) == target:
        res["ok"] = True
        return res
    og = [g for g in goals if g["own_goal"]]
    if og:
        flipped = [dict(g, side=("away" if g["side"] == "home" else "home")) if g["own_goal"] else g for g in goals]
        if tally(flipped) == target:
            res["goals"] = flipped
            res["ok"] = True
            res["note"] = "autogoles reasignados al beneficiado"
            return res
    res["ok"] = False
    h, a = tally(goals)
    res["note"] = f"fuente {h}-{a} vs base {target[0]}-{target[1]}"
    return res


# --------------------------------------------------------------------------- jugadores

def player_key(name):
    return re.sub(r"[^a-z ]", "", strip_accents(name).lower()).strip()


def canonicalize_players(goal_rows):
    """Une variantes: mayusculas/acentos, 'H. Suazo' ~ 'Humberto Suazo' (misma inicial+apellido y
    al menos un club en comun). El canonico es la variante completa mas frecuente."""
    freq = Counter(r["player"] for r in goal_rows if r["player"])
    teams_of = defaultdict(set)
    for r in goal_rows:
        if r["player"]:
            # el club del jugador: en un autogol juega para el rival del beneficiado
            if r["own_goal"] == 1:
                club = r["away_team_id"] if r["scoring_team_id"] == r["home_team_id"] else r["home_team_id"]
            else:
                club = r["scoring_team_id"]
            teams_of[r["player"]].add(club)
    by_key = defaultdict(list)
    for p in freq:
        by_key[player_key(p)].append(p)
    # canonico por clave exacta
    canon = {}
    for k, ps in by_key.items():
        best = max(ps, key=lambda p: (freq[p], len(p)))
        for p in ps:
            canon[p] = best
    notes = {p: ("variante de mayusculas/acentos" if canon[p] != p else "") for p in freq}
    # abreviados "X. Apellido"
    full = [p for p in freq if not re.match(r"^[A-Z]\.\s", p) and len(p.split()) >= 2]
    for p in freq:
        m = re.match(r"^([A-ZÁÉÍÓÚÑ])\.\s*(.+)$", p)
        if not m:
            continue
        ini, sur = strip_accents(m.group(1)).lower(), player_key(m.group(2))
        cands = []
        for f in full:
            fk = player_key(f)
            if fk.endswith(" " + sur) and fk[0] == ini and teams_of[f] & teams_of[p]:
                cands.append(f)
        cands = sorted({canon[c] for c in cands}, key=lambda c: -freq[c])
        if len(cands) == 1:
            canon[p] = cands[0]
            notes[p] = "abreviatura unificada (misma inicial, apellido y club)"
        elif len(cands) > 1:
            notes[p] = "abreviatura ambigua: " + " | ".join(cands)
    return [(p, canon[p], notes[p]) for p in sorted(freq, key=lambda x: (canon[x], x))]


# --------------------------------------------------------------------------- main

def parse_seasons(s):
    if not s:
        return None
    out = set()
    for part in s.split(","):
        if "-" in part:
            a, b = part.split("-")
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(part))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default="data/galeriastats.db")
    ap.add_argument("--catalog", default="data/catalog/teams.json")
    ap.add_argument("--raw-dir", default="data/raw/wfb")
    ap.add_argument("--out", default="data/goals")
    ap.add_argument("--cache", default=None, help="por defecto <out>/cache")
    ap.add_argument("--backends", default="espn,wfb,manual")
    ap.add_argument("--manual", default=None, help="CSV de goles curados (columnas de goals.csv)")
    ap.add_argument("--seasons", default=None, help="ej. 2003-2024 o 2009,2011")
    ap.add_argument("--competitions", default="primera-division,copa-chile,copa-libertadores")
    ap.add_argument("--priority", action="store_true", help="solo Colo-Colo, U. de Chile, U. Catolica y finales")
    ap.add_argument("--offline", action="store_true", help="no descargar; usar solo el cache")
    ap.add_argument("--delay", type=float, default=1.0, help="segundos entre requests")
    a = ap.parse_args()

    out = a.out
    os.makedirs(out, exist_ok=True)
    http = Http(a.cache or os.path.join(out, "cache"), a.offline, a.delay)

    teams, matches = load_db(a.db)
    seasons = parse_seasons(a.seasons)
    comps = set(a.competitions.split(","))
    sel = [m for m in matches if m["competition_id"] in comps and (not seasons or m["season"] in seasons)]
    if a.priority:
        sel = [m for m in sel if m["is_final"] or {m["home_team_id"], m["away_team_id"]} & PRIORITY_TEAMS]
    names = team_names(teams, load_catalog_aliases(a.catalog), load_raw_aliases(a.raw_dir, matches))
    log(f"{len(sel)} partidos seleccionados de {len(matches)}")

    results = {}
    backends = a.backends.split(",")
    if "espn" in backends:
        run_espn(http, sel, names, results)
        for m in sel:
            if m["id"] in results:
                check_result(m, results[m["id"]])
    if "wfb" in backends:
        run_wfb(http, sel, names, results)
    if "manual" in backends:
        run_manual(a.manual, sel, results)

    by_id = {m["id"]: m for m in sel}
    rows = []
    for mid, res in results.items():
        m = by_id[mid]
        for g in sorted(res["goals"], key=lambda g: int(g["minute"]) if str(g["minute"]).isdigit() else 999):
            if g["side"] is None:
                continue
            rows.append({
                "match_id": mid, "date": m["date"], "home_team_id": m["home_team_id"],
                "away_team_id": m["away_team_id"],
                "scoring_team_id": m["home_team_id"] if g["side"] == "home" else m["away_team_id"],
                "player": g["player"], "minute": g["minute"], "own_goal": g["own_goal"],
                "penalty": g["penalty"], "source": res["source"],
            })
    rows.sort(key=lambda r: (r["date"], r["match_id"]))
    with open(os.path.join(out, "goals.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=GOAL_FIELDS)
        w.writeheader()
        w.writerows(rows)

    with open(os.path.join(out, "players.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["player", "canonical_name", "notes"])
        w.writerows(canonicalize_players(rows))

    # cobertura (sobre TODA la base, no solo la seleccion)
    cov = defaultdict(lambda: [0, 0, 0])
    for m in matches:
        k = (m["season"], m["competition_id"])
        cov[k][0] += 1
        r = results.get(m["id"])
        if r and r["goals"]:
            cov[k][1] += 1
        if r and r.get("ok"):
            cov[k][2] += 1
    with open(os.path.join(out, "coverage.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["season", "competition_id", "matches_in_db", "matches_with_goals", "matches_complete"])
        for (s, c), v in sorted(cov.items()):
            w.writerow([s, c, *v])

    with open(os.path.join(out, "mismatches.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["match_id", "db_score", "source_score", "goals_found", "backend", "note", "source"])
        for mid, r in sorted(results.items()):
            m = by_id[mid]
            if not r.get("ok"):
                h, aw = tally(r["goals"])
                w.writerow([mid, f"{m['home_goals']}-{m['away_goals']}", f"{h}-{aw}", len(r["goals"]),
                            r["backend"], r.get("note", ""), r["source"]])

    ok = sum(1 for r in results.values() if r.get("ok"))
    with_goals = sum(1 for r in results.values() if r["goals"])
    log(f"partidos con datos de fuente: {len(results)}  con goles: {with_goals}  completos (suma==marcador): {ok}")
    log(f"filas en goals.csv: {len(rows)}")
    if http.errors:
        log("errores de red:", dict(http.errors))
    return 0


if __name__ == "__main__":
    sys.exit(main())
