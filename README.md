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
| Importar desde PuntoTicket | `/importar` | Pegas el correo de confirmación de compra (o subes el `.eml`) y se proponen los partidos que coinciden por fecha (±1 día) y rival. El hincha confirma; el correo no se guarda. |
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

La búsqueda y verificación de fuentes la hicieron dos agentes independientes: uno buscó plataformas y otro
auditó la elegida.

**Fuente principal:** resultados de worldfootball.net, vía el espejo en formato Football.TXT
[`yorobot/cache.wfb.txt`](https://github.com/yorobot/cache.wfb.txt). Son unos 7.800 partidos:
- Primera División desde el Clausura 2003.
- Copa Chile 2015–2024.
- Partidos de clubes chilenos en Copa Libertadores 2000–2024.

El repositorio fuente **no declara licencia**, por eso los datos crudos no se versionan aquí: se descargan
con `npm run data:fetch`.

### Confiabilidad (auditoría del agente verificador)

| Competición / período | Nivel | Evidencia |
|---|---|---|
| Primera, fase regular 2004–2023 | Alta | El campeón calculado desde los partidos coincide con el oficial en 21 de 21 torneos. Muestra aleatoria contrastada con prensa: 0 errores. |
| Finales 2003–2013 | Alta en el campeón | Los 17 campeones coinciden. Faltaban detalles (marcador de 90', penales), ya corregidos. |
| Playoffs 2004–2006 | Media-baja → corregida | 9 partidos corregidos con evidencia en `data/corrections.csv`. |
| Copa Chile 2015–2023 | Alta | Finales verificadas. |
| 2024 (liga y copa) | Baja | La copia se cortó en la fecha 23 de la liga y antes de las semifinales de la copa. |

- **Correcciones:** `data/corrections.csv` guarda cada error confirmado con la URL de su evidencia. Se
  aplican automáticamente en cada ingesta.
- **Verificación cruzada:** `data/crosscheck/` contiene partidos contrastados con fuentes independientes
  (prensa, ESPN). Esos partidos quedan marcados `verified = 1`.
- **Resultados de mesa:** se usa el resultado oficial. Por ejemplo, Coquimbo–Cobresal 2023 cuenta como
  0-3 por fallo del Tribunal, aunque en cancha terminó 2-1.
- **Finales:** son finales las rondas "Final" de los playoffs de Apertura y Clausura, la final única del
  Apertura 2013 y la final de Copa Chile. Las liguillas de clasificación a Libertadores y Sudamericana no
  cuentan como finales.

**Huecos conocidos:**
- Primera 2001–2002 y Apertura 2003.
- Segunda mitad de 2024 y temporadas 2025–2026.
- Copa Chile antes de 2015.
- Primera B, Supercopa y Copa Sudamericana.

Para la temporada en curso se recomienda API-Football (liga 265, plan de pago). Para 2001–2003 se
recomienda RSSSF.

## Integración con PuntoTicket

PuntoTicket, la ticketera de la mayoría de los partidos del fútbol chileno, no publica una API ni un
programa de afiliados. Por eso la integración rápida se apoya en lo único que todo comprador tiene: el
**correo de confirmación de compra**.

- `src/lib/ingest/tickets.ts` hace el trabajo:
  - decodifica el `.eml` (quoted-printable, base64 y HTML);
  - detecta fechas (`10/08/2024`, `10 de agosto de 2024`, ISO);
  - detecta equipos, incluidos apodos de ticketera como "UdeChile" o "Cruzados";
  - cruza esos datos con los partidos del club del hincha.
- **Siguiente nivel:** un acuerdo comercial con PuntoTicket (API de historial de compras o enlaces de
  afiliado en "Comprar entradas"), o conectar Gmail con OAuth para importar todas las compras de una vez.

Capturas de la app en `docs/capturas/`.

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

## Publicar en Railway

El repo trae `Dockerfile`, `railway.json` y `scripts/start.sh`. En el primer arranque se descargan y cargan
los partidos solos; los usuarios quedan guardados en un volumen persistente.

1. Entra a <https://railway.com>, inicia sesión con GitHub y elige **New Project → Deploy from GitHub repo**.
   Elige este repositorio (rama `main`).
2. En el servicio creado: **Settings → Volumes → Add Volume**, con *mount path* `/data`.
3. **Settings → Networking → Generate Domain** para obtener la URL pública
   (`https://<algo>.up.railway.app`).
4. Espera el primer despliegue: la carga de datos toma alrededor de un minuto. Luego abre la URL.

Variables opcionales:
- `DATABASE_PATH`: por defecto es `/data/galeriastats.db`.
- `REINGEST=1`: fuerza a recargar los partidos en el próximo arranque.

El mismo `Dockerfile` sirve para Render o Fly.io (con un volumen en `/data`).

