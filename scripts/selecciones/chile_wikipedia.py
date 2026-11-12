#!/usr/bin/env python3
"""
Partidos de la Selección chilena (1997 →) desde las páginas "Chile national football team results" de Wikipedia (en).
Cada partido trae fecha, estadio, rival, marcador, competición y los goleadores de Chile (solo los de Chile).

Uso (desde la raíz del repo):
    python3 -I scripts/selecciones/chile_wikipedia.py --cache /tmp/wp --out data/matches/seleccion-chilena.csv \
        --goals-out data/goals/goals-seleccion.csv

Las páginas se descargan con pausas (Wikipedia limita el ritmo) y quedan en --cache. Licencia del texto: CC BY-SA.
"""
from __future__ import annotations
import argparse, csv, json, os, re, subprocess, sys, time, unicodedata

PAGES = [
    ("Chile national football team results (1980–1999)", "r1980.txt"),
    ("Chile national football team results (2000–2019)", "r2000.txt"),
    ("Chile national football team results (2020–present)", "r2020.txt"),
]
UA = "GaluchaStats-research/1.0 (galuchastats@gmail.com)"
MONTHS = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}
CHILE = "Chile"
CHILE_ID = "seleccion-chilena"
# Finales jugadas por Chile (fecha -> rival): Copa América 2015 y 2016, Copa Confederaciones 2017.
FINALS = {("2015-07-04", "ARG"), ("2016-06-26", "ARG"), ("2017-07-02", "GER")}
SINCE = "1997-01-01"

# código FIFA -> (nombre en español, código para el id)
TEAMS = {
 "ALB": "Albania", "ALG": "Argelia", "ARG": "Argentina", "ARM": "Armenia", "AUS": "Australia", "AUT": "Austria", "BEL": "Bélgica",
 "BFA": "Burkina Faso", "BOL": "Bolivia", "BRA": "Brasil", "BUL": "Bulgaria", "CAN": "Canadá", "CHN": "China", "CIV": "Costa de Marfil",
 "CMR": "Camerún", "COD": "RD del Congo", "COL": "Colombia", "CPV": "Cabo Verde", "CRC": "Costa Rica", "CRO": "Croacia", "CUB": "Cuba",
 "DEN": "Dinamarca", "DOM": "República Dominicana", "ECU": "Ecuador", "EGY": "Egipto", "ENG": "Inglaterra", "ESP": "España", "EST": "Estonia",
 "FIN": "Finlandia", "FRA": "Francia", "FRG": "Alemania Occidental", "GER": "Alemania", "GHA": "Ghana", "GRE": "Grecia", "GUA": "Guatemala",
 "GUI": "Guinea", "HAI": "Haití", "HON": "Honduras", "IRL": "Irlanda", "IRN": "Irán", "IRQ": "Irak", "ISL": "Islandia", "ISR": "Israel",
 "ITA": "Italia", "JAM": "Jamaica", "JPN": "Japón", "KOR": "Corea del Sur", "KSA": "Arabia Saudita", "LTU": "Lituania", "MAR": "Marruecos",
 "MEX": "México", "NED": "Países Bajos", "NIR": "Irlanda del Norte", "NZL": "Nueva Zelanda", "OMA": "Omán", "PAN": "Panamá", "PAR": "Paraguay",
 "PER": "Perú", "POL": "Polonia", "POR": "Portugal", "QAT": "Catar", "ROU": "Rumania", "RSA": "Sudáfrica", "RUS": "Rusia", "SCO": "Escocia",
 "SLV": "El Salvador", "SRB": "Serbia", "SUI": "Suiza", "SVK": "Eslovaquia", "SWE": "Suecia", "TRI": "Trinidad y Tobago", "TUN": "Túnez",
 "TUR": "Turquía", "UAE": "Emiratos Árabes Unidos", "UKR": "Ucrania", "URU": "Uruguay", "USA": "Estados Unidos", "VEN": "Venezuela", "ZAM": "Zambia",
 "YUG": "Yugoslavia", "TCH": "Checoslovaquia", "URS": "Unión Soviética", "CZE": "Chequia", "HUN": "Hungría", "NOR": "Noruega", "SEN": "Senegal",
 "NGA": "Nigeria", "CHI": "Chile", "SCG": "Serbia y Montenegro", "BIH": "Bosnia y Herzegovina", "SVN": "Eslovenia", "MKD": "Macedonia del Norte",
}


