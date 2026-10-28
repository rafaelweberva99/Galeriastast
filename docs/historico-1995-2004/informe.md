# Verificación independiente: histórico de la Primera División de Chile (1995–2021)

Revisé `historico/matches.csv`, `correcciones_sugeridas.csv` y la base `galeriastats.db`, todo en modo solo lectura. Hay que tener en cuenta que la base **ya trae cargado `matches.csv`**: son las filas con `source='csv'`, y su `id` sigue el formato `fecha_local_visita`. Por eso las correcciones marcadas con `objetivo=csv` también deben aplicarse a esas filas de la base.

## Fuentes que usé (independientes del otro agente)

- **schochastics/football-data.** Lo descargué y lo crucé yo mismo. Cubre las 840 fechas regulares de 2000 a 2003 y los playoffs de 2004.
- **Búsqueda web.** Consulté es.wikipedia y en.wikipedia (anexos de temporada y artículos de liguillas), emol, cooperativa, ESPN, historiadecolocolo, cdcobresal, alairelibre y La Tercera.
- **Chequeos estructurales.** Usé el espejo de localía entre ruedas y torneos, y la lógica de las llaves.
- **No pude abrir directamente** rsssf.org, es.wikipedia.org, en.wikipedia.org, worldfootball.net ni historiadecolocolo.com. Solo los vi a través de los resúmenes del buscador.

## Resultado

| Bloque | Revisados | OK | ERROR | No concluyente |
|---|---|---|---|---|
| Muestra con evidencia web (1995–2022) | 61 | 47 | 9 (todos de fecha o localía) | 5 |
| Fecha regular 2000–2003 contra schochastics | 840 | 820 (97,6 %) en marcador y localía | 2 de localía (los corregí) | 16 de marcador (RSSSF dice una cosa, schochastics otra) |
| Archivo `verificacion.csv` | 101 filas | 68 | 12 | 21 |

- **Marcadores:** no encontré ningún marcador erróneo confirmado. Los 16 que difieren de schochastics quedan como NO_CONCLUYENTE. Tres casos de schochastics que cambian la localía resultaron ser errores de schochastics, como mostró el espejo de localía.
- **Campeones de 1995 a 2003:** coinciden todos.
  - 1995: U. de Chile.
  - 1996: Colo-Colo, que se aseguró el título con el 1-1 ante Audax.
  - 1997: el Apertura fue para la UC, en el desempate contra Colo-Colo (1-0 y 0-3, `is_final=1`). El Clausura fue para Colo-Colo.
  - 1998: Colo-Colo, que ganó 2-1 a Iquique el 13 de diciembre (64 puntos contra 63).
  - 1999: U. de Chile. Wikipedia habla de su racha de 33 partidos invicto, desde la 3.ª fecha hasta la 5.ª de la liguilla, y el CSV la reproduce exacta.
  - 2000: U. de Chile.
  - 2001: S. Wanderers.
  - 2002: la UC en el Apertura (1-1 y 4-0 a Rangers) y Colo-Colo en el Clausura (2-0 y 3-2 a la UC).
  - 2003: Cobreloa en el Apertura (0-0 y 4-0).
  - Liguillas Libertadores: 1995 la UC, 1996 la UC (por penales 4-2 a Cobreloa), 1998 la UC (por penales a la U), 2000 Deportes Concepción (3-2 en tiempo extra) y 2001 Cobreloa (4-4 y 2-1 con gol de oro). Todas coinciden con el CSV.
- **Chequeos internos:**
  - Nunca coinciden local y visita.
  - Todos los torneos de liga tienen los cruces completos. En los de dos ruedas cada pareja se enfrenta exactamente dos veces, y en Apertura y Clausura una vez.
  - Las tablas reconstruidas coinciden con las de RSSSF en 1996–2003. Quedan diferencias de un gol que vienen de la propia fuente: en 2001 entre O'Higgins y Puerto Montt (O'Higgins-U. de Chile figura con el 1-5 de cancha, no con el 0-2 adjudicado), y en 1999 con La Serena.
  - **Encontré cuatro fallas:**
    1. En la promoción de 1999 los cuatro equipos juegan dos veces el 19-dic.
    2. En 1996, Audax es local ante la U en las dos ruedas.
    3. En 2000, la U es local ante U. Española en las dos ruedas.
    4. En 2000, S. Morning es local ante Huachipato en las dos ruedas.

## Errores confirmados (detalle en `correcciones.csv`)

**En el CSV (13 filas):**
- **Promoción de 1999.** Los dos partidos de vuelta existieron, no son duplicados: Cobresal 2-3 Osorno e Iquique 0-1 Everton se jugaron el **22-dic-1999**. RSSSF decía «Date unknown» y el script copió la fecha de la ida.
- **Final del Apertura 2002.** Los partidos fueron el **26 y el 30 de junio**, no el 26 y el 30 de julio.
- **Localía invertida:**
  - 1996, fecha 22: debe ser U. de Chile 0-0 Audax.
  - 2000-12-16: debe ser U. Española 1-2 U. de Chile.
  - 2000-11-25: debe ser Huachipato 1-2 S. Morning.
