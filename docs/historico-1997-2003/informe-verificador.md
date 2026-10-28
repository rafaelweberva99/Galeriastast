# Verificación de las dudas 1997-2003 (marcadores y fechas)

Verificador: Claude. No toqué ningún archivo del repositorio.

## Salidas

Archivos en esta carpeta:

- `marcadores_verif.csv`: 21 filas. Son los 19 marcadores en disputa, más Puerto Montt-Coquimbo 1997 y Cobreloa-La Serena 1997.
- `fechas_verif.csv`: 110 filas de fechas.
- este informe.

Archivos de apoyo, en otras carpetas:

- Scripts: `../verif97_scripts/`.
  - `tabla.py`: tabla por tramo, con marcadores alternativos.
  - `partidos.py`: parser de `{{partidos}}` de Wikipedia.
  - `cmp.py`: compara las fechas que observé con las del resolutor.
  - `sanity.py`: controles de coherencia.
  - `write_*.py`: generan los CSV.
- Observaciones: `../verif97_obs/`.
- Descargas: `../verif97_dl/`.

## Acceso y método

**Qué pude abrir.**

- Desde este entorno solo se pueden abrir rsssf.org, Wikipedia (con `action=raw`) y GitHub.
- solofutbol, memoriawanderers, historiadecolocolo, emol, dalealbo, soccerway y geocities están bloqueados, tanto con curl como con WebFetch.
- A esos sitios bloqueados los consulté **con búsquedas propias en WebSearch**. Las redacté de nuevo, sin repetir las del resolutor y **sin poner en la consulta el marcador buscado**.
- Usé el dato que trajo una búsqueda solo cuando cumplía dos condiciones: que el marcador coincidiera con el del CSV, si la fila no estaba en disputa, y que el cruce quedara claro.

**Fuentes nuevas respecto del resolutor:**

- Las tablas por *tramo* de 2000, recalculadas desde el CSV.
- Las páginas de Wikipedia "Liguilla Pre-Libertadores 2000" y "Anexo:Temporada 2000 UC".
- Los anexos "Detalle de resultados" del Apertura y del Clausura 2002 en es.wikipedia. Traen el resultado al entretiempo y estadios.
- Las páginas de memoriawanderers de 2001, Apertura y Clausura 2002, Apertura y Clausura 1997, y 1998, leídas con consultas propias.

**Hallazgo de método.** Las tablas de posiciones de es.wikipedia de 2001, 2002 y 2003 (y la del Apertura 1997) **citan RSSSF** y son idénticas a las suyas. Por eso la "reconciliación de tabla" que usó el resolutor en varias filas es circular y no aporta independencia. No invalida ninguna decisión, pero sí rebaja la confianza de las filas que dependían solo de eso:

- 2001-07-01
- 2002-09-22
- en parte, 2002-11-03

## 1. Marcadores (19 en disputa y 2 más)

| Veredicto | Filas |
|---|---|
| OK | 18 de las 19 en disputa, más las 2 adicionales |
| NO_CONCLUYENTE | 1 (2001-07-01) |
| ERROR | 0 |

### 2000-11-11 Concepción 2-0 Wanderers

**Veredicto: OK, y la confianza sube de media a alta.**

**La prueba de los tramos.** En 2000 la Liguilla Pre-Libertadores la jugaron los ganadores de cada tramo de 10 fechas. Wikipedia, en la página del torneo y en la de la Liguilla 2000, dice que Concepción entró como **ganador del tercer tramo** (fechas 21-30). Recalculé ese tramo desde el CSV:

| Hipótesis | Concepción en el tramo 3 | Rivales | Resultado |
|---|---|---|---|
| 2-0 | 6-3-1, 15-10, **21 pts** | U. de Chile, Palestino y Cobreloa, 19 pts | Gana el tramo |
| 0-0 | 19 pts | Empatado con esos tres | 4º por diferencia de gol, no gana el tramo |

Validé el método con los otros dos tramos y dan lo que dice Wikipedia:

