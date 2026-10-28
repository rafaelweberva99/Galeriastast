# Auditoría de Primera División de Chile, 1995–2026 (GaleríaStats)

Base auditada: `/home/user/galeriastast/data/galeriastats.db`, abierta solo en lectura, filtrando `competition_id='primera-division'`.
Salida: `matches.csv` trae solo los partidos que **faltan** en la base: 2.125 filas. Se generan con `build_historico.py`. La comprobación de tablas está en `verificar_tablas.py`. Las correcciones a filas que ya están en la base van aparte, en `correcciones_sugeridas.csv`. Ese archivo es un extra y no forma parte de `matches.csv`.

## Fuentes

| Fuente | Qué aporta | Fiabilidad |
|---|---|---|
| `SoccerStatsUS/conmebol_data` (GitHub, commit `bb6c8c4`), archivos `games/country/chile/league/AAAA` y `sudamericana`. Es una conversión de las páginas RSSSF `chileNN.html` | Partidos de 1996 a 2003 con fecha (1996 viene sin fechas), liguillas, promociones de 1995 a 2013 y liguillas pre-Sudamericana de 2002 y 2004. También trae las tablas finales de RSSSF | Las tablas reconstruidas coinciden con las de RSSSF en todos los torneos de 1996 a 2003, salvo dos diferencias de 1 gol que vienen de la propia fuente (2001 y la liguilla de descenso de 1999) |
| `schochastics/football-data`, `data/results/games.parquet` (GitHub, commit `6ba5e7e`) | Resultados de Chile de 2000 a 2025. Sirve de **segunda fuente independiente** para el cruce. Para leerla hace falta pyarrow, así que el script stdlib no la usa | Coincide con RSSSF en el 97 % de los partidos de 2000 a 2003, y en el 99,9 % con la base entre 2004 y 2025 |
| Prensa vía WebSearch (redgol, t13, radioagricultura, ESPN, emol, Wikipedia) | 2019-11-22, la definición de 2020, la promoción de 2021, el formato del Apertura 2007 y la fecha de 1995 | Puntual |

`rsssf/tables` solo contiene `chile2025`, y `yorobot/cache.wfb.txt`, que es la fuente actual de la base, empieza en el Clausura 2003. No se pudo acceder a rsssf.org, es.wikipedia.org ni archive.org, porque el proxy solo deja pasar GitHub.

## Cobertura por año

Columnas: **Esperados** es el total según el formato. **En base** es el conteo actual por año calendario. **CSV** son las filas nuevas de `matches.csv`. **Faltan** es lo que sigue sin cubrirse.

