CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT results_scores_non_negative CHECK (home_score >= 0 AND away_score >= 0)
);

CREATE INDEX IF NOT EXISTS results_fixture_id_idx ON results (fixture_id);
