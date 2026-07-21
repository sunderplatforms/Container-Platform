CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition TEXT,
  kickoff TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fixtures_distinct_teams CHECK (home_team <> away_team)
);

CREATE INDEX IF NOT EXISTS fixtures_kickoff_idx ON fixtures (kickoff);

INSERT INTO fixtures (id, competition, kickoff, home_team, away_team, status)
VALUES ('d5a595fc-7a9f-45a7-93ae-5ed0d43b3001', 'Premier League', '2026-08-15T14:00:00Z', 'North London FC', 'Merseyside FC', 'scheduled')
ON CONFLICT (id) DO NOTHING;
