#!/usr/bin/env python3
"""Reproducible fetch + build of Chilean club matches 2024-H2 / 2025 / 2026 for GaleriaStats.

Usage:
    python3 -I build_matches.py [--raw DIR] [--out DIR]

1. Downloads pinned files from public GitHub repos (raw.githubusercontent.com) into --raw
   (default ./raw next to this script). Only stdlib (urllib); honours HTTPS_PROXY.
2. Builds matches from those files:
     - Liga de Primera 2024 (after 2024-09-08), 2025, 2026  -> ESPN data mirrored by
       vicentemaartinez/cadlag (UTC kickoff, score, status, scheduled fixtures),
       rounds from griffisben/Post_Match_App (Opta) + danonino21/Chile-football (pending
       2026 fixtures) + yorobot/cache.wfb.txt (2024 matchdays), venues from
       HectorMontiel/mundial-2026-predictor (ESPN venue names).
     - Copa Libertadores / Sudamericana 2025-2026, Chilean clubs only -> ESPN dump (cadlag),
       penalties + "awarded" from openfootball/south-america, venues from HectorMontiel.
     - Copa Chile 2025 (round of 16 onwards) + Liguilla de ascenso 2025 -> rsssf/tables
       tablesc/chile2025.txt.
3. Appends manual_web.csv (matches collected by hand from press via web search; each row has
   its own source URL) and writes matches.csv sorted by date.
Dates are converted to America/Santiago local dates.
"""
import csv, gzip, io, json, os, re, sys, urllib.request, argparse, datetime
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
CL = ZoneInfo("America/Santiago")

PIN = {
    "cadlag": ("vicentemaartinez/cadlag", "cba63ed60ee92a5c039b6e28bb4705a8d1333653"),
    "hector": ("HectorMontiel/mundial-2026-predictor", "da29246d4f3ffd237e8079a74d831cb02e039910"),
    "griff": ("griffisben/Post_Match_App", "cdfcd6b26550ff20cd0cec6344454a7933f2a0da"),
    "ofsa": ("openfootball/south-america", "f51b2dcf5e0fab9f0abd5206ab8c24a413e67277"),
    "rsssf": ("rsssf/tables", "74f5150b7e2de975eb3cd206a48d61a77dcc0cdb"),
    "danonino": ("danonino21/Chile-football", "828da33b273f3e8137af832440c5a462e2931fff"),
    "wfb": ("yorobot/cache.wfb.txt", "9b1887ae8cb801e9ad9da2b063a5be1dffd72c71"),
    "guig": ("guigalhano/jogos-chile-scraper", "7a53b0672a0dd12671dadf4c94fdc105b46d5ea5"),
}
FILES = {
    "cadlag_chi1.csv": ("cadlag", "data/raw/espn/chi.1_2012-2026.csv"),
    "cadlag_meta.json": ("cadlag", "data/raw/espn/chi.1_meta.json"),
    "cadlag_dump.txt.gz": ("cadlag", "data/raw/espn/espn_dump_2010-2026.txt.gz"),
    "hector_chi.csv": ("hector", "historico_chi_primera.csv"),
    "hector_lib.csv": ("hector", "historico_libertadores.csv"),
    "hector_sud.csv": ("hector", "historico_sudamericana.csv"),
    "griff_2025.csv": ("griff", "League_Files/Chilean Primera Division Full Match List 2025.csv"),
    "griff_2026.csv": ("griff", "League_Files/Chilean Primera Division Full Match List 2026.csv"),
    "danonino_matches.csv": ("danonino", "data/matches.csv"),
    "danonino_pending.json": ("danonino", "data/pending_fixtures.json"),
    "ofsa_2025_copal.txt": ("ofsa", "copa-libertadores/2025_copal.txt"),
    "ofsa_2025_copas.txt": ("ofsa", "copa-libertadores/2025_copas.txt"),
    "ofsa_2026_copal.txt": ("ofsa", "copa-libertadores/2026_copal.txt"),
    "rsssf_chile2025.txt": ("rsssf", "tablesc/chile2025.txt"),
    "wfb_2024_cl1.txt": ("wfb", "2024/cl.1.txt"),
    "guig_programados.csv": ("guig", "data/jogos_programados.csv"),
}


def src_ref(key):
    repo, path = FILES[key][0], FILES[key][1]
    r, sha = PIN[repo]
    return f"github:{r}@{sha[:7]}/{path}"


