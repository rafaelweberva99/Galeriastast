#!/usr/bin/env python3
"""
update_weekly.py - Actualización semanal de resultados y goleadores (fuente: ESPN).

Qué hace:
  1. Busca en data/matches/2024-2026.csv los partidos YA JUGADOS (fecha <= hoy) sin marcador.
  2. Los busca en ESPN (liga, Copa Chile, Libertadores, Sudamericana) y completa home_goals/away_goals
     (y penales si hubo tanda). Solo toma partidos terminados.
  3. Agrega a data/goals/goals.csv los goleadores de esos partidos, SOLO si la suma de goles de cada equipo
     calza con el marcador. El nombre se alinea con la grafía que ya existe en la base (tildes, nombre completo).

Uso (desde la raíz del repo, con una base ya ingerida para conocer los nombres de los clubes):
    DATABASE_PATH=/tmp/base.db npm run data:ingest
    python3 -I scripts/update_weekly.py --db /tmp/base.db            # simulacro: solo informa
    python3 -I scripts/update_weekly.py --db /tmp/base.db --apply    # escribe los CSV

Opciones: --since N (días hacia atrás, por defecto 21), --matches y --goals (rutas de los CSV).
Solo usa la biblioteca estándar de Python.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import importlib.util
import io
import json
import os
import re
import sys
import tempfile
import unicodedata
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("fetch_goals", os.path.join(HERE, "goals", "fetch_goals.py"))
fg = importlib.util.module_from_spec(spec)
sys.modules["fetch_goals"] = fg
spec.loader.exec_module(fg)


def strip(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn").strip()


def read_csv(path):
    raw = open(path, "rb").read().decode("utf-8")
    crlf = "\r\n" in raw
    rows = list(csv.reader(io.StringIO(raw, newline="")))
    return rows, crlf


def write_csv(path, rows, crlf):
    with open(path, "w", newline="", encoding="utf-8") as f:
        csv.writer(f, lineterminator="\r\n" if crlf else "\n").writerows(rows)


def name_index(goals_path, players_path):
    """Grafía preferida de cada nombre (sin tildes/mayúsculas) según lo que ya hay en la base."""
    alias = {}
    if os.path.exists(players_path):
        for r in csv.DictReader(open(players_path, encoding="utf-8", newline="")):
            alias[r["player"]] = r["canonical_name"]
    freq = Counter()
    for r in csv.reader(open(goals_path, encoding="utf-8", newline="")):
        if len(r) > 5 and r[5] != "player":
            freq[alias.get(r[5], r[5])] += 1
    best = {}
    for name, n in freq.items():
        k = strip(name)
        if k not in best or n > freq[best[k]]:
            best[k] = name
    return alias, best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True, help="base SQLite ya ingerida (para los nombres de los clubes)")
    ap.add_argument("--matches", default="data/matches/2024-2026.csv")
    ap.add_argument("--goals", default="data/goals/goals.csv")
    ap.add_argument("--players", default="data/goals/players.csv")
    ap.add_argument("--catalog", default="data/catalog/teams.json")
    ap.add_argument("--since", type=int, default=21)
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    today = dt.date.today()
    first = today - dt.timedelta(days=a.since)
    rows, crlf = read_csv(a.matches)
    hdr = rows[0]
    ix = {k: i for i, k in enumerate(hdr)}
    teams, _ = fg.load_db(a.db)
    names = fg.team_names(teams, fg.load_catalog_aliases(a.catalog), {})

    targets = []
    for i, r in enumerate(rows[1:], start=1):
        if len(r) < len(hdr):
            continue
        d = r[ix["date"]]
        if not d or not (first.isoformat() <= d <= today.isoformat()):
            continue
        if r[ix["home_goals"]] != "" or r[ix["competition_id"]] not in fg.ESPN_LEAGUE:
            continue
        targets.append(i)
    print(f"Partidos jugados sin marcador (últimos {a.since} días): {len(targets)}")

    http = fg.Http(tempfile.mkdtemp(prefix="espn-"), offline=False, delay=0.4)
    alias, best = name_index(a.goals, a.players)
    existing_goal_matches = {r[0] for r in csv.reader(open(a.goals, encoding="utf-8", newline=""))}
    new_goals, report = [], {"resultado": [], "con_goles": [], "sin_goles": [], "pendientes": []}

    for i in targets:
        r = rows[i]
        d, comp = r[ix["date"]], r[ix["competition_id"]]
        home, away = r[ix["home"]], r[ix["away"]]
        mid = f"{d}_{home}_{away}"
        league = fg.ESPN_LEAGUE[comp]
        day = dt.date.fromisoformat(d)
        found = None
        for off in (0, 1, -1):  # ESPN usa UTC: un partido nocturno puede salir al día siguiente
            body = http.get(fg.ESPN_SCOREBOARD.format(league=league, ymd=(day + dt.timedelta(days=off)).strftime("%Y%m%d")))
            if not body:
                continue
            try:
                events = json.loads(body).get("events", [])
            except ValueError:
                continue
            for ev in events:
                c0 = (ev.get("competitions") or [{}])[0]
                comps = c0.get("competitors") or []
                h = next((c for c in comps if c.get("homeAway") == "home"), None)
                w = next((c for c in comps if c.get("homeAway") == "away"), None)
                if not h or not w:
                    continue
                st = ((c0.get("status") or ev.get("status") or {}).get("type") or {})
                if not st.get("completed"):
                    continue
                nm = lambda c: (c.get("team") or {}).get("displayName") or (c.get("team") or {}).get("name") or ""
                s = min(fg.best_team_score(home, nm(h), names), fg.best_team_score(away, nm(w), names))
                if s >= 0.6 and (found is None or s > found[0]):
                    found = (s, ev, c0, h, w)
        if not found:
            report["pendientes"].append(mid)
            continue
        _, ev, c0, h, w = found
        try:
            hg, ag = int(h.get("score")), int(w.get("score"))
        except (TypeError, ValueError):
            report["pendientes"].append(mid)
            continue
        url = fg.ESPN_PUBLIC_URL.format(event=ev.get("id"))
        r[ix["home_goals"]], r[ix["away_goals"]] = str(hg), str(ag)
        so_h, so_a = h.get("shootoutScore"), w.get("shootoutScore")
        if so_h is not None and so_a is not None and "home_pens" in ix:
            r[ix["home_pens"]], r[ix["away_pens"]] = str(int(so_h)), str(int(so_a))
        r[ix["source"]] = (r[ix["source"]] + " ; " if r[ix["source"]] else "") + f"resultado y goles: {url}"
        report["resultado"].append(f"{mid} {hg}-{ag}")

        if mid in existing_goal_matches or hg + ag == 0:
            continue
        side = {str((h.get("team") or {}).get("id")): "home", str((w.get("team") or {}).get("id")): "away"}
        goals = fg.espn_goals_from_details(c0.get("details"), side)
        if not goals:
            sb = http.get(fg.ESPN_SUMMARY.format(league=league, event=ev.get("id")))
            if sb:
                try:
                    sj = json.loads(sb)
                    hc = ((sj.get("header") or {}).get("competitions") or [{}])[0]
                    goals = fg.espn_goals_from_details(hc.get("details"), side) or fg.espn_goals_from_keyevents(sj.get("keyEvents"), side)
                except ValueError:
                    goals = []
        m = {"home_goals": hg, "away_goals": ag}
        res = fg.check_result(m, {"goals": goals})
        # un mismo gol repetido por ESPN (mismo jugador, minuto ±1): se descarta el duplicado
        if not res["ok"]:
            dedup, seen = [], []
            for g in res["goals"] or goals:
                dupe = any(g["player"] == p["player"] and g["side"] == p["side"] and str(g["minute"]).isdigit() and str(p["minute"]).isdigit() and abs(int(g["minute"]) - int(p["minute"])) <= 1 for p in seen)
                if not dupe:
                    dedup.append(g); seen.append(g)
            res2 = fg.check_result(m, {"goals": dedup})
            if res2["ok"]:
                res = res2
        if not res["ok"] or any(not g["player"] for g in res["goals"]):
            report["sin_goles"].append(f"{mid} ({res.get('note') or 'goleadores incompletos'})")
            continue
        for g in sorted(res["goals"], key=lambda g: int(g["minute"]) if str(g["minute"]).isdigit() else 999):
            name = alias.get(g["player"], g["player"])
            name = best.get(strip(name), name)
            new_goals.append([mid, d, home, away, home if g["side"] == "home" else away, name, g["minute"], g["own_goal"], g["penalty"], url])
        report["con_goles"].append(f"{mid} ({len(res['goals'])} goles)")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if a.apply:
        write_csv(a.matches, rows, crlf)
        if new_goals:
            grows, gcrlf = read_csv(a.goals)
            write_csv(a.goals, grows + [[str(x) for x in g] for g in new_goals], gcrlf)
        print(f"Escrito: {len(report['resultado'])} resultados, {len(new_goals)} goles.")
    else:
        print("Simulacro (usa --apply para escribir).")


if __name__ == "__main__":
    sys.exit(main())
