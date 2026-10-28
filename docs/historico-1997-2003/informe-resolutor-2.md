# Seguimiento de las dudas de 1997-1998

No modifiqué `marcadores.csv` ni `fechas_1997_1998.csv`, porque el verificador los está revisando. Esta ronda dejó cuatro archivos nuevos:

- `fechas_apertura_1997.csv`
- `fechas_1998_pendientes.csv`
- `marcador_1997_pmontt_coquimbo.csv`
- este informe

Las observaciones de las que salen están en `_obs_ap97.csv` y `_obs_1998b.csv`. Los scripts que las procesan son `../scripts/fechas_ap.py` y `../scripts/fechas.py`.

## Método y fuentes

Es el mismo de `informe.md`:

- **Fuentes de partido:**
  - solofutbol.cl (la lista de partidos de cada torneo)
  - historiadecolocolo.com
  - memoriawanderers.cl
  - los anexos de temporada de la UC 1997 en es.wikipedia
  - la tabla de hat-tricks de es.wikipedia
- **Cómo leí las fuentes bloqueadas:** a solofutbol, historiadecolocolo y memoriawanderers solo pude acceder a través de los resúmenes de WebSearch, porque el proxy las bloquea.
- **Regla de aceptación:** solo acepté una fecha cuando el resumen nombraba explícitamente el cruce y el resultado, y ese resultado coincidía con el de RSSSF.
- **Lo que descarté:** las líneas cuyo marcador estaba desordenado.
- **Confianza más baja:**
  - Marqué `CONFIRMADA_DEBIL` las filas en que el resumen daba fecha y marcador pero no el rival, y deduje el rival del cruce que trae RSSSF para esa fecha.
  - También rebajé las filas cuya única fuente es la tabla de hat-tricks de es.wikipedia. Esa tabla trae al menos un error demostrado: pone UC-U. Española el 24-3, cuando fue el 1-3. Por eso no la cuento como fuente fuerte.

## 1. Apertura 1997 (120 filas)

RSSSF da una sola fecha por ronda, siempre el domingo, y el CSV la copió en todas las filas.

| Estado | Filas | Fecha del CSV ya correcta | Cambia la fecha |
|---|---|---|---|
| CONFIRMADA | 115 | 66 | 49 |
| CONFIRMADA_DEBIL | 3 | 2 | 1 |
| SIN_RESOLVER | 2 | | |

Las 3 filas `CONFIRMADA_DEBIL` son:

- Cobreloa-La Serena, 23-feb
- Temuco-La Serena, 22-mar
- Palestino-U. Española, 13-abr

En la mayoría de los casos el cambio es un día antes, al sábado. Hay un caso de dos días: U. de Chile-Wanderers de la fecha 15 se jugó el sábado 31-may en Santa Laura. Lo dicen memoriawanderers y la tabla de hat-tricks de es.wikipedia.

**Las 2 filas sin resolver:**

- **1997-03-02 audax-italiano vs coquimbo-unido.** Los resúmenes de solofutbol se contradicen: uno da el 1-mar y otro el 2-mar.
- **1997-03-23 huachipato vs universidad-de-chile.** No encontré el partido. Un resumen daba un "0-1 el 22/3" con un goleador confuso, y no lo usé.

Clubes con filas abiertas en la Apertura: audax-italiano, coquimbo-unido, huachipato, universidad-de-chile. Más las tres filas débiles, que tocan a cobreloa, la-serena, deportes-temuco, palestino y union-espanola.

**Posible duda de marcador que no verifiqué.** En Cobreloa vs La Serena (fecha 2), RSSSF y el CSV dicen 4-3. Un resumen de solofutbol lo daba como 4-1, con goles de González (2), Riveros de penal y Silva. No lo resolví.

## 2. Las 14 filas pendientes de 1998

Ver `fechas_1998_pendientes.csv`.

| Estado | Filas |
|---|---|
| CONFIRMADA | 5 |
| CONFIRMADA_DEBIL | 1 |
| SIN_RESOLVER | 8 |

**Confirmadas,** todas con solofutbol:

- Huachipato-La Serena: 1998-04-05
- Huachipato-Osorno: 1998-04-26
- Rangers-Concepción: 1998-04-26
- Huachipato-Temuco: 1998-05-06
- Rangers-Puerto Montt: 1998-05-10. Confirma que la fecha 6 se extendió hasta el 10 de mayo.

**Débil:** Cobreloa-U. de Chile, 1998-05-02. El resumen trae un rival confuso: decía "UC", pero la UC jugó ese día con Huachipato.

**Sin resolver:**

| Fecha | Partido |
|---|---|
| 1 | Temuco-Rangers |
| 3 | Concepción-Puerto Montt |
| 3 | Temuco-U. de Chile |
| 4 | Audax-Coquimbo |
| 5 | Temuco-La Serena |
| 5 | Osorno-Audax |
| 6 | Palestino-Cobreloa |
| 6 | U. de Chile-Concepción |

Clubes con filas abiertas en 1998:

| Club | Filas abiertas |
|---|---|
| deportes-temuco | 3 |
| audax-italiano | 2 |
| deportes-concepcion | 2 |
| universidad-de-chile | 2 |
| cobreloa | 1 |
| coquimbo-unido | 1 |
| la-serena | 1 |
| palestino | 1 |
| provincial-osorno | 1 |
| puerto-montt | 1 |
| rangers | 1 |

Además, universidad-de-chile y cobreloa tienen la fila débil.

## 3. Puerto Montt vs Coquimbo (Clausura 1997, fecha 8)

**Decisión: CORREGIR de 1-1 a 1-0.** La confianza es media-alta, porque no encontré crónica de prensa. El detalle está en `marcador_1997_pmontt_coquimbo.csv`.

**Evidencia a favor del 1-0:**

- solofutbol.cl: "19/10/97 Chinquihue, Puerto Montt 1 Vallejos (P), Coquimbo 0". Salió igual en tres búsquedas distintas.
- La tabla del Clausura 1997 de historiadecolocolo.com, que es independiente: PM 7-3-5 21-19 24 pts; Coquimbo 5-5-5 14-13 20 pts. Solo cuadra con el 1-0.
- La tabla del Clausura en es.wikipedia: los mismos números.
- La grilla de resultados del Clausura en en.wikipedia: 1-0.

**Evidencia a favor del 1-1:**

- RSSSF, que es el origen del CSV. Su tabla trae PM 6-4-5 21-20 22 y Coquimbo 5-6-4 15-13 21.
- La tabla del Clausura en en.wikipedia, que contradice su propia grilla.
- Las tablas acumuladas de 1997 de es.wikipedia y en.wikipedia, calculadas sobre RSSSF.
- Una línea de estadísticas de es.wikipedia ("Coquimbo 6 empates"), que contradice su propia tabla.

El cambio no altera ningún descenso ni clasificación. La fecha real es el domingo 1997-10-19; ese cambio ya estaba en `fechas_1997_1998.csv`.

## Resumen de clubes con ítems abiertos

| Origen | Clubes |
|---|---|
| Apertura 1997 (SIN_RESOLVER) | audax-italiano, coquimbo-unido, huachipato, universidad-de-chile |
| 1998, fechas 1 a 6 (SIN_RESOLVER) | deportes-temuco, audax-italiano, deportes-concepcion, universidad-de-chile, cobreloa, coquimbo-unido, la-serena, palestino, provincial-osorno, puerto-montt, rangers |
| Dudas de marcador | cobreloa y la-serena (Apertura 1997, 4-3 o 4-1; sin verificar). puerto-montt y coquimbo-unido (1-0 propuesto, sin prensa) |
