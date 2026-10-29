# Verificación: Copa Sudamericana 2005–2024, partidos de clubes chilenos

Archivo revisado: `sudamericana/sudamericana_2005_2024.csv`, con 310 filas, generado por el agente constructor. No se modificó ningún archivo del repositorio. La carga de prueba se hizo con una copia temporal del CSV, que se borró después; `git status` quedó limpio.

## Resumen

- **Completitud: correcta.** Están todos los partidos de todos los clubes chilenos de las 20 ediciones. No falta ninguno y no sobra ninguno. `faltantes.csv` solo tiene la cabecera.
  - Las 4 filas de 2022 de la U. Católica de Quito (contra Santos y Banfield) se descartaron bien.
  - Las 8 filas donde aparece la U. Católica de Ecuador **son partidos reales**: el rival de esa fila sí es chileno. Pero ver el error E1.
- **Exactitud: 309 OK y 1 NO_CONCLUYENTE, sin errores.** Se revisaron las 310 filas, no una muestra:
  - Las 310 se compararon con RSSSF, descargado de nuevo, en fecha, localía, marcador y penales.
  - 226 se compararon además con es.wikipedia, usando las plantillas `{{Partido}}` del artículo y de los anexos de cada fase. El constructor no usó esa fuente para 2010–2024.
  - Quedan cubiertos: las 14 filas de semifinal y final, las 13 tandas de penales, los 3 partidos suspendidos, la adjudicación San Lorenzo–Temuco 2018 y la fecha de Boca–UC 2005.
- **Formato: correcto, salvo un problema de carga (E1)** y algunas inconsistencias menores de nombres (O1–O3).
- **Carga de prueba**:
  - Se cargaron 310 partidos, con 0 rechazados y 0 "clubes chilenos fuera del catálogo" nuevos.
  - Pero 8 partidos quedan asignados al club equivocado (E1).

## Errores

### E1 (bloqueante): "Universidad Catolica (ECU)" se carga como la Universidad Católica chilena

En `src/lib/ingest/load.ts`, `ingestMatchesCsv` (línea 182) llama a `resolver.resolve(name)` **antes** de mirar el país. El nombre sin el código de país, "Universidad Catolica", se convierte en el slug `universidad-catolica`, que es el id del club chileno.

En la base de prueba (`sud.db`) se ve el efecto:
- 8 partidos quedaron como `universidad-catolica` contra Huachipato (2014), Colo-Colo (2019) y Unión La Calera (2022 y 2024).
- Eso suma a la UC chilena 8 partidos que no jugó.
- Hay 30 partidos "chileno vs chileno" en la Sudamericana 2005–2024, cuando deberían ser 22.

Filas afectadas:
- 2014-09-17 huachipato–U. Católica (ECU)
- 2014-09-24 U. Católica (ECU)–huachipato
- 2019-04-02 U. Católica (ECU)–colo-colo
- 2019-04-30 colo-colo–U. Católica (ECU)
- 2022-04-05 U. Católica (ECU)–union-la-calera
- 2022-05-24 union-la-calera–U. Católica (ECU)
- 2024-04-10 union-la-calera–U. Católica (ECU)
- 2024-05-09 U. Católica (ECU)–union-la-calera

Ningún otro nombre extranjero choca con el catálogo; se probaron todos.

**Solución posible** (hay que elegir una):
- (a) Renombrar el club a algo que no choque, por ejemplo `Universidad Católica del Ecuador (ECU)` o `Católica del Ecuador (ECU)`.
- (b) Corregir el ingest para que solo resuelva contra el catálogo cuando el país es nulo o CHI, como ya hace la ruta wfb en la línea 90. Esto toca el repositorio y queda a decisión del usuario.

### Sin errores de datos

No hay errores en fecha, localía, marcador ni penales.

## Casos revisados en detalle

