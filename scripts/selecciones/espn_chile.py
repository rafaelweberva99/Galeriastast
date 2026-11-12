#!/usr/bin/env python3
"""
Descarga de ESPN los partidos de la Selección chilena (eliminatorias, Copa América, amistosos, Mundial, Confederaciones)
con el detalle de goles de AMBOS equipos. Guarda un JSON con los eventos en --out.

Uso:  python3 -I scripts/selecciones/espn_chile.py --out /tmp/wp/espn_chile.json
"""
import argparse, json, subprocess, sys, time

LEAGUES = ["fifa.worldq.conmebol", "conmebol.america", "fifa.friendly", "fifa.world", "fifa.confederations"]


def get(url: str) -> dict:
    for _ in range(3):
        out = subprocess.run(["curl", "-s", "--compressed", "-m", "60", url], capture_output=True, text=True).stdout
        try:
            return json.loads(out)
        except ValueError:
            time.sleep(5)
    return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/wp/espn_chile.json")
    ap.add_argument("--from-year", type=int, default=1997)
    ap.add_argument("--to-year", type=int, default=2026)
    a = ap.parse_args()
    res = {}
    for lg in LEAGUES:
        res[lg] = []
        for y in range(a.from_year, a.to_year + 1):
            d = get(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{lg}/scoreboard?dates={y}&limit=1000")
            for e in d.get("events", []):
                cs = (e.get("competitions") or [{}])[0].get("competitors", [])
                if any((c.get("team") or {}).get("abbreviation") == "CHI" and (c.get("team") or {}).get("displayName") == "Chile" for c in cs):
                    res[lg].append(e)
        print(lg, len(res[lg]), file=sys.stderr)
    json.dump(res, open(a.out, "w"))


if __name__ == "__main__":
    main()