def fetch(raw):
    os.makedirs(raw, exist_ok=True)
    for name, (repo, path) in FILES.items():
        dest = os.path.join(raw, name)
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            continue
        r, sha = PIN[repo]
        url = f"https://raw.githubusercontent.com/{r}/{sha}/" + urllib.request.quote(path)
        print("GET", url, file=sys.stderr)
        with urllib.request.urlopen(url, timeout=120) as resp, open(dest, "wb") as f:
            f.write(resp.read())


# ---------------------------------------------------------------- team names
IDS = {
    "colo-colo": ["Colo Colo", "Colo-Colo", "CSD Colo-Colo"],
    "universidad-de-chile": ["Universidad de Chile", "Univ. de Chile", "U. de Chile", "CF Universidad de Chile", "U de Chile"],
    "universidad-catolica": ["Universidad Católica", "Universidad Catolica", "CD Universidad Católica", "U. Católica", "UC"],
    "ohiggins": ["O'Higgins", "O'Higgins FC", "O´Higgins"],
    "coquimbo-unido": ["Coquimbo Unido", "CD Coquimbo Unido", "Coquimbo"],
    "audax-italiano": ["Audax Italiano", "Audax"],
    "palestino": ["Palestino", "CD Palestino"],
    "huachipato": ["Huachipato", "CD Huachipato"],
    "cobresal": ["Cobresal"],
    "everton": ["Everton", "Everton CD", "Everton de Viña del Mar"],
    "nublense": ["Ñublense", "CD Nublense", "Nublense"],
    "union-la-calera": ["Unión La Calera", "U. La Calera", "Union La Calera"],
    "la-serena": ["La Serena", "Deportes La Serena", "Dep. La Serena"],
    "deportes-limache": ["Deportes Limache", "Limache"],
    "universidad-de-concepcion": ["Universidad de Concepción", "Universidad Concepción", "U. de Concepción", "UdeC"],
    "deportes-concepcion": ["Deportes Concepción", "Deportes Concepcion", "Dep. Concepción"],
    "union-espanola": ["Unión Española", "Union Espanola", "U. Española"],
    "deportes-iquique": ["Deportes Iquique", "CD Iquique", "Iquique"],
    "cobreloa": ["Cobreloa"],
    "magallanes": ["Magallanes", "CD Magallanes"],
    "curico-unido": ["Curicó Unido", "Provincial Curicó Unido", "Curico Unido"],
    "santiago-wanderers": ["Santiago Wanderers", "S. Wanderers"],
    "deportes-antofagasta": ["Antofagasta", "Deportes Antofagasta"],
    "copiapo": ["Copiapó", "Deportes Copiapó"],
    "deportes-temuco": ["Temuco", "Deportes Temuco"],
    "san-luis": ["San Luis", "San Luis de Quillota"],
    "rangers": ["Rangers", "Rangers de Talca"],
    "san-marcos-de-arica": ["San Marcos", "San Marcos de Arica"],
    "santiago-morning": ["Santiago Morning"],
    "melipilla": ["Melipilla", "Deportes Melipilla"],
    "barnechea": ["Barnechea", "AC Barnechea"],
    "puerto-montt": ["Puerto Montt", "Deportes Puerto Montt"],
    "provincial-osorno": ["Provincial Osorno"],
    "union-san-felipe": ["Unión San Felipe"],
    "deportes-recoleta": ["Deportes Recoleta", "Recoleta"],
}
NAME2ID = {}
for _id, names in IDS.items():
    NAME2ID[_id] = _id
    for n in names:
        NAME2ID[n] = _id
        NAME2ID[n.lower()] = _id
CHILEAN = set(IDS)

# foreign clubs: ESPN name -> display name with country
FOREIGN = {}


def tid(name, foreign_country=None):
    n = name.strip()
    n = re.sub(r"\s*\((CHI)\)$", "", n)
    if n in NAME2ID:
        return NAME2ID[n]
    if n.lower() in NAME2ID:
        return NAME2ID[n.lower()]
    if foreign_country:
        return f"{n} ({foreign_country})"
    return n


def local_date(utc_str):
    """utc_str: 'YYYYmmddHHMM' or ISO 'YYYY-mm-ddTHH:MMZ' or 'YYYY-mm-dd HH:MM:SS' (UTC)."""
    s = utc_str.strip()
    if re.fullmatch(r"\d{12}", s):
        dt = datetime.datetime.strptime(s, "%Y%m%d%H%M")
    elif "T" in s:
        dt = datetime.datetime.strptime(s.rstrip("Z"), "%Y-%m-%dT%H:%M")
    else:
        dt = datetime.datetime.strptime(s[:16], "%Y-%m-%d %H:%M")
    dt = dt.replace(tzinfo=datetime.timezone.utc).astimezone(CL)
    return dt.strftime("%Y-%m-%d")