def fetch(title: str, path: str) -> str:
    if os.path.exists(path):
        return open(path, encoding="utf8").read()
    for _ in range(8):
        out = subprocess.run(
            ["curl", "-s", "-m", "50", "-A", UA, "-G", "https://en.wikipedia.org/w/api.php", "--data-urlencode", "action=parse",
             "--data-urlencode", f"page={title}", "--data-urlencode", "prop=wikitext", "--data-urlencode", "format=json"],
            capture_output=True, text=True).stdout
        try:
            w = json.loads(out)["parse"]["wikitext"]["*"]
            open(path, "w", encoding="utf8").write(w)
            time.sleep(8)
            return w
        except Exception:
            time.sleep(15)
    sys.exit(f"No se pudo descargar {title}")


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", strip_accents(s.lower())).strip("-")


def unlink(s: str) -> str:
    """[[A|B]] -> B ; [[A]] -> A ; quita plantillas y etiquetas."""
    s = re.sub(r"<ref[^>]*?/>|<ref[^>]*?>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_date(cell: str) -> str | None:
    m = re.search(r"\{\{dts\|(?:format=\w+\|)?(\d{1,2}) (\w+) (\d{4})", cell)
    if m:
        return f"{m.group(3)}-{MONTHS[m.group(2).capitalize()]:02d}-{int(m.group(1)):02d}"
    m = re.search(r"\{\{dts\|(\d{4})\|(\d{1,2})\|(\d{1,2})", cell)
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else None


def competition(raw: str) -> tuple[str, str, str]:
    """-> (competition_id, tournament, stage)"""
    t = unlink(raw)
    low = t.lower()
    yr = re.search(r"(19|20)\d{2}", raw)
    if "world cup qualification" in low:
        return "eliminatorias", re.sub(r"(?:FIFA )?World Cup qualification", "Eliminatorias", t), ""
    if "fifa world cup" in low and "qualif" not in low:
        return "mundial", re.sub(r"(\d{4}) FIFA World Cup", r"Mundial \1", t), ""
    if "copa américa" in low or "copa america" in low:
        return "copa-america", re.sub(r"(\d{4}) Copa Am[eé]rica", r"Copa América \1", t), ""
    if "confederations" in low:
        return "confederaciones", re.sub(r"(\d{4}) FIFA Confederations Cup", r"Copa Confederaciones \1", t), ""
    return "amistoso-seleccion", t if t and t.lower() != "friendly" else "Amistoso", ""


def split_row(r: str) -> list[str]:
    parts = re.split(r"\n\|(?!\|)", "\n" + r.strip())
    return [p.strip() for p in parts if p.strip() != ""] if False else [p.strip("\n") for p in parts[1:]] if parts and parts[0].strip() == "" else parts


def scorers(cell: str):
    """'[[Alexis Sánchez|Sánchez]], [[Arturo Vidal|Vidal]] (2) (pen.), Díaz (o.g.)' -> [(nombre, n, penales, autogol)]"""
    cell = re.sub(r"<ref[^>]*?/>|<ref[^>]*?>.*?</ref>", "", cell, flags=re.S)
    cell = re.sub(r"\{\{(?!nowrap)[^}]*\}\}", "", cell)
    out = []
    for piece in re.split(r",(?![^\[]*\]\])", cell):
        piece = piece.strip()
        if not piece:
            continue
        link = re.search(r"\[\[([^\]|]*)(?:\|[^\]]*)?\]\]", piece)
        name = link.group(1) if link else re.sub(r"\(.*?\)", "", unlink(piece)).strip()
        name = re.sub(r"\s*\((?:footballer|soccer|Chilean)[^)]*\)", "", name).strip()
        n = re.search(r"\((\d)\)", piece)
        n = int(n.group(1)) if n else 1
        og = bool(re.search(r"o\.?g\.?|own goal", piece, re.I))
        pen = bool(re.search(r"\bpen", piece, re.I))
        if name:
            out.append((name, n, pen, og))
    return out


def parse(wikitext: str):
    for r in re.split(r"\n\|-\s*\n", wikitext):
        lines = r.split("\n|")
        if len(lines) < 7:
            continue
        cells = [lines[0].lstrip("|").strip()] + [c.strip() for c in lines[1:]]
        if not re.fullmatch(r"\d+", cells[0]):
            continue
        date = parse_date(cells[1])
        if not date:
            yield {"error": f"fecha ilegible: {cells[1][:60]}"}
            continue
        venue_raw = cells[2]
        side = re.search(r"\((H|A|N)\)\s*$", venue_raw.strip())
        side = side.group(1) if side else "N"
        venue = re.sub(r"\s*\((?:H|A|N)\)\s*$", "", unlink(venue_raw)).strip()
        code = re.search(r"\{\{fb(?:-rt)?\|([A-Za-z]+)", cells[3])
        code = code.group(1).upper() if code else None
        score_cell = cells[4]
        sc = re.search(r"(\d+)[–-](\d+)", unlink(score_cell))
        if code and not unlink(score_cell).strip():
            # Partido anunciado, todavía sin marcador.
            yield {"date": date, "side": side, "venue": venue, "code": code, "gf": None, "ga": None, "pens": None,
                   "competition_id": competition(cells[5])[0], "tournament": competition(cells[5])[1], "stage": "", "scorers": [], "raw_comp": unlink(cells[5])}
            continue
        if not code or not sc:
            yield {"error": f"{date}: rival o marcador ilegible ({cells[3][:30]} / {score_cell[:40]})"}
            continue
        gf, ga = int(sc.group(1)), int(sc.group(2))
        pens = re.search(r"\((\d+)[–-](\d+)\s*p", unlink(score_cell)) or re.search(r"(\d+)[–-](\d+)\s*(?:on )?pen", unlink(score_cell))
        comp_id, tournament, stage = competition(cells[5])
        yield {
            "date": date, "side": side, "venue": venue, "code": code, "gf": gf, "ga": ga,
            "pens": (int(pens.group(1)), int(pens.group(2))) if pens else None,
            "competition_id": comp_id, "tournament": tournament, "stage": stage,
            "scorers": scorers(cells[6]), "raw_comp": unlink(cells[5]),
        }


def rsssf_opponents(cache: str):
    """RSSSF 'Chile - International Results' (1997–2001): fecha -> (goles Chile, goles rival, [(jugador, minuto, penal, autogol)] del rival)."""
    out = {}
    for yy in ("97", "98", "99", "00", "01"):
        path = os.path.join(cache, f"rsssf-intres{yy}.html")
        if not os.path.exists(path):
            r = subprocess.run(["curl", "-s", "-m", "40", "-A", UA, f"https://www.rsssf.org/tablesc/chil-intres{yy}.html", "-o", path])
        if not os.path.exists(path) or os.path.getsize(path) < 500:
            continue
        text = re.sub(r"<[^>]+>", "", open(path, encoding="latin1").read())
        for block in re.split(r"\n_{20,}\n", text):
            lines = [l for l in block.strip("\n").split("\n")]
            if len(lines) < 3:
                continue
            m = re.match(r"\s*\d+\s+(\d\d)/(\d\d)/(\d{4})\s+.*?\s(\d+)-(\d+)(?:\s|$)", lines[0])
            if not m:
                continue
            date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
            gf, ga = int(m.group(4)), int(m.group(5))
            scorers_line = lines[2] if ";" in lines[2] else ""
            if ";" not in scorers_line:
                continue
            _, opp_part = scorers_line.split(";", 1)
            opp = []
            last = ""
            for piece in opp_part.split(","):
                piece = piece.strip()
                if not piece:
                    continue
                # "Ronaldo 9, 59pen, Romario 39, 61": los minutos sueltos son goles del jugador anterior.
                only_min = re.fullmatch(r"(\d+)(?:\+\d+)?(pen|og)?", piece)
                if only_min and last:
                    opp.append((last, only_min.group(1), only_min.group(2) == "pen", only_min.group(2) == "og"))
                    continue
                mm = re.match(r"(.*?)\s+(\d+)(?:\+\d+)?(pen|og)?\s*$", piece)
                if mm:
                    last = mm.group(1).strip()
                    opp.append((last, mm.group(2), mm.group(3) == "pen", mm.group(3) == "og"))
                else:
                    last = piece
                    opp.append((piece, "", False, False))
            out[date] = (gf, ga, opp)
    return out


def espn_index(path: str):
    """(fecha, código del rival) -> evento de ESPN con el detalle de goles."""
    idx = {}
    if not path or not os.path.exists(path):
        return idx
    for events in json.load(open(path)).values():
        for e in events:
            comp = (e.get("competitions") or [{}])[0]
            teams = comp.get("competitors", [])
            opp = next((c for c in teams if (c.get("team") or {}).get("abbreviation") != "CHI"), None)
            if not opp:
                continue
            code = (opp["team"].get("abbreviation") or "").upper()
            idx[(e["date"][:10], code)] = e
    return idx


def espn_goals(event, gf, ga):
    """Goles de ambos equipos según ESPN: [(side, jugador, minuto, penal, autogol)] con side 'chile'|'rival', o None si no calza con el marcador."""
    comp = (event.get("competitions") or [{}])[0]
    side = {}
    for c in comp.get("competitors", []):
        side[str((c.get("team") or {}).get("id"))] = "chile" if (c.get("team") or {}).get("abbreviation") == "CHI" else "rival"
    out = []
    for d in comp.get("details") or []:
        if not d.get("scoringPlay") or d.get("shootout"):
            continue
        who = side.get(str((d.get("team") or {}).get("id", "")))
        ath = d.get("athletesInvolved") or []
        name = (ath[0].get("displayName") or ath[0].get("fullName") or "") if ath else ""
        minute = re.sub(r"\D.*", "", (d.get("clock") or {}).get("displayValue", "")) if d.get("clock") else ""
        if who and name:
            out.append((who, re.sub(r"\s+", " ", name).strip(), minute, bool(d.get("penaltyKick")), bool(d.get("ownGoal"))))
        else:
            return None
    if sum(1 for g in out if g[0] == "chile") != gf or sum(1 for g in out if g[0] == "rival") != ga:
        return None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--espn", default="/tmp/wp/espn_chile.json", help="JSON de espn_chile.py (goles de ambos equipos)")
    ap.add_argument("--cache", default="/tmp/wp")
    ap.add_argument("--out", default="data/matches/seleccion-chilena.csv")
    ap.add_argument("--goals-out", default="data/goals/goals-seleccion.csv")
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    rows, errors = {}, []
    for title, fn in PAGES:
        for m in parse(fetch(title, os.path.join(a.cache, fn))):
            if "error" in m:
                errors.append(m["error"])
                continue
            if m["date"] < SINCE:
                continue
            rows[(m["date"], m["code"])] = m
    unknown = sorted({m["code"] for m in rows.values() if m["code"] not in TEAMS})
    if unknown:
        sys.exit(f"Códigos FIFA sin nombre: {unknown}")
    espn = espn_index(a.espn)
    rsssf = rsssf_opponents(a.cache)
    from_rsssf = 0
    matches, goals, bad = [], [], []
    from_espn = 0
    for (date, code), m in sorted(rows.items()):
        opp = f"{TEAMS[code]} ({code})"
        opp_id = f"{slug(TEAMS[code])}-{code.lower()}"
        # Local/visita: (A) visitante; (H) y (N) con Chile como local.
        home, away = (opp, CHILE) if m["side"] == "A" else (CHILE, opp)
        hg, ag = (m["ga"], m["gf"]) if m["side"] == "A" else (m["gf"], m["ga"])
        if m["gf"] is None:
            hg = ag = ""  # por jugar
        hp = ap_ = ""
        if m["pens"]:
            pc, po = m["pens"]
            hp, ap_ = (po, pc) if m["side"] == "A" else (pc, po)
        year = int(date[:4])
        is_final = 1 if (date, code) in FINALS else 0
        matches.append([date, m["competition_id"], year, m["tournament"], m["stage"], home, away, hg, ag, hp, ap_, is_final, m["venue"],
                        "wikipedia:Chile national football team results"])
        total = sum(n for _, n, _, og in m["scorers"])  # los autogoles del rival también cuentan para Chile
        if m["scorers"] and m["gf"] is not None and total != m["gf"]:
            bad.append(f"{date} vs {code}: goleadores {total} vs marcador {m['gf']}")
        hid, aid = (opp_id, CHILE_ID) if m["side"] == "A" else (CHILE_ID, opp_id)
        mid = f"{date}_{hid}_{aid}"
        ev = None
        if m["gf"] is not None:
            for off in (0, 1, -1):
                from datetime import date as _d, timedelta
                k = ((_d.fromisoformat(date) + timedelta(days=off)).isoformat(), code)
                if k in espn:
                    ev = espn[k]
                    break
        full = espn_goals(ev, m["gf"], m["ga"]) if ev else None
        if full:
            from_espn += 1
            src = f"https://www.espn.com/soccer/match/_/gameId/{ev['id']}"
            for who, name, minute, pen, og in full:
                goals.append([mid, date, hid, aid, CHILE_ID if who == "chile" else opp_id, name, minute, 1 if og else 0, 1 if pen else 0, src])
            continue
        chile_goals = [(name, pen, og) for name, n, pen, og in m["scorers"] for _ in range(n)]
        rs = rsssf.get(date)
        # RSSSF da solo apellidos: se usa únicamente si todos los goleadores del rival traen nombre y apellido.
        if rs and any(" " not in name for name, *_ in rs[2]):
            rs = None
        if rs and m["gf"] is not None and rs[0] == m["gf"] and rs[1] == m["ga"] and len(rs[2]) == m["ga"] and len(chile_goals) == m["gf"]:
            from_rsssf += 1
            for name, pen, og in chile_goals:
                goals.append([mid, date, hid, aid, CHILE_ID, name, "", 1 if og else 0, 1 if pen else 0, "https://en.wikipedia.org/wiki/Chile_national_football_team_results_(2000–2019)"])
            for name, minute, pen, og in rs[2]:
                goals.append([mid, date, hid, aid, opp_id, name, minute, 1 if og else 0, 1 if pen else 0, f"https://www.rsssf.org/tablesc/chil-intres{date[2:4]}.html"])
            continue
        for name, pen, og in chile_goals:
            goals.append([mid, date, hid, aid, CHILE_ID, name, "", 1 if og else 0, 1 if pen else 0, "https://en.wikipedia.org/wiki/Chile_national_football_team_results_(2000–2019)"])
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["date", "competition_id", "season", "tournament", "stage", "home", "away", "home_goals", "away_goals", "home_pens", "away_pens", "is_final", "venue", "source"])
        w.writerows(matches)
    print(f"{len(matches)} partidos -> {a.out}")
    print(f"{len(goals)} goles de Chile -> (revisar ids antes de cargar) {a.goals_out}")
    with open(a.goals_out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["match_id", "date", "home_team_id", "away_team_id", "scoring_team_id", "player", "minute", "own_goal", "penalty", "source"])
        w.writerows(goals)
    for e in errors[:20]:
        print("  error:", e)
    for b in bad[:30]:
        print("  suma:", b)
    print(f"goles de ambos equipos: ESPN en {from_espn} partidos, RSSSF (1997–2001) en {from_rsssf}; el resto solo trae los goles de Chile (Wikipedia)")
    print(f"errores {len(errors)}, goleadores que no suman {len(bad)}")


if __name__ == "__main__":
    main()
