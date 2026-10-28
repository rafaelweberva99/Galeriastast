# Dudas 1997-2003: marcadores en disputa y fechas de 1997-1998

Resolutor: Claude. No toqué ningún archivo del repositorio. Las salidas están en esta carpeta:

- `marcadores.csv`: los 19 marcadores en disputa (tarea A).
- `fechas_1997_1998.csv`: las 168 filas con fecha dada como rango en RSSSF (tarea B).
- `_obs.csv`: cada fecha observada, con su fuente (date, home, away, src). Es la materia prima de `fechas_1997_1998.csv`.
- Los scripts están en `../scripts/` (`marcadores.py`, `fechas.py`, `standings.py`, `partidos.py`, `grid.py`, `wget.sh`).
- Las descargas están en `../dl_rsssf/` y `../dl_wiki/`.

## 1. Método y fuentes

**Acceso.** Bajé directamente RSSSF (chile97 a chile03) y Wikipedia, esta última solo con `action=raw`. Varios sitios no se pueden abrir desde este entorno porque el proxy rechaza la conexión: emol, cooperativa, memoriawanderers.cl, historiadecolocolo.com, solofutbol.cl, guioteca, ceroacero, transfermarkt y web.archive.org. Su contenido lo leí **solo a través de resúmenes de WebSearch**, y quien verifique debe tenerlo en cuenta. Para no aceptar datos inventados por el resumidor seguí tres reglas:

- Hice las búsquedas sin poner el marcador buscado en la consulta.
- Solo acepté una fila cuando el resumen daba la fecha, el cruce y el marcador, y además el cruce y el resultado coincidían con RSSSF (en la tarea B).
- Descarté las líneas que el propio resumen marcaba como dudosas o que no cuadraban; por ejemplo, el "Osorno 0-2 Cobreloa 7/12/97" que dio un resumen.

**Independencia de las fuentes.**

- *en.wikipedia (grillas 1999-2003).* Copia RSSSF: las 19 filas coinciden exactamente con el CSV y la página enlaza a RSSSF. **No la conté como fuente independiente.**
- *es.wikipedia, anexos de temporada (UC 1997, 1998, 2001, 2002 y 2003; Colo-Colo 2001).*
  - Traen estadio, goles y minutos.
  - El anexo de Colo-Colo 2001 incluye árbitro y público, y algunos minutos distintos de RSSSF, así que no es una copia.
  - Los anexos de la UC citan a RSSSF y a soccerstats.us (que tiene el mismo origen que el CSV), así que pesan menos.
- *es.wikipedia, tablas de posiciones.* Las usé para reconciliar:
  - 2001 y 2002-2003: cuadran con el CSV.
  - 2000: **no** coincide con la tabla actual de RSSSF (ver la sección 2).
- *solofutbol.cl ("El almanaque de fútbol en la red").* Lista cada partido con fecha, estadio, marcador y goleadores.
  - Casi siempre coincide con RSSSF, así que no se puede descartar que tengan un origen común.
  - Tiene diferencias puntuales: el penal de Cáceres en Cobresal-Cobreloa 2002, y el 5-2 implícito en su tabla de 2000.
  - Lo traté como semi-independiente y, cuando pude, lo combiné con otra fuente.
- *memoriawanderers.cl (archivo histórico de Santiago Wanderers).*
  - Trae fecha, día de la semana, estadio, público, goleadores y minutos; en algunos casos los minutos difieren de RSSSF.
  - Lo consideré independiente.
- *historiadecolocolo.com, dalealbo.cl, colocoloenlamemoria (blog) y encancha.cl.* Son sitios de club o de prensa e independientes.
- *emol.com (El Mercurio).* Es prensa de la época, vista a través del resumen de WebSearch.

**Reconciliación con las tablas.** Escribí `standings.py`, que recalcula la tabla de cada torneo desde el CSV, primero tal cual y luego con el marcador de schochastics. Después comparé ambas versiones con las tablas publicadas en es.wikipedia y solofutbol.

## 2. Tarea A: los 19 marcadores

| Decisión | Filas |
|---|---|
| CONFIRMADO_CSV | 18 |
| CORREGIR | 1 |
| SIN_RESOLVER | 0 |

**Corrección:** 2000-12-16 colo-colo 5-0 santiago-morning pasa a **5-2**, y la fecha pasa a **2000-12-17**.