- **Fechas de 1997 que quedaron un día antes.** RSSSF da la jornada como un rango de dos días («[Sep 13,14]») y el script tomó el primer día:
  - UC 4-1 Colo-Colo se jugó el 14-sep.
  - Colo-Colo 4-0 Temuco se jugó el 21-dic.
- **Fechas reales de 1996 que encontré:**
  - Colo-Colo 7-1 Concepción: 24-mar.
  - Colo-Colo 0-1 U. de Chile: 24-jul, en el Nacional. La fecha estimada era el 16-jun.
  - Colo-Colo 1-1 Audax: 11-nov.
- **1995.** UC 2-1 Cobreloa se jugó de verdad el 10-dic, en el Estadio Nacional.

**En la base (9 filas, todas de `correcciones_sugeridas.csv`):**
- **Cinco partidos de playoffs de 2004 con goles NULL.** Los marcadores confirmados son 2-0, 1-0, 2-0, 1-1 y 3-1. Cuadran con schochastics y con los globales que llevan a penales.
- **Wanderers-Rangers del 23-may-2004.** El resultado fue 3-0, no 0-3: Wanderers pasa a cuartos con un global de 4-1 (en.wikipedia y schochastics).
- **Repechaje del Clausura 2004.** El que avanzó fue Everton, así que el registro actual, que da ganador a Puerto Montt, está mal. No pude confirmar quién fue local; usé la localía de RSSSF.
- **2003-11-09.** El partido debe quedar como Huachipato 2-1 Audax. En el Apertura 2003 ya se jugó Audax-Huachipato, y los otros 119 cruces del Clausura están invertidos respecto del Apertura.
- **Definición Pre-Sudamericana 2009.** Se jugó el **16-jul** en Coquimbo, en cancha neutral, y ganó U. de Chile 3-1.

**Correcciones sugeridas que NO aplicaría:**
- No toquen las de 2005-09-03, 2006-05-28, 2008-11-29 y 2007-07-19. Solo las respalda RSSSF, y tanto la base (wfb) como schochastics coinciden con lo que ya está cargado.
- Los partidos adjudicados se resuelven con una decisión de criterio, no son errores de datos. Recomiendo guardar el resultado de cancha y agregar un campo de adjudicado, de modo que el partido de 2013-08-24 (0-3) quede alineado con el resto.

## Pendientes y advertencias

- **2019-11-22 La Calera-Iquique.** El partido se **suspendió** al minuto 66, con 0-0, y según la prensa que encontré nunca se reanudó ni se homologó. No debería contar como un 0-0 final: o se marca como suspendido o se saca de la tabla.
- **Fechas de 1997 y 1998.** Hay unas 160 filas (120 de 1997 y 40 de 1998) con la fecha del primer día de una jornada de dos días. Pueden tener un día de error.
- **1999-11-11, Concepción-O'Higgins.** RSSSF anota «10/11?», así que es dudoso si fue el 10 de noviembre o el 11 de octubre.
- **Siguen sin resolver 16 marcadores de 2000–2003 en los que RSSSF y schochastics no coinciden.** Entre ellos están Colo-Colo-Morning (5-0 contra 5-2) y Wanderers-Cobreloa (0-3 contra 1-1). Dejaría los de RSSSF porque cuadran con su tabla, aunque esa tabla no es una fuente independiente.
- **Fase regular de 1995 (240 partidos): no se pudo conseguir.** No está en GitHub: busqué en rsssf/mirror, rsssf/world, openfootball, footballcsv y con la búsqueda de código. Tampoco la saqué con la búsqueda web: en.wikipedia tiene la grilla de resultados, pero sin fechas, y el buscador no la devuelve completa. Para obtenerla hay que habilitar en la red de la sesión `en.wikipedia.org` (grilla) o `www.worldfootball.net` (fixtures con fecha).

## Recomendación

**Cargar con correcciones.** Hay que aplicar `correcciones.csv`: 13 cambios en el CSV o en las filas `source='csv'` de la base, y 9 en las filas `wfb`. Además, hay que decidir qué hacer con el partido de 2019.

**Fechas estimadas de 1996.** Son 240 partidos y no son fiables a nivel de día: en los tres casos que pude contrastar hubo desfases de 6, 7 y 38 días, porque hubo partidos postergados que se jugaron a mitad de semana. Propongo:
1. Mantener la jornada (el campo `stage`) y la fecha estimada solo para ordenar los partidos.
2. Agregar una marca `date_precision='estimada'`, o lo que ya trae `source`, y que la app no muestre el día exacto ni lo use en rachas por fecha o en «partidos de un día».
3. Reemplazar las fechas cuando se habilite `historiadecolocolo.com`, que tiene fecha por partido de Colo-Colo, o `worldfootball.net`/`es.wikipedia.org`. Mientras tanto, conviene aplicar las tres fechas reales que ya están en `correcciones.csv`.
