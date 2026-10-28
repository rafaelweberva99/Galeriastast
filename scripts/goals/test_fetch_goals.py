#!/usr/bin/env python3
"""Pruebas offline de fetch_goals.py con fixtures sinteticos (formato ESPN scoreboard y
fichas de worldfootball.net). Uso: python3 -I test_fetch_goals.py <ruta galeriastats.db>"""
import csv
import gzip
import hashlib
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DB = sys.argv[1] if len(sys.argv) > 1 else "data/galeriastats.db"


def put(cache, url, body):
    h = hashlib.sha1(url.encode()).hexdigest()
    os.makedirs(os.path.join(cache, h[:2]), exist_ok=True)
    with gzip.open(os.path.join(cache, h[:2], h + ".gz"), "wt", encoding="utf-8") as f:
        f.write(body)


def det(team, name, clock, og=False, pen=False, so=False):
    return {"type": {"text": "Goal"}, "scoringPlay": True, "ownGoal": og, "penaltyKick": pen, "shootout": so,
            "clock": {"displayValue": clock}, "team": {"id": team},
            "athletesInvolved": [{"displayName": name}]}


with tempfile.TemporaryDirectory() as tmp:
    cache = os.path.join(tmp, "cache")
    # Final Clausura 2009 vuelta: U. Catolica 2-4 Colo-Colo (fecha UTC 2009-12-10).
    # Se simula un autogol que la fuente atribuye al equipo del autor (debe reasignarse)
    # y un gol de tanda de penales (debe excluirse).
    sb = {"events": [{"id": "275559", "competitions": [{
        "status": {"type": {"completed": True}},
        "competitors": [
            {"homeAway": "home", "score": "2", "team": {"id": "1", "displayName": "Universidad Católica"}},
            {"homeAway": "away", "score": "4", "team": {"id": "2", "displayName": "Colo Colo"}}],
        "details": [det("1", "Rodrigo Valenzuela", "1'"), det("2", "Charles Aránguiz", "13'"),
                    det("2", "Esteban Paredes", "32'", pen=True), det("1", "Roberto Gutiérrez", "65'"),
                    det("2", "Esteban Paredes", "67'"),
                    det("2", "Cristian Bogado", "90'+2'", og=True),  # fuente "al reves"
                    det("1", "X", "120'", so=True)]}]}]}
    sb["events"][0]["competitions"][0]["details"][5]["team"]["id"] = "1"
    put(cache, "https://site.api.espn.com/apis/site/v2/sports/soccer/chi.1/scoreboard?dates=20091210&limit=200",
        json.dumps(sb))
    # worldfootball: 2009-12-05 Colo-Colo 2-2 U. Catolica (ida)
    sched = """<table class="standard_tabelle"><tr><td>05/12/2009</td><td>18:00</td>
      <td><a href="/teams/colo-colo/" title="Colo-Colo">Colo-Colo</a></td><td>-</td>
      <td><a href="/teams/universidad-catolica/" title="Universidad Católica">Universidad Católica</a></td>
      <td><a href="/report/primera-division-2009-clausura-playoffs-finale-colo-colo-universidad-catolica/">2:2 (1:1)</a></td></tr></table>"""
    put(cache, "https://raw.githubusercontent.com/yorobot/worldfootball/master/slugs/cl.1.csv",
        "season,slug\n2009 Clausura Playoffs,chi-primera-division-2009-clausura-playoffs\n")
    put(cache, "https://www.worldfootball.net/all_matches/chi-primera-division-2009-clausura-playoffs/", sched)
    rep = """<table class="standard_tabelle"><tr><th colspan="2">goals</th></tr>
      <tr><td class="hell"><b>0 : 1</b></td><td class="hell" style="padding-left: 50px;"><a href="/player_summary/a/" title="Jugador A">Jugador A</a> 10. / own goal</td></tr>
      <tr><td class="dunkel"><b>1 : 1</b></td><td class="dunkel"><a href="/player_summary/b/" title="Jugador B">Jugador B</a> 45. / penalty</td></tr>
      <tr><td class="hell"><b>2 : 1</b></td><td class="hell"><a href="/player_summary/b/" title="Jugador B">Jugador B</a> 70. / right-footed shot (Jugador C)</td></tr>
      <tr><td class="dunkel"><b>2 : 2</b></td><td class="dunkel" style="padding-left: 50px;"><a href="/player_summary/d/" title="J. B">J. B</a> 90.</td></tr>
      </table>"""
    put(cache, "https://www.worldfootball.net/report/primera-division-2009-clausura-playoffs-finale-colo-colo-universidad-catolica/", rep)
    out = os.path.join(tmp, "out")
    r = subprocess.run([sys.executable, "-I", os.path.join(HERE, "fetch_goals.py"), "--db", DB, "--out", out,
                        "--cache", cache, "--offline", "--seasons", "2009", "--competitions", "primera-division",
                        "--priority", "--raw-dir", os.path.join(os.path.dirname(DB), "raw", "wfb"),
                        "--catalog", os.path.join(os.path.dirname(DB), "catalog", "teams.json")],
                       capture_output=True, text=True)
    print(r.stderr)
    rows = list(csv.DictReader(open(os.path.join(out, "goals.csv"), encoding="utf-8")))
    vuelta = [x for x in rows if x["match_id"] == "2009-12-09_universidad-catolica_colo-colo"]
    ida = [x for x in rows if x["match_id"] == "2009-12-05_colo-colo_universidad-catolica"]
    for x in vuelta + ida:
        print(x)
    assert len(vuelta) == 6, len(vuelta)
    og = [x for x in vuelta if x["own_goal"] == "1"][0]
    assert og["scoring_team_id"] == "colo-colo" and og["minute"] == "90", og
    assert sum(x["penalty"] == "1" for x in vuelta) == 1
    assert len(ida) == 4
    assert ida[0]["own_goal"] == "1" and ida[0]["scoring_team_id"] == "universidad-catolica"
    assert ida[1]["penalty"] == "1" and ida[1]["scoring_team_id"] == "colo-colo"
    assert ida[2]["minute"] == "70" and ida[2]["player"] == "Jugador B"
    print(open(os.path.join(out, "players.csv"), encoding="utf-8").read())
    print("OK")