| Partido | Veredicto | Detalle |
|---|---|---|
| 2005-11-24 Boca 2-2 UC (semifinal de ida) | NO_CONCLUYENTE (probablemente el 24) | **A favor del 24**: RSSSF "(Nov 24 and Dec 1)", y SoccerStatsUS, que deriva de RSSSF. **A favor del 23**: el artículo de es.wikipedia (el anexo de semifinales no existe). En.wikipedia no da la fecha. No se pudo consultar la ficha de CONMEBOL porque web.archive.org está bloqueado por el proxy. **Indicio a favor del 24**: la vuelta fue el jueves 1-dic, y la otra semifinal se jugó en miércoles (23 y 30). El marcador coincide en todas las fuentes. Se puede mantener el 24, dejando la nota. |
| 2018-07-26 San Lorenzo 3-0 Temuco | OK | **RSSSF**: marca el resultado como "awd" y su nota dice "originally 1-2, Temuco fielded ineligible player (Jonathan Requena)". **es.wikipedia**: también da 3-0. La fecha cuadra con "(Jul 26 and Aug 15)". Usar el resultado oficial es coherente con lo hecho en Colo-Colo–Fortaleza 2025. |
| 2006-10-19 Colo-Colo 4-1 Gimnasia | OK | Suspendido al minuto 86. RSSSF dice "result stood". |
| 2008-09-17 Olimpia 2-2 UC | OK | Suspendido al minuto 87. RSSSF (nota a) dice "result stood". |
| 2011-09-21 Nacional 0-2 U. de Chile | OK | Suspendido al inicio del segundo tiempo. RSSSF da 2-0 para la U. |
| 2012-10-25 Emelec 0-1 U. de Chile | OK | **es.wikipedia** pone el 24-oct. **El 25 lo dan**: RSSSF "(Oct 2-25)", ESPN (00:45Z del 26, o sea 19:45 hora local del 25) y openfootball ("Thu Oct 25"). Se mantiene el 25. Conviene agregar esta discrepancia a la nota de la fila. |
| 2021-01-12 y 01-16 Coquimbo–Defensa y Justicia | OK | Se reprogramaron desde el 7 y el 14 de enero, y la ida se jugó en Asunción. Coinciden es.wikipedia (con nota) y RSSSF "(Jan 12 and 16, 2021)". |
| 13 tandas de penales | OK | Coinciden con RSSSF en la orientación local–visita del partido de vuelta. Las que también trae es.wikipedia coinciden. |
| 14 semifinales y finales | OK | `is_final=1` está solo en las finales de 2006 y 2011. |

## Completitud por edición

Los clubes participantes y sus cruces salen de dos fuentes:
- **es.wikipedia**: la tabla de clasificados por país de cada edición, más los clubes que bajan de la Copa Libertadores.
- **RSSSF**: descargado de nuevo, de donde salen las llaves y los grupos.

En cada club se muestra "esperado/CSV". La columna "Partidos RSSSF" cuenta una sola vez los duelos entre dos chilenos.

| Ed. | Clubes chilenos (esperado/CSV) | Partidos RSSSF | Filas CSV | ¿Cuadra? |
|---|---|---|---|---|
| 2005 | Universidad Católica 10/10, Universidad de Chile 2/2 | 10 | 10 | sí |
| 2006 | Colo-Colo 12/12, Huachipato 2/2 | 12 | 12 | sí |
| 2007 | Colo-Colo 6/6, Audax Italiano 4/4 | 8 | 8 | sí |
| 2008 | Universidad Católica 6/6, Ñublense 2/2 | 8 | 8 | sí |
| 2009 | Universidad de Chile 6/6, Unión Española 4/4 | 10 | 10 | sí |
| 2010 | Unión San Felipe 4/4, Colo-Colo 2/2, Universidad de Chile 2/2 | 8 | 8 | sí |
| 2011 | Universidad de Chile 12/12, Universidad Católica 6/6, Deportes Iquique 2/2 | 18 | 18 | sí |
| 2012 | Universidad Católica 10/10, Cobreloa 4/4, Universidad de Chile 4/4, O'Higgins 2/2, Deportes Iquique 2/2 | 22 | 22 | sí |
| 2013 | Universidad de Chile 6/6, Universidad Católica 6/6, Colo-Colo 4/4, Cobreloa 4/4 | 20 | 20 | sí |
| 2014 | Huachipato 6/6, Deportes Iquique 2/2, Cobresal 2/2, Universidad Católica 2/2 | 12 | 12 | sí |
| 2015 | Universidad Católica 4/4, Huachipato 2/2, Santiago Wanderers 2/2, Universidad de Concepción 2/2 | 10 | 10 | sí |
| 2016 | Palestino 8/8, Universidad Católica 2/2, O'Higgins 2/2, Universidad de Concepción 2/2 | 14 | 14 | sí |
| 2017 | Palestino 4/4, O'Higgins 2/2, Universidad de Chile 2/2, Everton 2/2, Deportes Iquique 2/2 | 12 | 12 | sí |
| 2018 | Deportes Temuco 4/4, Unión Española 2/2, Everton 2/2, Audax Italiano 2/2 | 10 | 10 | sí |
| 2019 | Unión La Calera 4/4, Unión Española 4/4, Deportes Antofagasta 2/2, Colo-Colo 2/2, Palestino 2/2, Universidad Católica 2/2 | 16 | 16 | sí |
| 2020 | Coquimbo Unido 10/10, Unión La Calera 6/6, Universidad Católica 6/6, Huachipato 4/4, Audax Italiano 4/4 | 30 | 30 | sí |
| 2021 | Huachipato 8/8, Palestino 8/8, Deportes Antofagasta 2/2, Cobresal 2/2 | 16 | 16 | sí |
| 2022 | Unión La Calera 8/8, Deportes Antofagasta 8/8, Everton 6/6, Ñublense 2/2, Unión Española 2/2, Colo-Colo 2/2, Universidad Católica 2/2 | 26 | 26 | sí |
| 2023 | Audax Italiano 9/9, Palestino 7/7, Magallanes 6/6, Ñublense 4/4, Colo-Colo 2/2, Universidad Católica 1/1, Cobresal 1/1 | 26 | 26 | sí |
| 2024 | Coquimbo Unido 7/7, Unión La Calera 7/7, Huachipato 4/4, Palestino 4/4, Universidad Católica 1/1, Everton 1/1 | 22 | 22 | sí |