- Fuentes del 5-2:
  - dalealbo.cl: 17-dic-2000, 5-2, con 4 goles de S. González y uno de Reyes, y los de Arrué y Ferrero para Morning.
  - Blog Colo Colo en la memoria: 5 a 2.
  - historiadecolocolo.com: 17/12/2000, 5:2.
- Las tablas de es.wikipedia y de solofutbol (Colo-Colo 58-46, S. Morning 47-54) solo cuadran con 5-2.
- RSSSF no trae goleadores de ese partido.
- Coincide con schochastics, que daba 5-2 el 2000-12-17.

**Confirmados con confianza alta**, con al menos una fuente de partido independiente, en la mayoría de los casos más la reconciliación de tabla:

- 1999-12-15: Clásico en es.wikipedia, con goleadores, más encancha.cl.
- 2001-05-13 y 2001-05-19: memoriawanderers más tabla. También confirma que el UE-Wanderers fue el sábado 19, no el 20.
- 2001-12-09 Audax 2-4 Wanderers: emol, más tabla.
- 2001-12-09 Colo-Colo 4-1 UC: anexo de Colo-Colo 2001, con árbitro y público, más el anexo de la UC.
- 2002-03-17, 2002-04-06, 2002-04-28 (las dos filas), 2002-09-15 y 2002-11-03: solofutbol más tabla de es.wikipedia.
- 2002-08-25: solofutbol más anexo de la UC. El gol de Morning fue un autogol de Acuña al 90+2, lo que explica el 0-2 de schochastics.
- 2002-11-02: memoriawanderers (sábado 2-nov, Robles 34 y Soto 85) más tabla.
- 2003-03-01: memoriawanderers (3.625 espectadores) más tabla.
- 2003-03-22: solofutbol más anexo de la UC más tabla.

**Confirmados con confianza media** (no encontré crónica de prensa):

- **2000-11-11 deportes-concepcion 2-0 santiago-wanderers.**
  - A favor del 2-0:
    - solofutbol da 2-0 con los mismos goleadores que RSSSF (Pozo y Almendra).
    - memoriawanderers ubica a Wanderers 9° en 2000. Eso solo calza con la derrota: con 0-0 tendría 41 puntos y quedaría 7°.
  - En contra: **las tablas de es.wikipedia y en.wikipedia 2000 implican 0-0** (Concepción 11-10-9 28-30, Wanderers 10-11-9 47-46).
  - Esas tablas también implican el 5-2 de Colo-Colo, que sí está confirmado. Es posible que vengan de una versión antigua de RSSSF ("chile2000.html") o de schochastics.
  - Lo mantengo, pero conviene buscarle una crónica (El Sur o El Mercurio de Valparaíso, 12-nov-2000).
- **2001-07-01 huachipato 2-2 deportes-concepcion.** Tengo el partido en solofutbol (2-2 en Las Higueras) y dos tablas que cuadran (Huachipato 58-42, Concepción 35-51). Me falta prensa.
- **2002-09-22 santiago-morning 0-4 cobreloa.** Solo lo respalda solofutbol, con cuatro goleadores. Las tablas no sirven para distinguir aquí, porque los cambios de schochastics se compensan.

Nota sobre schochastics: el local "Universidad de Concepción" de 2000-11-11 es un error de etiqueta suyo. En 2000 y 2001 llama así a Deportes Concepción en todas las filas.

**Clubes con ítems todavía no del todo cerrados en la tarea A** (confianza media, ninguno sin resolver):

- deportes-concepcion
- santiago-wanderers
- huachipato
- santiago-morning
- cobreloa

## 3. Tarea B: fechas de 1997 y 1998

**Rondas con rango en RSSSF:**

- **Clausura 1997:** las 15 fechas.
  - 1 [Jul 26,27], 2 [Aug 2,3], 3 [Aug 9,10], 4 [Aug 23,24], 5 [Aug 30,31]
  - 6 [Sep 13,14], 7 [Sep 27,28], 8 [Oct 18,19], 9 [Oct 25,26], 10 [Nov 1,2]
  - 11 [Nov 22,23], 12 [Nov 29,30], 13 [Dec 6,7], 14 [Dec 13,14], 15 [Dec 20,21]
  - Son 120 filas del CSV.