| Año | Formato | Esperados | En base | CSV | Faltan | Campeón y verificación |
|---|---|---|---|---|---|---|
| 1995 | Torneo largo de 16 equipos y 30 fechas (240), más la Liguilla Pre-Libertadores, un todos contra todos de 4 equipos (6), más la Promoción (4) | 250 | 0 | 10 | **240** | U. de Chile, 62 pts. Solo se pudo verificar contra la tabla RSSSF, porque RSSSF no publica los resultados de 1995 |
| 1996 | Torneo largo 16×30 (240), más la Liguilla Libertadores con semis y final (6), más la Liguilla de Promoción (4) | 250 | 0 | 250 | 0 | Colo-Colo, 63 pts. La tabla reconstruida es igual a la de RSSSF. **Fechas estimadas** |
| 1997 | Apertura 16×15 (120) más un desempate a 2 partidos (UC y Colo-Colo empataron a 37), y Clausura 16×15 (120). Los dos últimos de la tabla anual descienden | 242 | 0 | 242 | 0 | Apertura: U. Católica, por el desempate (1-0 y 0-3). Clausura: Colo-Colo, 35 pts. Ambas tablas coinciden |
| 1998 | Torneo largo 16×30 (239 jugados más 1 W.O.), Liguilla Libertadores (6), Promoción (4) | 250 | 0 | 250 | 0 | Colo-Colo, 64 pts. Tabla igual a RSSSF, contando el W.O. Temuco-Concepción adjudicado 0-2 |
| 1999 | Torneo largo 16×30 (240). Después, una liguilla por el título y otra por el descenso, cada una de 8 equipos a 14 fechas (56 + 56), con bonificación de ¼ de los puntos. Más la Promoción (4) | 356 | 0 | 356 | 0 | U. de Chile, 47 pts con bonificación. Coincide (la fuente suma bonus y goles de la fase 1) |
| 2000 | Torneo largo 16×30 (240), más la Liguilla Pre-Libertadores a partido único (3) | 243 | 0 | 243 | 0 | U. de Chile, 61 pts. Tabla igual a RSSSF |
| 2001 | Torneo largo 16×30 (240, uno de ellos adjudicado), más la Liguilla Pre-Libertadores (6) | 246 | 0 | 246 | 0 | S. Wanderers, 66 pts. Puntos iguales a RSSSF. Queda una diferencia de 1 gol en contra entre O'Higgins y Puerto Montt dentro de la propia fuente |
| 2002 | Apertura en 4 grupos (16×15 = 120) más playoffs (12+8+4+2). Clausura igual (120 + 26). Partido por el 3.er cupo a Libertadores (2). Liguilla Pre-Sudamericana (14) | 308 | 0 | 308 | 0 | Apertura: U. Católica (1-1 y 4-0 a Rangers). Clausura: Colo-Colo (2-0 y 3-2 a la UC). Grupos iguales a RSSSF |
| 2003 | Apertura en grupos (120) con repechaje 1 y playoffs 12+8+4+2. Clausura igual (120 + 27) | 294 | 146 | 148 | 0 | Apertura: Cobreloa (0-0 y 4-0 a Colo-Colo). Clausura: Cobreloa (2-2 y 2-1). Grupos del Apertura iguales a RSSSF. **A la base le faltaba el repechaje del Clausura** (Puerto Montt 1-1 Audax, 16-nov) |
| 2004 | Apertura 18×17 (153) y playoffs (2+12+8+4+2). Clausura 153 y playoffs (1+12+8+4+2). Liguilla Pre-Sudamericana (32) | 393 | 361 | 32 | 0 | Apertura: U. de Chile (penales a Cobreloa). Clausura: Cobreloa. **5 partidos de playoffs con marcador NULL** y 2 errores (ver correcciones) |
| 2005 | Apertura y Clausura de 20 equipos (190 + 190), playoffs (16 + 15), Promoción (4) | 415 | 411 | 4 | 0 | Apertura: U. Española. Clausura: U. Católica (penales) |
| 2006 | Torneos de 19 equipos (171 + 171), playoffs (16 + 15), Promoción (4) | 377 | 373 | 4 | 0 | Apertura y Clausura: Colo-Colo |
| 2007 | Apertura 21×20 (210) **sin playoffs**. Clausura 210 más desempate y playoffs (1+8+4+2). Liguilla Sudamericana (2). Promoción en formato liguilla de 3 (6) | 443 | 437 | 6 | 0 | Apertura: Colo-Colo por tabla (47 pts, confirmado). Clausura: Colo-Colo (1-0 y 3-0 a la UdeC) |
| 2008 | Apertura con 20 equipos (190). Clausura con 19 (171), porque Deportes Concepción fue desafiliado. Playoffs (15 + 15). Promoción (4) | 395 | 391 | 4 | 0 | Apertura: Everton. Clausura: Colo-Colo |
| 2009 | Torneos de 18 equipos (153 + 153), playoffs (14 + 14), Liguilla Sudamericana (1), Promoción (4) | 339 | 335 | 4 | 0 | Apertura: U. de Chile. Clausura: Colo-Colo |
| 2010 | Torneo largo 18×34 (306), Liguilla Sudamericana (2), Liguilla Libertadores (6), Promoción (4) | 318 | 314 | 4 | 0 | U. Católica, 74 pts por tabla |
| 2011 | Torneos de 18 equipos (153 + 153), playoffs (14 + 14), Liguilla Sudamericana (2), Promoción (4) | 340 | 336 | 4 | 0 | Apertura y Clausura: U. de Chile |
| 2012 | Torneos de 18 equipos (153 + 153), playoffs (14 + 14), Promoción (4) | 338 | 334 | 4 | 0 | Apertura: U. de Chile. Clausura: Huachipato (penales) |
| 2013 | Transición 2013 (153), Promoción (2), Apertura 2013-14 (153), final de desempate (1), Liguilla Libertadores (6) | 315 | 313 | 2 | 0 | Transición: U. Española (38 pts, mejor diferencia de gol que la UC). Apertura 2013-14: O'Higgins (1-0 a la UC en el desempate) |
| 2014 | Clausura 2013-14 (153), Liguilla Sudamericana (6), Apertura 2014-15 (153), Liguilla Libertadores (6) | 318 | 318 | 0 | 0 | Clausura: Colo-Colo, 42 pts. Apertura: U. de Chile, 44 pts |
| 2015 | Clausura 2014-15 (153), Liguilla Sudamericana (6), Apertura 2015-16 (120, uno de ellos se completó el 11-ene-2016), Liguilla Libertadores (6) | 284 | 284 | 0 | 0 | Clausura: Cobresal, 34 pts. Apertura: Colo-Colo, 33 pts |
| 2016 | Clausura 2015-16 (120), Liguilla Sudamericana (6), Apertura 2016-17 (120), Liguilla Libertadores (1) | 248 | 248 | 0 | 0 | Clausura: U. Católica, 29 pts. Apertura: U. Católica, 31 pts |
| 2017 | Clausura 2016-17 (120), Transición 2017 (120), Liguilla Libertadores (2) | 242 | 242 | 0 | 0 | Clausura: U. de Chile, 30 pts. Transición: Colo-Colo, 33 pts |
| 2018 | Torneo largo 16×30 | 240 | 240 | 0 | 0 | U. Católica, 61 pts |
| 2019 | Torneo largo suspendido tras la fecha 25: 192 partidos más 2 de la fecha 26 | 194 | 193 | 1 | 0 | U. Católica, 53 pts. Faltaba La Calera 0-0 Iquique (22-nov, suspendido con 0-0) |
| 2020–21 | Torneo 2020 de 18×34 (306, terminó en febrero de 2021) más el partido de definición del descenso | 307 | 306 | 1 | 0 | U. Católica, 65 pts. Faltaba Colo-Colo 1-0 U. de Concepción (17-feb-2021, Talca) |
| 2021 | Torneo de 17×32 (272) más la Promoción contra Copiapó, jugada en enero de 2022 (2) | 274 | 272 | 2 | 0 | U. Católica, 68 pts |
| 2022 | 16×30 | 240 | 240 | 0 | 0 | Colo-Colo, 63 pts |
| 2023 | 16×30 | 240 | 240 | 0 | 0 | Huachipato, 57 pts |
| 2024 | 16×30 | 240 | 240 | 0 | 0 | Colo-Colo, 67 pts. El 2-4 UC-Everton de la base es correcto (ESPN) |
| 2025 | 16×30 | 240 | 240 | 0 | 0 | Coquimbo Unido, 75 pts |
| 2026 | 16×30, en curso | 240 | 240 | 0 | 0 | 199 jugados y 41 programados sin resultado. Colo-Colo lidera con 55 |