Otras comprobaciones:
- **Clubes de cada edición en es.wikipedia**: los clubes chilenos con bandera en cada artículo son los mismos que tiene el CSV.
- **Clubes que vienen de la Copa Libertadores**:
  - Están Iquique 2017, UC 2019 y 2020, Colo-Colo y UC 2022, Colo-Colo y Ñublense 2023, y Huachipato y Palestino 2024.
  - Se descartaron como faltantes La Calera 2021, Curicó 2023 y Cobresal 2024: no aparecen en la Sudamericana ni en RSSSF ni en es.wikipedia.
- **Formato 2022**: no hubo playoffs de octavos. La Calera y Everton quedaron segundos de su grupo y fueron eliminados. Colo-Colo y UC entraron directo a octavos, así que la etiqueta "Octavos de final" es correcta.
- **Grupos 2023**: Palestino y Magallanes terminaron terceros. Audax terminó segundo y jugó el playoff con Ñublense. Todo eso está en el CSV.

## Formato

Todo esto está correcto:
- La cabecera es la del encargo, en UTF-8 sin BOM, con saltos LF y las filas ordenadas por fecha.
- `competition_id` es `copa-sudamericana` y el torneo es `Copa Sudamericana <season>`.
- Los clubes chilenos son ids de `teams.json` y los extranjeros van como `Nombre (CCC)`.
- No hay filas sin club chileno.
- No hay duplicados de (fecha, local, visita), ni un equipo que juegue dos veces el mismo día.
- No hay choques con partidos que ya están en `data/matches`.
- Todas las fechas caen en el año de su edición. La excepción son las semifinales de 2020, jugadas el 12 y el 16 de enero de 2021 con season 2020, y es correcta.
- 9 filas tienen penales sin empate en el partido. Es correcto: son vueltas de llaves empatadas en el global, como en las filas de 2025–2026 del repo.

### Nombres de clubes extranjeros (O1)

Coinciden con `2024-2026.csv` cuando el club ya existía ahí: Fluminense, Botafogo, São Paulo, Olimpia, Vasco, Barcelona SC, Fortaleza, Mushuc Runa, etc. Si no, se usó el nombre de wfb, como `Flamengo RJ`, `Corinthians SP`, `Universidad Catolica (ECU)` (sin tilde, igual que wfb) o `12 de Octubre de Itauguá`.

Hay 16 nombres que no están ni en el repo ni en wfb, todos plausibles.

Inconsistencias menores:
- **Mismo club con dos nombres según la época**:
  - `Real Garcilaso (PER)` en 2016 y `Cusco FC (PER)` en 2020. RSSSF 2020 todavía dice "Real Garcilaso (Cusco)".
  - `San José (BOL)` en 2014 y `GV San José (BOL)` en 2025.
  - En la base quedan como rivales distintos.
