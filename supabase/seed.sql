-- Seed: IntegrateAI as the first client
-- Run this AFTER schema.sql

INSERT INTO clients (name, slug, industry, founder_name, founder_email, phase, gateway_url, vps_ip, vps_port)
VALUES (
  'IntegrateAI Advisors',
  'integrateai',
  'AI Consulting',
  'Chad',
  'chad@integrate-ai.uk',
  'operations',
  'http://89.167.1.21:18789',
  '89.167.1.21',
  2222
)
ON CONFLICT (slug) DO UPDATE SET
  gateway_url = EXCLUDED.gateway_url,
  vps_ip = EXCLUDED.vps_ip,
  updated_at = NOW();