- Tramo 1: gana la UC.
- Tramo 2: gana U. de Chile y Audax es 2º.

**Totales de la temporada según cada hipótesis:**

| Hipótesis | Concepción | Wanderers |
|---|---|---|
| 2-0 | 12-9-9, 30-30, 45 pts | 10-10-10, 47-48, 40 pts |
| 0-0 | 11-10-9, 28-30, 43 pts | 10-11-9, 47-46, 41 pts |

**Por qué las tablas de es.wikipedia y en.wikipedia 2000 dan el 0-0.** Coinciden exactamente con esa hipótesis. La de es.wikipedia cita una URL antigua de RSSSF (`chile2000.html`, que hoy da 404), y schochastics también da 0-0, fechado el 12-nov. Lo más probable es que ambas vengan de una versión vieja de RSSSF, que después se corrigió con goleadores (Pozo 29, Almendra 45).

**Lo que contradice esa tabla de Wikipedia:**

- El propio texto de la página: "Concepción remató en el quinto lugar, un punto más que los cruzados", es decir, 45 puntos.
- El anexo UC 2000 de es.wikipedia: Concepción 45 y Wanderers 9º con 40.
- memoriawanderers: Wanderers 9º.
- El dato de los tramos.

### 2000-12-16 Colo-Colo 5-0 Santiago Morning

**Veredicto: la corrección a 5-2, jugado el 2000-12-17, es correcta.**

- Las tablas del anexo UC 2000 y de la página de la temporada dan Colo-Colo 58-46 y S. Morning 47-54. Solo cuadran con 5-2.
- El anexo UC da 45 puntos a Concepción, así que no sale de la versión vieja del 0-0.
- Las fuentes de club que citó el resolutor (dalealbo, historiadecolocolo) no las pude abrir ni encontrar con búsquedas propias. Me apoyo en las tablas y en schochastics.

### Las otras dos filas de confianza media

**2001-07-01 Huachipato 2-2 Concepción: NO_CONCLUYENTE, mantener 2-2.**

- No encontré ninguna fuente nueva.
- La tabla de es.wikipedia que usó el resolutor es una copia de RSSSF.
- No hay discriminador por tramo: es la fecha 15, y 2-2 o 1-1 dan los mismos puntos.

**2002-09-22 S. Morning 0-4 Cobreloa: OK con confianza media, mantener.**

- La respaldan RSSSF (con cuatro goleadores y sus minutos) y solofutbol.
- Una consulta mía devolvió un resumen confuso con el mismo 4-0 y los mismos goleadores.

### Resto de los marcadores en disputa: reconfirmados con fuente nueva o reabierta

- **memoriawanderers**, con público y horarios:
  - 2001-05-13
  - 2001-05-19
  - 2001-12-09 Audax 2-4 Wanderers. También dice que el 4-1 de Colo-Colo a la UC se jugó dos horas antes.
  - 2002-03-17 (3.193 espectadores)
  - 2002-09-15 (1.596 espectadores)
  - 2002-11-02
  - 2003-03-01
- **Anexos de es.wikipedia** con entretiempo o estadio:
  - 2002-04-06
  - 2002-04-28 (las dos filas)
  - 2002-08-25
  - 2002-11-03
  - 2003-03-22

### Encargo adicional (a): 1997-10-19 Puerto Montt vs Coquimbo

**Veredicto: la corrección de 1-1 a 1-0 es correcta (confianza media-alta), con fecha 1997-10-19.**

- Una consulta mía a solofutbol devolvió: "19/10/97 Chinquihue, Puerto Montt 1 Vallejos (P) - Coquimbo 0". En la misma lectura, los otros tres partidos de esa fecha coinciden con el CSV.
- La tabla del Clausura 1997 de es.wikipedia cita RSSSF, pero difiere de RSSSF justo en estos dos clubes. Además es internamente coherente con el 1-0: suma de victorias = suma de derrotas = 91, y goles a favor = goles en contra = 337. Eso indica una edición deliberada desde otra fuente.
- La grilla de en.wikipedia también da 1-0.
- RSSSF no trae goleadores de ese partido.
- El cambio no altera ni el descenso ni las clasificaciones.

