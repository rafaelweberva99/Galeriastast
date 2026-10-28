#!/usr/bin/env python3
"""Consistency checks over matches.csv -> checks.md.  Usage: python3 -I checks.py [--db path/to/galeriastats.db]"""
import csv, collections, os, sys, sqlite3, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
rows = list(csv.DictReader(open(os.path.join(HERE, "matches.csv"), encoding="utf-8")))
out = []
ok_all = True


def check(name, cond, detail=""):
    global ok_all
    ok_all &= bool(cond)
    out.append(f"- {'OK' if cond else 'FALLA'} — {name}" + (f": {detail}" if detail else ""))


def table(ms):
    t = collections.defaultdict(lambda: [0, 0, 0, 0, 0, 0, 0])  # pj g e p gf gc pts
    for m in ms:
        if m["home_goals"] == "":
            continue
        hg, ag = int(m["home_goals"]), int(m["away_goals"])
        for team, gf, gc in ((m["home"], hg, ag), (m["away"], ag, hg)):
            r = t[team]
            r[0] += 1; r[4] += gf; r[5] += gc
            if gf > gc: r[1] += 1; r[6] += 3
            elif gf == gc: r[2] += 1; r[6] += 1
            else: r[3] += 1
    return sorted(t.items(), key=lambda kv: (-kv[1][6], -(kv[1][4] - kv[1][5]), -kv[1][4]))


out.append("# Chequeos de consistencia — matches.csv\n")
out.append(f"Generado por `checks.py` sobre {len(rows)} filas.\n")

# --- formato
out.append("## Formato y unicidad\n")
cols = "date,competition_id,season,tournament,stage,home,away,home_goals,away_goals,home_pens,away_pens,is_final,venue,source".split(",")
check("columnas exactas", list(rows[0].keys()) == cols)
bad_dates = [r for r in rows if not (len(r["date"]) == 10 and datetime.date.fromisoformat(r["date"]))]
check("fechas yyyy-mm-dd válidas", not bad_dates)
check("season == año de la fecha (salvo nada)", all(r["date"][:4] == r["season"] for r in rows),
      ", ".join(f"{r['date']} {r['home']}-{r['away']}" for r in rows if r["date"][:4] != r["season"]))
check("local ≠ visita", all(r["home"] != r["away"] for r in rows))
check("goles: ambos vacíos o ambos enteros", all((r["home_goals"] == "") == (r["away_goals"] == "") for r in rows))
bp = [r for r in rows if r["home_pens"] and r["home_goals"] != r["away_goals"] and "Vuelta" not in r["stage"]]
check("penales sólo tras empate (partido único) o en partido de vuelta (empate en el global)", not bp,
      "; ".join(f"{r['date']} {r['home']}-{r['away']}" for r in bp))
check("todo partido con resultado tiene fecha <= 2026-10-28; sin resultado => fecha >= 2026-10-28",
      all((r["home_goals"] != "" and r["date"] <= "2026-10-28") or (r["home_goals"] == "" and r["date"] >= "2026-10-28")
          or (r["home_goals"] == "" and "POSTPONED" in r["source"]) for r in rows),
      "; ".join(f"{r['date']} {r['home']}-{r['away']}" for r in rows if r["home_goals"] == "" and r["date"] < "2026-10-28"))
dups = [k for k, v in collections.Counter((r["date"], r["home"], r["away"]) for r in rows).items() if v > 1]
check("sin filas duplicadas (fecha, local, visita)", not dups, str(dups))
sameday = collections.defaultdict(list)
for r in rows:
    for t in (r["home"], r["away"]):
        sameday[(r["date"], t)].append(f"{r['competition_id']}:{r['home']}-{r['away']}")
twice = {k: v for k, v in sameday.items() if len(v) > 1}
check("ningún equipo juega dos veces el mismo día", not twice, str(twice))
# 48h rule (warning only)
near = []
byteam = collections.defaultdict(list)
for r in rows:
    for t in (r["home"], r["away"]):
        byteam[t].append(r["date"])
for t, ds in byteam.items():
    ds = sorted(set(ds))
    for a, b in zip(ds, ds[1:]):
        if (datetime.date.fromisoformat(b) - datetime.date.fromisoformat(a)).days == 1:
            near.append(f"{t} {a}/{b}")