- **Criterio contrario en otro caso**: `Independiente del Valle (ECU)` se usa también en 2013, cuando el club se llamaba Independiente José Terán, y wfb usa ese nombre en esos años.
- Hay que elegir un criterio único: nombre histórico o nombre actual.

### Estadios (O2)

Hay 18 filas de 2005–2008 sin estadio, lo que está bien porque ninguna fuente lo da.

Varios estadios chilenos se escriben distinto que en el repo. Como el ingest crea los estadios por slug, quedarían duplicados:

| CSV | Repo |
|---|---|
| `Estadio Ester Roa` (7) y `Estadio Alcaldesa Ester Roa Rebolledo` | `Estadio Ester Roa Rebolledo` |
| `Estadio Santa Laura` (10) | `Estadio Santa Laura-Universidad SEK` |
| `Estadio Municipal Francisco Sánchez Rumoroso` (7) | `Estadio Francisco Sánchez Rumoroso` |
| `Estadio Municipal Nicolás Chahuán Nazar` (3) | `Estadio Nicolás Chahuán Nazar` |
| `Estadio Monumental` (2006) | `Estadio Monumental David Arellano` |
| `Estadio Nacional` (2006, 2009) | `Estadio Nacional Julio Martínez Prádanos` |
| `Estadio Parque El Teniente` | `Estadio El Teniente` |
| `Estadio Municipal Nelson Oyarzún Arenas` | `Estadio Bicentenario Nelson Oyarzún Arenas` |

Además:
- `Estadio Nacional` también se usa para el de Lima (2020-12-02), lo que lo hace ambiguo.
- Dentro del mismo CSV hay variantes de un mismo estadio: Morumbi (`Estádio do Morumbi` y `Estádio Cícero Pompeu de Toledo`, con o sin "(Morumbi)") y `Estadio Dr. Nicolás Leoz` / `Léoz`.

Los estadios que trae es.wikipedia para 85 partidos coinciden con el CSV; solo cambia la forma de escribir el nombre.

### Etapas (O3)

La nomenclatura cambia según la fuente principal de cada época:
- 2005–2009 sigue a es.wikipedia: en 2007, Audax y Colo-Colo jugaron una "Primera fase", que en RSSSF es "Second Stage".
- 2010 en adelante sigue a ESPN.

Es aceptable, pero conviene saberlo si se van a comparar etapas entre años.

## Carga de prueba

Pasos:
1. `cp` del CSV a `data/matches/sudamericana-2005-2024.csv`.
2. `DATABASE_PATH=<scratchpad>/sudamericana-verif/sud.db npm run data:ingest`. No hay `DATABASE_URL` en el entorno, así que se usó SQLite.
3. `rm` de la copia.

Resultado: `sudamericana-2005-2024.csv  310 partidos`, 0 rechazados y ningún club chileno nuevo fuera del catálogo. Los 70 que lista el ingest vienen de wfb/Copa Chile, igual que antes. `git status`: "nothing to commit, working tree clean". Sí aparece el problema E1.

## Recomendación

**Aprobar con una corrección obligatoria y dos menores.**
1. **Obligatoria**: resolver E1, renombrando `Universidad Catolica (ECU)` o restringiendo el `resolve` del ingest CSV a clubes chilenos. Sin eso, la UC chilena suma 8 partidos que no jugó.
2. **Menor**: normalizar los nombres de los estadios chilenos a como están en el repo (O2), y elegir un criterio único de nombre histórico o actual para Real Garcilaso/Cusco FC, San José/GV San José e Independiente del Valle (O1).
3. **Opcional**: dejar en la nota de la fila Emelec–U. de Chile 2012 la discrepancia de es.wikipedia (24-oct). Boca–UC 2005 puede quedar en 24-nov con su nota actual.

## Fuentes y archivos

Fuentes descargadas por el verificador en `dl/`:
- RSSSF `sacups/sudamcup*.html` de 2005 a 2024.
- es.wikipedia `Copa_Sudamericana_YYYY` de 2005 a 2024 y 110 anexos de fases y grupos (otros 17 anexos no existen, devuelven 404).
- en.wikipedia 2005.
- web.archive.org y las Wikipedia en otros idiomas (pt, de, it) fueron rechazadas por el proxy.

Otros archivos:
- Scripts en `scripts/`, ejecutados con `python3 -I`.
- `verificacion.csv`: una fila por partido, las 310.
- `work_*.json`: resultados intermedios.
