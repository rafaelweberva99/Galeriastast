# GaleríaStats · ¿Eres cábala o yeta?

Carnet de hincha del fútbol chileno. Marcas los partidos de tu club a los que fuiste al estadio y la app
calcula tu efectividad como hincha (**Mufómetro**), tus clásicos, finales, rachas, el modo **Infiltrado**
y rankings de hinchas por club.

Réplica funcional de [TribunaStats](https://www.tribunastats.com/) (fútbol argentino), adaptada al fútbol
chileno.

## Funcionalidades

| Funcionalidad | Dónde | Detalle |
|---|---|---|
| Carnet de hincha (registro / ingreso) | `/registro`, `/ingresar` | Usuario + club. Sesiones con cookie httpOnly; contraseñas con scrypt. |
| Marcar partidos | `/partidos` | Filtros por temporada, competición y rival. Tres estados por partido: *No fui*, *Fui*, *Infiltrado*. Solo partidos del propio club y ya jugados. |
| Mufómetro | `/carnet` | Efectividad = puntos obtenidos / en disputa en los partidos que viste. >60% **cábala**, 40–60% **neutro**, <40% **yeta** (mínimo 5 partidos). |
| Impacto real | `/carnet` | Tu efectividad vs. la del club en todas sus partidos de esas mismas temporadas. |
| Clásicos | `/carnet`, `/clubes/[id]` | Superclásico, Clásico Universitario, Porteño, de Colonias, etc. (`data/catalog/rivalries.json`). |
| Finales | `/carnet`, `/clubes/[id]` | Finales de playoffs, Copa Chile y Libertadores, con definición a penales. |
| Modo Infiltrado | `/carnet` | Partidos en la galería rival: cuentan para el Mufómetro y además se muestran aparte. |
| Rachas y partidos memorables | `/carnet` | Racha ganadora / invicta / sin ganar, mayor goleada, peor derrota, primer y último partido. |
| Desgloses | `/carnet` | Por temporada, competición, rival, local/visita. |
| Carnet público | `/hincha/[usuario]` | Se puede ocultar desde `/perfil`. |
| Rankings | `/rankings`, `/rankings/[club]` | Hinchas que más fueron, mayores cábalas y mayores yetas por club. |
| Historial de clubes | `/clubes`, `/clubes/[id]` | Récord histórico, por temporada, clásicos y finales. |
| Transparencia de datos | `/datos` | Cobertura por competición y resultado de los chequeos de calidad. |

## Arquitectura

```
data/
  sources.json          configuración de fuentes (URL, licencia, archivos por competición)
  catalog/              catálogo versionado: clubes (+alias), competiciones, clásicos
  corrections.csv       correcciones confirmadas con evidencia (opcional)
  crosscheck/*.csv      segundas fuentes para marcar partidos como verificados (opcional)
  raw/                  descargas crudas (no versionadas)
scripts/
  fetch.ts              descarga los archivos de la fuente
  ingest.ts             parsea, normaliza nombres y carga partidos (idempotente)
  verify.ts             correcciones + verificación cruzada + chequeos de consistencia
src/
  lib/db/               esquema SQL y conexión (node:sqlite, sin dependencias nativas)
  lib/domain/           lógica pura: Mufómetro, rachas, clásicos, finales, normalización
  lib/ingest/           parser Football.TXT, catálogo, CSV, chequeos de calidad
  lib/repo/             acceso a datos (partidos, clubes, usuarios/asistencias, rankings)
  lib/auth.ts           sesiones (cookies) para Server Components / Server Actions
  app/                  Next.js App Router: páginas + server actions (actions.ts)
  components/           UI (Mufómetro SVG, barras G/E/P, fila de partido, selector de asistencia)
tests/                  Vitest: dominio, parser, repositorios y calidad de datos
```

- **Next.js 15 (App Router) + React 19 + TypeScript.** Páginas renderizadas en el servidor; las
  mutaciones son Server Actions validadas con zod. El único componente interactivo pesado es el selector
  de asistencia, con actualización optimista.
- **SQLite vía `node:sqlite`** (Node ≥ 22.13). Datos deportivos de solo lectura (cargados por scripts)
  y datos de hinchas (escritos por la app) en el mismo archivo. La capa `lib/repo` aísla el SQL, de modo
  que migrar a Postgres solo toca esa carpeta.
- **Dominio puro y testeado.** `lib/domain/stats.ts` no conoce la base de datos: recibe partidos y
  devuelve el carnet completo.
- **Ids determinísticos de partido** (`fecha_local_visita`) para deduplicar entre fuentes y hacer la
  ingesta idempotente.

## Datos

La búsqueda y verificación de fuentes la hicieron dos agentes independientes:

- **Fuente principal:** resultados de worldfootball.net, vía el espejo en formato Football.TXT
  [`yorobot/cache.wfb.txt`](https://github.com/yorobot/cache.wfb.txt). Primera División desde el Clausura
  2003, Copa Chile 2015–2024 y partidos de clubes chilenos en Copa Libertadores 2000–2024 (unos 7.800
  partidos).
- El repositorio fuente **no declara licencia**, por eso los datos crudos no se versionan aquí: se
  descargan con `npm run data:fetch`.
- **Huecos conocidos:** Primera 2001–2002 y Apertura 2003, temporadas 2025–2026, segunda mitad de 2024,
  Primera B, Supercopa y Copa Sudamericana. Para la temporada en curso se recomienda API-Football
  (liga 265), con plan de pago.

## Puesta en marcha

```bash
npm install
npm run data:fetch     # descarga datos crudos a data/raw/
npm run data:ingest    # crea data/galeriastats.db y carga catálogo + partidos
npm run data:verify    # correcciones, verificación cruzada y chequeos
npm run dev            # http://localhost:3000
```

`npm test` corre la suite de Vitest y `npm run lint` hace el chequeo de tipos.

Requiere Node 22.13 o superior.