out.append(f"- INFO — partidos en días consecutivos del mismo equipo (posible error de fecha, revisar): {len(near)}"
           + (": " + "; ".join(near) if near else ""))
check("is_final=1 sólo en stage 'Final'", all(r["is_final"] == "0" or r["stage"].startswith("Final") for r in rows))

# --- Liga 2025
out.append("\n## Liga de Primera 2025\n")
l25 = [r for r in rows if r["competition_id"] == "primera-division" and r["season"] == "2025"]
check("240 partidos", len(l25) == 240, str(len(l25)))
pj = collections.Counter(t for r in l25 for t in (r["home"], r["away"]))
check("16 equipos con 30 partidos cada uno", len(pj) == 16 and set(pj.values()) == {30}, str(dict(pj)))
fechas = collections.Counter(r["stage"] for r in l25)
check("30 fechas de 8 partidos", len(fechas) == 30 and set(fechas.values()) == {8})
pairs = collections.Counter((r["home"], r["away"]) for r in l25)
check("cada cruce local/visita exactamente una vez (doble rueda)", len(pairs) == 240)
t25 = table(l25)
RSSSF = {"coquimbo-unido": (75, 49, 17), "universidad-catolica": (58, 44, 26), "ohiggins": (56, 43, 34),
         "universidad-de-chile": (55, 58, 32), "audax-italiano": (52, 51, 43), "palestino": (49, 42, 31),
         "cobresal": (47, 38, 38), "colo-colo": (44, 46, 36), "huachipato": (43, 43, 42), "nublense": (33, 31, 40),
         "deportes-limache": (31, 36, 43), "union-la-calera": (29, 28, 39), "la-serena": (27, 32, 52),
         "everton": (26, 27, 44), "deportes-iquique": (24, 34, 60), "union-espanola": (21, 33, 58)}
out.append("\n| # | equipo | PJ | G | E | P | GF | GC | Pts | RSSSF (Pts GF-GC) |\n|---|---|---|---|---|---|---|---|---|---|")
for i, (t, r) in enumerate(t25, 1):
    rs = RSSSF.get(t)
    out.append(f"| {i} | {t} | {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {r[6]} | {rs[0]} {rs[1]}-{rs[2]} |")
out.append("")
check("campeón reconstruido = Coquimbo Unido", t25[0][0] == "coquimbo-unido")
check("descienden (15° y 16°) Deportes Iquique y Unión Española", {t25[14][0], t25[15][0]} == {"deportes-iquique", "union-espanola"})
check("tabla idéntica a RSSSF (pts, GF, GC de los 16)", all((r[6], r[4], r[5]) == RSSSF[t] for t, r in t25))

# --- Liga 2026
out.append("\n## Liga de Primera 2026 (en curso)\n")
l26 = [r for r in rows if r["competition_id"] == "primera-division" and r["season"] == "2026"]
pj = collections.Counter(t for r in l26 for t in (r["home"], r["away"]))
check("240 partidos programados (jugados + pendientes)", len(l26) == 240, str(len(l26)))
check("16 equipos con 30 partidos cada uno", len(pj) == 16 and set(pj.values()) == {30})
f26 = collections.Counter(r["stage"] for r in l26)
check("30 fechas de 8 partidos", len(f26) == 30 and set(f26.values()) == {8}, str(sorted(f26.items())))
played = [r for r in l26 if r["home_goals"] != ""]
out.append(f"- INFO — jugados {len(played)}, pendientes {len(l26) - len(played)} (fechas 24 pend. UC-Audax, 26-30)")
out.append("\n| # | equipo | PJ | Pts | GF-GC |\n|---|---|---|---|---|")
for i, (t, r) in enumerate(table(l26), 1):
    out.append(f"| {i} | {t} | {r[0]} | {r[6]} | {r[4]}-{r[5]} |")
out.append("")

# --- Liga 2024 complement
out.append("\n## Liga 2024 (complemento segunda mitad)\n")
l24 = [r for r in rows if r["competition_id"] == "primera-division" and r["season"] == "2024"]
f24 = collections.Counter(r["stage"] for r in l24)
check("fechas 24-30 completas (8 c/u) + 1 partido de la fecha 18", all(f24[f"Fecha {i}"] == 8 for i in range(24, 31)) and f24["Fecha 18"] == 1, str(sorted(f24.items())))
db = None
if "--db" in sys.argv:
    db = sys.argv[sys.argv.index("--db") + 1]
