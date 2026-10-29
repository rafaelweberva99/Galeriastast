# Copa Sudamericana 2005–2024: partidos de clubes chilenos (informe del constructor)

Archivo: `sudamericana_2005_2024.csv`, con 310 filas y la misma cabecera que `data/matches/*.csv`. No se modificó ningún archivo del repositorio.

## Resumen

- Hay **310 partidos** de 20 ediciones. Ninguno quedó sin fuente.
- **310/310 filas** tienen fecha, localía y marcador confirmados por al menos 2 fuentes. Con 3 o más fuentes coincidentes hay 308 filas: 52 con 3, 202 con 4 y 54 con 5.
- Contando "familias" independientes (RSSSF y SoccerStatsUS son una sola familia, porque SoccerStatsUS se deriva de RSSSF; Wikipedia EN y ES también cuentan como una):
  - 1 fila tiene una sola familia: 2005-11-24 Boca–UC (ver discrepancias).
  - 48 filas tienen 2 familias.
  - 261 filas tienen 3 o más familias.
- Todos los clubes chilenos existen en `data/catalog/teams.json`, así que no hay nombres planos.
- Aparecen los dos partidos que el usuario asistió:
  - `2011-10-19 Flamengo RJ (BRA) 0-4 universidad-de-chile`. Ver la nota sobre el estadio más abajo.
  - `2017-05-10 universidad-de-chile 1-2 Corinthians SP (BRA)`.

## Partidos por edición

En la columna de clubes, el número entre paréntesis es la cantidad de partidos de ese club. Un duelo entre dos chilenos cuenta para ambos. La última columna indica cuántas filas tienen 2 o más fuentes coincidentes.

| Ed. | Filas | Clubes chilenos | Registros por fuente | ≥2 fuentes |
|---|---|---|---|---|
| 2005 | 10 | Universidad Católica (10), Universidad de Chile (2) | SoccerStatsUS 10, Wiki ES 10, RSSSF 10 | 10/10 |
| 2006 | 12 | Colo-Colo (12), Huachipato (2) | SoccerStatsUS 12, Wiki ES 12, RSSSF 12 | 12/12 |
| 2007 | 8 | Colo-Colo (6), Audax Italiano (4) | SoccerStatsUS 8, Wiki ES 8, RSSSF 8, Wiki EN 2 | 8/8 |
| 2008 | 8 | Universidad Católica (6), Ñublense (2) | SoccerStatsUS 8, Wiki ES 8, RSSSF 8, Wiki EN 2 | 8/8 |
| 2009 | 10 | Universidad de Chile (6), Unión Española (4) | SoccerStatsUS 10, Wiki EN 10, Wiki ES 10, RSSSF 10 | 10/10 |
| 2010 | 8 | Unión San Felipe (4), Colo-Colo (2), Universidad de Chile (2) | ESPN 8, SoccerStatsUS 8, Wiki EN 8, RSSSF 8 | 8/8 |
| 2011 | 18 | Universidad de Chile (12), Universidad Católica (6), Deportes Iquique (2) | ESPN 18, Wiki EN 18, RSSSF 18, SoccerStatsUS 10 | 18/18 |
| 2012 | 22 | Universidad Católica (10), Cobreloa (4), Universidad de Chile (4), O'Higgins (2), Deportes Iquique (2) | ESPN, SoccerStatsUS, openfootball, Wiki EN, RSSSF (22 c/u) | 22/22 |
| 2013 | 20 | Universidad de Chile (6), Universidad Católica (6), Colo-Colo (4), Cobreloa (4) | ESPN, SoccerStatsUS, openfootball, Wiki EN, RSSSF (20 c/u) | 20/20 |
| 2014 | 12 | Huachipato (6), Deportes Iquique (2), Cobresal (2), Universidad Católica (2) | ESPN, SoccerStatsUS, openfootball, Wiki EN, RSSSF (12 c/u) | 12/12 |
| 2015 | 10 | Universidad Católica (4), Huachipato (2), Santiago Wanderers (2), Universidad de Concepción (2) | ESPN, openfootball, Wiki EN, RSSSF (10 c/u) | 10/10 |
| 2016 | 14 | Palestino (8), Universidad Católica (2), O'Higgins (2), Universidad de Concepción (2) | ESPN, openfootball, Wiki EN, RSSSF (14 c/u) | 14/14 |
| 2017 | 12 | Palestino (4), O'Higgins (2), Universidad de Chile (2), Everton (2), Deportes Iquique (2) | ESPN, openfootball, Wiki EN, RSSSF (12 c/u) | 12/12 |
| 2018 | 10 | Deportes Temuco (4), Unión Española (2), Everton (2), Audax Italiano (2) | ESPN 10, openfootball 10, Wiki EN 10, RSSSF 8 | 10/10 |
| 2019 | 16 | Unión La Calera (4), Unión Española (4), Deportes Antofagasta (2), Colo-Colo (2), Palestino (2), Universidad Católica (2) | ESPN, openfootball, Wiki EN, RSSSF (16 c/u) | 16/16 |
| 2020 | 30 | Coquimbo Unido (10), Unión La Calera (6), Universidad Católica (6), Huachipato (4), Audax Italiano (4) | ESPN 30, openfootball 30, Wiki EN 30, RSSSF 28 | 30/30 |
| 2021 | 16 | Huachipato (8), Palestino (8), Deportes Antofagasta (2), Cobresal (2) | ESPN, openfootball, Wiki EN, RSSSF (16 c/u) | 16/16 |
| 2022 | 26 | Unión La Calera (8), Deportes Antofagasta (8), Everton (6), Ñublense (2), Unión Española (2), Colo-Colo (2), Universidad Católica (2) | ESPN 26, openfootball 26, Wiki EN 26, RSSSF 22 | 26/26 |
| 2023 | 26 | Audax Italiano (9), Palestino (7), Magallanes (6), Ñublense (4), Colo-Colo (2), Universidad Católica (1), Cobresal (1) | ESPN, openfootball, Wiki EN, RSSSF (26 c/u) | 26/26 |
| 2024 | 22 | Coquimbo Unido (7), Unión La Calera (7), Huachipato (4), Palestino (4), Universidad Católica (1), Everton (1) | ESPN 22, openfootball 22, Wiki EN 22, RSSSF 18 | 22/22 |