### Encargo adicional (b): Cobreloa vs La Serena, Apertura 1997, fecha 2

**Veredicto: OK, mantener 4-3.**

- Mi lectura de la misma página de solofutbol da: "23/2/97 Calama, Cobreloa 4 González (2), Riveros (P), Silva - La Serena 3 Lucca, Aredes, Cerino".
- El "4-1" del resumen anterior parece un error del resumidor.
- Esto también confirma la fila débil de fecha de ese partido.

## 2. Fechas

### Resultado

`fechas_verif.csv` tiene 110 filas:

| Veredicto | Filas | Detalle |
|---|---|---|
| OK | 106 | En **60 de ellas el resolutor cambia la fecha**, y confirmé ese cambio |
| RESUELVE_PENDIENTE | 1 | |
| NO_CONCLUYENTE | 3 | |
| ERROR | 0 | **Ninguna fecha del resolutor quedó contradicha** |

Las 60 fechas cambiadas que confirmé se reparten así:

| Torneo | Filas |
|---|---|
| Apertura 1997 | 25 |
| Clausura 1997 | 26 |
| 1998 | 9 |

### Cómo se confirmó cada fecha

- La mayoría se confirmó **reabriendo con consultas propias** las mismas fuentes del resolutor:
  - memoriawanderers (Apertura y Clausura 1997, 1998)
  - historiadecolocolo (Apertura y Clausura 1997, 1998)
  - el anexo UC 1997/1998, leído en raw
  - solofutbol: fechas 5, 8 y 14 del Clausura 1997, fecha 6 del Apertura 1997, fechas 5 y 6 de 1998
- En las lecturas de solofutbol **exigí que el marcador coincidiera con el CSV**. Lo cumplieron todas, salvo Puerto Montt-Coquimbo, que es justamente la corrección de marcador.
- Solo 4 filas tienen una fuente de fecha nueva respecto del resolutor:
  - 1997-05-03 Wanderers-UC (memoriawanderers)
  - 1998-05-06 La Serena-Colo-Colo (historiadecolocolo)
  - 1998-05-09 Wanderers-Iquique (solofutbol)
  - 1998-05-02 Cobreloa-U. de Chile (solofutbol)
- Para todas las demás filas, la confirmación depende de las mismas fuentes que usó el resolutor.

### Partidos que se mueven a otro fin de semana

Los confirmé todos, salvo uno:

- **1997-07-27 Coquimbo-Colo-Colo, jugado el 1997-12-03.**
  - historiadecolocolo lo lista como "1 · 03/12/1997 Coquimbo Unido 1:1 Colo-Colo", fuera de orden.
  - RSSSF lo da como "[Dec 3]".
- **1998 fecha 6.** Se jugó entre el 5 y el 10 de mayo:

| Partido | Fecha | Fuentes |
|---|---|---|
| Audax-UC | 5-may | anexo UC |
| La Serena-Colo-Colo | 6-may | historiadecolocolo y solofutbol |
| Osorno 4-0 Coquimbo | 9-may | solofutbol |
| Wanderers-Iquique | 9-may | memoriawanderers y solofutbol |
| Rangers-Puerto Montt | 10-may | **no pude reconfirmarlo** (NO_CONCLUYENTE) |

### Encargo adicional (c): filas débiles

| Partido | Veredicto | Motivo |
|---|---|---|
| Cobreloa-La Serena, 23-feb-1997 | OK | Mi lectura trae el rival y el 4-3 |
| Temuco-La Serena, 22-mar-1997 | OK, débil | "Temuco 6 (...)" el 22/3; es el único 6 de esa fecha y el CSV da 6-1 |
| Palestino-U. Española, 13-abr-1997 | NO_CONCLUYENTE | Solo aparece una línea huérfana "Unión Española · 0". Como el resolutor no cambia la fecha, no pasa nada |
| Cobreloa-U. de Chile, 2-may-1998 | OK, débil | "2/5/98 Calama, Cobreloa 1 Vallejos": Cobreloa es el único local en Calama esa fecha y el CSV da 1-0. La UC jugó ese día con Huachipato, según el anexo |

