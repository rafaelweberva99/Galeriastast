import type { Insights } from "@/lib/domain/insights/types.ts";

/**
 * Muestra realista (calculada desde el perfil de prueba nacho_bulla: 73 partidos jugados, 57% de efectividad) para dibujar
 * los gráficos del carnet mientras no esté conectado buildInsights(). La vista usa `data.insights ?? sampleInsights`.
 */
export const sampleInsights: Insights = {
 "seasons": [
  {
   "season": 2011,
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 4,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.7556,
   "delta": 24.4
  },
  {
   "season": 2012,
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 0,
   "gc": 2,
   "effectiveness": 0,
   "clubEffectiveness": 0.6111,
   "delta": -61.1
  },
  {
   "season": 2013,
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 0,
   "gc": 1,
   "effectiveness": 0,
   "clubEffectiveness": 0.5733,
   "delta": -57.3
  },
  {
   "season": 2015,
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 0,
   "gc": 1,
   "effectiveness": 0,
   "clubEffectiveness": 0.4967,
   "delta": -49.7
  },
  {
   "season": 2017,
   "pj": 11,
   "g": 6,
   "e": 3,
   "p": 2,
   "gf": 20,
   "gc": 16,
   "effectiveness": 0.6364,
   "clubEffectiveness": 0.6423,
   "delta": -0.6
  },
  {
   "season": 2018,
   "pj": 14,
   "g": 6,
   "e": 4,
   "p": 4,
   "gf": 19,
   "gc": 15,
   "effectiveness": 0.5238,
   "clubEffectiveness": 0.6136,
   "delta": -9
  },
  {
   "season": 2019,
   "pj": 8,
   "g": 2,
   "e": 4,
   "p": 2,
   "gf": 12,
   "gc": 10,
   "effectiveness": 0.4167,
   "clubEffectiveness": 0.3958,
   "delta": 2.1
  },
  {
   "season": 2021,
   "pj": 2,
   "g": 0,
   "e": 0,
   "p": 2,
   "gf": 0,
   "gc": 3,
   "effectiveness": 0,
   "clubEffectiveness": 0.4539,
   "delta": -45.4
  },
  {
   "season": 2022,
   "pj": 2,
   "g": 1,
   "e": 1,
   "p": 0,
   "gf": 4,
   "gc": 3,
   "effectiveness": 0.6667,
   "clubEffectiveness": 0.3772,
   "delta": 28.9
  },
  {
   "season": 2023,
   "pj": 3,
   "g": 0,
   "e": 1,
   "p": 2,
   "gf": 3,
   "gc": 5,
   "effectiveness": 0.1111,
   "clubEffectiveness": 0.4583,
   "delta": -34.7
  },
  {
   "season": 2024,
   "pj": 14,
   "g": 8,
   "e": 5,
   "p": 1,
   "gf": 18,
   "gc": 7,
   "effectiveness": 0.6905,
   "clubEffectiveness": 0.7083,
   "delta": -1.8
  },
  {
   "season": 2025,
   "pj": 12,
   "g": 9,
   "e": 1,
   "p": 2,
   "gf": 26,
   "gc": 11,
   "effectiveness": 0.7778,
   "clubEffectiveness": 0.5962,
   "delta": 18.2
  },
  {
   "season": 2026,
   "pj": 3,
   "g": 2,
   "e": 0,
   "p": 1,
   "gf": 4,
   "gc": 3,
   "effectiveness": 0.6667,
   "clubEffectiveness": 0.5794,
   "delta": 8.7
  }
 ],
 "form": [
  {
   "matchId": "2011-10-19_flamengo-rj-bra_universidad-de-chile",
   "date": "2011-10-19",
   "label": "Flamengo RJ 0-4 Universidad de Chile",
   "outcome": "G",
   "cumulative": 1,
   "rolling10": null
  },
  {
   "matchId": "2012-09-26_santos-fc-bra_universidad-de-chile",
   "date": "2012-09-26",
   "label": "Santos FC 2-0 Universidad de Chile",
   "outcome": "P",
   "cumulative": 0.5,
   "rolling10": null
  },
  {
   "matchId": "2013-10-27_universidad-de-chile_universidad-catolica",
   "date": "2013-10-27",
   "label": "Universidad de Chile 0-1 Universidad Católica",
   "outcome": "P",
   "cumulative": 0.3333,
   "rolling10": null
  },
  {
   "matchId": "2015-10-24_universidad-de-chile_santiago-wanderers",
   "date": "2015-10-24",
   "label": "Universidad de Chile 0-1 Santiago Wanderers",
   "outcome": "P",
   "cumulative": 0.25,
   "rolling10": null
  },
  {
   "matchId": "2017-03-05_palestino_universidad-de-chile",
   "date": "2017-03-05",
   "label": "Palestino 1-3 Universidad de Chile",
   "outcome": "G",
   "cumulative": 0.4,
   "rolling10": null
  },
  {
   "matchId": "2017-03-19_universidad-de-chile_union-espanola",
   "date": "2017-03-19",
   "label": "Universidad de Chile 2-1 Unión Española",
   "outcome": "G",
   "cumulative": 0.5,
   "rolling10": null
  },
  {
   "matchId": "2017-04-08_universidad-de-chile_colo-colo",
   "date": "2017-04-08",
   "label": "Universidad de Chile 2-2 Colo-Colo",
   "outcome": "E",
   "cumulative": 0.4762,
   "rolling10": null
  },
  {
   "matchId": "2017-04-22_universidad-de-chile_santiago-wanderers",
   "date": "2017-04-22",
   "label": "Universidad de Chile 2-0 Santiago Wanderers",
   "outcome": "G",
   "cumulative": 0.5417,
   "rolling10": null
  },
  {
   "matchId": "2017-05-10_universidad-de-chile_corinthians-sp-bra",
   "date": "2017-05-10",
   "label": "Universidad de Chile 1-2 Corinthians SP",
   "outcome": "P",
   "cumulative": 0.4815,
   "rolling10": null
  },
  {
   "matchId": "2017-05-20_universidad-de-chile_san-luis",
   "date": "2017-05-20",
   "label": "Universidad de Chile 1-0 San Luis de Quillota",
   "outcome": "G",
   "cumulative": 0.5333,
   "rolling10": 0.5333
  },
  {
   "matchId": "2017-08-20_universidad-de-chile_huachipato",
   "date": "2017-08-20",
   "label": "Universidad de Chile 3-2 Huachipato",
   "outcome": "G",
   "cumulative": 0.5758,
   "rolling10": 0.5333
  },
  {
   "matchId": "2017-09-09_universidad-de-chile_ohiggins",
   "date": "2017-09-09",
   "label": "Universidad de Chile 2-2 O'Higgins",
   "outcome": "E",
   "cumulative": 0.5556,
   "rolling10": 0.5667
  },
  {
   "matchId": "2017-09-23_universidad-de-chile_everton",
   "date": "2017-09-23",
   "label": "Universidad de Chile 2-2 Everton",
   "outcome": "E",
   "cumulative": 0.5385,
   "rolling10": 0.6
  },
  {
   "matchId": "2017-10-22_universidad-de-chile_palestino",
   "date": "2017-10-22",
   "label": "Universidad de Chile 2-1 Palestino",
   "outcome": "G",
   "cumulative": 0.5714,
   "rolling10": 0.7
  },
  {
   "matchId": "2017-11-25_universidad-de-chile_audax-italiano",
   "date": "2017-11-25",
   "label": "Universidad de Chile 0-3 Audax Italiano",
   "outcome": "P",
   "cumulative": 0.5333,
   "rolling10": 0.6
  },
  {
   "matchId": "2018-03-04_universidad-de-chile_deportes-antofagasta",
   "date": "2018-03-04",
   "label": "Universidad de Chile 2-0 Deportes Antofagasta",
   "outcome": "G",
   "cumulative": 0.5625,
   "rolling10": 0.6
  },
  {
   "matchId": "2018-04-03_universidad-de-chile_racing-club-arg",
   "date": "2018-04-03",
   "label": "Universidad de Chile 1-1 Racing Club",
   "outcome": "E",
   "cumulative": 0.549,
   "rolling10": 0.6
  },
  {
   "matchId": "2018-04-07_universidad-de-chile_curico-unido",
   "date": "2018-04-07",
   "label": "Universidad de Chile 2-1 Curicó Unido",
   "outcome": "G",
   "cumulative": 0.5741,
   "rolling10": 0.6
  },
  {
   "matchId": "2018-04-15_universidad-de-chile_colo-colo",
   "date": "2018-04-15",
   "label": "Universidad de Chile 1-3 Colo-Colo",
   "outcome": "P",
   "cumulative": 0.5439,
   "rolling10": 0.6
  },
  {
   "matchId": "2018-04-19_universidad-de-chile_cruzeiro-bra",
   "date": "2018-04-19",
   "label": "Universidad de Chile 0-0 Cruzeiro",
   "outcome": "E",
   "cumulative": 0.5333,
   "rolling10": 0.5333
  },
  {
   "matchId": "2018-04-29_universidad-de-chile_universidad-de-concepcion",
   "date": "2018-04-29",
   "label": "Universidad de Chile 1-2 Universidad de Concepción",
   "outcome": "P",
   "cumulative": 0.5079,
   "rolling10": 0.4333
  },
  {
   "matchId": "2018-05-18_universidad-de-chile_palestino",
   "date": "2018-05-18",
   "label": "Universidad de Chile 1-2 Palestino",
   "outcome": "P",
   "cumulative": 0.4848,
   "rolling10": 0.4
  },
  {
   "matchId": "2018-05-22_universidad-de-chile_vasco-da-gama-rj-bra",
   "date": "2018-05-22",
   "label": "Universidad de Chile 0-2 Vasco da Gama RJ",
   "outcome": "P",
   "cumulative": 0.4638,
   "rolling10": 0.3667
  },
  {
   "matchId": "2018-07-22_universidad-de-chile_huachipato",
   "date": "2018-07-22",
   "label": "Universidad de Chile 2-2 Huachipato",
   "outcome": "E",
   "cumulative": 0.4583,
   "rolling10": 0.3
  },
  {
   "matchId": "2018-08-11_union-espanola_universidad-de-chile",
   "date": "2018-08-11",
   "label": "Unión Española 1-4 Universidad de Chile",
   "outcome": "G",
   "cumulative": 0.48,
   "rolling10": 0.4
  },
  {
   "matchId": "2018-08-18_universidad-de-chile_ohiggins",
   "date": "2018-08-18",
   "label": "Universidad de Chile 1-0 O'Higgins",
   "outcome": "G",
   "cumulative": 0.5,
   "rolling10": 0.4
  },
  {
   "matchId": "2018-08-31_universidad-de-chile_deportes-temuco",
   "date": "2018-08-31",
   "label": "Universidad de Chile 2-1 Deportes Temuco",
   "outcome": "G",
   "cumulative": 0.5185,
   "rolling10": 0.4667
  },
  {
   "matchId": "2018-10-27_universidad-de-chile_universidad-catolica",
   "date": "2018-10-27",
   "label": "Universidad de Chile 2-0 Universidad Católica",
   "outcome": "G",
   "cumulative": 0.5357,
   "rolling10": 0.4667
  },
  {
   "matchId": "2018-11-25_universidad-de-chile_deportes-iquique",
   "date": "2018-11-25",
   "label": "Universidad de Chile 0-0 Deportes Iquique",
   "outcome": "E",
   "cumulative": 0.5287,
   "rolling10": 0.5
  },
  {
   "matchId": "2019-03-02_universidad-de-chile_huachipato",
   "date": "2019-03-02",
   "label": "Universidad de Chile 3-0 Huachipato",
   "outcome": "G",
   "cumulative": 0.5444,
   "rolling10": 0.5667
  },
  {
   "matchId": "2019-03-10_universidad-de-chile_union-espanola",
   "date": "2019-03-10",
   "label": "Universidad de Chile 1-2 Unión Española",
   "outcome": "P",
   "cumulative": 0.5269,
   "rolling10": 0.5667
  },
  {
   "matchId": "2019-04-07_universidad-de-chile_union-la-calera",
   "date": "2019-04-07",
   "label": "Universidad de Chile 1-1 Unión La Calera",
   "outcome": "E",
   "cumulative": 0.5208,
   "rolling10": 0.6
  },
  {
   "matchId": "2019-05-18_universidad-de-chile_colo-colo",
   "date": "2019-05-18",
   "label": "Universidad de Chile 1-1 Colo-Colo",
   "outcome": "E",
   "cumulative": 0.5152,
   "rolling10": 0.6333
  },
  {
   "matchId": "2019-08-03_universidad-de-chile_audax-italiano",
   "date": "2019-08-03",
   "label": "Universidad de Chile 1-1 Audax Italiano",
   "outcome": "E",
   "cumulative": 0.5098,
   "rolling10": 0.6333
  },
  {
   "matchId": "2019-08-25_universidad-de-chile_universidad-catolica",
   "date": "2019-08-25",
   "label": "Universidad de Chile 1-1 Universidad Católica",
   "outcome": "E",
   "cumulative": 0.5048,
   "rolling10": 0.5667
  },
  {
   "matchId": "2019-09-28_universidad-de-chile_palestino",
   "date": "2019-09-28",
   "label": "Universidad de Chile 2-3 Palestino",
   "outcome": "P",
   "cumulative": 0.4907,
   "rolling10": 0.4667
  },
  {
   "matchId": "2019-10-17_universidad-de-chile_deportes-iquique",
   "date": "2019-10-17",
   "label": "Universidad de Chile 2-1 Deportes Iquique",
   "outcome": "G",
   "cumulative": 0.5045,
   "rolling10": 0.4667
  },
  {
   "matchId": "2021-08-15_universidad-de-chile_cobresal",
   "date": "2021-08-15",
   "label": "Universidad de Chile 0-2 Cobresal",
   "outcome": "P",
   "cumulative": 0.4912,
   "rolling10": 0.3667
  },
  {
   "matchId": "2021-10-09_everton_universidad-de-chile",
   "date": "2021-10-09",
   "label": "Everton 1-0 Universidad de Chile",
   "outcome": "P",
   "cumulative": 0.4786,
   "rolling10": 0.3333
  },
  {
   "matchId": "2022-03-17_universidad-de-chile_curico-unido",
   "date": "2022-03-17",
   "label": "Universidad de Chile 1-1 Curicó Unido",
   "outcome": "E",
   "cumulative": 0.475,
   "rolling10": 0.2667
  },
  {
   "matchId": "2022-05-21_universidad-de-chile_huachipato",
   "date": "2022-05-21",
   "label": "Universidad de Chile 3-2 Huachipato",
   "outcome": "G",
   "cumulative": 0.4878,
   "rolling10": 0.3667
  },
  {
   "matchId": "2023-03-02_universidad-de-chile_union-la-calera",
   "date": "2023-03-02",
   "label": "Universidad de Chile 1-1 Unión La Calera",
   "outcome": "E",
   "cumulative": 0.4841,
   "rolling10": 0.3667
  },
  {
   "matchId": "2023-11-06_universidad-de-chile_everton",
   "date": "2023-11-06",
   "label": "Universidad de Chile 1-2 Everton",
   "outcome": "P",
   "cumulative": 0.4729,
   "rolling10": 0.3333
  },
  {
   "matchId": "2023-11-24_universidad-de-chile_coquimbo-unido",
   "date": "2023-11-24",
   "label": "Universidad de Chile 1-2 Coquimbo Unido",
   "outcome": "P",
   "cumulative": 0.4621,
   "rolling10": 0.3
  },
  {
   "matchId": "2024-02-24_universidad-de-chile_audax-italiano",
   "date": "2024-02-24",
   "label": "Universidad de Chile 1-0 Audax Italiano",
   "outcome": "G",
   "cumulative": 0.4741,
   "rolling10": 0.3667
  },
  {
   "matchId": "2024-03-16_universidad-de-chile_ohiggins",
   "date": "2024-03-16",
   "label": "Universidad de Chile 1-0 O'Higgins",
   "outcome": "G",
   "cumulative": 0.4855,
   "rolling10": 0.4667
  },
  {
   "matchId": "2024-03-25_universidad-de-chile_cobresal",
   "date": "2024-03-25",
   "label": "Universidad de Chile 2-2 Cobresal",
   "outcome": "E",
   "cumulative": 0.4823,
   "rolling10": 0.4
  },
  {
   "matchId": "2024-04-14_universidad-de-chile_coquimbo-unido",
   "date": "2024-04-14",
   "label": "Universidad de Chile 1-1 Coquimbo Unido",
   "outcome": "E",
   "cumulative": 0.4792,
   "rolling10": 0.4333
  },
  {
   "matchId": "2024-05-18_universidad-de-chile_universidad-catolica",
   "date": "2024-05-18",
   "label": "Universidad de Chile 1-2 Universidad Católica",
   "outcome": "P",
   "cumulative": 0.4694,
   "rolling10": 0.4333
  },
  {
   "matchId": "2024-05-26_universidad-de-chile_nublense",
   "date": "2024-05-26",
   "label": "Universidad de Chile 0-0 Ñublense",
   "outcome": "E",
   "cumulative": 0.4667,
   "rolling10": 0.4333
  },
  {
   "matchId": "2024-08-04_universidad-de-chile_copiapo",
   "date": "2024-08-04",
   "label": "Universidad de Chile 1-0 Deportes Copiapó",
   "outcome": "G",
   "cumulative": 0.4771,
   "rolling10": 0.4333
  },
  {
   "matchId": "2024-08-10_universidad-de-chile_colo-colo",
   "date": "2024-08-10",
   "label": "Universidad de Chile 0-0 Colo-Colo",
   "outcome": "E",
   "cumulative": 0.4744,
   "rolling10": 0.4333
  },
  {
   "matchId": "2024-08-23_universidad-de-chile_cobreloa",
   "date": "2024-08-23",
   "label": "Universidad de Chile 4-0 Cobreloa",
   "outcome": "G",
   "cumulative": 0.4843,
   "rolling10": 0.5333
  },
  {
   "matchId": "2024-08-27_universidad-de-chile_union-espanola",
   "date": "2024-08-27",
   "label": "Universidad de Chile 2-0 Unión Española",
   "outcome": "G",
   "cumulative": 0.4938,
   "rolling10": 0.6333
  },
  {
   "matchId": "2024-09-24_universidad-de-chile_huachipato",
   "date": "2024-09-24",
   "label": "Universidad de Chile 2-1 Huachipato",
   "outcome": "G",
   "cumulative": 0.503,
   "rolling10": 0.6333
  },
  {
   "matchId": "2024-10-05_universidad-de-chile_union-la-calera",
   "date": "2024-10-05",
   "label": "Universidad de Chile 1-0 Unión La Calera",
   "outcome": "G",
   "cumulative": 0.5119,
   "rolling10": 0.6333
  },
  {
   "matchId": "2024-11-10_universidad-de-chile_everton",
   "date": "2024-11-10",
   "label": "Universidad de Chile 1-1 Everton",
   "outcome": "E",
   "cumulative": 0.5088,
   "rolling10": 0.6333
  },
  {
   "matchId": "2024-11-20_universidad-de-chile_nublense",
   "date": "2024-11-20",
   "label": "Universidad de Chile 1-0 Ñublense",
   "outcome": "G",
   "cumulative": 0.5172,
   "rolling10": 0.7
  },
  {
   "matchId": "2025-02-23_universidad-de-chile_union-la-calera",
   "date": "2025-02-23",
   "label": "Universidad de Chile 1-0 Unión La Calera",
   "outcome": "G",
   "cumulative": 0.5254,
   "rolling10": 0.8
  },
  {
   "matchId": "2025-04-02_universidad-de-chile_botafogo-bra",
   "date": "2025-04-02",
   "label": "Universidad de Chile 1-0 Botafogo",
   "outcome": "G",
   "cumulative": 0.5333,
   "rolling10": 0.8667
  },
  {
   "matchId": "2025-05-07_universidad-de-chile_estudiantes-de-la-plata-arg",
   "date": "2025-05-07",
   "label": "Universidad de Chile 0-3 Estudiantes de La Plata",
   "outcome": "P",
   "cumulative": 0.5246,
   "rolling10": 0.7667
  },
  {
   "matchId": "2025-05-13_universidad-de-chile_carabobo-ven",
   "date": "2025-05-13",
   "label": "Universidad de Chile 4-0 Carabobo",
   "outcome": "G",
   "cumulative": 0.5323,
   "rolling10": 0.8333
  },
  {
   "matchId": "2025-06-21_universidad-de-chile_deportes-iquique",
   "date": "2025-06-21",
   "label": "Universidad de Chile 3-1 Deportes Iquique",
   "outcome": "G",
   "cumulative": 0.5397,
   "rolling10": 0.8333
  },
  {
   "matchId": "2025-07-12_universidad-de-chile_colo-colo",
   "date": "2025-07-12",
   "label": "Universidad de Chile 2-1 Colo-Colo",
   "outcome": "G",
   "cumulative": 0.5469,
   "rolling10": 0.8333
  },
  {
   "matchId": "2025-07-17_universidad-de-chile_guarani-par",
   "date": "2025-07-17",
   "label": "Universidad de Chile 5-0 Guaraní",
   "outcome": "G",
   "cumulative": 0.5538,
   "rolling10": 0.8333
  },
  {
   "matchId": "2025-08-04_universidad-de-chile_cobresal",
   "date": "2025-08-04",
   "label": "Universidad de Chile 0-1 Cobresal",
   "outcome": "P",
   "cumulative": 0.5455,
   "rolling10": 0.7333
  },
  {
   "matchId": "2025-08-09_universidad-de-chile_union-espanola",
   "date": "2025-08-09",
   "label": "Universidad de Chile 4-1 Unión Española",
   "outcome": "G",
   "cumulative": 0.5522,
   "rolling10": 0.8
  },
  {
   "matchId": "2025-08-13_universidad-de-chile_independiente-arg",
   "date": "2025-08-13",
   "label": "Universidad de Chile 1-0 Independiente",
   "outcome": "G",
   "cumulative": 0.5588,
   "rolling10": 0.8
  },
  {
   "matchId": "2025-11-09_universidad-de-chile_deportes-limache",
   "date": "2025-11-09",
   "label": "Universidad de Chile 4-3 Deportes Limache",
   "outcome": "G",
   "cumulative": 0.5652,
   "rolling10": 0.8
  },
  {
   "matchId": "2025-12-02_universidad-de-chile_coquimbo-unido",
   "date": "2025-12-02",
   "label": "Universidad de Chile 1-1 Coquimbo Unido",
   "outcome": "E",
   "cumulative": 0.5619,
   "rolling10": 0.7333
  },
  {
   "matchId": "2026-04-25_universidad-de-chile_universidad-catolica",
   "date": "2026-04-25",
   "label": "Universidad de Chile 1-0 Universidad Católica",
   "outcome": "G",
   "cumulative": 0.5681,
   "rolling10": 0.8333
  },
  {
   "matchId": "2026-08-09_universidad-de-chile_palestino",
   "date": "2026-08-09",
   "label": "Universidad de Chile 2-1 Palestino",
   "outcome": "G",
   "cumulative": 0.5741,
   "rolling10": 0.8333
  },
  {
   "matchId": "2026-08-23_universidad-de-chile_colo-colo",
   "date": "2026-08-23",
   "label": "Universidad de Chile 1-2 Colo-Colo",
   "outcome": "P",
   "cumulative": 0.5662,
   "rolling10": 0.7333
  }
 ],
 "rivals": [
  {
   "rivalId": "colo-colo",
   "rivalName": "Colo-Colo",
   "pj": 6,
   "g": 1,
   "e": 3,
   "p": 2,
   "gf": 7,
   "gc": 9,
   "effectiveness": 0.3333,
   "clubEffectiveness": 0.3427,
   "verdict": "yeta",
   "lastMatchId": "2026-08-23_universidad-de-chile_colo-colo"
  },
  {
   "rivalId": "huachipato",
   "rivalName": "Huachipato",
   "pj": 5,
   "g": 4,
   "e": 1,
   "p": 0,
   "gf": 13,
   "gc": 7,
   "effectiveness": 0.8667,
   "clubEffectiveness": 0.5846,
   "verdict": "cabala",
   "lastMatchId": "2024-09-24_universidad-de-chile_huachipato"
  },
  {
   "rivalId": "palestino",
   "rivalName": "Palestino",
   "pj": 5,
   "g": 3,
   "e": 0,
   "p": 2,
   "gf": 10,
   "gc": 8,
   "effectiveness": 0.6,
   "clubEffectiveness": 0.6027,
   "verdict": "neutro",
   "lastMatchId": "2026-08-09_universidad-de-chile_palestino"
  },
  {
   "rivalId": "union-espanola",
   "rivalName": "Unión Española",
   "pj": 5,
   "g": 4,
   "e": 0,
   "p": 1,
   "gf": 13,
   "gc": 5,
   "effectiveness": 0.8,
   "clubEffectiveness": 0.6119,
   "verdict": "cabala",
   "lastMatchId": "2025-08-09_universidad-de-chile_union-espanola"
  },
  {
   "rivalId": "universidad-catolica",
   "rivalName": "Universidad Católica",
   "pj": 5,
   "g": 2,
   "e": 1,
   "p": 2,
   "gf": 5,
   "gc": 4,
   "effectiveness": 0.4667,
   "clubEffectiveness": 0.4365,
   "verdict": "neutro",
   "lastMatchId": "2026-04-25_universidad-de-chile_universidad-catolica"
  },
  {
   "rivalId": "everton",
   "rivalName": "Everton",
   "pj": 4,
   "g": 0,
   "e": 2,
   "p": 2,
   "gf": 4,
   "gc": 6,
   "effectiveness": 0.1667,
   "clubEffectiveness": 0.4255,
   "verdict": "yeta",
   "lastMatchId": "2024-11-10_universidad-de-chile_everton"
  },
  {
   "rivalId": "union-la-calera",
   "rivalName": "Unión La Calera",
   "pj": 4,
   "g": 2,
   "e": 2,
   "p": 0,
   "gf": 4,
   "gc": 2,
   "effectiveness": 0.6667,
   "clubEffectiveness": 0.5729,
   "verdict": "cabala",
   "lastMatchId": "2025-02-23_universidad-de-chile_union-la-calera"
  },
  {
   "rivalId": "audax-italiano",
   "rivalName": "Audax Italiano",
   "pj": 3,
   "g": 1,
   "e": 1,
   "p": 1,
   "gf": 2,
   "gc": 4,
   "effectiveness": 0.4444,
   "clubEffectiveness": 0.5833,
   "verdict": "neutro",
   "lastMatchId": "2024-02-24_universidad-de-chile_audax-italiano"
  },
  {
   "rivalId": "cobresal",
   "rivalName": "Cobresal",
   "pj": 3,
   "g": 0,
   "e": 1,
   "p": 2,
   "gf": 2,
   "gc": 5,
   "effectiveness": 0.1111,
   "clubEffectiveness": 0.5697,
   "verdict": "yeta",
   "lastMatchId": "2025-08-04_universidad-de-chile_cobresal"
  },
  {
   "rivalId": "coquimbo-unido",
   "rivalName": "Coquimbo Unido",
   "pj": 3,
   "g": 0,
   "e": 2,
   "p": 1,
   "gf": 3,
   "gc": 4,
   "effectiveness": 0.2222,
   "clubEffectiveness": 0.614,
   "verdict": "yeta",
   "lastMatchId": "2025-12-02_universidad-de-chile_coquimbo-unido"
  },
  {
   "rivalId": "deportes-iquique",
   "rivalName": "Deportes Iquique",
   "pj": 3,
   "g": 2,
   "e": 1,
   "p": 0,
   "gf": 5,
   "gc": 2,
   "effectiveness": 0.7778,
   "clubEffectiveness": 0.6389,
   "verdict": "cabala",
   "lastMatchId": "2025-06-21_universidad-de-chile_deportes-iquique"
  },
  {
   "rivalId": "ohiggins",
   "rivalName": "O'Higgins",
   "pj": 3,
   "g": 2,
   "e": 1,
   "p": 0,
   "gf": 4,
   "gc": 2,
   "effectiveness": 0.7778,
   "clubEffectiveness": 0.5818,
   "verdict": "cabala",
   "lastMatchId": "2024-03-16_universidad-de-chile_ohiggins"
  },
  {
   "rivalId": "curico-unido",
   "rivalName": "Curicó Unido",
   "pj": 2,
   "g": 1,
   "e": 1,
   "p": 0,
   "gf": 3,
   "gc": 2,
   "effectiveness": 0.6667,
   "clubEffectiveness": 0.6111,
   "verdict": "poca-muestra",
   "lastMatchId": "2022-03-17_universidad-de-chile_curico-unido"
  },
  {
   "rivalId": "nublense",
   "rivalName": "Ñublense",
   "pj": 2,
   "g": 1,
   "e": 1,
   "p": 0,
   "gf": 1,
   "gc": 0,
   "effectiveness": 0.6667,
   "clubEffectiveness": 0.6778,
   "verdict": "poca-muestra",
   "lastMatchId": "2024-11-20_universidad-de-chile_nublense"
  },
  {
   "rivalId": "santiago-wanderers",
   "rivalName": "Santiago Wanderers",
   "pj": 2,
   "g": 1,
   "e": 0,
   "p": 1,
   "gf": 2,
   "gc": 1,
   "effectiveness": 0.5,
   "clubEffectiveness": 0.625,
   "verdict": "poca-muestra",
   "lastMatchId": "2017-04-22_universidad-de-chile_santiago-wanderers"
  },
  {
   "rivalId": "botafogo-bra",
   "rivalName": "Botafogo",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 1,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.5,
   "verdict": "poca-muestra",
   "lastMatchId": "2025-04-02_universidad-de-chile_botafogo-bra"
  },
  {
   "rivalId": "carabobo-ven",
   "rivalName": "Carabobo",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 4,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.6667,
   "verdict": "poca-muestra",
   "lastMatchId": "2025-05-13_universidad-de-chile_carabobo-ven"
  },
  {
   "rivalId": "cobreloa",
   "rivalName": "Cobreloa",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 4,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.6045,
   "verdict": "poca-muestra",
   "lastMatchId": "2024-08-23_universidad-de-chile_cobreloa"
  },
  {
   "rivalId": "corinthians-sp-bra",
   "rivalName": "Corinthians SP",
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 1,
   "gc": 2,
   "effectiveness": 0,
   "clubEffectiveness": 0,
   "verdict": "poca-muestra",
   "lastMatchId": "2017-05-10_universidad-de-chile_corinthians-sp-bra"
  },
  {
   "rivalId": "cruzeiro-bra",
   "rivalName": "Cruzeiro",
   "pj": 1,
   "g": 0,
   "e": 1,
   "p": 0,
   "gf": 0,
   "gc": 0,
   "effectiveness": 0.3333,
   "clubEffectiveness": 0.0556,
   "verdict": "poca-muestra",
   "lastMatchId": "2018-04-19_universidad-de-chile_cruzeiro-bra"
  },
  {
   "rivalId": "deportes-antofagasta",
   "rivalName": "Deportes Antofagasta",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 2,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.6364,
   "verdict": "poca-muestra",
   "lastMatchId": "2018-03-04_universidad-de-chile_deportes-antofagasta"
  },
  {
   "rivalId": "copiapo",
   "rivalName": "Deportes Copiapó",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 1,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.5833,
   "verdict": "poca-muestra",
   "lastMatchId": "2024-08-04_universidad-de-chile_copiapo"
  },
  {
   "rivalId": "deportes-limache",
   "rivalName": "Deportes Limache",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 4,
   "gc": 3,
   "effectiveness": 1,
   "clubEffectiveness": 0.5833,
   "verdict": "poca-muestra",
   "lastMatchId": "2025-11-09_universidad-de-chile_deportes-limache"
  },
  {
   "rivalId": "deportes-temuco",
   "rivalName": "Deportes Temuco",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 2,
   "gc": 1,
   "effectiveness": 1,
   "clubEffectiveness": 0.7619,
   "verdict": "poca-muestra",
   "lastMatchId": "2018-08-31_universidad-de-chile_deportes-temuco"
  },
  {
   "rivalId": "estudiantes-de-la-plata-arg",
   "rivalName": "Estudiantes de La Plata",
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 0,
   "gc": 3,
   "effectiveness": 0,
   "clubEffectiveness": 0.5,
   "verdict": "poca-muestra",
   "lastMatchId": "2025-05-07_universidad-de-chile_estudiantes-de-la-plata-arg"
  },
  {
   "rivalId": "flamengo-rj-bra",
   "rivalName": "Flamengo RJ",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 4,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.7222,
   "verdict": "poca-muestra",
   "lastMatchId": "2011-10-19_flamengo-rj-bra_universidad-de-chile"
  },
  {
   "rivalId": "guarani-par",
   "rivalName": "Guaraní",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 5,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.75,
   "verdict": "poca-muestra",
   "lastMatchId": "2025-07-17_universidad-de-chile_guarani-par"
  },
  {
   "rivalId": "independiente-arg",
   "rivalName": "Independiente",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 1,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 1,
   "verdict": "poca-muestra",
   "lastMatchId": "2025-08-13_universidad-de-chile_independiente-arg"
  },
  {
   "rivalId": "racing-club-arg",
   "rivalName": "Racing Club",
   "pj": 1,
   "g": 0,
   "e": 1,
   "p": 0,
   "gf": 1,
   "gc": 1,
   "effectiveness": 0.3333,
   "clubEffectiveness": 0.1667,
   "verdict": "poca-muestra",
   "lastMatchId": "2018-04-03_universidad-de-chile_racing-club-arg"
  },
  {
   "rivalId": "san-luis",
   "rivalName": "San Luis de Quillota",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 1,
   "gc": 0,
   "effectiveness": 1,
   "clubEffectiveness": 0.7778,
   "verdict": "poca-muestra",
   "lastMatchId": "2017-05-20_universidad-de-chile_san-luis"
  },
  {
   "rivalId": "santos-fc-bra",
   "rivalName": "Santos FC",
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 0,
   "gc": 2,
   "effectiveness": 0,
   "clubEffectiveness": 0.3333,
   "verdict": "poca-muestra",
   "lastMatchId": "2012-09-26_santos-fc-bra_universidad-de-chile"
  },
  {
   "rivalId": "universidad-de-concepcion",
   "rivalName": "Universidad de Concepción",
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 1,
   "gc": 2,
   "effectiveness": 0,
   "clubEffectiveness": 0.5185,
   "verdict": "poca-muestra",
   "lastMatchId": "2018-04-29_universidad-de-chile_universidad-de-concepcion"
  },
  {
   "rivalId": "vasco-da-gama-rj-bra",
   "rivalName": "Vasco da Gama RJ",
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 0,
   "gc": 2,
   "effectiveness": 0,
   "clubEffectiveness": 0.5,
   "verdict": "poca-muestra",
   "lastMatchId": "2018-05-22_universidad-de-chile_vasco-da-gama-rj-bra"
  }
 ],
 "competitions": [
  {
   "competitionId": "primera-division",
   "name": "Primera División",
   "pj": 61,
   "g": 29,
   "e": 17,
   "p": 15,
   "gf": 92,
   "gc": 67,
   "effectiveness": 0.5683,
   "home": {
    "pj": 58,
    "g": 27,
    "e": 17,
    "p": 14,
    "gf": 85,
    "gc": 64
   },
   "away": {
    "pj": 3,
    "g": 2,
    "e": 0,
    "p": 1,
    "gf": 7,
    "gc": 3
   }
  },
  {
   "competitionId": "copa-libertadores",
   "name": "Copa Libertadores",
   "pj": 6,
   "g": 2,
   "e": 2,
   "p": 2,
   "gf": 6,
   "gc": 6,
   "effectiveness": 0.4444,
   "home": {
    "pj": 6,
    "g": 2,
    "e": 2,
    "p": 2,
    "gf": 6,
    "gc": 6
   },
   "away": {
    "pj": 0,
    "g": 0,
    "e": 0,
    "p": 0,
    "gf": 0,
    "gc": 0
   }
  },
  {
   "competitionId": "copa-sudamericana",
   "name": "Copa Sudamericana",
   "pj": 4,
   "g": 3,
   "e": 0,
   "p": 1,
   "gf": 11,
   "gc": 2,
   "effectiveness": 0.75,
   "home": {
    "pj": 3,
    "g": 2,
    "e": 0,
    "p": 1,
    "gf": 7,
    "gc": 2
   },
   "away": {
    "pj": 1,
    "g": 1,
    "e": 0,
    "p": 0,
    "gf": 4,
    "gc": 0
   }
  },
  {
   "competitionId": "recopa-sudamericana",
   "name": "Recopa Sudamericana",
   "pj": 1,
   "g": 0,
   "e": 0,
   "p": 1,
   "gf": 0,
   "gc": 2,
   "effectiveness": 0,
   "home": {
    "pj": 0,
    "g": 0,
    "e": 0,
    "p": 0,
    "gf": 0,
    "gc": 0
   },
   "away": {
    "pj": 1,
    "g": 0,
    "e": 0,
    "p": 1,
    "gf": 0,
    "gc": 2
   }
  },
  {
   "competitionId": "copa-chile",
   "name": "Copa Chile",
   "pj": 1,
   "g": 1,
   "e": 0,
   "p": 0,
   "gf": 1,
   "gc": 0,
   "effectiveness": 1,
   "home": {
    "pj": 1,
    "g": 1,
    "e": 0,
    "p": 0,
    "gf": 1,
    "gc": 0
   },
   "away": {
    "pj": 0,
    "g": 0,
    "e": 0,
    "p": 0,
    "gf": 0,
    "gc": 0
   }
  }
 ],
 "distributions": {
  "byMonth": [
   0,
   2,
   9,
   11,
   10,
   1,
   3,
   16,
   5,
   8,
   7,
   1
  ],
  "byWeekday": [
   22,
   3,
   6,
   7,
   5,
   4,
   26
  ],
  "bySeason": [
   {
    "season": 2011,
    "pj": 1
   },
   {
    "season": 2012,
    "pj": 1
   },
   {
    "season": 2013,
    "pj": 1
   },
   {
    "season": 2015,
    "pj": 1
   },
   {
    "season": 2017,
    "pj": 11
   },
   {
    "season": 2018,
    "pj": 14
   },
   {
    "season": 2019,
    "pj": 8
   },
   {
    "season": 2021,
    "pj": 2
   },
   {
    "season": 2022,
    "pj": 2
   },
   {
    "season": 2023,
    "pj": 3
   },
   {
    "season": 2024,
    "pj": 14
   },
   {
    "season": 2025,
    "pj": 12
   },
   {
    "season": 2026,
    "pj": 3
   }
  ]
 },
 "played": 73,
 "goals": {
  "forPerMatch": 1.51,
  "againstPerMatch": 1.05,
  "goalless": 4,
  "cleanSheets": 24,
  "bigWins": 7,
  "bigLosses": 2,
  "highestScoring": {
   "id": "2025-11-09_universidad-de-chile_deportes-limache",
   "date": "2025-11-09",
   "season": 2025,
   "competitionId": "primera-division",
   "competitionName": "Primera División",
   "competitionKind": "liga",
   "tournament": "Liga de Primera 2025",
   "stage": "Fecha 27",
   "homeTeamId": "universidad-de-chile",
   "homeTeamName": "Universidad de Chile",
   "awayTeamId": "deportes-limache",
   "awayTeamName": "Deportes Limache",
   "homeGoals": 4,
   "awayGoals": 3,
   "homePens": null,
   "awayPens": null,
   "venueName": "Estadio Santa Laura-Universidad SEK",
   "isFinal": false,
   "mode": "propia"
  },
  "shootouts": {
   "pj": 0,
   "won": 0,
   "lost": 0
  }
 },
 "missed": {
  "missed": 516,
  "withYou": {
   "pj": 73,
   "g": 35,
   "e": 19,
   "p": 19,
   "gf": 110,
   "gc": 77,
   "effectiveness": 0.5662
  },
  "without": {
   "pj": 516,
   "g": 254,
   "e": 122,
   "p": 140,
   "gf": 880,
   "gc": 598,
   "effectiveness": 0.5711
  },
  "biggestWinMissed": {
   "id": "2023-04-09_chimbarongo_universidad-de-chile",
   "date": "2023-04-09",
   "season": 2023,
   "competitionId": "copa-chile",
   "competitionName": "Copa Chile",
   "competitionKind": "copa",
   "tournament": "2023",
   "stage": "Ronda 2",
   "homeTeamId": "chimbarongo",
   "homeTeamName": "Chimbarongo",
   "awayTeamId": "universidad-de-chile",
   "awayTeamName": "Universidad de Chile",
   "homeGoals": 0,
   "awayGoals": 10,
   "homePens": null,
   "awayPens": null,
   "venueName": null,
   "isFinal": false
  },
  "biggestLossMissed": {
   "id": "2018-04-26_cruzeiro-bra_universidad-de-chile",
   "date": "2018-04-26",
   "season": 2018,
   "competitionId": "copa-libertadores",
   "competitionName": "Copa Libertadores",
   "competitionKind": "internacional",
   "tournament": "2018",
   "stage": "Grupo 5",
   "homeTeamId": "cruzeiro-bra",
   "homeTeamName": "Cruzeiro",
   "awayTeamId": "universidad-de-chile",
   "awayTeamName": "Universidad de Chile",
   "homeGoals": 7,
   "awayGoals": 0,
   "homePens": null,
   "awayPens": null,
   "venueName": null,
   "isFinal": false
  },
  "finalsMissed": [
   {
    "id": "2025-09-14_colo-colo_universidad-de-chile",
    "date": "2025-09-14",
    "season": 2025,
    "competitionId": "supercopa",
    "competitionName": "Supercopa de Chile",
    "competitionKind": "supercopa",
    "tournament": "Supercopa 2025",
    "stage": "Final",
    "homeTeamId": "colo-colo",
    "homeTeamName": "Colo-Colo",
    "awayTeamId": "universidad-de-chile",
    "awayTeamName": "Universidad de Chile",
    "homeGoals": 0,
    "awayGoals": 3,
    "homePens": null,
    "awayPens": null,
    "venueName": "Estadio Santa Laura-Universidad SEK",
    "isFinal": true
   },
   {
    "id": "2017-11-11_universidad-de-chile_santiago-wanderers",
    "date": "2017-11-11",
    "season": 2017,
    "competitionId": "copa-chile",
    "competitionName": "Copa Chile",
    "competitionKind": "copa",
    "tournament": "2017",
    "stage": "Final",
    "homeTeamId": "universidad-de-chile",
    "homeTeamName": "Universidad de Chile",
    "awayTeamId": "santiago-wanderers",
    "awayTeamName": "Santiago Wanderers",
    "homeGoals": 1,
    "awayGoals": 3,
    "homePens": null,
    "awayPens": null,
    "venueName": null,
    "isFinal": true
   },
   {
    "id": "2015-12-02_universidad-de-chile_colo-colo",
    "date": "2015-12-02",
    "season": 2015,
    "competitionId": "copa-chile",
    "competitionName": "Copa Chile",
    "competitionKind": "copa",
    "tournament": "2015",
    "stage": "Final",
    "homeTeamId": "universidad-de-chile",
    "homeTeamName": "Universidad de Chile",
    "awayTeamId": "colo-colo",
    "awayTeamName": "Colo-Colo",
    "homeGoals": 1,
    "awayGoals": 1,
    "homePens": 5,
    "awayPens": 3,
    "venueName": null,
    "isFinal": true
   }
  ]
 },
 "records": {
  "longestWin": {
   "length": 4,
   "from": "2018-08-11",
   "to": "2018-10-27"
  },
  "longestUnbeaten": {
   "length": 11,
   "from": "2024-05-26",
   "to": "2025-04-02"
  },
  "longestWinless": {
   "length": 6,
   "from": "2018-04-15",
   "to": "2018-07-22"
  },
  "seasonsInARow": 6,
  "bestSeason": {
   "season": 2025,
   "pj": 12,
   "g": 9,
   "e": 1,
   "p": 2,
   "gf": 26,
   "gc": 11,
   "effectiveness": 0.7778,
   "clubEffectiveness": 0.5962,
   "delta": 18.2
  },
  "worstSeason": {
   "season": 2023,
   "pj": 3,
   "g": 0,
   "e": 1,
   "p": 2,
   "gf": 3,
   "gc": 5,
   "effectiveness": 0.1111,
   "clubEffectiveness": 0.4583,
   "delta": -34.7
  },
  "busiestSeason": {
   "season": 2018,
   "pj": 14
  }
 },
 "phases": [
  {
   "phase": "eliminatoria",
   "pj": 4,
   "g": 3,
   "e": 0,
   "p": 1,
   "gf": 11,
   "gc": 2,
   "effectiveness": 0.75
  },
  {
   "phase": "final",
   "pj": 2,
   "g": 1,
   "e": 0,
   "p": 1,
   "gf": 1,
   "gc": 2,
   "effectiveness": 0.5
  },
  {
   "phase": "liga",
   "pj": 61,
   "g": 29,
   "e": 17,
   "p": 15,
   "gf": 92,
   "gc": 67,
   "effectiveness": 0.5683
  },
  {
   "phase": "grupos",
   "pj": 6,
   "g": 2,
   "e": 2,
   "p": 2,
   "gf": 6,
   "gc": 6,
   "effectiveness": 0.4444
  }
 ],
 "highlights": [
  {
   "id": "rival-yeta-colo",
   "tone": "bad",
   "title": "Contra Colo-Colo eres yeta",
   "text": "1 victoria en 6 partidos: 33% de efectividad, y el club le gana al Cacique bastante más seguido cuando tú no estás.",
   "weight": 92,
   "matchIds": [
    "2026-08-23_universidad-de-chile_colo-colo"
   ]
  },
  {
   "id": "best-season",
   "tone": "good",
   "title": "2025 fue tu año",
   "text": "12 partidos, 9 victorias y 78% de efectividad: 18 puntos sobre lo que hizo el club esa temporada.",
   "weight": 88,
   "matchIds": []
  },
  {
   "id": "rival-cabala-hua",
   "tone": "good",
   "title": "Huachipato te debe una cena",
   "text": "5 partidos, 4 victorias y un empate: 87% de efectividad cuando vas.",
   "weight": 80,
   "matchIds": [
    "2024-09-24_universidad-de-chile_huachipato"
   ]
  },
  {
   "id": "unbeaten",
   "tone": "fun",
   "title": "11 partidos sin perder",
   "text": "Entre mayo de 2024 y abril de 2025 no conociste la derrota en la galería. Esa sí que fue una racha de campeón.",
   "weight": 76,
   "matchIds": []
  },
  {
   "id": "worst-season",
   "tone": "bad",
   "title": "2023: mejor ni lo recordemos",
   "text": "3 partidos, ninguna victoria y 11% de efectividad. El club rindió 35 puntos más sin ti.",
   "weight": 70,
   "matchIds": []
  },
  {
   "id": "clean-sheets",
   "tone": "neutral",
   "title": "Valla invicta en 24 partidos",
   "text": "Un tercio de lo que viste terminó con el arco en cero. Promedias 1,5 goles a favor y 1,1 en contra por partido.",
   "weight": 55,
   "matchIds": []
  },
  {
   "id": "big-wins",
   "tone": "fun",
   "title": "7 goleadas para recordar",
   "text": "Ganaste por 3 o más goles de diferencia en 7 ocasiones y solo viste 2 palizas en contra.",
   "weight": 50,
   "matchIds": []
  },
  {
   "id": "seasons-row",
   "tone": "neutral",
   "title": "6 temporadas seguidas en el estadio",
   "text": "De 2017 a 2022 no faltaste ni un año. Eso es constancia de socio.",
   "weight": 44,
   "matchIds": []
  }
 ]
} as unknown as Insights;
