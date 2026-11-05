"""Goleadores con nombre completo desde los anexos de temporada de es.wikipedia.org (Colo-Colo y U. de Chile, 2000-2001).

RSSSF solo da apellidos en 2000-2001; los anexos "Temporada AAAA del Club ..." de Wikipedia traen cada partido con sus
goleadores enlazados a su página (nombre completo) y los minutos. Aquí se lee ese formato y se cruza con la base y con RSSSF:

 - el partido debe existir en la base (equipos, fecha ±4 días y marcador iguales);
 - los goles de cada equipo deben sumar el marcador y todos los goleadores deben tener enlace (nombre completo);
 - los apellidos y la cantidad de goles por equipo deben coincidir con los de RSSSF (segunda fuente independiente).

Solo los partidos que pasan todo se escriben. Uso (desde la raíz del repo):
    python3 -I scripts/goals/wikipedia_annex.py --years 2000-2001 --out data/raw/goals_wiki
Wikipedia limita las descargas: se piden con pausa y quedan en data/raw/wikipedia/.
"""
import argparse
import csv
import html
import importlib.util
import json
import os
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from datetime import date

UA = "GaluchaStats-research/1.0 (galuchastats@gmail.com)"
CLUBS = {
    "colo-colo": "Club_Social_y_Deportivo_Colo-Colo",
    "universidad-de-chile": "Club_Universidad_de_Chile",
}
MONTHS = {m: i + 1 for i, m in enumerate("enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split())}
MONTHS["setiembre"] = 9

_spec = importlib.util.spec_from_file_location("rsssf_chile", os.path.join(os.path.dirname(os.path.abspath(__file__)), "rsssf_chile.py"))
rs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rs)
EXTRA = {
    "deportes puerto montt": "puerto-montt", "rangers de talca": "rangers", "club deportivo huachipato": "huachipato",
    "u. catolica": "universidad-catolica", "stgo. morning": "santiago-morning", "a. italiano": "audax-italiano",
    "coquimbo u.": "coquimbo-unido", "u. espanola": "union-espanola", "dep. concepcion": "deportes-concepcion",
    "prov. osorno": "provincial-osorno", "u. de chile": "universidad-de-chile", "san felipe": "union-san-felipe",
    "stgo. wanderers": "santiago-wanderers", "deportes temuco": "deportes-temuco", "dep. temuco": "deportes-temuco",
    "deportes concepcion": "deportes-concepcion", "o'higgins": "ohiggins", "club deportivo palestino": "palestino",
}


def page(club_slug, year, cache):
    title = f"Anexo:Temporada_{year}_del_{club_slug}"
    path = os.path.join(cache, f"{title.replace(':', '_')}.html")
    if not os.path.exists(path):
        os.makedirs(cache, exist_ok=True)
        time.sleep(7)  # Wikipedia responde 429 si se pide muy seguido
        req = urllib.request.Request("https://es.wikipedia.org/wiki/" + urllib.parse.quote(title, safe=":_-"), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            open(path, "wb").write(r.read())
    return open(path, encoding="utf8", errors="ignore").read()


def templates(h):
    """Plantillas de partido ('partido'/'partidos') incrustadas en el HTML renderizado (atributo data-mw)."""
    out = []
    for _, raw in re.findall(r'data-mw=(["\'])(.*?)\1', h, flags=re.S):
        try:
            d = json.loads(html.unescape(raw))
        except Exception:  # noqa: BLE001
            continue
        for part in d.get("parts", []):
            tpl = part.get("template") if isinstance(part, dict) else None
            if tpl and tpl["target"].get("wt", "").strip().lower() in ("partido", "partidos"):
                out.append({k: v.get("wt", "") for k, v in tpl.get("params", {}).items()})
    return out


def link_label(s):
    s = re.sub(r"<[^>]+>", "", s)
    m = re.search(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", s)
    return (m.group(2) or m.group(1)).strip() if m else s.strip()


def parse_goals(wt):
    """-> [(nombre_completo|None, minutos, penal, autogol)] por cada jugador listado."""
    out = []
    for item in re.split(r"<br\s*/?>", wt or ""):
        item = item.strip()
        if not item:
            continue
        m = re.search(r"\{\{\s*gol\s*\|([^}]*)\}\}", item, flags=re.I)
        params = [p.strip() for p in m.group(1).split("|")] if m else []
        mins = [p for p in params if re.fullmatch(r"\d{1,3}(\+\d+)?", p)]
        flags = " ".join(p.lower() for p in params if not re.fullmatch(r"\d{1,3}(\+\d+)?", p) and p)
        link = re.search(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", item)
        name = re.sub(r"\s*\(.*?\)\s*$", "", link.group(1)).strip() if link else None
        if "a.g" in flags or "og" in flags or "autogol" in flags:
            kind = "og"
        elif "pen" in flags:
            kind = "pen"
        else:
            kind = ""
        out.append((name, mins, kind == "pen", kind == "og"))
    return out


def words(s):
    return [w for w in re.sub(r"[.\-']", " ", rs.norm(s)).split() if len(w) > 1]


def surname(s):
    w = words(s)
    return w[-1] if w else ""


def same_scorers(wiki, ref):
    """¿Los goleadores de Wikipedia (nombre completo) y los de RSSSF (apellido, a veces con inicial) son los mismos?
    Cada apellido de RSSSF debe estar entre las palabras de un nombre de Wikipedia (con tolerancia a ortografía)."""
    from difflib import SequenceMatcher

    if len(wiki) != len(ref):
        return False
    pool = [words(n) for n in wiki]
    for r in ref:
        w = surname(r)
        hit = next((i for i, ws in enumerate(pool) if any(x == w or SequenceMatcher(None, x, w).ratio() >= 0.8 for x in ws)), None)
        if hit is None:
            return False
        pool.pop(hit)
    return True


# ---- RSSSF 2000/2001 (apellidos) -------------------------------------------------------------------------
TOKEN = re.compile(r"^(?:(?P<name>.+?)\s+)?(?P<min>\d{1,3}(?:\+\d+)?)(?:\s*-?\s*(?P<flag>pen|og))?$")


def rsssf_goals(text):
    goals, last = [], None
    for tok in [t.strip() for t in text.split(",") if t.strip()]:
        m = TOKEN.match(tok)
        if not m:
            return None
        if m.group("name"):
            last = m.group("name").strip()
        elif last is None:
            return None
        goals.append((last, m.group("flag") == "og"))
    return goals


def rsssf_matches(year, teams, cache):
    out = {}
    for d, home, away, hg, ag, gtxt in rs.parse_page(rs.fetch(f"{year % 100:02d}", os.path.join(os.path.dirname(cache), "rsssf")), year):
        h, a = teams.get(rs.norm(home)), teams.get(rs.norm(away))
        if not h or not a or not gtxt:
            continue
        gtxt = re.sub(r"\s+so:.*$", "", gtxt)
        if ";" in gtxt:
            left, right = gtxt.split(";", 1)
        elif ag == 0:
            left, right = gtxt, ""
        elif hg == 0:
            left, right = "", gtxt
        else:
            continue
        gl = rsssf_goals(left) if left.strip() else []
        gr = rsssf_goals(right) if right.strip() else []
        if gl is None or gr is None:
            continue
        out[(h, a, hg, ag, d)] = (gl, gr)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="data/galeriastats.db")
    ap.add_argument("--years", default="2000-2001")
    ap.add_argument("--out", default="data/raw/goals_wiki")
    ap.add_argument("--cache", default="data/raw/wikipedia")
    a = ap.parse_args()
    y0, _, y1 = a.years.partition("-")
    years = range(int(y0), int(y1 or y0) + 1)
    db = sqlite3.connect(a.db)
    teams = {rs.norm(n): i for i, n in db.execute("select id, name from teams")}
    teams.update({rs.norm(s): i for i, s in db.execute("select id, short_name from teams")})
    teams.update(rs.ALIASES)
    teams.update(EXTRA)
    existing = {}
    for r in db.execute("select id, date, home_team_id, away_team_id, home_goals, away_goals from matches where competition_id='primera-division' and home_goals is not null"):
        existing.setdefault((r[2], r[3], r[4], r[5]), []).append((r[1], r[0]))

    rows, report = [], []
    stats = {"plantillas": 0, "sin_base": 0, "sin_enlace": 0, "no_suma": 0, "sin_rsssf": 0, "rsssf_distinto": 0, "incluidos": 0}
    seen = set()
    for y in years:
        rsm = rsssf_matches(y, teams, a.cache)
        for club_id, slug in CLUBS.items():
            try:
                h = page(slug, y, a.cache)
            except Exception as e:  # noqa: BLE001
                print(f"{club_id} {y}: no se pudo leer ({e})")
                continue
            for p in templates(h):
                stats["plantillas"] += 1
                m = re.search(r"(\d{1,2}) de (\w+) de (\d{4})", p.get("fecha", ""))
                sc = re.findall(r"\d+", p.get("resultado", ""))
                if not m or len(sc) != 2 or m.group(2).lower() not in MONTHS:
                    continue
                d = date(int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1)))
                hid, vid = teams.get(rs.norm(link_label(p.get("local", "")))), teams.get(rs.norm(link_label(p.get("visita", ""))))
                hg, ag = int(sc[0]), int(sc[1])
                cands = [c for c in existing.get((hid, vid, hg, ag), []) if abs((date.fromisoformat(c[0]) - d).days) <= 4] if hid and vid else []
                if len(cands) != 1:
                    stats["sin_base"] += 1
                    continue
                mid, mdate = cands[0][1], cands[0][0]
                if mid in seen or hg + ag == 0:
                    continue
                gh, gv = parse_goals(p.get("goleslocal", "")), parse_goals(p.get("golesvisita", ""))
                if any(n is None for n, *_ in gh + gv):
                    stats["sin_enlace"] += 1
                    report.append(f"{mid}: hay goleadores sin enlace (nombre incompleto)")
                    continue
                flat_h = [(n, pen, og) for n, mins, pen, og in gh for _ in (mins or [None])]
                flat_v = [(n, pen, og) for n, mins, pen, og in gv for _ in (mins or [None])]
                if len(flat_h) != hg or len(flat_v) != ag:
                    stats["no_suma"] += 1
                    report.append(f"{mid}: los goles de Wikipedia no suman el marcador ({len(flat_h)}-{len(flat_v)} vs {hg}-{ag})")
                    continue
                # segunda fuente: RSSSF (apellidos y cantidad por equipo)
                ref = next((v for (h2, a2, g1, g2, d2), v in rsm.items() if (h2, a2, g1, g2) == (hid, vid, hg, ag) and abs((d2 - d).days) <= 4), None)
                if ref is None:
                    stats["sin_rsssf"] += 1
                    report.append(f"{mid}: RSSSF no lo tiene para contrastar")
                    continue
                ok = same_scorers([n for n, *_ in flat_h], [n for n, _ in ref[0]]) and same_scorers([n for n, *_ in flat_v], [n for n, _ in ref[1]])
                if not ok:
                    stats["rsssf_distinto"] += 1
                    report.append(f"{mid}: Wikipedia y RSSSF no coinciden (Wikipedia {[n for n, *_ in flat_h]} {[n for n, *_ in flat_v]} | RSSSF {[n for n, _ in ref[0]]} {[n for n, _ in ref[1]]})")
                    continue
                seen.add(mid)
                src = f"https://es.wikipedia.org/wiki/Anexo:Temporada_{y}_del_{slug} (contrastado con RSSSF chile{y % 100:02d})"
                for side, flat in ((hid, flat_h), (vid, flat_v)):
                    for name, pen, og in flat:
                        rows.append({"match_id": mid, "date": mdate, "home_team_id": hid, "away_team_id": vid, "scoring_team_id": side,
                                     "player": re.sub(r"\s+", " ", name), "minute": "", "own_goal": int(og), "penalty": int(pen), "source": src})
                stats["incluidos"] += 1
    os.makedirs(a.out, exist_ok=True)
    cols = ["match_id", "date", "home_team_id", "away_team_id", "scoring_team_id", "player", "minute", "own_goal", "penalty", "source"]
    with open(os.path.join(a.out, "goals.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    open(os.path.join(a.out, "report.txt"), "w").write("\n".join(report))
    print(stats)


if __name__ == "__main__":
    sys.exit(main())