En 2020 se incluyen las semifinales Coquimbo–Defensa y Justicia, jugadas en enero de 2021 (season = 2020).

## Fuentes usadas

Todo lo descargado está en `dl/` y los scripts en `scripts/`. Python se ejecutó con `-I`.

1. **ESPN, vía `github:vicentemaartinez/cadlag@cba63ed`**: archivo `data/raw/espn/espn_dump_2010-2026.txt.gz`, sección `@@conmebol.sudamericana`. Es la fuente principal de 2010 a 2024 y la que entrega el id del evento.
   - Las horas vienen en UTC. Para obtener la fecha local se resta un día cuando la hora UTC es anterior a las 09:00, igual que en las filas de 2025.
   - El dump no trae estadio, cantidad de penales ni grupo. Solo trae el estado `FINAL_PEN`.
2. **openfootball, `github:openfootball/south-america@f51b2dc`**: archivos `copa-libertadores/20XX_copas.txt` de 2012 a 2024. Aporta fechas locales, penales y letra de grupo. Se cita con `#L<línea>`.
3. **SoccerStatsUS, `github:SoccerStatsUS/conmebol_data@bb6c8c4`**: archivos `games/confederation/sudamericana/2005…2014`. La de 2011 está incompleta (10 de 18 partidos).
   - Declara a RSSSF como fuente (`BlockSource`), así que no es independiente de RSSSF.
   - Sus penales no siguen la orientación local–visita: van desde la perspectiva del local de la ida. Por eso no se usaron para fijar penales.
