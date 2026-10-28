# Verificación independiente de `partidos2526/matches.csv` (907 filas)

Fecha de corte: 2026-10-28. Todas las fuentes salen de búsquedas web propias (prensa chilena, ESPN, informes arbitrales de campeonatochileno.cl). No usé las fuentes del constructor. El detalle está en `verificacion.csv` (90 filas) y los cambios en `correcciones.csv` (7 filas).

## 1. Muestra aleatoria estratificada (semilla 20261028)

| Estrato | n | OK |
|---|---|---|
| Liga 2025 | 20 | 20 |
| Liga 2026 (jugados) | 15 | 15 |
| Liga 2024 (2ª mitad) | 3 | 3 |
| Copa Chile 2025/2026 | 10 | 10 |
| Libertadores/Sudamericana | 8 | 8 |
| Supercopa 2025 y 2026 (4 partidos) | 4 | 4 |
| Copa de la Liga 2026 | 4 | 4 |
| Liguilla de ascenso 2025 | 3 | 3 |
| **Total** | **67** | **67 (100 %)** |

Se revisaron la fecha, el local/visita y el marcador, incluidos los penales. Las únicas diferencias de un día son las fechas de ESPN y FotMob en UTC (La Calera–Everton, Limache–O'Higgins), y en el CSV están bien en hora de Chile. Hay dos partidos con evidencia más débil, de una sola fuente o indirecta: Rangers 0-0 Huachipato (CC 2025) y Palestino 2-1 U. Española (CC 2025, solo ESPN).

## 2. Errores encontrados (fuera de la muestra, al revisar los puntos dudosos)

1. **Faltan 2 partidos del grupo H de Copa Chile 2025.** Son Ñublense 2-2 Deportes Santa Cruz (2025-02-08, Nelson Oyarzún, ESPN 731328) y Curicó Unido 2-1 Ñublense (2025-05-10, Cooperativa). Los dos van como `add`.
2. **Curicó Unido 1-0 Ñublense (CC 2026, grupo F)** figura el 2026-06-20, pero se jugó el **2026-06-21** a las 16:00 en La Granja, según la programación oficial, Pauta, Cooperativa y ceroacero. Va como `delete` + `add`.
3. **Independiente–U. de Chile (Sudamericana 2025, vuelta de octavos)** figura con 1-1. Ese no es un resultado oficial: el partido se suspendió y la CONMEBOL descalificó a Independiente sin fijar marcador. Si se carga 1-1, cuenta como empate. Va como `update` con los goles en NULL.
4. **Everton–U. de Chile (CC 2026, ida, 24-sep).** El marcador 0-1 es **correcto**, pero la nota del CSV dice "1-0 Everton al 82'". En realidad ganaba la U 1-0 con gol de Lucero al 61', y en los minutos que faltaban (27-sep, Nacional sin público) no cambió nada. Va como `update` solo de `source`.
5. **Final de Copa Chile 2025** sin estadio. Se jugó en el **Estadio El Teniente** (Rancagua). Va como `update`.

Menor, sin corrección: Colo-Colo 1-0 UC del 2024-10-03 aparece como "Fecha 24", pero era el partido pendiente de la fecha 18.

## 3. Decisiones sobre partidos suspendidos o por secretaría

- **Colo-Colo–Fortaleza (Libertadores 2025):** se mantiene **0-3**. Es el resultado oficial: la CONMEBOL lo resolvió el 30-abr-2025 y el partido iba 0-0 al 70'. La fecha local es el 10-abr (algunas fuentes dan el 11 por UTC).
- **Independiente–U. de Chile:** sin resultado (goles NULL) y con nota. La app debe excluir de las estadísticas los partidos pasados con goles NULL. Otra opción es borrarlo, pero entonces se pierde que la U avanzó.
- **Everton–U. de Chile:** 0-1 con la fecha original (24-sep). Está bien.
- **Colo-Colo–Puerto Montt (vuelta de cuartos, CC 2026):** empezó el 6-oct y se suspendió **al entretiempo con 1-0** (Correa). La reanudación del 20-oct también se suspendió. El **2-nov** se juegan **solo los 45' restantes**. Está bien que figure como pendiente el 2-nov. Al completarlo, conviene decidir si se deja el 2-nov o el 6-oct, la fecha de inicio, que es el criterio que se usó con Everton–U.

## 4. Finales y campeones

| Final | CSV | Verificado |
|---|---|---|
| Supercopa 2025 | Colo-Colo 0-3 U. de Chile, 14-sep, Santa Laura | OK, campeón U. de Chile |
| Supercopa 2026 | UC 0-0 Coquimbo (7-8 pen), 25-ene, Sausalito | OK, campeón Coquimbo Unido |
| Copa Chile 2025 | Huachipato 1-1 Limache (4-3 pen), 10-dic | OK, campeón Huachipato (falta el estadio, El Teniente) |
| Copa Chile 2024 | U. de Chile 1-0 Ñublense, 20-nov | OK |
| Copa de la Liga 2026 | Coquimbo–O'Higgins, pendiente, 14-nov, Santa Laura | OK, aún no se juega (se postergó en julio y en octubre) |
| Liguilla de ascenso 2025 | D. Concepción 1-1 Cobreloa / Cobreloa 2-3 D. Concepción | OK, asciende D. Concepción (global 4-3). Es una final a dos partidos, por eso `is_final=0` |

## 5. Pendientes y fecha 25 de 2026

- Los 41 partidos de Liga 2026, los 4 de Copa Chile y la final de la Copa de la Liga sin resultado tienen todos fecha ≥ 2026-10-28.
- La fecha 25 está completa en el CSV y los resultados coinciden con Cooperativa y BioBío: Palestino 1-1 Colo-Colo, Ñublense 2-1 Coquimbo, La Calera 3-1 UC y U. de Chile 4-1 Everton (en El Teniente). No hay partidos jugados marcados como pendientes.
- **UC–Audax (fecha 24)** está programado para hoy a las 20:30, pero una nota habla de una posible nueva suspensión por la Delegación Presidencial. Es NO_CONCLUYENTE y hay que revisarlo mañana.
- Las fechas 27 a 30 son tentativas, como ya avisaba el constructor.

## 6. Duplicados contra la base

**Importante:** la base `galeriastats.db` (modificada hoy a las 16:02) **ya tiene cargadas las 907 filas** de este CSV (`source='csv'`), además de 93 filas `wfb` desde julio de 2024. No las cargué yo: solo la abrí en modo lectura.

En lo que está cargado no hay duplicados:
- Liga 2024, 2025 y 2026: cada cruce sin orden aparece exactamente 2 veces (120 pares × 2 por temporada).
- No hay un mismo cruce local/visita repetido dentro de una temporada y competición.
- Los partidos del mismo cruce a ≤3 días son todos ida/vuelta legítimos.
- Copa Chile 2024: las 8 filas del CSV no se cruzan con las filas `wfb`.

Por lo tanto, las correcciones se deben aplicar **sobre la base**, no como una carga nueva.

## Recomendación

**Cargar con correcciones.** La muestra no tuvo errores (67/67) y los problemas detectados son puntuales: 2 partidos faltantes, 1 fecha mal, 1 resultado no oficial y 2 metadatos. Hay que aplicar `correcciones.csv` a la base, que ya tiene el CSV, y volver a revisar UC–Audax y el resto de los pendientes después de cada fecha.