COLS = ["date", "competition_id", "season", "tournament", "stage", "home", "away", "home_goals",
        "away_goals", "home_pens", "away_pens", "is_final", "venue", "source"]


def row(**kw):
    r = {c: "" for c in COLS}
    r.update({k: ("" if v is None else v) for k, v in kw.items()})
    if r["is_final"] == "":
        r["is_final"] = 0
    return r


def num(x):
    if x in (None, ""):
        return ""
    return str(int(float(x)))


# ---------------------------------------------------------------- venues (ESPN via HectorMontiel)
def load_hector(raw, name):
    out = {}
    with open(os.path.join(raw, name), encoding="utf-8") as f:
        for x in csv.DictReader(f):
            if x["date"] < "2024-06":
                continue
            h, a = tid(x["home_team"]), tid(x["away_team"])
            out.setdefault((h, a), []).append(x)
    return out


def pick_hector(hmap, h, a, date):
    best = None
    for x in hmap.get((h, a), []):
        d = local_date(x["date"])
        diff = abs((datetime.date.fromisoformat(d) - datetime.date.fromisoformat(date)).days)
        if diff <= 3 and (best is None or diff < best[0]):
            best = (diff, x)
    return best[1] if best else None


def clean_venue(v):
    v = (v or "").strip()
    v = v.replace(" (old)", "")
    v = v.replace("Estadio ueno La Nueva Olla", "Estadio ueno La Nueva Olla")
    return v


# ---------------------------------------------------------------- Liga
def build_liga(raw, log):
    meta = json.load(open(os.path.join(raw, "cadlag_meta.json"), encoding="utf-8"))
    teams = meta["teams"]
    slugs = meta["slugs"]
    hmap = load_hector(raw, "hector_chi.csv")

    # rounds by (season, home, away)
    rnd = {}
    for season in (2025, 2026):
        with open(os.path.join(raw, f"griff_{season}.csv"), encoding="utf-8-sig") as f:
            for x in csv.DictReader(f):
                rnd[(season, tid(x["Home"]), tid(x["Away"]))] = (int(x["Round"]), x)
    pend = json.load(open(os.path.join(raw, "danonino_pending.json"), encoding="utf-8"))
    for x in pend:
        k = (2026, tid(x["home_team"]), tid(x["away_team"]))
        if k in rnd and rnd[k][0] != x["matchday"]:
            log.append(f"round mismatch griff vs danonino {k}: {rnd[k][0]} vs {x['matchday']}")
        rnd.setdefault(k, (x["matchday"], None))
    with open(os.path.join(raw, "danonino_matches.csv"), encoding="utf-8") as f:
        for x in csv.DictReader(f):
            k = (2026, tid(x["home_team"]), tid(x["away_team"]))
            if k in rnd and rnd[k][0] != int(x["matchday"]):
                log.append(f"round mismatch griff vs danonino {k}: {rnd[k][0]} vs {x['matchday']}")
            rnd.setdefault(k, (int(x["matchday"]), None))
    # 2024 matchdays from worldfootball (wfb) fixture list
    md = None
    with open(os.path.join(raw, "wfb_2024_cl1.txt"), encoding="utf-8") as f:
        for line in f:
            m = re.match(r"Matchday (\d+)", line)
            if m:
                md = int(m.group(1)); continue
            line = re.sub(r"\s*\[postponed\]\s*$", "", line)
            m = re.match(r"\s+(?:\d\d\.\d\d\s+)?(.+?)\s{2,}(?:\d+-\d+(?: \(\d+-\d+\))?|-)\s+(.+?)\s*$", line)
            if m and md:
                rnd[(2024, tid(m.group(1)), tid(m.group(2)))] = (md, None)

    # official upcoming schedule (campeonatochileno.cl scraped by guigalhano/jogos-chile-scraper)
    upcoming = {}
    with open(os.path.join(raw, "guig_programados.csv"), encoding="utf-8-sig") as f:
        for g in csv.DictReader(f):
            if g["fonte"] == "campeonatochileno.cl" and g["competicao"].startswith("Liga de Primera"):
                upcoming[(int(g["data"][:4]), tid(g["mandante"]), tid(g["visitante"]))] = g
    out = []
    with open(os.path.join(raw, "cadlag_chi1.csv"), encoding="utf-8") as f:
        for x in csv.DictReader(f):
            slug = slugs[int(x["slug_idx"])]
            if not slug[:4].isdigit() or int(slug[:4]) < 2024:
                continue
            season = int(slug[:4])
            if season < 2024:
                continue
            h, a = tid(teams[x["home_id"]]), tid(teams[x["away_id"]])
            date = local_date(x["date"])
            if season == 2024 and date <= "2024-09-08":
                continue
            st = x["status"]
            hg = ag = ""
            extra_src = ""
            if st == "F":
                hg, ag = x["hg"], x["ag"]
            elif st not in ("S", "POSTPONED"):
                log.append(f"liga status {st} {date} {h}-{a}")
            if st != "F":
                # played after the cadlag snapshot: take the result from HectorMontiel (ESPN) and check vs Opta
                hx0 = pick_hector(hmap, h, a, date)
                if hx0 and hx0["home_goals"] != "":
                    hg, ag = num(hx0["home_goals"]), num(hx0["away_goals"])
                    date = local_date(hx0["date"])
                    extra_src = " ; resultado: " + src_ref("hector_chi.csv")
                    st = "F"
                elif (season, h, a) in upcoming:
                    g = upcoming[(season, h, a)]
                    date, extra_src = g["data"], " ; fecha/estadio oficial: " + src_ref("guig_programados.csv") + " (campeonatochileno.cl)"
                    st = "S"
            r = rnd.get((season, h, a))
            if r is None:
                log.append(f"liga sin fecha {season} {date} {h}-{a}")
            # cross-check scores with Opta (griff)
            if r and r[1] is not None and st == "F":
                m = re.search(r"(\d+)-(\d+)", r[1]["Match"].replace(r[1]["Home"], "", 1))
                if m and (m.group(1), m.group(2)) != (hg, ag):
                    log.append(f"score mismatch ESPN vs Opta {date} {h}-{a}: {hg}-{ag} vs {m.group(1)}-{m.group(2)}")
            hx = pick_hector(hmap, h, a, date)
            if hx and st == "F" and hx["home_goals"] != "" and (num(hx["home_goals"]), num(hx["away_goals"])) != (hg, ag):
                log.append(f"score mismatch cadlag vs hector {date} {h}-{a}")
            venue = clean_venue(hx["sede_nombre"]) if hx else ""
            if not venue and (season, h, a) in upcoming:
                venue = upcoming[(season, h, a)]["estadio"]
            note = extra_src
            if st == "POSTPONED":
                note += " (ESPN: POSTPONED; sin nueva fecha conocida)"
            out.append(row(date=date, competition_id="primera-division", season=season,
                           tournament=f"Liga de Primera {season}" if season >= 2025 else "Campeonato Nacional 2024",
                           stage=f"Fecha {r[0]}" if r else "", home=h, away=a, home_goals=hg, away_goals=ag,
                           venue=venue,
                           source=src_ref("cadlag_chi1.csv") + f"#event={x['event_id']}" + note))
    return out