**Inconsistencia en los archivos del resolutor:** Cobreloa-U. de Chile sigue como `SIN_RESOLVER` en `fechas_1997_1998.csv` y como `CONFIRMADA_DEBIL` en `fechas_1998_pendientes.csv`. Hay que unificarlo.

### Fila nueva que se puede resolver

**1997-03-23 Huachipato vs U. de Chile** (el resolutor la dejó `SIN_RESOLVER`) se jugó el **1997-03-22**.

- Mi consulta a solofutbol devolvió: "22/3/97 Las Higueras, Huachipato 0 - Universidad de Chile 1 (Báez)". El CSV da 0-1.
- Es una fuente única, así que la confianza es media.

**Sigue abierta:** 1997-03-02 Audax-Coquimbo (1 o 2 de marzo). No encontré ninguna fuente nueva.

### Controles de coherencia (`sanity.py`)

Apliqué las 278 fechas nuevas de los tres archivos del resolutor sobre las temporadas 1997 y 1998 del CSV.

- **Ningún club juega dos partidos con menos de 2 días de diferencia.**
- **Los rangos de cada torneo son coherentes:**

| Torneo | Desde | Hasta |
|---|---|---|
| Apertura 1997 | 15-feb | 1-jun |
| Clausura 1997 | 26-jul | 21-dic |
| 1998 | 4-abr | 13-dic |

- **El único caso en que una fecha de una ronda queda después del inicio de la siguiente es el aplazado Coquimbo-Colo-Colo (fecha 1 jugada el 3-dic),** que es lo esperado.

## Desacuerdos con el resolutor

1. **Independencia de las tablas.** Las tablas de es.wikipedia de 2001 a 2003 no son independientes: citan RSSSF. Las filas 2001-07-01 y 2002-09-22 siguen en confianza media, y la primera la marco NO_CONCLUYENTE (aunque sin proponer cambio).
2. **2000-11-11.** No es de confianza media sino alta, gracias a la prueba del tercer tramo. El conflicto con la tabla de Wikipedia se explica por una versión antigua de RSSSF.
3. **Fila resoluble.** Huachipato-U. de Chile del Apertura 1997 se puede resolver: 1997-03-22.
4. **Duda de Cobreloa-La Serena.** El "4-1" fue un error del resumen: se mantiene el 4-3.
5. **Archivos del resolutor.** Unificar Cobreloa-U. de Chile 1998: `SIN_RESOLVER` en un archivo y `CONFIRMADA_DEBIL` en el otro.

## Recomendación final

**Aplicar:**

- La corrección de 2000-12-16: pasa a **2000-12-17, 5-2**.
- La corrección de 1997-10-18: pasa a **1997-10-19, Puerto Montt 1-0 Coquimbo**.
- Todas las fechas `CONFIRMADA` del resolutor. Ninguna resultó contradicha, y 60 de los cambios quedaron reconfirmados.
- La nueva fecha 1997-03-22 para Huachipato-U. de Chile.

**Mantener sin cambios** los otros 18 marcadores. En 2001-07-01 y 2002-09-22 la evidencia es buena, pero no tienen una segunda fuente independiente.

**Dejar abiertas:**

- Audax-Coquimbo 1997 (1 o 2 de marzo).
- Rangers-Puerto Montt 1998: el 10-may no lo pude reconfirmar.
- Las 8 filas de 1998 que siguen `SIN_RESOLVER`.

**Advertencia:** casi toda la evidencia de los sitios bloqueados viene de resúmenes de WebSearch. Si en otro entorno se permite el acceso a solofutbol.cl, memoriawanderers.cl e historiadecolocolo.com, conviene hacer una pasada de lectura directa.
