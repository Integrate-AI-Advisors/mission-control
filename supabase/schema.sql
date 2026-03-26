-- IntegrateAI Mission Control — Supabase Schema
-- Run this in the Supabase SQL Editor to set up tables

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT,
  founder_name TEXT,
  founder_email TEXT,
  founder_phone TEXT,
  phase TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (phase IN ('onboarding', 'discovery', 'dashboard', 'intelligence', 'operations')),
  gateway_url TEXT,                -- e.g. http://89.167.1.21:18789
  gateway_token TEXT,              -- bearer token for gateway auth
  vps_ip TEXT,
  vps_port INTEGER DEFAULT 2222,
  slack_workspace_id TEXT,
  slack_channel_ids JSONB DEFAULT '{}',
  integrations JSONB DEFAULT '{}',
  discovery_report_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approval queue table
CREATE TABLE IF NOT EXISTS approval_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('save_money', 'grow_revenue', 'efficiency', 'retention')),
  urgency TEXT NOT NULL DEFAULT 'this_week'
    CHECK (urgency IN ('now', 'this_week', 'when_convenient')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_estimate TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  founder_notes TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);
CREATE INDEX IF NOT EXISTS idx_approval_queue_client ON approval_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON approval_queue(status);

-- Row-level security (enable but allow all for now — add policies when auth is set up)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;

-- Permissive policies for service role (Mission Control backend)
CREATE POLICY "Allow all for authenticated" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON approval_queue FOR ALL USING (true);
