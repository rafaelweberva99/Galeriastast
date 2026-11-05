# Goleadores por partido

`fetch_goals.py` descarga los goles de cada partido de la base (jugador, minuto, penal, autogol)
desde la API de marcadores de ESPN y, como respaldo, desde las fichas de worldfootball.net.
Genera `goals.csv`, `players.csv`, `coverage.csv` y `mismatches.csv` en el formato que carga
`src/lib/ingest/goals.ts`.

Estado:
- Probado solo con datos simulados (`python3 -I scripts/goals/test_fetch_goals.py`). La red del
  entorno de desarrollo bloquea ambas fuentes.
- Antes de cargar los resultados a la app, dos agentes los verifican por separado contra la prensa.
  La carga además exige que los goles de cada partido sumen el marcador.
- Ninguna de las dos fuentes tiene licencia abierta. Revisa sus términos antes de publicar.

Uso (desde la raíz del repo; la corrida completa toma horas, por eso todo queda en caché):

    python3 -I scripts/goals/fetch_goals.py --db data/galeriastats.db --out data/raw/goals --priority

## 2000-2001: anexos de Wikipedia (Colo-Colo y U. de Chile)

RSSSF solo trae apellidos en 2000 y 2001. `wikipedia_annex.py` lee los anexos de temporada de es.wikipedia.org
(`Anexo:Temporada 2001 del Club ...`), que traen cada partido con sus goleadores enlazados (nombre completo), y solo
escribe un partido si existe en la base, los goles suman el marcador, todos los goleadores tienen nombre completo y
RSSSF (otra fuente) coincide en los apellidos. Solo existen los anexos de 2001 de Colo-Colo y la U; los de 2000 no.

    python3 -I scripts/goals/wikipedia_annex.py --years 2001 --out data/raw/goals_wiki