if db and os.path.exists(db):
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    have = set(con.execute("select date, home_team_id, away_team_id from matches where season in (2024,2025,2026)"))
    ov = [r for r in rows if (r["date"], r["home"], r["away"]) in have]
    check("ninguna fila ya existe en la base actual (fecha, local, visita)", not ov, "; ".join(f"{r['date']} {r['home']}-{r['away']}" for r in ov))
    l24db = list(con.execute("select home_team_id, away_team_id from matches where season=2024 and competition_id='primera-division'"))
    allp = set(l24db) | {(r["home"], r["away"]) for r in l24}
    check("base + complemento = 240 cruces únicos de la Liga 2024", len(allp) == 240, str(len(allp)))

# --- group tables
out.append("\n## Tablas de grupos reconstruidas vs. publicadas\n")
PUB = {
    ("copa-de-la-liga", "2026"): {"A": {"coquimbo-unido": 14, "colo-colo": 10, "huachipato": 8, "deportes-concepcion": 1},
                                  "B": {"nublense": 14, "universidad-catolica": 11, "universidad-de-concepcion": 4, "cobresal": 4},
                                  "C": {"ohiggins": 14, "everton": 7, "deportes-limache": 6, "palestino": 5},
                                  "D": {"union-la-calera": 13, "audax-italiano": 11, "universidad-de-chile": 8, "la-serena": 1}},
    ("copa-chile", "2026"): {"A": {"coquimbo-unido": 12, "deportes-limache": 8}, "B": {"universidad-catolica": 15, "everton": 8},
                             "C": {"la-serena": 7, "cobresal": 2}, "D": {"universidad-de-chile": 13, "union-la-calera": 11},
                             "E": {"colo-colo": 13, "ohiggins": 11}, "F": {"nublense": 13, "universidad-de-concepcion": 4},
                             "G": {"audax-italiano": 12, "palestino": 10}, "H": {"deportes-concepcion": 13, "huachipato": 6}},
    ("copa-chile", "2025"): {"A": {"deportes-iquique": 7}, "B": {"deportes-limache": 11, "colo-colo": 8}, "C": {"la-serena": 11, "coquimbo-unido": 9, "cobresal": 5},
                             "D": {"union-la-calera": 11, "everton": 9, "universidad-catolica": 4},
                             "E": {"audax-italiano": 12, "union-espanola": 7, "palestino": 5}, "F": {"huachipato": 11, "ohiggins": 6},
                             "G": {"universidad-de-chile": 13}},
}
for (comp, season), groups in PUB.items():
    for g, exp in groups.items():
        ms = [r for r in rows if r["competition_id"] == comp and r["season"] == season and r["stage"].startswith(f"Fase de grupos · Grupo {g}")]
        got = {t: v[6] for t, v in table(ms)}
        diff = {t: (got.get(t), p) for t, p in exp.items() if got.get(t) != p}
        check(f"{comp} {season} Grupo {g}: puntos de clubes de Primera = tabla publicada", not diff, str(diff) if diff else "")

out.append("\n## Conteos por competición\n")
out.append("| competición | temporada | partidos | con resultado | sin resultado |\n|---|---|---|---|---|")
for (c, s), n in sorted(collections.Counter((r["competition_id"], r["season"]) for r in rows).items()):
    w = sum(1 for r in rows if r["competition_id"] == c and r["season"] == s and r["home_goals"] != "")
    out.append(f"| {c} | {s} | {n} | {w} | {n - w} |")

log = os.path.join(HERE, "build_log.txt")
if os.path.exists(log):
    out.append("\n## Log del build (cruces entre fuentes)\n")
    out.append("Comparaciones automáticas ESPN (cadlag) vs Opta (griffisben) vs ESPN (HectorMontiel) para cada partido de Liga: "
               "las discrepancias de marcador aparecerían aquí como `score mismatch`.\n")
    out.append("```\n" + open(log, encoding="utf-8").read().strip() + "\n```")
out.insert(2, f"**Resultado global: {'TODOS LOS CHEQUEOS OK' if ok_all else 'HAY FALLAS (ver abajo)'}**\n")
open(os.path.join(HERE, "checks.md"), "w", encoding="utf-8").write("\n".join(out) + "\n")
print("ok" if ok_all else "FALLAS")