- **1998:** fechas 1 a 6.
  - Apr 4,5 / Apr 11,12 / Apr 18,19 / Apr 25,26 / May 2,3
  - La fecha 6 es "May 5-10", un rango de 6 días.
  - Son 48 filas.
  - Desde la fecha 7, RSSSF da día exacto por partido.

**Resultado:**

| Torneo | Filas | CONFIRMADA | De ellas cambian de fecha | SIN_RESOLVER |
|---|---|---|---|---|
| Clausura 1997 | 120 | 120 | 68 | 0 |
| 1998, fechas 1 a 6 | 48 | 34 | 23 | 14 |

En 117 de las 154 filas confirmadas la fecha la respalda una sola fuente; en 37, dos o más. Fuentes:

- página de partidos del Clausura 1997 en solofutbol (la mayoría de las filas)
- historiadecolocolo (1997 y 1998)
- memoriawanderers (1997 y 1998)
- anexos UC 1997/1998 de es.wikipedia
- tablas de hat-tricks de es.wikipedia

**Hallazgos importantes de la tarea B:**

- **1997-07-27 coquimbo-unido 1-1 colo-colo está mal fechado.** Se jugó el **1997-12-03** (aplazado). Lo dicen RSSSF ("[Dec 3]"), solofutbol e historiadecolocolo.
- **En 1998 la fecha 6 se jugó entre el 5 y el 9 de mayo:**
  - Audax-UC: 5-may
  - La Serena-Colo-Colo: 6-may
  - Osorno-Coquimbo y Wanderers-Iquique: 9-may
  - El CSV pone 05-05 a toda la fecha.
- **Varias filas de 1998 se corren un día o más:**
  - Cobreloa-Iquique: 04-04 pasa a 04-05.
  - Palestino-Temuco y Puerto Montt-Iquique: pasan a 04-26.
  - Las de la fecha 2 pasan al 12-abr.
  - Las de la fecha 3 pasan al 19-abr, salvo UC-Palestino, que fue el 18.
- **Quedan 14 filas de 1998 SIN_RESOLVER.**
  - Clubes afectados y número de filas: deportes-temuco 4; deportes-concepcion 3; huachipato 3; rangers 3; universidad-de-chile 3; audax-italiano 2; cobreloa 2; la-serena 2; provincial-osorno 2; puerto-montt 2; coquimbo-unido 1; palestino 1.
  - Los partidos son:
    - fecha 1: Temuco-Rangers, Huachipato-La Serena
    - fecha 3: Concepción-Puerto Montt, Temuco-U. de Chile
    - fecha 4: Audax-Coquimbo, Huachipato-Osorno, Rangers-Concepción
    - fecha 5: Cobreloa-U. de Chile, Temuco-La Serena, Osorno-Audax
    - fecha 6: Huachipato-Temuco, Palestino-Cobreloa, Rangers-Puerto Montt, U. de Chile-Concepción

## 4. Fuera de alcance, pero hay que revisarlo

- **Apertura 1997.** RSSSF da una sola fecha por ronda (el domingo: "Round 1 (Feb. 16)", etc.) y el CSV la copió en las 120 filas. Pero el anexo de la UC 1997 de es.wikipedia muestra que **13 de los 15 partidos de la UC se jugaron el sábado anterior**. Por ejemplo, UC-Palestino fue el 15-feb y no el 16, y Cobreloa-UC fue el 31-may y no el 1-jun. Sospecho que toda la Apertura 1997 tiene el mismo problema; hay que tratarla como la tarea B.
- **Clausura 1997, fecha 8: Puerto Montt vs Coquimbo.** RSSSF y el CSV dicen 1-1. Dos resúmenes independientes de la página de solofutbol lo dieron como **1-0 para Puerto Montt (Vallejos de penal)**. No lo verifiqué; queda como posible duda de marcador.
- **Tabla de 2000.** es.wikipedia y en.wikipedia publican una tabla distinta de la que hoy tiene RSSSF:
  - Concepción 43 puntos y 6°, en vez de 45 y 5°.
  - Wanderers 41 y 7°, en vez de 40 y 9°.
  - Colo-Colo con 46 goles en contra.
  - Con el 5-2 corregido, la discrepancia que queda en el CSV se reduce a Concepción-Wanderers (ver la sección 2).
