-- Discovery questions: tracked here after the CEO agent asks them in Slack
CREATE TABLE IF NOT EXISTS discovery_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'revenue', 'operations', 'marketing', 'finance', 'retention', 'growth', 'general'
  question TEXT NOT NULL,
  context TEXT, -- data-driven context that prompted this question
  priority TEXT NOT NULL DEFAULT 'normal', -- 'critical', 'normal', 'nice_to_have'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'asked', 'answered', 'skipped'
  answer TEXT, -- founder's response captured from Slack
  answered_at TIMESTAMPTZ,
  asked_at TIMESTAMPTZ,
  asked_in_channel TEXT,
  source_integration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discovery_questions_client ON discovery_questions(client_id);
CREATE INDEX idx_discovery_questions_status ON discovery_questions(client_id, status);

-- Discovery data ingestion tracking
CREATE TABLE IF NOT EXISTS discovery_data_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  integration TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_connected', -- 'not_connected', 'connected', 'ingesting', 'complete', 'failed'
  records_pulled INTEGER DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  findings_summary TEXT, -- AI summary of what the data revealed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, integration)
);

CREATE INDEX idx_discovery_data_client ON discovery_data_status(client_id);

-- Discovery vault/knowledge base construction status
CREATE TABLE IF NOT EXISTS discovery_vault_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  section TEXT NOT NULL, -- 'company_overview', 'brand_voice', 'team_directory', 'processes', 'target_audience', 'competitor_landscape', 'kpi_config'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'complete'
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, section)
);

CREATE INDEX idx_discovery_vault_client ON discovery_vault_status(client_id);

-- Phase history: when each phase was entered/exited
CREATE TABLE IF NOT EXISTS phase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ
);

CREATE INDEX idx_phase_history_client ON phase_history(client_id);

-- Seed initial phase history for existing clients
INSERT INTO phase_history (client_id, phase, entered_at)
SELECT id, phase, COALESCE(phase_changed_at, created_at)
FROM clients
ON CONFLICT DO NOTHING;

-- No seed data. These tables are populated by the platform agents during
-- real Discovery sessions. Mission Control is read-only.
