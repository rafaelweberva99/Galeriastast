# Cobertura — partidos 2024 (2ª mitad), 2025 y 2026 de clubes de Primera

Fecha de corte: **2026-10-28**. Archivo: `matches.csv` (907 filas). Se reconstruye con `python3 -I build_matches.py`, que descarga fuentes de GitHub fijadas por commit y luego agrega `manual_web.csv`, donde están las filas sacadas de prensa, cada una con su URL. Un build desde cero produce un `matches.csv` idéntico byte a byte.

Criterio de inclusión: entran los partidos donde juega al menos un club que estaba en Primera **esa temporada**. Es el filtro que aplica el script a Copa Chile. La Liguilla de ascenso 2025 entra completa porque definió el ascenso de Deportes Concepción. Las fechas están en hora de Chile y las fuentes ESPN, que vienen en UTC, se convierten a America/Santiago.

## Resumen

| Competición | Año | Formato (confirmado) | Esperados | En CSV | Falta |
|---|---|---|---|---|---|
| Liga de Primera | 2024 (2ª mitad) | 16 clubes, 30 fechas | 57 (fechas 24-30 + Colo-Colo–UC, que estaba pendiente de la fecha 18) | 57 | — (base + complemento = 240 cruces únicos) |
| Liga de Primera | 2025 | 16 clubes, 30 fechas, doble rueda | 240 | 240 | — |
| Liga de Primera | 2026 | 16 clubes, 30 fechas (en curso) | 240 | 240 (199 jugados, 41 programados) | fechas 27-30: días tentativos (ver notas) |
| Copa Chile | 2024 (resto) | fase zonal + nacional | 8 (desde el 10-oct-2024 hasta la final del 20-nov) | 8 | — |
| Copa Chile | 2025 | 32 clubes (Primera + Primera B), 8 grupos de 4 a ida y vuelta, luego octavos, cuartos y semis a ida y vuelta, y final única | grupos: 74 con club de Primera; KO: 29 | 72 + 29 = 101 → **99** en el CSV (ver nota) | 2 partidos de grupo de Ñublense |
| Copa Chile | 2026 | 32 clubes, 8 grupos de 4 (fechas Primera B vs Primera B en ene-feb; resto jun-ago), octavos y cuartos a ida y vuelta | grupos 80, octavos 14, cuartos 8 | 80 + 14 + 8 = 102 (4 cuartos sin jugar) | semifinales y final aún sin programar |
| Supercopa | 2025 | partido único, Colo-Colo vs U. de Chile (14-sep-2025, Santa Laura) | 1 | 1 | — |
| Supercopa | 2026 | "Final Four" en el Sausalito (semis el 20 y 21 de enero, final el 25-ene) | 3 | 3 | — |
| Copa de la Liga | 2025 | **no existió** (se creó en 2026) | 0 | 0 | — |
| Copa de la Liga | 2026 | 16 clubes de Primera, 4 grupos de 4 a ida y vuelta, semis a ida y vuelta, final única | 48 + 4 + 1 | 53 (final sin jugar: 14-nov, Santa Laura) | — |
| Liguilla de ascenso | 2025 | Primera B, puestos 2 al 8 (Copiapó entra directo a semis) | 12 | 12 | — |
| Liguilla de ascenso | 2026 | aún no se juega (la Liga de Ascenso termina en noviembre) | — | 0 | se jugará después del corte |
| Promoción Primera/Primera B | 2025-26 | **no existe** en el formato actual | — | — | — |
| Copa Libertadores | 2025 | Iquique y Ñublense (fase 2), Iquique (fase 3), Colo-Colo (grupo E) y U. de Chile (grupo A) | 18 | 18 | — |
| Copa Libertadores | 2026 | Huachipato (fase 2), O'Higgins (fases 2 y 3), UC (grupo D, octavos) y Coquimbo (grupo B, octavos) | 22 | 22 | — (ya no quedan clubes chilenos) |
| Copa Sudamericana | 2025 | fase preliminar chilena; Palestino (E), U. Española (F) e Iquique (H); U. de Chile llegó a semifinales | 30 | 30 | — |
| Copa Sudamericana | 2026 | fase preliminar; O'Higgins (C), Palestino (F) y Audax (G); O'Higgins jugó el playoff con Boca | 22 | 22 | — |

Nota sobre Copa Chile 2025: hay 72 partidos de grupo y 27 de eliminación directa en el CSV, 99 en total. El filtro deja fuera la llave de octavos Santiago Wanderers–Antofagasta, porque son 2 partidos entre clubes de Primera B.

## Fuentes

**Desde GitHub** (descarga reproducible con `build_matches.py`, commits fijados):