4. **RSSSF**: `https://www.rsssf.org/sacups/sudamcupYY.html` (2005–2009) y `sudamcupYYYY.html` (2010–2024). Entrega marcadores de ida y vuelta por llave, penales, rangos de fechas y notas al pie (partidos suspendidos, sedes).
5. **Wikipedia EN**: páginas `YYYY_Copa_Sudamericana` y sus subpáginas (first/second stage, group stage, final stages, etc.), leídas con `action=raw`. Se usaron los `{{football box}}` para fecha, marcador, penales, estadio y grupo.
6. **Wikipedia ES**: `Copa_Sudamericana_2005` a `2009`. Se usaron las tablas de llaves de la primera fase y las plantillas `{{Partido}}` (fecha, estadio, sucesos). Es la segunda familia independiente para 2005–2009.

Se intentaron dos fuentes más sin éxito:
- `yorobot/cache.wfb.txt` no tiene archivos de Sudamericana.
- La API de ESPN (`site.api.espn.com`) está bloqueada por el proxy, así que no se pudo obtener el estadio desde ESPN.
- worldfootball.net se omitió, según las instrucciones.

## Criterios

- **Agrupación**: los registros de distintas fuentes se agruparon por edición, mismo club chileno en el mismo lado (local o visita) y fechas a ±3 días.
  - La fecha final es la moda. ESPN, openfootball y las dos Wikipedia pesan 1 cada una y RSSSF pesa 0,5, porque solo da rangos.
  - Para el marcador se usó la moda.
- **Penales**: solo se tomaron de fuentes con orientación local–visita (openfootball, Wiki EN, Wiki ES, RSSSF), en el partido donde hubo definición.
  - En todos los casos coinciden con el `FINAL_PEN` de ESPN.
  - Los valores de SoccerStatsUS también coinciden, una vez corregida su orientación.
- **Estadio**: se tomó el campo `stadium` o `estadio` de Wikipedia (EN, o ES para 2005–2008), usando el nombre del artículo enlazado cuando el texto visible venía abreviado. Donde ninguna fuente nombra el estadio, el campo queda vacío (18 partidos de primera fase de 2005–2008).
- **Etapas**:
  - 2005–2009 siguen la nomenclatura de Wikipedia ES: Fase preliminar, Primera fase, Octavos, Cuartos, Semifinal, Final.
  - 2010–2020 siguen ESPN: Primera fase, Segunda fase, Octavos, Cuartos, Semifinal, Final.
  - 2021–2022 usan `Fase preliminar · Ida/Vuelta`, porque fue a doble partido. 2023–2024 usan `Fase preliminar (partido único)`, como en 2025.
  - Además: `Fase de grupos · Grupo X` (la letra coincide entre openfootball y Wiki EN), `Playoffs de octavos` e `Ida/Vuelta` según el orden de las fechas en cada llave.
  - `is_final=1` solo en las finales de 2006 (Colo-Colo vs Pachuca) y 2011 (U. de Chile vs LDU Quito).
- **Nombres de clubes extranjeros**: primero se buscó el nombre en `data/matches/2024-2026.csv`. Si no estaba, se usó el de `data/raw/wfb/*_copa.l.txt`.
  - Por eso quedaron `Corinthians SP (BRA)` y `Flamengo RJ (BRA)`, que es como los escribe wfb, y no "Corinthians (BRA)" como en el ejemplo del encargo.
  - Cuando hay conflicto, gana 2024-2026: `Fluminense (BRA)`, `Botafogo (BRA)`, `São Paulo (BRA)`, `Olimpia (PAR)` y `Vasco da Gama (BRA)`, en lugar de `Fluminense RJ`, `Botafogo RJ`, `São Paulo FC` y `Club Olimpia`.
  - 16 nombres no existían en ninguno de los dos: Alajuelense (CRC), Alianza Atlético (PER), Alianza FC (COL), Aragua FC (VEN), Atlético Goianiense (BRA), Atlético Venezuela (VEN), Cuiabá (BRA), Cusco FC (PER), DC United (USA), El Tanque Sisley (URU), Fuerza Amarilla (ECU), General Díaz (PAR), La Equidad (COL), Patriotas (COL), Sol de América (PAR) y Sport Áncash (PER).
  - Unificaciones del mismo club:
    - ESPN "Independiente Terán" (2013) se escribió `Independiente del Valle (ECU)`.
    - ESPN "Internacional de Bogotá" (2013) se escribió `La Equidad (COL)`.
    - ESPN "Cusco FC" en 2016 se escribió `Real Garcilaso (PER)`, su nombre de entonces. En 2020 quedó `Cusco FC (PER)`.
    - RSSSF "Alianza Petrolera" (2024) corresponde a `Alianza FC (COL)`.
    - `San José (BOL)` (2014) es el mismo club que figura como `GV San José (BOL)` en 2025.

