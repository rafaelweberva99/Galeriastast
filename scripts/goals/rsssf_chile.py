"""Goleadores de la Primera División de Chile desde las páginas de RSSSF (rsssf.org/tablesc/chileYY.html).

RSSSF lista cada partido con sus goleadores, p. ej.:

    Colo Colo                 6-4 Audax Italiano
      [Ivan Zamorano 38, 52, Gonzalo Fierro 54; Salvador Cabañas 9, 70pen]

(`pen` = penal, `og` = autogol: en RSSSF va en la lista del equipo beneficiado). Aquí se lee ese formato con
reglas fijas (nada de resúmenes de buscador), se cruza cada partido con la base por equipos, marcador y fecha
y solo se escribe un partido si los goles de cada equipo suman EXACTAMENTE su marcador.

Uso (desde la raíz del repo):
    python3 -I scripts/goals/rsssf_chile.py --years 2002-2005 --out data/raw/goals_rsssf
    python3 -I scripts/goals/rsssf_chile.py --years 2006-2009 --out data/raw/goals_rsssf_check   # validar contra ESPN

Las páginas se guardan en data/raw/rsssf/ (caché). RSSSF no tiene licencia abierta: conviene mostrar solo
nombre y cantidad de goles, y revisar sus términos antes de monetizar.
"""
import argparse
import csv
import html
import os
import re
import sqlite3
import sys
import unicodedata
import urllib.request
from datetime import date, timedelta

UA = "Mozilla/5.0 GaluchaStats-research"
URL = "https://rsssf.org/tablesc/chile{yy}.html"
MONTHS = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}

# Nombres de RSSSF -> id del equipo en la base (los que no coinciden por nombre).
ALIASES = {
    "colo colo": "colo-colo", "univ. catolica": "universidad-catolica", "u. catolica": "universidad-catolica",
    "universidad catolica": "universidad-catolica", "universidad de chile": "universidad-de-chile",
    "u. de chile": "universidad-de-chile", "universidad de concepcion": "universidad-de-concepcion",
    "u. de concepcion": "universidad-de-concepcion", "union espanola": "union-espanola",
    "union san felipe": "union-san-felipe", "u. san felipe": "union-san-felipe", "deportes temuco": "deportes-temuco",
    "dep. temuco": "deportes-temuco", "prov. osorno": "provincial-osorno", "provincial osorno": "provincial-osorno",
    "prov. curico unido": "curico-unido", "curico unido": "curico-unido", "dep. concepcion": "deportes-concepcion",
    "deportes concepcion": "deportes-concepcion", "dep. la serena": "la-serena",
    "deportes la serena": "la-serena", "dep. antofagasta": "deportes-antofagasta",
    "deportes antofagasta": "deportes-antofagasta", "dep. iquique": "deportes-iquique",
    "deportes iquique": "deportes-iquique", "dep. puerto montt": "puerto-montt", "puerto montt": "puerto-montt",
    "santiago wanderers": "santiago-wanderers", "s. wanderers": "santiago-wanderers", "ohiggins": "ohiggins",
    "o'higgins": "ohiggins", "coquimbo unido": "coquimbo-unido", "coquimbo u.": "coquimbo-unido",
    "audax italiano": "audax-italiano", "santiago morning": "santiago-morning", "huachipato": "huachipato",
    "cobreloa": "cobreloa", "cobresal": "cobresal", "everton": "everton", "palestino": "palestino",
    "rangers": "rangers", "melipilla": "melipilla", "dep. melipilla": "melipilla",
    "san marcos de arica": "san-marcos-de-arica", "lota schwager": "lota-schwager", "fernandez vial": "fernandez-vial",
    "provincial osorno": "provincial-osorno", "deportes copiapo": "deportes-copiapo", "dep. copiapo": "deportes-copiapo",
    "union la calera": "union-la-calera", "u. la calera": "union-la-calera", "ñublense": "nublense", "nublense": "nublense",
    "deportes melipilla": "melipilla", "stgo. morning": "santiago-morning", "stgo. wanderers": "santiago-wanderers",
    "univ. de chile": "universidad-de-chile", "univ. de concepcion": "universidad-de-concepcion", "univ. catolica": "universidad-catolica",
    "u. espanola": "union-espanola", "d. antofagasta": "deportes-antofagasta", "d. concepcion": "deportes-concepcion", "dep. ovalle": "deportes-ovalle", "naval": "naval",
}


def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s.lower().replace("’", "'")).strip()