| Fuente | Qué aporta |
|---|---|
| `vicentemaartinez/cadlag` `data/raw/espn/chi.1_2012-2026.csv` + `chi.1_meta.json` | Liga 2024/2025/2026 desde ESPN: hora UTC, marcador, estado, y el fixture 2026 completo hasta la fecha 30 |
| `vicentemaartinez/cadlag` `espn_dump_2010-2026.txt.gz` | Libertadores y Sudamericana desde ESPN: fase, estado y marcador |
| `HectorMontiel/mundial-2026-predictor` `historico_chi_primera.csv`, `historico_libertadores.csv`, `historico_sudamericana.csv` | Estadios (ESPN) y resultados de Liga hasta el 26-oct-2026 |
| `griffisben/Post_Match_App` `League_Files/Chilean Primera Division Full Match List 2025/2026.csv` | Número de fecha (Opta) y control cruzado de marcadores |
| `danonino21/Chile-football` `data/matches.csv`, `pending_fixtures.json` | Número de fecha de los partidos 2026 no jugados |
| `yorobot/cache.wfb.txt` `2024/cl.1.txt` | Número de fecha de la Liga 2024 |
| `openfootball/south-america` `copa-libertadores/2025_copal.txt`, `2025_copas.txt`, `2026_copal.txt` | Penales y el 0-3 por secretaría de Colo-Colo–Fortaleza |
| `rsssf/tables` `tablesc/chile2025.txt` | Tabla final 2025 (control), Copa Chile 2025 desde octavos y liguilla de ascenso 2025 |
| `guigalhano/jogos-chile-scraper` `data/jogos_programados.csv` | Fechas y estadios oficiales que publica campeonatochileno.cl para los partidos próximos (fecha 26, UC–Audax reprogramado, cuartos de Copa Chile, final de la Copa de la Liga). Su historial de git sirvió para fechar y ubicar los partidos de jun-ago 2026. |

**Desde la web** (`manual_web.csv`, con la URL en cada fila): Cooperativa, ESPN/espn.cl, Emol, BioBío, La Tercera, Redgol, AlAireLibre, T13, Primera B Chile, Radio La Señal, campeonatochileno.cl, solofutbol.cl (listas de grupos de Copa Chile), ceroacero (tablas), Puranoticia, El Ciudadano, Prensa Latina, entre otras. WebFetch está bloqueado en esta sesión, así que estos datos se sacaron de los resúmenes de WebSearch. Por eso cada grupo se validó contra la tabla final publicada (ver `checks.md`).

## Lo que falta o hay que verificar

1. **Copa Chile 2025, grupo H**: faltan Ñublense–Santa Cruz (fecha 3, alrededor del 8-feb, 2-2 según una sola fuente y sin fecha confirmada) y Curicó–Ñublense (10 u 11 de mayo; ganó Curicó según las tablas, pero no hay marcador).
2. **Copa Chile 2025**: Deportes Concepción 1-0 Unión Española aparece con fecha **aproximada** del 2025-06-07. Era el pendiente de la fecha 1 y la nota se publicó el 8-jun. Además, casi no hay estadios en la fase de grupos 2025 ni en los octavos-final 2025 (RSSSF no los trae) y falta el estadio de la final del 10-dic-2025.
3. **Copa Chile 2026, octavos**: Everton–U. de Chile (24-sep) se suspendió al minuto 82 con 1-0 para Everton por incidentes. La federación ordenó jugar los minutos restantes el 27-sep sin público. En el CSV figura **0-1**, deducido del global 2-1 que informó la prensa, y hay que confirmar el marcador final oficial.
4. **Copa Chile 2026, cuartos**: la vuelta Colo-Colo–Puerto Montt del 6-oct se suspendió por lluvia con 1-0. Está reprogramada para el **2-nov** (en el CSV sin resultado), y no está claro si se jugará completa o solo los minutos que faltan. La Calera–Coquimbo pasó del 20-oct al 4-nov, con vuelta el 24-nov. U. de Chile–Antofagasta pasó del 21-oct al 5-nov. ESPN muestra 0-0 en algunos de estos partidos, pero son marcadores de relleno de partidos postergados y no se usaron.
5. **Copa Chile 2026, marcadores con una sola fuente**: Ñublense 2-2 Curicó (5-jul; el empate cuadra con las tablas) y Ñublense 4-2 UdeC (25-jun; la victoria está confirmada). Los partidos de la fecha 3 (19 al 21 de junio) están fechados según solofutbol y campeonatochileno.
6. **Liga 2026, fechas 27 a 30**: la fecha 26 es oficial (campeonatochileno.cl). Las fechas 27-30 vienen del snapshot de ESPN del 25-oct, con fin de semana tentativo y sin estadio, y la ANFP programa fecha a fecha. Hay que volver a correr el build cuando se actualicen las fuentes. UC–Audax (fecha 24, postergado) quedó para **hoy, 28-oct, 20:30, Claro Arena**.
7. **Continentales**: Independiente–U. de Chile (20-ago-2025) se suspendió en el entretiempo con **1-1** por la violencia en la tribuna. No tiene resultado oficial: la CONMEBOL descalificó a Independiente. Colo-Colo–Fortaleza (10-abr-2025) se suspendió y la CONMEBOL lo dio **0-3**. No hay estadio para los partidos únicos UC–Palestino y U. Española–Everton de la fase preliminar de la Sudamericana 2025.
8. **Grupos continentales**: las letras de 2025 de Colo-Colo (E) y U. de Chile (A) en la Libertadores son conocidas, pero no se volvieron a verificar en esta sesión. Las de 2026 sí están confirmadas por prensa.
9. **Fuera de alcance, pero detectado**: la base no tiene la **Copa Sudamericana 2024** de los clubes chilenos. openfootball tiene `2024_copas.txt` si se quiere agregar.
10. **Etapas de Copa Chile 2024**: se usaron los mismos nombres que ya tiene la base ("Octavos/Cuartos de final" para las llaves zonales y "Semifinal" para las semis), así que no corresponden exactamente a la nomenclatura oficial (final zonal o semifinal nacional).
11. Equipos sin id en la lista: **Deportes Santa Cruz** (Copa Chile 2026) va con su nombre tal cual, y los extranjeros van como "Nombre (PAÍS)".