En las filas de 2019 a 2021 los conteos de la columna **En base** siguen el torneo, no el año calendario como en el resto. En la base, el campo `season` es el año de la fecha, de modo que los partidos del torneo 2020 jugados en 2021 llevan `season=2021`. `matches.csv` sigue la misma convención.

Comprobaciones hechas sobre la base para 2003–2026:
- En todos los torneos de fase regular cada equipo jugó el mismo número de partidos y no falta ni sobra ningún cruce, salvo 2019, que se suspendió.
- Los campeones que salen de la base coinciden con la lista oficial. En los torneos por tabla gana el líder con 3 puntos por victoria. En los torneos con playoffs gana el ganador de la final, con `is_final=1`.

## Hallazgos sobre los huecos que se pedía revisar

- **Playoffs del Apertura 2007: no existieron.** RSSSF y la prensa confirman que fue un torneo de 20 fechas sin playoffs, y Colo-Colo salió campeón por tabla. A la base no le falta nada en ese torneo.
- **Liguillas pre-Libertadores y pre-Sudamericana:**
  - Desde 2007 la base tiene todas las que trae worldfootball: 2007, 2009, 2010, 2011 y las de 2013 a 2017.
  - Faltaban la **Pre-Sudamericana 2002** (14 partidos) y la **2004** (32), ambas solo entre clubes de Primera. Ya están en el CSV.
  - También faltaba el partido por el 3.er cupo a la Libertadores 2002 (Palestino contra Cobreloa).
  - La **Pre-Sudamericana 2003** (30 partidos) se **excluyó** a propósito: fue una copa abierta a equipos de Primera B y Tercera.
  - En 2005, 2006, 2008, 2012 y desde 2018 no hubo liguillas.
- **Liguillas de promoción:**
  - **Ninguna estaba en la base.** Se agregan las de 1995, 1996, 1998, 1999, 2005–2013 y 2021, en total 54 partidos. Todas enfrentan a un club de Primera con uno de Primera B.
  - Si la app no quiere contarlas como partidos de Primera, basta con filtrar `stage='Promoción'`.
  - En 1997, 2000 y 2001 RSSSF no registra promoción, porque los descensos fueron directos.
- **Partidos de definición:** el de 2007 ya estaba en la base, igual que los de clasificación de 2008 y la final de desempate de 2013. Faltaba el de 2020 (Colo-Colo contra la UdeC).
- **Temporadas 2013-14 a 2016-17 y Transición 2017:** están completas, con su fase regular, finales y liguillas.
- **Conteos raros:**
  - 2003 (146): es correcto que falte el Apertura.
  - 2015 (284) y 2016 (248): un partido del Apertura 2015-16 se completó el 11-ene-2016.
  - 2019 (193): torneo suspendido, y además faltaba un partido.
  - 2020 y 2021: el torneo 2020 se reparte entre los dos años.
  - 2008: el Clausura tuvo 19 equipos.