def fetch(yy, cache):
    path = os.path.join(cache, f"chile{yy}.html")
    if not os.path.exists(path):
        os.makedirs(cache, exist_ok=True)
        req = urllib.request.Request(URL.format(yy=yy), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            open(path, "wb").write(r.read())
    raw = open(path, "rb").read().decode("latin-1")
    return html.unescape(re.sub(r"<[^>]+>", "", raw))


TOKEN = re.compile(r"^(?:(?P<name>.+?)\s+)?(?P<min>\d{1,3}(?:\+\d+)?)(?P<flag>pen|og)?$")


def parse_goals(text):
    """'Joel Soto 19pen, 42, Victor Fuentes 45og' -> [(jugador, penal, autogol)]; None si no se entiende."""
    goals, last = [], None
    for tok in [t.strip() for t in text.split(",") if t.strip()]:
        m = TOKEN.match(tok)
        if not m:
            return None
        name = m.group("name")
        if name:
            last = re.sub(r"\s+", " ", name).strip()
        elif last is None:
            return None
        goals.append((last, m.group("flag") == "pen", m.group("flag") == "og"))
    return goals


def parse_page(text, year):
    """Genera (fecha, local, visita, goles_local, goles_visita, texto_goles|None) por cada partido de la página."""
    lines = text.split("\n")
    cur = None
    out = []
    i = 0
    match_re = re.compile(r"^\s*(.+?)\s{2,}(\d+)-(\d+)\s+(.+?)\s*(?:\[[^\]]*\])?\s*$")
    while i < len(lines):
        line = lines[i]
        d = re.match(r"^\s*\[([A-Z][a-z]{2})\s+(\d{1,2})(?:[,\s].*)?\]\s*$", line)
        if d and d.group(1) in MONTHS:
            cur = date(year, MONTHS[d.group(1)], int(d.group(2)))
            i += 1
            continue
        m = match_re.match(line)
        if m and cur and not line.strip().startswith("["):
            goals = None
            j = i + 1
            if j < len(lines) and lines[j].strip().startswith("["):
                buf = lines[j].strip()
                while "]" not in buf and j + 1 < len(lines):
                    j += 1
                    buf += " " + lines[j].strip()
                goals = buf[1 : buf.index("]")] if "]" in buf else None
                i = j
            out.append((cur, m.group(1).strip(), m.group(4).strip(), int(m.group(2)), int(m.group(3)), goals))
        i += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="data/galeriastats.db")
    ap.add_argument("--years", default="2002-2005")
    ap.add_argument("--out", default="data/raw/goals_rsssf")
    ap.add_argument("--cache", default="data/raw/rsssf")
    a = ap.parse_args()
    y0, _, y1 = a.years.partition("-")
    years = range(int(y0), int(y1 or y0) + 1)

    db = sqlite3.connect(a.db)
    teams = {norm(n): i for i, n in db.execute("select id, name from teams")}
    teams.update({norm(s): i for i, s in db.execute("select id, short_name from teams")})
    teams.update(ALIASES)
    existing = {}
    for r in db.execute("select id, date, home_team_id, away_team_id, home_goals, away_goals from matches "
                        "where competition_id='primera-division' and home_goals is not null"):
        existing.setdefault((r[2], r[3], r[4], r[5]), []).append((r[1], r[0]))

    os.makedirs(a.out, exist_ok=True)
    rows, report = [], []
    unknown = {}
    seen_ids, dropped = set(), set()
    stats = {"partidos": 0, "sin_base": 0, "sin_goles": 0, "no_suma": 0, "incluidos": 0, "apellido_solo": 0}
    for y in years:
        try:
            text = fetch(f"{y % 100:02d}", a.cache)
        except Exception as e:  # noqa: BLE001
            print(f"{y}: no se pudo leer ({e})")
            continue
        for d, home, away, hg, ag, gtxt in parse_page(text, y):
            stats["partidos"] += 1
            h, v = teams.get(norm(home)), teams.get(norm(away))
            for n, t in ((home, h), (away, v)):
                if t is None:
                    unknown[n] = unknown.get(n, 0) + 1
            if not h or not v:
                stats["sin_base"] += 1
                continue
            cands = existing.get((h, v, hg, ag), [])
            cands = [c for c in cands if abs((date.fromisoformat(c[0]) - d).days) <= 4]
            if len(cands) != 1:
                stats["sin_base"] += 1
                report.append(f"{d} {home} {hg}-{ag} {away}: {'sin partido en la base' if not cands else 'varios candidatos'}")
                continue
            mid = cands[0][1]
            if hg + ag == 0:
                continue
            if not gtxt:
                stats["sin_goles"] += 1
                continue
            if ";" in gtxt:
                left, right = gtxt.split(";", 1)
            elif ag == 0:
                left, right = gtxt, ""
            elif hg == 0:
                left, right = "", gtxt
            else:
                stats["no_suma"] += 1
                report.append(f"{mid}: no se sabe de qué equipo es cada gol")
                continue
            gh = parse_goals(left) if left.strip() else []
            ga = parse_goals(right) if right.strip() else []
            if gh is None or ga is None or len(gh) != hg or len(ga) != ag:
                stats["no_suma"] += 1
                report.append(f"{mid}: los goles no suman el marcador ({gtxt[:60]})")
                continue
            if any(" " not in p for p, _, _ in gh + ga):
                stats["apellido_solo"] += 1
                report.append(f"{mid}: nombre de una sola palabra ({gtxt[:60]})")
                continue
            if mid in seen_ids:  # el mismo partido aparece en dos secciones (p. ej. liguillas): ambiguo, se descarta
                rows = [r for r in rows if r["match_id"] != mid]
                dropped.add(mid)
                report.append(f"{mid}: aparece más de una vez en RSSSF")
                continue
            if mid in dropped:
                continue
            seen_ids.add(mid)
            for side, goals in ((h, gh), (v, ga)):
                for player, pen, og in goals:
                    rows.append({"match_id": mid, "date": cands[0][0], "home_team_id": h, "away_team_id": v,
                                 "scoring_team_id": side, "player": player, "minute": "", "own_goal": int(og),
                                 "penalty": int(pen), "source": f"https://rsssf.org/tablesc/chile{y % 100:02d}.html"})
            stats["incluidos"] += 1
    cols = ["match_id", "date", "home_team_id", "away_team_id", "scoring_team_id", "player", "minute", "own_goal", "penalty", "source"]
    with open(os.path.join(a.out, "goals.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    open(os.path.join(a.out, "report.txt"), "w").write("\n".join(report))
    print(stats)
    if unknown:
        print("equipos sin id (agrégalos a ALIASES):", sorted(unknown.items(), key=lambda x: -x[1])[:15])


if __name__ == "__main__":
    sys.exit(main())
