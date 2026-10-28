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