# ---------------------------------------------------------------- continental
STAGE_ES = {
    "second-stage": "Fase 2", "third-stage": "Fase 3", "first-stage": "Fase preliminar",
    "group-stage": "Fase de grupos", "knockout-round-playoffs": "Playoffs de octavos",
    "round-of-16": "Octavos de final", "quarterfinals": "Cuartos de final",
    "semifinals": "Semifinal", "final": "Final",
}
COUNTRY = {}  # foreign team -> code, filled from openfootball names


def parse_openfootball(path):
    """Return list of dicts (stage, group, date, home, away, score text)."""
    res = []
    stage = None
    group = None
    date = None
    year = int(re.search(r"(\d{4})_", os.path.basename(path)).group(1)) if re.search(r"(\d{4})_", os.path.basename(path)) else None
    year = int(re.search(r"_(\d{4})_", "_" + os.path.basename(path).split("ofsa")[-1]).group(1)) if year is None else year
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        m = re.match(r"▪ (.+)$", line)
        if m:
            stage = m.group(1).strip(); group = None
            gm = re.match(r"Group ([A-H])", stage)
            if gm:
                group = gm.group(1)
            continue
        m = re.match(r"\s+(?:\w{3} )?(\w{3}) (\d{1,2})(?: (\d{4}))?\s*$", line)
        if m and m.group(1) in ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"):
            date = (m.group(1), int(m.group(2)))
            continue
        m = re.match(r"\s+(?:\d\d:\d\d\s+)?(.+?)\s+v\s+(.+?)(?:\s{2,}(.*))?$", line)
        if m and "(" in m.group(1):
            res.append(dict(stage=stage, group=group, date=date, home=m.group(1).strip(), away=m.group(2).strip(),
                            score=(m.group(3) or "").strip()))
    return res


