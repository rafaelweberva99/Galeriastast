# Selección chilena

`chile_wikipedia.py` arma `data/matches/seleccion-chilena.csv` (partidos desde 1997) y `data/goals/goals-seleccion.csv` desde las páginas
"Chile national football team results" de Wikipedia (CC BY-SA). Los goles de ambos equipos vienen de ESPN (`espn_chile.py`) y, en 1997–2001,
de RSSSF (solo si traen nombre y apellido); donde no hay detalle del rival quedan solo los goles de Chile y el partido no cuenta para
"ídolo/verdugo" (igual que un partido de club sin goles completos).

    python3 -I scripts/selecciones/espn_chile.py --out /tmp/wp/espn_chile.json
    python3 -I scripts/selecciones/chile_wikipedia.py --cache /tmp/wp --espn /tmp/wp/espn_chile.json
    python3 -I scripts/selecciones/test_chile_wikipedia.py
