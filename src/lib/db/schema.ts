/**
 * Esquema relacional de GaleríaStats, válido para SQLite (desarrollo, tests) y Postgres (producción).
 * Datos deportivos (solo lectura para la app, cargados por scripts/ingest.ts) y datos de hinchas.
 * Va embebido como texto para que viaje dentro del bundle serverless.
 */

const TEMPLATE = `
CREATE TABLE IF NOT EXISTS competitions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('liga', 'copa', 'internacional', 'supercopa')),
  tier        INTEGER
);

CREATE TABLE IF NOT EXISTS teams (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,
  city            TEXT,
  color_primary   TEXT NOT NULL DEFAULT '#1f2937',
  color_secondary TEXT NOT NULL DEFAULT '#ffffff',
  is_chilean      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS venues (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  city  TEXT
);

-- id determinístico: fecha + local + visita. date en ISO yyyy-mm-dd (hora de Chile).
CREATE TABLE IF NOT EXISTS matches (
  id              TEXT PRIMARY KEY,
  date            TEXT NOT NULL,
  season          INTEGER NOT NULL,
  competition_id  TEXT NOT NULL REFERENCES competitions(id),
  tournament      TEXT,
  stage           TEXT,
  home_team_id    TEXT NOT NULL REFERENCES teams(id),
  away_team_id    TEXT NOT NULL REFERENCES teams(id),
  home_goals      INTEGER,
  away_goals      INTEGER,
  home_pens       INTEGER,
  away_pens       INTEGER,
  venue_id        TEXT REFERENCES venues(id),
  is_final        INTEGER NOT NULL DEFAULT 0,
  source          TEXT NOT NULL,
  source_ref      TEXT,
  verified        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home_team_id, date);
CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away_team_id, date);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season, competition_id);

CREATE TABLE IF NOT EXISTS rivalries (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  team_a  TEXT NOT NULL REFERENCES teams(id),
  team_b  TEXT NOT NULL REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS users (
  id            {{SERIAL_ID}},
  username      TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  club_id       TEXT NOT NULL REFERENCES teams(id),
  is_public     INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT {{NOW}}
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL
);

-- mode = 'propia' (galería de su club) | 'infiltrado' (galería rival; igual cuenta para el Mufómetro)
CREATE TABLE IF NOT EXISTS attendances (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id    TEXT NOT NULL REFERENCES matches(id),
  mode        TEXT NOT NULL DEFAULT 'propia' CHECK (mode IN ('propia', 'infiltrado')),
  created_at  TEXT NOT NULL DEFAULT {{NOW}},
  PRIMARY KEY (user_id, match_id)
);
CREATE INDEX IF NOT EXISTS idx_attendances_match ON attendances(match_id);

-- Registro de consentimientos (Ley 19.628 / 21.719): cada aceptación y cada cambio de preferencia
-- queda como una fila nueva; nunca se edita. kind: 'terms' | 'privacy' | 'age' | 'public_profile'.
CREATE TABLE IF NOT EXISTS consents (
  id          {{SERIAL_ID}},
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('terms', 'privacy', 'age', 'public_profile')),
  version     TEXT NOT NULL,
  granted     INTEGER NOT NULL CHECK (granted IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT {{NOW}}
);
CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id, kind);

-- Privacidad por defecto: los hinchas creados antes de existir el registro de consentimientos nunca eligieron
-- ser públicos, así que quedan privados hasta que lo acepten en /aceptar o /perfil. Idempotente.
UPDATE users SET is_public = 0
 WHERE is_public = 1
   AND NOT EXISTS (SELECT 1 FROM consents c WHERE c.user_id = users.id AND c.kind = 'public_profile');

-- Goles de cada partido. team_id = equipo al que se le suma el gol en el marcador;
-- en un autogol (own_goal = 1) el jugador pertenece al equipo rival de team_id.
CREATE TABLE IF NOT EXISTS goals (
  id          {{SERIAL_ID}},
  match_id    TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id     TEXT NOT NULL REFERENCES teams(id),
  player      TEXT NOT NULL,
  minute      INTEGER,
  own_goal    INTEGER NOT NULL DEFAULT 0,
  penalty     INTEGER NOT NULL DEFAULT 0,
  source      TEXT NOT NULL,
  verified    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_goals_match ON goals(match_id);
CREATE INDEX IF NOT EXISTS idx_goals_team_player ON goals(team_id, player);

-- Bitácora de cargas de datos, para trazabilidad y para no recargar archivos sin cambios.
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id          {{SERIAL_ID}},
  source      TEXT NOT NULL,
  file        TEXT NOT NULL,
  sha256      TEXT NOT NULL,
  rows_read   INTEGER NOT NULL,
  rows_loaded INTEGER NOT NULL,
  ran_at      TEXT NOT NULL DEFAULT {{NOW}}
);
`;

export function schemaFor(dialect: "sqlite" | "pg"): string {
  return dialect === "sqlite"
    ? TEMPLATE.replaceAll("{{SERIAL_ID}}", "INTEGER PRIMARY KEY AUTOINCREMENT").replaceAll("{{NOW}}", "(datetime('now'))")
    : TEMPLATE.replaceAll("{{SERIAL_ID}}", "SERIAL PRIMARY KEY").replaceAll(
        "{{NOW}}",
        "(to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'))",
      );
}
