-- GaleríaStats: esquema relacional.
-- Datos deportivos (solo lectura para la app, cargados por scripts/ingest.ts)
-- y datos de hinchas (escritos por la app).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS competitions (
  id          TEXT PRIMARY KEY,            -- slug estable, ej. 'primera-division'
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('liga', 'copa', 'internacional', 'supercopa')),
  tier        INTEGER                      -- 1 = Primera, 2 = Primera B, ...
);

CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,            -- slug, ej. 'colo-colo'
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  city        TEXT,
  color_primary   TEXT NOT NULL DEFAULT '#1f2937',
  color_secondary TEXT NOT NULL DEFAULT '#ffffff',
  is_chilean  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS venues (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  city  TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id              TEXT PRIMARY KEY,        -- determinístico: fecha + local + visita
  date            TEXT NOT NULL,           -- ISO yyyy-mm-dd (hora local de Chile)
  season          INTEGER NOT NULL,
  competition_id  TEXT NOT NULL REFERENCES competitions(id),
  tournament      TEXT,                    -- 'Apertura', 'Clausura', 'Transición', 'Anual', ...
  stage           TEXT,                    -- 'Fecha 12', 'Cuartos de final', 'Final', ...
  home_team_id    TEXT NOT NULL REFERENCES teams(id),
  away_team_id    TEXT NOT NULL REFERENCES teams(id),
  home_goals      INTEGER,                 -- NULL = partido aún no jugado / sin resultado
  away_goals      INTEGER,
  home_pens       INTEGER,
  away_pens       INTEGER,
  venue_id        TEXT REFERENCES venues(id),
  is_final        INTEGER NOT NULL DEFAULT 0,
  source          TEXT NOT NULL,           -- id de la fuente de datos (ver data/sources.json)
  source_ref      TEXT,                    -- id/URL del registro en la fuente
  verified        INTEGER NOT NULL DEFAULT 0  -- 1 = confirmado por una segunda fuente
);
CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home_team_id, date);
CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away_team_id, date);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season, competition_id);

CREATE TABLE IF NOT EXISTS rivalries (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,                   -- 'Superclásico', 'Clásico Universitario', ...
  team_a  TEXT NOT NULL REFERENCES teams(id),
  team_b  TEXT NOT NULL REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  club_id       TEXT NOT NULL REFERENCES teams(id),
  is_public     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL
);

-- Un registro por partido al que el hincha fue.
-- mode = 'propia'     -> estuvo en la galería de su club
-- mode = 'infiltrado' -> fue escondido a la galería rival (igual cuenta para el Mufómetro)
CREATE TABLE IF NOT EXISTS attendances (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id    TEXT NOT NULL REFERENCES matches(id),
  mode        TEXT NOT NULL DEFAULT 'propia' CHECK (mode IN ('propia', 'infiltrado')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, match_id)
);
CREATE INDEX IF NOT EXISTS idx_attendances_match ON attendances(match_id);

-- Bitácora de cargas de datos, para trazabilidad y verificación.
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      TEXT NOT NULL,
  file        TEXT NOT NULL,
  sha256      TEXT NOT NULL,
  rows_read   INTEGER NOT NULL,
  rows_loaded INTEGER NOT NULL,
  ran_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