def country_of(name):
    m = re.search(r"\((\w{3})\)\s*$", name)
    return m.group(1) if m else None


def build_conmebol(raw, log):
    teams = {}
    rows = []
    sec = None
    with gzip.open(os.path.join(raw, "cadlag_dump.txt.gz"), "rt", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("@@"):
                sec = line[2:]; continue
            if sec == "TEAMS":
                p = line.split("\t", 1)
                if len(p) == 2:
                    teams[p[0]] = p[1]
            elif sec in ("conmebol.libertadores", "conmebol.sudamericana", "chi.1"):
                rows.append((sec, line.split(",")))
    chi_ids = set()
    for sec, r in rows:
        if sec == "chi.1" and r[1] >= "2024":
            chi_ids.update([r[2], r[3]])
    hl = load_hector(raw, "hector_lib.csv")
    hs = load_hector(raw, "hector_sud.csv")
    # openfootball, for stage/group names, penalties and country codes
    of = {}
    for fn, comp in (("ofsa_2025_copal.txt", "copa-libertadores"), ("ofsa_2025_copas.txt", "copa-sudamericana"),
                     ("ofsa_2026_copal.txt", "copa-libertadores")):
        season = int(fn.split("_")[1])
        for x in parse_openfootball(os.path.join(raw, fn)):
            for nm in (x["home"], x["away"]):
                c = country_of(nm)
                base = re.sub(r"\s*\(\w{3}\)$", "", nm)
                if c and c != "CHI":
                    COUNTRY[base] = c
            h, a = tid(x["home"]), tid(x["away"])
            if h in CHILEAN or a in CHILEAN:
                of.setdefault((comp, season, h if h in CHILEAN else None, a if a in CHILEAN else None), []).append(x)
    out = []
    for sec, r in rows:
        if not sec.startswith("conmebol") or r[1] < "2025":
            continue
        if r[2] not in chi_ids and r[3] not in chi_ids:
            continue
        comp = "copa-libertadores" if sec.endswith("libertadores") else "copa-sudamericana"
        season = int(r[8]) if r[8].isdigit() else int(r[1][:4])
        hn, an = teams.get(r[2], r[2]), teams.get(r[3], r[3])
        h, a = tid(hn), tid(an)
        date = local_date(r[1])
        st = r[6]
        hg, ag = (r[4], r[5]) if st in ("FULL_TIME", "FINAL_PEN", "FINAL_AET") else ("", "")
        hmap = hl if comp == "copa-libertadores" else hs
        hx = pick_hector(hmap, h, a, date)
        venue = clean_venue(hx["sede_nombre"]) if hx else ""
        stage = STAGE_ES.get(r[7], r[7])
        out.append(dict(_espn=r, _status=st, _hn=hn, _an=an, row=row(
            date=date, competition_id=comp, season=season,
            tournament=("Copa Libertadores " if comp == "copa-libertadores" else "Copa Sudamericana ") + str(season),
            stage=stage, home=h, away=a, home_goals=hg, away_goals=ag, venue=venue,
            source=src_ref("cadlag_dump.txt.gz") + f"#{sec}:event={r[0]}")))
    return out, of


# ---------------------------------------------------------------- RSSSF Copa Chile 2025 + liguilla
MONTHS = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def build_rsssf(raw, log):
    out = []
    sec = None
    stage = None
    leg = ""
    date = None
    ref = src_ref("rsssf_chile2025.txt")
    for line in open(os.path.join(raw, "rsssf_chile2025.txt"), encoding="utf-8"):
        line = line.rstrip("\n")
        if line.startswith("===="):
            sec = "copa" if "Copa Chile" in line else ("prom" if "Promotion" in line else None)
            continue
        if sec is None:
            continue
        m = re.match(r"^(1/8 Finals|Quarterfinals|Semifinals|Final|First Round)\b(?:.*\[(\w{3}) (\d+)\])?", line)
        if m:
            stage = {"1/8 Finals": "Octavos de final", "Quarterfinals": "Cuartos de final",
                     "Semifinals": "Semifinal", "Final": "Final", "First Round": "Primera ronda"}[m.group(1)]
            leg = ""
            if m.group(2):
                date = datetime.date(2025, MONTHS[m.group(2)], int(m.group(3)))
            else:
                date = None
            if not line.startswith("Final ["):
                continue
        m = re.match(r"^(First|Second) Legs?(?: \[(\w{3}) (\d+)\])?", line)
        if m:
            leg = " · Ida" if m.group(1) == "First" else " · Vuelta"
            if m.group(2):
                date = datetime.date(2025, MONTHS[m.group(2)], int(m.group(3)))
            continue
        m = re.match(r"^\[(\w{3}) (\d+)\]$", line)
        if m:
            date = datetime.date(2025, MONTHS[m.group(1)], int(m.group(2))); continue
        m = re.match(r"^(?:Final \[\w{3} \d+\]\s*)?([A-Za-zÀ-ÿ'´\. ]+?)\s+(\d+)-(\d+)\s+([A-Za-zÀ-ÿ'´\. ]+?)(?:\s+\[(\d+)-(\d+) pen\])?\s*$", line)
        if m and date and stage:
            h, a = tid(m.group(1)), tid(m.group(4))
            for t in (h, a):
                if t not in CHILEAN:
                    log.append(f"rsssf nombre sin id: {t}")
            if line.startswith("Final ["):
                h, a = tid(re.sub(r"^Final \[\w{3} \d+\]\s*", "", m.group(1))), a
            comp = "copa-chile" if sec == "copa" else "liguilla-ascenso"
            out.append(row(date=date.isoformat(), competition_id=comp, season=2025,
                           tournament="Copa Chile 2025" if comp == "copa-chile" else "Liguilla de ascenso 2025 (Primera B)",
                           stage=stage + (leg if stage != "Final" or comp == "liguilla-ascenso" else ""),
                           home=h, away=a, home_goals=m.group(2), away_goals=m.group(3),
                           home_pens=m.group(5) or "", away_pens=m.group(6) or "",
                           is_final=1 if (comp == "copa-chile" and stage == "Final") else 0,
                           source=f"{ref} (https://rsssf.org/tablesc/chile2025.html)"))
    return out


# ---------------------------------------------------------------- continental enrichment
FOREIGN_NAMES = {  # ESPN name -> (display name, country)
    "Independiente Santa Fe": ("Independiente Santa Fe", "COL"), "Boston River": ("Boston River", "URU"),
    "Alianza Lima": ("Alianza Lima", "PER"), "Atlético Bucaramanga": ("Atlético Bucaramanga", "COL"),
    "Botafogo": ("Botafogo", "BRA"), "Estudiantes de La Plata": ("Estudiantes de La Plata", "ARG"),
    "Fortaleza": ("Fortaleza", "BRA"), "Racing Club": ("Racing Club", "ARG"), "Carabobo": ("Carabobo", "VEN"),
    "Bahia": ("Bahia", "BRA"), "Deportes Tolima": ("Deportes Tolima", "COL"), "Boca Juniors": ("Boca Juniors", "ARG"),
    "Nacional": ("Nacional", "URU"), "Universitario": ("Universitario", "PER"), "Cruzeiro": ("Cruzeiro", "BRA"),
    "Barcelona SC": ("Barcelona SC", "ECU"), "Platense": ("Platense", "ARG"), "Caracas FC": ("Caracas FC", "VEN"),
    "GV San José": ("GV San José", "BOL"), "Mushuc Runa": ("Mushuc Runa", "ECU"), "Unión (Santa Fe)": ("Unión de Santa Fe", "ARG"),
    "Once Caldas": ("Once Caldas", "COL"), "Atlético-MG": ("Atlético Mineiro", "BRA"), "Fluminense": ("Fluminense", "BRA"),
    "Cienciano del Cusco": ("Cienciano", "PER"), "Bolívar": ("Bolívar", "BOL"), "Guaraní": ("Guaraní", "PAR"),
    "Independiente": ("Independiente", "ARG"), "Lanús": ("Lanús", "ARG"), "Millonarios": ("Millonarios", "COL"),
    "Deportivo Riestra": ("Deportivo Riestra", "ARG"), "Club Olimpia": ("Olimpia", "PAR"), "São Paulo": ("São Paulo", "BRA"),
    "Vasco da Gama": ("Vasco da Gama", "BRA"), "Montevideo City Torque": ("Montevideo City Torque", "URU"),
    "Barracas Central": ("Barracas Central", "ARG"), "Grêmio": ("Grêmio", "BRA"),
}
GROUPS = {  # (comp, season, chilean team) -> group letter
    ("copa-libertadores", 2025, "colo-colo"): "E", ("copa-libertadores", 2025, "universidad-de-chile"): "A",
    ("copa-libertadores", 2026, "universidad-catolica"): "D", ("copa-libertadores", 2026, "coquimbo-unido"): "B",
    ("copa-sudamericana", 2025, "palestino"): "E", ("copa-sudamericana", 2025, "union-espanola"): "F",
    ("copa-sudamericana", 2025, "deportes-iquique"): "H",
    ("copa-sudamericana", 2026, "ohiggins"): "C", ("copa-sudamericana", 2026, "palestino"): "F",
    ("copa-sudamericana", 2026, "audax-italiano"): "G",
}
MANUAL_PENS = {  # (date, home, away) -> (home_pens, away_pens, source)
    ("2026-03-03", "cobresal", "audax-italiano"): (2, 3, "https://www.emol.com/noticias/Deportes/2026/03/04/1193266/audax-italiano-copa-sudamericana-cobresal.html"),
    ("2026-08-19", "coquimbo-unido", "Platense (ARG)"): (6, 7, "https://www.emol.com/noticias/Deportes/2026/08/19/1209004/coquimbo-platense-penales-libertadores.html"),
    ("2026-07-30", "ohiggins", "Boca Juniors (ARG)"): (3, 4, "https://www.biobiochile.cl/noticias/deportes/futbol-internacional/notas-futbol-internacional/2026/07/30/fin-al-sueno-internacional-ohiggins-cayo-ante-boca-en-penales-y-se-despide-de-la-copa-sudamericana.shtml"),
}
MANUAL_VENUES = {
    ("2025-02-25", "Independiente Santa Fe (COL)"): "Estadio El Campín",
    ("2026-02-25", "Bahia (BRA)"): "Arena Fonte Nova",
    ("2026-03-03", "cobresal"): "Estadio Zorros del Desierto",
    ("2026-08-19", "coquimbo-unido"): "Estadio Francisco Sánchez Rumoroso",
    ("2026-07-30", "ohiggins"): "Estadio El Teniente",
    ("2025-04-10", "colo-colo"): "Estadio Monumental David Arellano",
    ("2025-08-20", "Independiente (ARG)"): "Estadio Libertadores de América",
}


def fname(espn_name):
    if tid(espn_name) in CHILEAN:
        return tid(espn_name)
    if espn_name in FOREIGN_NAMES:
        n, c = FOREIGN_NAMES[espn_name]
        return f"{n} ({c})"
    return espn_name


def enrich_conmebol(cont, of, log):
    out = []
    # two-legged ties: first match of a pair in a stage = Ida
    seen = {}
    for c in sorted(cont, key=lambda c: c["row"]["date"]):
        r = c["row"]
        r["home"], r["away"] = fname(c["_hn"]), fname(c["_an"])
        chil = r["home"] if r["home"] in CHILEAN else r["away"]
        season, comp = r["season"], r["competition_id"]
        stage = r["stage"]
        if stage == "Fase de grupos":
            g = GROUPS.get((comp, season, chil))
            stage = f"Fase de grupos · Grupo {g}" if g else stage
            if not g:
                log.append(f"sin grupo {comp} {season} {chil}")
        elif stage == "Fase preliminar":
            stage = "Fase preliminar (partido único)"
        else:
            key = (comp, season, stage, frozenset([r["home"], r["away"]]))
            stage += " · Vuelta" if key in seen else " · Ida"
            seen[key] = 1
        r["stage"] = stage
        st = c["_status"]
        if st == "FINAL_PEN":
            k = (r["date"], r["home"], r["away"])
            if k in MANUAL_PENS:
                r["home_pens"], r["away_pens"], src = MANUAL_PENS[k]
                r["source"] += " ; penales: " + src
            else:  # openfootball "a-b pen."
                for x in of.get((comp, season, r["home"] if r["home"] in CHILEAN else None,
                                 r["away"] if r["away"] in CHILEAN else None), []):
                    m = re.match(r"(\d+)-(\d+) pen\.", x["score"])
                    mon = datetime.date.fromisoformat(r["date"]).strftime("%b")
                    if m and x["date"] and x["date"][0] == mon and abs(x["date"][1] - int(r["date"][8:])) <= 1:
                        r["home_pens"], r["away_pens"] = m.group(1), m.group(2)
                        r["source"] += " ; penales: " + src_ref(f"ofsa_{season}_{'copal' if comp == 'copa-libertadores' else 'copas'}.txt")
                if r["home_pens"] == "":
                    log.append(f"penales sin dato {k}")
        elif st == "ABANDONED":  # Colo-Colo v Fortaleza 2025, suspended 0-0 ~70', awarded 0-3
            r["home_goals"], r["away_goals"] = 0, 3
            r["source"] += (" ; suspendido por incidentes (muerte de 2 hinchas en las afueras), CONMEBOL lo dio 0-3 a Fortaleza: "
                            + src_ref("ofsa_2025_copal.txt") + " [awarded]")
        elif st == "CANCELED":  # Independiente v U. de Chile 2025-08-20
            r["home_goals"], r["away_goals"] = 1, 1
            r["source"] += (" ; SUSPENDIDO en el entretiempo (1-1) por violencia en las tribunas; sin resultado oficial,"
                            " CONMEBOL descalificó a Independiente y avanzó U. de Chile (marcador = momento de la suspensión)")
        for (d, t), v in MANUAL_VENUES.items():
            if d == r["date"] and t == r["home"] and not r["venue"]:
                r["venue"] = v
        out.append(r)
    return out


# Copa Chile: keep only matches with at least one club playing Primera that season
PRIMERA = {
    2024: {"colo-colo", "universidad-de-chile", "universidad-catolica", "ohiggins", "coquimbo-unido", "audax-italiano",
           "palestino", "huachipato", "cobresal", "everton", "nublense", "union-la-calera", "union-espanola",
           "deportes-iquique", "cobreloa", "copiapo"},
    2025: {"colo-colo", "universidad-de-chile", "universidad-catolica", "ohiggins", "coquimbo-unido", "audax-italiano",
           "palestino", "huachipato", "cobresal", "everton", "nublense", "union-la-calera", "la-serena",
           "deportes-limache", "union-espanola", "deportes-iquique"},
    2026: {"colo-colo", "universidad-de-chile", "universidad-catolica", "ohiggins", "coquimbo-unido", "audax-italiano",
           "palestino", "huachipato", "cobresal", "everton", "nublense", "union-la-calera", "la-serena",
           "deportes-limache", "universidad-de-concepcion", "deportes-concepcion"},
}


VENUE_CANON = {
    "Estadio Municipal Nelson Oyarzún Arenas": "Estadio Bicentenario Nelson Oyarzún Arenas",
    "Estadio Municipal Oyarzún Arenas": "Estadio Bicentenario Nelson Oyarzún Arenas",
    "Estadio Codelco El Teniente": "Estadio El Teniente",
    "Estadio Huachipato": "Estadio Huachipato-CAP Acero",
    "Ester Roa Rebolledo": "Estadio Ester Roa Rebolledo",
    "Estadio Municipal Alcaldesa Ester Roa Rebolledo": "Estadio Ester Roa Rebolledo",
    "Estadio Municipal Francisco Sánchez Rumoroso": "Estadio Francisco Sánchez Rumoroso",
    "Francisco Sánchez Rumoroso": "Estadio Francisco Sánchez Rumoroso",
    "Estadio Municipal Nicolás Chahuán": "Estadio Nicolás Chahuán Nazar",
    "Estadio Nicolás Chahuán": "Estadio Nicolás Chahuán Nazar",
    "Estadio Municipal de La Florida": "Estadio Bicentenario de La Florida",
    "Estadio San Carlos de Apoquindo": "Claro Arena",
    "Estadio Tierra de Campeones Ramón Estay Saavedra": "Estadio Tierra de Campeones",
    "Estadio do Maracana": "Estádio do Maracanã",
    "Jorge Luis Hirschi": "Estadio Jorge Luis Hirschi",
    "Estadio El Campín": "Estadio Nemesio Camacho El Campín",
    "Estadio Santa Laura Universidad SEK": "Estadio Santa Laura-Universidad SEK",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=os.path.join(HERE, "raw"))
    ap.add_argument("--out", default=HERE)
    ap.add_argument("--no-fetch", action="store_true")
    a = ap.parse_args()
    if not a.no_fetch:
        fetch(a.raw)
    log = []
    rows = build_liga(a.raw, log)
    cont, of = build_conmebol(a.raw, log)
    rows += enrich_conmebol(cont, of, log)
    rows += build_rsssf(a.raw, log)
    man = os.path.join(HERE, "manual_web.csv")
    if os.path.exists(man):
        with open(man, encoding="utf-8") as f:
            for x in csv.DictReader(f):
                if x.get("date", "").startswith("#") or not x.get("date"):
                    continue
                rows.append(row(**{k: x.get(k, "") for k in COLS}))
    rows = [r for r in rows if r["competition_id"] != "copa-chile"
            or r["home"] in PRIMERA[int(r["season"])] or r["away"] in PRIMERA[int(r["season"])]]
    for r in rows:
        r["venue"] = VENUE_CANON.get(r["venue"], r["venue"])
    rows.sort(key=lambda r: (r["date"], r["competition_id"], r["home"]))
    with open(os.path.join(a.out, "matches.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(a.out, "build_log.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(log) + "\n")
    print(len(rows), "rows;", len(log), "log lines", file=sys.stderr)


if __name__ == "__main__":
    main()