## Discrepancias y cómo se resolvieron

1. **2018-07-26 San Lorenzo (ARG) – Deportes Temuco, Segunda fase · Ida**:
   - Lo que dicen las fuentes:
     - openfootball dice `3-0 [awarded]`.
     - Wiki EN dice 3–0 "Awarded": CONMEBOL sancionó a Temuco por alinear a Jonathan Requena, que no estaba habilitado, y el partido había terminado 1–2.
     - RSSSF dice `awd` y su nota dice "originally 1-2".
     - ESPN registra 0-0.
   - **Se dejó el resultado oficial 3-0**, como en el antecedente Colo-Colo–Fortaleza 2025 del repo. La nota en `source` explica el 1-2 jugado en cancha. ESPN aparece como "discrepa".
2. **2005-11-24 Boca Juniors – U. Católica, semifinal de ida**:
   - RSSSF ("Nov 24 and Dec 1") y SoccerStatsUS dicen 24-nov.
   - Wikipedia ES dice 23-nov, con la misma fecha y hora 21:10 que la otra semifinal, lo que parece un error de copia.
   - **Se usó el 24-nov**. Es la única fila con una sola familia de fuentes (RSSSF/SoccerStatsUS) para la fecha. El marcador 2-2 sí lo confirman las tres fuentes.
3. **Cuatro registros solo de RSSSF de 2022 se descartaron** ("Universidad Católica" contra Santos o Banfield). En la tabla de grupos sin país, el parser los tomó como del club chileno, pero son de la Universidad Católica de Quito (grupo C con Unión La Calera). No se agregaron filas.

Partidos suspendidos cuyo resultado se mantuvo (anotado en `source`):
- 2006-10-19 Colo-Colo 4-1 Gimnasia LP: suspendido al minuto 86. CONMEBOL confirmó el 4-1 (Wiki ES y RSSSF).
- 2008-09-17 Olimpia 2-2 U. Católica: suspendido al minuto 87, el resultado se mantuvo (RSSSF).
- 2011-09-21 Nacional 0-2 U. de Chile: suspendido al inicio del segundo tiempo. Todas las fuentes registran 0-2 (RSSSF y Wiki EN).

Aparte de lo anterior no hubo otras diferencias. En todas las filas restantes la fecha, la localía y el marcador coinciden entre todas las fuentes que traen el partido, y los penales también coinciden.

## Observaciones y faltantes

- **Estadio de Flamengo 0-4 U. de Chile (2011-10-19)**: el usuario lo recuerda en el Maracanã, pero Wikipedia EN registra el Estádio Olímpico João Havelange (Engenhão). En 2011 el Maracanã estaba cerrado por remodelación. Se dejó Engenhão porque es lo que dice la fuente; conviene confirmarlo con el usuario.
- **Estadios vacíos**: 18 partidos de primera fase y fase preliminar de 2005–2008 no tienen estadio en ninguna fuente. RSSSF solo menciona ciudades en algunos casos (por ejemplo, Piura en 2005 y Concepción en 2008), y esos datos no se usaron como estadio.
- **Huecos parciales en las fuentes**, cubiertos por las demás:
  - RSSSF no trae la ida 2018 San Lorenzo–Temuco (`awd`), que no se parseó, ni la vuelta.
  - Tampoco trae las semifinales 2020 de Coquimbo, cuatro partidos de grupo de Antofagasta en 2022 ni los playoffs de octavos de 2024 (Huachipato y Palestino).
  - SoccerStatsUS 2011 está incompleta.
  - openfootball solo cubre desde 2012.
- **Llaves**: no quedaron llaves con un solo partido, salvo las de partido único de 2023–2024, que son intencionales.
