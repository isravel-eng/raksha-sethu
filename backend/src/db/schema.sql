-- RakshaSetu PostgreSQL schema
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'citizen',
    'counsellor',
    'district_officer',
    'state_officer',
    'national_admin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citizens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL UNIQUE,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  case_stage TEXT NOT NULL DEFAULT 'FIR'
    CHECK (case_stage IN ('FIR', 'CHARGESHEET', 'TRIAL', 'RELIEF', 'CLOSED')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'on_hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screenings (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
  screening_type TEXT NOT NULL,
  responses_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emotional_distress NUMERIC NOT NULL CHECK (emotional_distress >= 0 AND emotional_distress <= 10),
  distress_frequency NUMERIC NOT NULL CHECK (distress_frequency >= 0 AND distress_frequency <= 7),
  overwhelm NUMERIC NOT NULL CHECK (overwhelm >= 0 AND overwhelm <= 10),
  sleep_quality NUMERIC NOT NULL CHECK (sleep_quality >= 0 AND sleep_quality <= 10),
  fatigue NUMERIC NOT NULL CHECK (fatigue >= 0 AND fatigue <= 10),
  social_support NUMERIC NOT NULL CHECK (social_support >= 0 AND social_support <= 10),
  coping_ability NUMERIC NOT NULL CHECK (coping_ability >= 0 AND coping_ability <= 10),
  self_harm_indicator NUMERIC NOT NULL CHECK (self_harm_indicator >= 0 AND self_harm_indicator <= 1),
  message_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_events (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'FIR',
      'CHARGESHEET',
      'TRIAL_DATE',
      'HEARING_POSTPONED',
      'RELIEF',
      'THREAT_REPORTED'
    )),
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  check_in_id INTEGER NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL,
  dynamic_score NUMERIC,
  urgent_probability NUMERIC,
  confidence NUMERIC,
  trend TEXT,
  top_risk_factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  protective_factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  human_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  prediction_id INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS interventions (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  alert_id INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
  counsellor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS citizens_updated_at ON citizens;
CREATE TRIGGER citizens_updated_at BEFORE UPDATE ON citizens
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON cases
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_citizens_user_id ON citizens(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_citizen_id ON cases(citizen_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_case_id ON check_ins(case_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_citizen_id ON check_ins(citizen_id);
CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_predictions_check_in_id ON predictions(check_in_id);
CREATE INDEX IF NOT EXISTS idx_alerts_case_id ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
