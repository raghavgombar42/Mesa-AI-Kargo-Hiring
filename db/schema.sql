-- Kargo hiring dashboard schema (Neon Postgres). Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS rubric_criteria (
  id          SERIAL PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('PM', 'SPM')),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  weight      INT  NOT NULL CHECK (weight > 0 AND weight <= 100),
  source      TEXT,
  description TEXT NOT NULL,
  anchors     JSONB NOT NULL,
  probe       TEXT,
  red_flag    TEXT,
  sort_order  INT NOT NULL
);

-- personal_details holds name / email / phone / links / location and is NEVER
-- sent to an AI step. cv_content is the redacted CV text the AI sees.
CREATE TABLE IF NOT EXISTS candidates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- applied_role = the track the candidate is ranked in (set by the screen);
  -- selected_role = what Arjun picked at upload (AUTO = not specified)
  applied_role       TEXT NOT NULL CHECK (applied_role IN ('PM', 'SPM')),
  selected_role      TEXT NOT NULL DEFAULT 'AUTO' CHECK (selected_role IN ('PM', 'SPM', 'AUTO')),
  file_name          TEXT,
  personal_details   JSONB NOT NULL DEFAULT '{}'::jsonb,
  cv_content         TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'scoring' CHECK (status IN ('scoring', 'scored', 'error')),
  error              TEXT,
  headline           TEXT,
  -- Stage 1 hard screen: facts + 5 gate results; override = Arjun passed/failed it by hand
  screen             JSONB,
  screen_passed      BOOLEAN,
  screen_override    BOOLEAN,
  duplicate_of       UUID,
  pm_score           NUMERIC(5,1),
  spm_score          NUMERIC(5,1),
  brief              TEXT,
  probes             JSONB,
  brief_generated_at TIMESTAMPTZ,
  decision           TEXT CHECK (decision IN ('invite', 'reject')),
  decision_note      TEXT,
  decided_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scores (
  id                SERIAL PRIMARY KEY,
  candidate_id      UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('PM', 'SPM')),
  criterion_code    TEXT NOT NULL REFERENCES rubric_criteria(code),
  score             INT  NOT NULL CHECK (score BETWEEN 0 AND 4),
  reason            TEXT NOT NULL,
  evidence          TEXT,
  doubt             TEXT,
  evidence_verified BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (candidate_id, criterion_code)
);

CREATE TABLE IF NOT EXISTS email_drafts (
  candidate_id UUID PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('invite', 'rejection')),
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  -- locked = Arjun edited the draft or chose its type; the pipeline won't overwrite it
  locked       BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
  sent_at      TIMESTAMPTZ,
  sent_to      TEXT,
  resend_id    TEXT,
  error        TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidates_role_idx ON candidates (applied_role, status);
CREATE INDEX IF NOT EXISTS scores_candidate_idx ON scores (candidate_id);

-- Upgrades for databases created before the screening stage existed.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS selected_role TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS screen JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS screen_passed BOOLEAN;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS screen_override BOOLEAN;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS duplicate_of UUID;