## Problemas detectados en la base (detalle en `correcciones_sugeridas.csv`)

1. **Cinco partidos de playoffs de 2004 tienen goles NULL** y solo guardan los penales: 12-jun Wanderers-U. Española, tres partidos del 28-nov y el 12-dic UC-U. Española.
2. El 2004-05-23 la base registra Wanderers 0-3 Rangers. Las dos fuentes dan **3-0**, y es Wanderers quien pasa a cuartos.
3. En el repechaje del Clausura 2004 la localía está invertida. Con el registro actual habría ganado Puerto Montt, pero el que avanzó fue Everton.
4. La base mezcla criterios en los partidos adjudicados por el tribunal. El de 2013-08-24 está con el resultado adjudicado (0-3), mientras que los de 2008, 2009, 2011 y 2015 están con el de cancha. Conviene fijar un solo criterio.
5. Hay discrepancias menores de fecha o localía que solo aparecen en una fuente: 2003-11-09, 2005 fecha 1, 2006-05-28, 2008-11-29, 2009-07-17 y 2007-07-19. Tienen prioridad baja o media.

## Calidad de los datos nuevos (`matches.csv`)

- **Fechas:**
  - Fechas estimadas (250 filas, marcadas `FECHA ESTIMADA` en `source`): **1996 completo**, porque RSSSF no publica fechas. Se interpoló cada fecha entre el 16-mar y el 24-nov y se ajustó al domingo. Las fechas de la liguilla de 1996 sí son reales.
  - También son estimadas la liguilla y la promoción de 1995, salvo Colo-Colo 0-0 Temuco del 10-dic, que está confirmada.
  - Se corrigieron dos fechas imposibles de la fuente: «1/3/1997» y «6/22/2004».
- **Prórroga y adjudicaciones:**
  - En los playoffs de 2002 y 2003 el marcador incluye la prórroga con gol de oro (`asdet`). Queda anotado en `source`.
  - El W.O. de 1998 (Temuco-Concepción, no jugado y adjudicado 0-2) se incluye para que la tabla cuadre.
  - En 2001, O'Higgins-U. de Chile va con el **resultado de cancha 1-5**, y la nota indica que fue adjudicado 0-2, siguiendo el criterio mayoritario de la base.
- **Discrepancias RSSSF contra schochastics en 2000–2003 (≈15 marcadores):**
  - Partidos afectados:
    - 2000-12-16 Colo-Colo-S. Morning: 5-0 frente a 5-2.
    - 2001-05-13 Wanderers-San Felipe: 2-0 frente a 2-1.
    - 2001-05-19 U. Española-Wanderers: 0-2 frente a 0-3.
    - 2002-03-17 Wanderers-Cobreloa: 0-3 frente a 1-1.
    - 2002-04-06 Palestino-Temuco: 2-2 frente a 3-2.
    - 2002-04-28 Cobresal-Palestino: 2-3 frente a 2-2.
    - 2002-04-28 U. de Chile-Cobreloa: 4-2 frente a 3-2.
    - 2002-08-25 S. Morning-UC: 1-2 frente a 0-2.
    - 2002-09-15 Cobreloa-Wanderers: 2-0 frente a 3-0.
    - 2002-09-22 S. Morning-Cobreloa: 0-4 frente a 1-4.
    - 2002-11-02 Temuco-Wanderers: 0-2 frente a 1-2.
    - 2002-11-03 Cobresal-Cobreloa: 1-1 frente a 0-0.
    - 2003-03-01 Coquimbo-Wanderers: 0-2 frente a 0-0.
    - 2003-03-22 San Felipe-UC: 1-3 frente a 0-3.
  - Se usa RSSSF, porque sus partidos reproducen exactamente su tabla oficial. schochastics, además, confunde a Deportes Concepción con la U. de Concepción entre 2000 y 2002.
- **Equipo que no está en `teams`:** `Regional Atacama`, con 32 filas de 1995 y 1996. Va con el nombre del club tal cual.
- **Sedes:** solo hay sede en las finales y en algunos partidos. RSSSF no trae estadios.

## Pendiente

- **Fase regular de 1995 (240 partidos).** No hay fuente en GitHub: RSSSF solo publica la tabla. Se puede completar con es.wikipedia («Campeonato Nacional de Primera División de Chile 1995») o con prensa de la época, pero hay que habilitar `es.wikipedia.org` o `rsssf.org` en la red de la sesión.
- **Fechas reales de 1996** y de la liguilla y promoción de 1995: hacen falta las mismas fuentes.
- Confirmar con la ANFP si La Calera-Iquique 2019 quedó homologado 0-0. ESPN lo da como suspendido.
