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

-- Seed Discovery data for Newground
DO $$
DECLARE
  newground_id UUID;
BEGIN
  SELECT id INTO newground_id FROM clients WHERE slug = 'newground';
  IF newground_id IS NULL THEN RETURN; END IF;

  -- Revenue questions (from Shopify analysis)
  INSERT INTO discovery_questions (client_id, category, question, context, priority, status, answer, asked_at, answered_at, asked_in_channel, source_integration) VALUES
  (newground_id, 'revenue', 'Your Shopify data shows subscription blends account for 62% of total revenue. Is this the intentional product strategy, or would you like to grow other categories?', 'Shopify: 2,847 orders analysed. Top 3 SKUs = 62% of revenue. Subscription orders = 71% repeat rate.', 'critical', 'answered', 'Intentional — those are our subscription blends. The rest is retail/gift. Happy with this split.', now() - interval '3 days', now() - interval '2 days 18 hours', '#ai-ceo', 'shopify'),
  (newground_id, 'revenue', 'Average order value is £34.50, but subscription orders average £28.90 vs one-time orders at £42.10. Would a subscription upsell strategy be valuable?', 'Shopify: AOV variance between subscription (£28.90) and one-time (£42.10) suggests upsell opportunity.', 'normal', 'asked', null, now() - interval '1 day', null, '#ai-ceo', 'shopify'),
  (newground_id, 'revenue', 'Q4 shows a consistent 35% revenue spike (likely gifts). Do you run specific gift campaigns, or is this organic?', 'Shopify: Q4 2024 revenue +35% vs Q3. Q4 2025 +31% vs Q3. Pattern consistent.', 'normal', 'pending', null, null, null, null, 'shopify');

  -- Retention questions
  INSERT INTO discovery_questions (client_id, category, question, context, priority, status, answer, asked_at, answered_at, asked_in_channel, source_integration) VALUES
  (newground_id, 'retention', 'What is your target monthly subscription churn rate? Current data suggests 6-8% which is slightly above the specialty coffee industry average of 5%.', 'SKIO/Shopify: Monthly churn estimated at 6-8% based on subscription cancellation patterns.', 'critical', 'asked', null, now() - interval '1 day 6 hours', null, '#ai-ceo', 'shopify'),
  (newground_id, 'retention', 'Do you currently have an automated win-back flow for lapsed subscribers? We see 23% of cancellations happen in months 3-4.', 'Shopify: Subscription lifecycle analysis shows month 3-4 as the highest churn window.', 'normal', 'pending', null, null, null, null, 'shopify');

  -- Finance questions
  INSERT INTO discovery_questions (client_id, category, question, context, priority, status, answer, asked_at, answered_at, asked_in_channel, source_integration) VALUES
  (newground_id, 'finance', 'Stripe shows an average payment processing fee of 2.4%. Are you on the standard Stripe rate, or have you negotiated volume pricing?', 'Stripe: £142K processed in last 12 months. Average fee 2.4%. Volume discount threshold is typically £100K+.', 'normal', 'answered', 'Standard rate. We have not negotiated — didn''t know we could at our volume.', now() - interval '2 days', now() - interval '1 day 20 hours', '#ai-ceo', 'stripe'),
  (newground_id, 'finance', 'Your Xero data shows a cash flow dip in January-February each year. Do you have a credit facility for seasonal gaps, or is this managed from reserves?', 'Xero: Cash position drops 18-22% in Jan-Feb vs annual average. Recovers by March.', 'critical', 'answered', 'Managed from reserves. We build up cash in Q4 specifically for the January dip. It is tight but we have not needed a facility yet.', now() - interval '2 days', now() - interval '1 day 22 hours', '#ai-ceo', 'xero');

  -- Marketing questions
  INSERT INTO discovery_questions (client_id, category, question, context, priority, status, answer, asked_at, answered_at, asked_in_channel, source_integration) VALUES
  (newground_id, 'marketing', 'Klaviyo shows 4,200 email subscribers but the last campaign was 6 weeks ago. Is email marketing paused, or deprioritised?', 'Klaviyo: 4,200 subscribers. Last campaign sent 6 weeks ago. Open rate on last 5 campaigns: 34% (above industry avg 21%).', 'critical', 'asked', null, now() - interval '12 hours', null, '#ai-ceo', 'klaviyo'),
  (newground_id, 'marketing', 'Your Instagram has strong engagement (4.2% vs industry 1.5%) but you are not using Instagram Shopping. Would enabling product tags be worth exploring?', 'Instagram: 8,400 followers, 4.2% engagement rate. No Shopping tags detected on recent posts.', 'normal', 'pending', null, null, null, null, 'instagram'),
  (newground_id, 'marketing', 'We found no TikTok presence. Specialty coffee brands see 3-5x higher engagement on TikTok vs Instagram. Is this a conscious choice or a resource gap?', 'No TikTok integration connected. Industry benchmark: specialty coffee TikTok engagement 6-9%.', 'nice_to_have', 'pending', null, null, null, null, 'tiktok');

  -- Operations questions
  INSERT INTO discovery_questions (client_id, category, question, context, priority, status, source_integration) VALUES
  (newground_id, 'operations', 'What is your typical order fulfilment time from placement to dispatch? This helps us set monitoring thresholds.', 'No fulfilment data available — need founder input to establish baselines.', 'normal', 'pending', null),
  (newground_id, 'operations', 'Do you roast to order or maintain roasted stock? This affects how we model inventory alerts.', 'Shopify inventory data shows variable stock levels — pattern unclear without context.', 'normal', 'pending', 'shopify');

  -- Growth questions
  INSERT INTO discovery_questions (client_id, category, question, context, priority, status, source_integration) VALUES
  (newground_id, 'growth', 'What are your top 3 business priorities for the next 6 months? This shapes which intelligence scans we prioritise.', 'No data source — requires founder input. Critical for configuring intelligence engine focus areas.', 'critical', 'pending', null),
  (newground_id, 'growth', 'Are you considering wholesale/B2B channels? Your current setup is 100% D2C.', 'Shopify: All orders are direct-to-consumer. No B2B pricing or wholesale orders detected.', 'nice_to_have', 'pending', 'shopify');

  -- Data ingestion: 3 complete, 1 ingesting, 2 not connected
  INSERT INTO discovery_data_status (client_id, integration, status, records_pulled, date_range_start, date_range_end, findings_summary, started_at, completed_at) VALUES
  (newground_id, 'shopify', 'complete', 2847, '2024-01-01', '2026-04-13', '62% of revenue from 3 subscription blends. 71% repeat rate on subscriptions. Q4 spike of 35% (likely gifts). AOV £34.50.', now() - interval '4 days', now() - interval '3 days 20 hours'),
  (newground_id, 'stripe', 'complete', 1203, '2024-01-01', '2026-04-13', '£142K processed in 12 months. Average fee 2.4% — volume discount possible. 3 failed payments last month (0.2% rate, healthy).', now() - interval '4 days', now() - interval '3 days 22 hours'),
  (newground_id, 'xero', 'complete', 892, '2024-01-01', '2026-04-13', 'Cash flow dips 18-22% in Jan-Feb. Gross margin steady at 58-62%. No outstanding debt.', now() - interval '3 days', now() - interval '2 days 18 hours');
  INSERT INTO discovery_data_status (client_id, integration, status, records_pulled, started_at) VALUES
  (newground_id, 'klaviyo', 'ingesting', 340, now() - interval '6 hours');
  INSERT INTO discovery_data_status (client_id, integration, status) VALUES
  (newground_id, 'skio', 'not_connected'),
  (newground_id, 'instagram', 'not_connected');

  -- Vault sections: 2 complete, 1 in progress, 4 pending
  INSERT INTO discovery_vault_status (client_id, section, status, completed_at) VALUES
  (newground_id, 'company_overview', 'complete', now() - interval '2 days'),
  (newground_id, 'brand_voice', 'complete', now() - interval '1 day');
  INSERT INTO discovery_vault_status (client_id, section, status, notes) VALUES
  (newground_id, 'team_directory', 'in_progress', 'Waiting for Dickon to confirm team roles');
  INSERT INTO discovery_vault_status (client_id, section, status) VALUES
  (newground_id, 'processes', 'pending'),
  (newground_id, 'target_audience', 'pending'),
  (newground_id, 'competitor_landscape', 'pending'),
  (newground_id, 'kpi_config', 'pending');
END $$;
