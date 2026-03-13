# n8n Integration Layer — Full Implementation Plan

**Status:** SHELVED — To be revisited when ready for multi-client onboarding
**Created:** 2026-03-13
**Authors:** Chad, Paul, Claude
**Prerequisite:** At least 2-3 clients onboarded manually first to validate which integrations matter

---

## 1. Problem Statement

IntegrateAI runs a 9-employee AI squad via OpenClaw on a single VPS. All tool credentials (HubSpot, Buffer, Google, Discord etc.) are hardcoded in flat env files (`/root/.openclaw/env`). This approach:

- Requires SSH terminal access to add/change credentials
- Has no per-client isolation (single-tenant)
- No OAuth — clients must manually generate and share API keys
- No token auto-refresh — expired tokens break agents silently
- No visibility into which integrations are healthy

**Goal:** Replace the flat credential store with n8n as a self-hosted integration backbone so that:
1. Client tool connections happen via OAuth in a browser (on a call or self-service)
2. Agents call n8n webhooks instead of APIs directly — n8n handles auth
3. Each client's credentials are isolated and auto-refreshed
4. Chad/Paul can manage all integrations visually without touching a terminal

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VPS (Single Server)                        │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   nginx       │    │   nginx       │    │   nginx              │  │
│  │   :443        │    │   :443        │    │   :443               │  │
│  │   app.        │    │   n8n.        │    │   integrate-ai.uk    │  │
│  │   integrate-  │    │   integrate-  │    │   (main website)     │  │
│  │   ai.uk       │    │   ai.uk       │    │                      │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────────────┘  │
│         │                   │                                       │
│         ▼                   ▼                                       │
│  ┌──────────────┐    ┌──────────────┐                              │
│  │  Mission      │    │  n8n          │                              │
│  │  Control      │    │  (Docker)     │                              │
│  │  Next.js      │    │  :5678        │                              │
│  │  :3001        │    │               │                              │
│  └──────┬───────┘    └──────┬───────┘                              │
│         │                   ▲                                       │
│         │                   │ HTTP webhooks                         │
│         │                   │                                       │
│  ┌──────┴───────────────────┴──────────────────────┐               │
│  │              OpenClaw Gateway :18789              │               │
│  │                                                   │               │
│  │  ┌─────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐  │               │
│  │  │Lead │ │Strategist│ │Content  │ │Social    │  │               │
│  │  │     │ │          │ │Creator  │ │Media Mgr │  │               │
│  │  └─────┘ └──────────┘ └─────────┘ └──────────┘  │               │
│  │  ┌─────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐  │               │
│  │  │Email│ │Market    │ │Data     │ │Sales     │  │               │
│  │  │Mktg │ │Research  │ │Analyst  │ │Rep       │  │               │
│  │  └─────┘ └──────────┘ └─────────┘ └──────────┘  │               │
│  │  ┌─────┐                                         │               │
│  │  │ PA  │                                         │               │
│  │  └─────┘                                         │               │
│  └──────────────────────────────────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    n8n webhooks call out to:
                              │
          ┌───────────┬───────┴────┬────────────┐
          ▼           ▼            ▼            ▼
     ┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
     │HubSpot  │ │Buffer  │ │Google   │ │Meta/     │
     │CRM API  │ │API     │ │APIs     │ │LinkedIn  │
     └─────────┘ └────────┘ └─────────┘ └──────────┘
```

## 3. Agent → n8n Data Flow

```
Agent needs to create a HubSpot contact for Client X:

  ┌─────────────────┐
  │ Sales Rep Agent  │
  │ (OpenClaw)       │
  └────────┬────────┘
           │
           │ 1. Tool call: hubspot_create_contact
           │    {clientId: "acme", firstName: "Jane", email: "jane@acme.com"}
           ▼
  ┌─────────────────┐
  │ OpenClaw Gateway │
  │ Tool Router      │
  └────────┬────────┘
           │
           │ 2. POST http://localhost:5678/webhook/hubspot-create-contact
           │    Headers: X-Client-Id: acme
           │    Body: {firstName: "Jane", email: "jane@acme.com"}
           ▼
  ┌─────────────────┐
  │ n8n Workflow     │
  │ "HubSpot:       │
  │  Create Contact" │
  └────────┬────────┘
           │
           │ 3. n8n looks up "acme" credentials
           │    (stored in n8n's credential store)
           │
           │ 4. POST https://api.hubapi.com/crm/v3/objects/contacts
           │    Authorization: Bearer {acme's HubSpot token}
           │    Body: {properties: {firstname: "Jane", email: "jane@acme.com"}}
           ▼
  ┌─────────────────┐
  │ HubSpot API     │
  │ (acme's account)│
  └────────┬────────┘
           │
           │ 5. Response: {id: "12345", properties: {...}}
           │
           ▼ (bubbles all the way back)
  ┌─────────────────┐
  │ Sales Rep Agent  │
  │ "Contact created │
  │  successfully"   │
  └─────────────────┘
```

## 4. Client Credential Flow (OAuth)

```
Chad is on a call with new client "Acme Corp":

  ┌──────────────────┐
  │ Chad opens        │
  │ Mission Control   │
  │ Clicks "+" button │
  └────────┬─────────┘
           │
           │ 1. Creates client "acme" in database
           ▼
  ┌──────────────────┐
  │ Client Setup Page │
  │ Shows checklist:  │
  │ □ HubSpot         │
  │ □ Buffer          │
  │ □ Google          │
  │ □ Discord         │
  └────────┬─────────┘
           │
           │ 2. Chad clicks "Connect HubSpot"
           ▼
  ┌──────────────────┐     ┌──────────────────┐
  │ n8n OAuth Trigger │────▶│ HubSpot OAuth    │
  │ (opens in new tab │     │ Consent Screen   │
  │  or iframe)       │     │ "Grant access to │
  └──────────────────┘     │  IntegrateAI?"   │
                            └────────┬─────────┘
                                     │
                                     │ 3. Client (or Chad on their behalf)
                                     │    clicks "Authorize"
                                     ▼
                            ┌──────────────────┐
                            │ n8n Callback      │
                            │ Stores tokens:    │
                            │  access_token     │
                            │  refresh_token    │
                            │  expires_at       │
                            │  client: "acme"   │
                            └────────┬─────────┘
                                     │
                                     │ 4. Redirects back to Mission Control
                                     ▼
                            ┌──────────────────┐
                            │ Client Setup Page │
                            │ ☑ HubSpot ✓      │
                            │ □ Buffer          │
                            │ □ Google          │
                            │ □ Discord         │
                            └──────────────────┘
```

---

## 5. Implementation Phases

### Phase 1: n8n Infrastructure Setup
**Effort:** ~2 hours
**Dependencies:** None
**Risk:** Low

**Tasks:**
1. Install Docker on VPS (if not present)
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. Create docker-compose for n8n:
   ```
   /root/n8n/docker-compose.yml
   ```
   ```yaml
   version: '3.8'
   services:
     n8n:
       image: n8nio/n8n:latest
       restart: always
       ports:
         - "127.0.0.1:5678:5678"
       environment:
         - N8N_HOST=n8n.integrate-ai.uk
         - N8N_PORT=5678
         - N8N_PROTOCOL=https
         - WEBHOOK_URL=https://n8n.integrate-ai.uk/
         - N8N_BASIC_AUTH_ACTIVE=true
         - N8N_BASIC_AUTH_USER=chad
         - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
         - GENERIC_TIMEZONE=Europe/London
         - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
       volumes:
         - n8n_data:/home/node/.n8n
   volumes:
     n8n_data:
   ```

3. Add DNS record for `n8n.integrate-ai.uk`
   - A record → VPS IP
   - Submit via Namecheap API (remember: must re-submit ALL records)

4. nginx config at `/etc/nginx/sites-available/n8n`:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name n8n.integrate-ai.uk;

       ssl_certificate /etc/letsencrypt/live/n8n.integrate-ai.uk/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/n8n.integrate-ai.uk/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:5678;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           chunked_transfer_encoding off;
           proxy_buffering off;
           proxy_cache off;
       }
   }

   server {
       listen 80;
       server_name n8n.integrate-ai.uk;
       return 301 https://$host$request_uri;
   }
   ```

5. SSL via certbot:
   ```bash
   # Temp HTTP-only config first, then:
   certbot certonly --webroot -w /var/www/html -d n8n.integrate-ai.uk
   # Then switch to full SSL config
   ```

6. Start n8n:
   ```bash
   cd /root/n8n && docker compose up -d
   ```

7. Verify: browse to `https://n8n.integrate-ai.uk`, log in, see n8n UI.

**Acceptance criteria:**
- n8n accessible at `https://n8n.integrate-ai.uk` with basic auth
- WebSocket connections work (needed for n8n's UI)
- n8n data persists across Docker restarts (volume mount)

---

### Phase 2: Core Webhook Workflows

**Effort:** ~1-2 hours per integration
**Dependencies:** Phase 1
**Risk:** Medium — each provider's API has quirks

Build ONE n8n workflow per integration. Each workflow:
- Triggered by webhook (agent calls it)
- Accepts `clientId` header to pick the right credentials
- Calls the external API
- Returns structured JSON to the agent

**Priority order** (based on IntegrateAI's current squad needs):

#### 2a. HubSpot CRM (Sales Rep, Lead, PA)
```
Webhook workflows needed:
├── hubspot-create-contact    POST  {email, firstName, lastName, company, ...}
├── hubspot-get-contacts      GET   {query?, limit?}
├── hubspot-update-contact    PUT   {contactId, properties}
├── hubspot-create-deal       POST  {dealName, stage, amount, contactId}
├── hubspot-get-deals         GET   {stage?, limit?}
└── hubspot-create-note       POST  {contactId, body}
```

n8n workflow structure (same pattern for all):
```
┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐
│ Webhook  │───▶│ Switch on  │───▶│ HubSpot Node │───▶│ Respond  │
│ Trigger  │    │ clientId   │    │ (uses client │    │ to       │
│          │    │ (credential│    │  credentials)│    │ Webhook  │
└──────────┘    │  lookup)   │    └──────────────┘    └──────────┘
                └────────────┘
```

#### 2b. Buffer (Social Media Manager, Content Creator)
```
Webhook workflows needed:
├── buffer-create-post        POST  {profileIds[], text, media?, scheduledAt?}
├── buffer-get-profiles       GET   {}
├── buffer-get-queue          GET   {profileId}
└── buffer-get-analytics      GET   {profileId, startDate, endDate}
```

#### 2c. Google Analytics 4 (Data Analyst, Strategist)
```
Webhook workflows needed:
├── ga4-run-report            POST  {propertyId, dateRange, metrics[], dimensions[]}
├── ga4-get-realtime          GET   {propertyId}
└── ga4-get-properties        GET   {}
```

#### 2d. Google Search Console (Market Researcher, Data Analyst)
```
Webhook workflows needed:
├── gsc-search-analytics      POST  {siteUrl, startDate, endDate, dimensions[]}
└── gsc-get-sitemaps          GET   {siteUrl}
```

#### 2e. Meta — Instagram/Facebook (Social Media Manager)
```
Webhook workflows needed:
├── meta-publish-post         POST  {pageId, message, image?, link?}
├── meta-get-insights         GET   {pageId, metrics[], period}
├── meta-ig-publish           POST  {igUserId, caption, imageUrl}
└── meta-ig-get-media         GET   {igUserId, limit?}
```

#### 2f. LinkedIn (Social Media Manager, Strategist)
```
Webhook workflows needed:
├── linkedin-create-post      POST  {orgId, text, media?}
├── linkedin-get-org-stats    GET   {orgId}
└── linkedin-get-followers    GET   {orgId}
```

#### 2g. Email — Mailchimp/SendGrid (Email Marketer)
```
Webhook workflows needed:
├── email-send-campaign       POST  {listId, subject, htmlContent, ...}
├── email-get-lists           GET   {}
├── email-add-subscriber      POST  {listId, email, firstName, ...}
└── email-get-campaign-stats  GET   {campaignId}
```

#### 2h. Discord (all agents — comms channel)
```
Already handled by OpenClaw's native Discord integration.
No n8n workflow needed unless we want to add non-chat features:
├── discord-create-channel    POST  {guildId, name, category?}
└── discord-send-embed        POST  {channelId, embed}
```

**Acceptance criteria per workflow:**
- Webhook URL responds within 5 seconds
- Returns structured JSON matching the agent's expected tool response format
- Handles missing/invalid clientId with clear error
- Handles API errors gracefully (returns error message, not 500)

---

### Phase 3: Per-Client Credential Namespacing

**Effort:** ~3-4 hours
**Dependencies:** Phase 2 (at least one workflow working)
**Risk:** Medium — this is the multi-tenancy core

#### 3a. Credential Storage Strategy

n8n stores credentials encrypted in its SQLite database. Each credential has a name.

**Naming convention:**
```
{clientId}_{provider}

Examples:
  integrateai_hubspot
  integrateai_buffer
  acme_hubspot
  acme_google
  acme_buffer
```

#### 3b. Credential Routing in Workflows

Each webhook workflow needs to select the right credential based on `clientId`:

```
Option A: Separate workflow per client (simple, duplicated)
  └── "Acme HubSpot Create Contact" uses acme_hubspot credential
  └── "BobCo HubSpot Create Contact" uses bobco_hubspot credential
  Problem: Workflow explosion. 7 integrations × N clients = too many workflows.

Option B: Single workflow with dynamic credential selection (DRY, complex)
  └── Webhook receives clientId
  └── Function node maps clientId → credential name
  └── HTTP Request node uses the credential dynamically
  Problem: n8n's credential system doesn't natively support dynamic selection.

Option C: Single workflow per integration, sub-workflows per client (balanced)
  └── "HubSpot Create Contact" webhook
  └── Switch node on clientId
  └── Each branch uses that client's stored credential
  └── Adding a client = adding a branch to each workflow
  Problem: Manual step per client, but manageable up to ~20 clients.
```

**Recommendation: Option C.** It's explicit (matches engineering preferences), works within n8n's native capabilities, and the manual step of adding a branch is fast in n8n's visual editor. When you hit 20+ clients and it becomes painful, that's when you build the automation.

#### 3c. Client Registry

A simple JSON file or n8n workflow that tracks which clients exist and which credentials they have connected:

```json
// /root/n8n/clients.json (or stored as n8n workflow variable)
{
  "integrateai": {
    "name": "IntegrateAI",
    "credentials": {
      "hubspot": "connected",
      "buffer": "connected",
      "google": "connected",
      "meta": "pending",
      "linkedin": "pending"
    },
    "squad": ["lead", "strategist", "content-creator", "social-media-manager",
              "email-marketer", "market-researcher", "data-analyst", "sales-rep", "pa"],
    "createdAt": "2026-03-13"
  }
}
```

This file is read by Mission Control to show which tools are connected per client.

---

### Phase 4: Mission Control UI for Client Onboarding

**Effort:** ~6-8 hours
**Dependencies:** Phase 1 + Phase 3
**Risk:** Medium

#### 4a. New Pages/Components

```
/root/mission-control/src/
├── app/
│   ├── dashboard/
│   │   └── [clientId]/
│   │       ├── page.tsx              # Existing — employee grid
│   │       └── settings/
│   │           └── page.tsx          # NEW — client settings + tool connections
│   └── onboarding/
│       └── page.tsx                  # NEW — "+" button destination
├── components/
│   ├── ClientSetup.tsx               # NEW — onboarding wizard
│   ├── ToolConnectionCard.tsx        # NEW — per-tool connect/status card
│   └── SquadPicker.tsx               # NEW — toggle which employees client gets
└── lib/
    ├── clients.ts                    # NEW — read/write client registry
    └── n8n.ts                        # NEW — n8n API client (credential status, webhook URLs)
```

#### 4b. Onboarding Flow (what Chad sees)

```
┌─────────────────────────────────────────────────────────────┐
│  Mission Control              [+ New Client]    [Kill Switch]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Client Details                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Company Name:  [Acme Corp________________]          │    │
│  │ Contact Name:  [Jane Smith________________]         │    │
│  │ Industry:      [SaaS / B2B  ▼]                      │    │
│  │ Primary Goal:  [Lead Generation  ▼]                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Step 2: Pick Their Team                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ Lead (CEO / Chief of Staff)        Required       │    │
│  │ ☑ Strategist (CMO)                   Recommended    │    │
│  │ ☑ Content Creator                    Recommended    │    │
│  │ ☑ Social Media Manager               Recommended    │    │
│  │ □ Email Marketer                     Optional       │    │
│  │ □ Market Researcher                  Optional       │    │
│  │ □ Data Analyst                       Optional       │    │
│  │ ☑ Sales Rep                          Recommended    │    │
│  │ □ PA                                 Optional       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Step 3: Connect Tools                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ HubSpot  │ │ Buffer   │ │ Google   │ │ Meta     │      │
│  │          │ │          │ │          │ │          │      │
│  │[Connect] │ │[Connect] │ │[Connect] │ │[Connect] │      │
│  │          │ │          │ │          │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ LinkedIn │ │ Email    │ │ Discord  │                    │
│  │          │ │ Provider │ │ /Slack   │                    │
│  │[Connect] │ │[Connect] │ │[Connect] │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                             │
│              [Activate Team →]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4c. Tool Connection Cards — States

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  HubSpot        │  │  HubSpot        │  │  HubSpot        │
│                 │  │                 │  │                 │
│  Not connected  │  │  ● Connected    │  │  ⚠ Expired      │
│                 │  │  acme@corp.com  │  │  Token expired   │
│  [Connect →]    │  │  [Disconnect]   │  │  [Reconnect →]  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     Grey                  Green                Amber
```

#### 4d. What "Connect" does

For OAuth-capable tools (HubSpot, Buffer, Google, Meta, LinkedIn):
1. Click "Connect"
2. Opens n8n OAuth URL in popup/new tab
3. Client authorizes
4. n8n stores credential with naming convention `{clientId}_{provider}`
5. Popup closes, card refreshes to "Connected"

For API-key-only tools (Cal.com, some email providers):
1. Click "Connect"
2. Modal opens with API key input field
3. Chad pastes the key
4. Saved to n8n as a credential via n8n's REST API
5. Card refreshes to "Connected"

For Discord/Slack:
1. Click "Connect"
2. Opens bot invite URL
3. Client adds bot to their server
4. Chad enters the guild/channel IDs
5. Saved to openclaw.json for that client

---

### Phase 5: OpenClaw Agent Tool Definitions

**Effort:** ~4-6 hours
**Dependencies:** Phase 2
**Risk:** High — this changes how agents work

#### 5a. Current Tool Architecture

```
Today:
  Agent "Sales Rep" has tool: hubspot_create_contact
    → Tool definition hardcodes the API endpoint + auth from env
    → Agent calls tool → OpenClaw executes → direct API call to HubSpot

After n8n:
  Agent "Sales Rep" has tool: hubspot_create_contact
    → Tool definition points to n8n webhook URL
    → Agent calls tool → OpenClaw executes → HTTP POST to n8n webhook
    → n8n handles auth + credential lookup → calls HubSpot → returns result
```

#### 5b. Tool Definition Changes

Current tool definition pattern (in agent YAML/JSON):
```yaml
tools:
  - name: hubspot_create_contact
    description: Create a new contact in HubSpot CRM
    endpoint: https://api.hubapi.com/crm/v3/objects/contacts
    auth: bearer ${HUBSPOT_API_KEY}
    method: POST
```

New tool definition pattern:
```yaml
tools:
  - name: hubspot_create_contact
    description: Create a new contact in HubSpot CRM
    endpoint: http://localhost:5678/webhook/hubspot-create-contact
    headers:
      X-Client-Id: ${CLIENT_ID}
      X-Webhook-Secret: ${N8N_WEBHOOK_SECRET}
    method: POST
```

#### 5c. Client Context Injection

OpenClaw needs to know which client the agent is currently operating for. Options:

```
Option A: Environment variable per client instance
  - Each client gets their own OpenClaw process group
  - CLIENT_ID set in env per process
  - Agents only ever serve one client
  Pro: Simple, total isolation
  Con: Resource heavy (9 agents × N clients = 9N processes)

Option B: Runtime context from conversation
  - Agent determines client from Discord server / channel / conversation
  - Passes clientId in every tool call
  - Single squad serves multiple clients
  Pro: Resource efficient
  Con: Risk of cross-client data leakage, complex routing

Option C: Hybrid — one squad instance per client, shared n8n
  - Each client gets their own OpenClaw config + workspace
  - But all share the same n8n instance for tool execution
  - CLIENT_ID baked into each client's openclaw.json
  Pro: Isolated agent context, shared infrastructure
  Con: Still resource heavy on agent side
```

**Recommendation: Option C (Hybrid).** Keeps agent isolation (critical for trust/security) while sharing the expensive integration layer. Resource cost is manageable up to ~10 clients on a single VPS, at which point you'd add a second server.

#### 5d. Files to modify per agent

For each of the 9 agents:
```
/root/.openclaw/agents/{agentId}/agent/
├── agent.yaml          # Update tool endpoints to n8n webhooks
└── tools/
    ├── hubspot.yaml    # Repoint to n8n
    ├── buffer.yaml     # Repoint to n8n
    └── ...             # Each tool file updated
```

---

### Phase 6: Migration — IntegrateAI's Own Credentials

**Effort:** ~2 hours
**Dependencies:** Phase 2 + Phase 3
**Risk:** Low — but needs careful cutover

#### 6a. Migration Steps

```
1. Create IntegrateAI as a client in n8n (clientId: "integrateai")
2. For each credential currently in /root/.openclaw/env:
   a. Create matching credential in n8n (integrateai_hubspot, etc.)
   b. Test the n8n webhook workflow with IntegrateAI's credentials
   c. Verify agent gets same data back
3. Update IntegrateAI's agent tool definitions to point to n8n webhooks
4. Run both paths in parallel for 48 hours (n8n + direct) to verify
5. Remove direct API credentials from env file
6. Update Mission Control software.ts to show connection status from n8n
```

#### 6b. Rollback Plan

```
If n8n breaks:
1. Agent tool definitions still have the old endpoint commented out
2. Uncomment direct API endpoints, comment n8n endpoints
3. Restart OpenClaw gateway
4. Squad is back to direct API calls in < 5 minutes
```

Keep `/root/.openclaw/env` as a backup for 30 days after migration.

---

## 6. Security Considerations

### 6a. n8n Access
- n8n UI behind basic auth (Chad/Paul only)
- n8n listens on 127.0.0.1:5678 only — not exposed to internet directly
- nginx proxies external requests with SSL
- Consider: add IP allowlisting in nginx for extra protection

### 6b. Webhook Security
- All webhook URLs include a secret token: `/webhook/{secret}/hubspot-create-contact`
- Or: verify `X-Webhook-Secret` header in each workflow
- Webhooks only accept requests from localhost (OpenClaw) — nginx doesn't proxy `/webhook/` paths from external

### 6c. Credential Isolation
- n8n encrypts all credentials at rest (N8N_ENCRYPTION_KEY in docker-compose)
- Each client's credentials named with `{clientId}_` prefix
- Workflows route by clientId — never cross-reference

### 6d. Token Refresh
- n8n handles OAuth token refresh automatically for supported providers
- For API keys that don't expire: no action needed
- For API keys that do expire: n8n can run a scheduled workflow to test each credential and alert if expired

```
Credential Health Check (scheduled, daily at 8am):

  ┌──────────┐    ┌────────────────┐    ┌──────────┐    ┌──────────┐
  │ Cron     │───▶│ For each client│───▶│ Test API │───▶│ If fail: │
  │ Trigger  │    │ + credential   │    │ call     │    │ Discord  │
  │ 8am daily│    │                │    │          │    │ alert to │
  └──────────┘    └────────────────┘    └──────────┘    │ #alerts  │
                                                        └──────────┘
```

---

## 7. Monitoring & Observability

### 7a. n8n Execution Logs
- n8n stores execution history (success/failure) for every workflow run
- Accessible via n8n UI under "Executions"
- Retain for 30 days

### 7b. Mission Control Integration
- New API route: `GET /api/integrations/{clientId}` returns credential status
- Reads from n8n API: `GET /credentials` filtered by clientId prefix
- Shows in Mission Control settings page per client

### 7c. Alerting
- n8n workflow: on any webhook failure → post to Discord #alerts channel
- n8n workflow: daily credential health check → post failures to Discord

---

## 8. Cost Analysis

```
n8n self-hosted:                    £0/month
Docker overhead on VPS:             ~200MB RAM, negligible CPU
Additional VPS cost:                £0 (current VPS has headroom)
SSL certificate:                    £0 (Let's Encrypt)
DNS record:                         £0 (included with Namecheap)
────────────────────────────────────────────────
Total incremental cost:             £0/month

vs. Alternatives:
  Zapier Team:                      $74/month (limited tasks)
  Make Pro:                         $16/month (limited ops)
  Nango Growth:                     $249/month
  Composio Business:                $149/month
```

---

## 9. Resource Requirements (VPS)

```
Current VPS usage (estimated):
  OpenClaw Gateway + 9 agents:      ~2-3GB RAM
  Mission Control (Next.js):        ~200MB RAM
  nginx:                            ~50MB RAM

After adding n8n:
  n8n Docker container:             ~300-500MB RAM
  n8n SQLite database:              ~50MB disk (grows slowly)

Total estimated:                    ~3-4GB RAM
Recommended VPS minimum:            4GB RAM, 2 vCPU
```

Check current VPS specs before proceeding. If under 4GB RAM, consider upgrading.

---

## 10. Timeline Estimate

```
Phase 1: n8n Infrastructure         2 hours
Phase 2: First webhook (HubSpot)    2 hours
  ── CHECKPOINT: prove end-to-end works ──
Phase 2: Remaining webhooks          6-8 hours (1-2h each, as needed)
Phase 3: Credential namespacing      3-4 hours
Phase 4: Mission Control UI          6-8 hours
Phase 5: Agent tool migration        4-6 hours
Phase 6: IntegrateAI migration       2 hours
────────────────────────────────────────────
Total:                               25-32 hours

Recommended approach:
  Week 1: Phase 1 + Phase 2 (HubSpot only) = prove it works
  Week 2: Phase 3 + Phase 5 = multi-tenant ready
  Week 3: Phase 4 = nice UI for onboarding
  Week 4: Phase 6 + remaining Phase 2 workflows = fully migrated
```

---

## 11. Decision Log

Decisions to be made when this plan is activated:

| # | Decision | Options | Notes |
|---|----------|---------|-------|
| 1 | n8n version pinning | Latest vs specific version | Pin to avoid breaking changes |
| 2 | Credential routing | Option A/B/C from Phase 3 | Recommended: C (Switch node) |
| 3 | Client context injection | Option A/B/C from Phase 5 | Recommended: C (Hybrid) |
| 4 | n8n backup strategy | Docker volume backup frequency | Daily cron rsync recommended |
| 5 | When to build custom UI vs use n8n UI | Phase 4 timing | After 2-3 manual client onboards |
| 6 | Email provider | Mailchimp vs SendGrid vs Resend | Depends on client needs |
| 7 | Slack support | Add alongside Discord? | Only if a client needs it |

---

## 12. NOT in Scope (Explicitly Deferred)

- **Client self-service portal** — clients don't create their own accounts. Chad/Paul onboard them.
- **Billing/subscription management** — handled outside Mission Control for now.
- **Agent auto-scaling** — single VPS, fixed squad size per client.
- **n8n clustering/HA** — single instance is fine until 20+ clients.
- **Custom OAuth app registration** — use n8n's built-in OAuth apps initially. Register custom apps only when needed (e.g., for custom branding on consent screens).
- **Automated squad provisioning** — "Activate Team" button creates config manually at first.
- **Audit logging** — n8n execution logs are sufficient for now.

---

## 13. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| n8n Docker container crashes | All integrations down | Low | pm2/systemd restart policy, Docker `restart: always` |
| VPS runs out of RAM | Everything unstable | Medium | Monitor with `htop`, upgrade VPS proactively |
| n8n webhook latency > 5s | Agent tool calls timeout | Low | n8n is local (localhost), latency ~100ms |
| Credential leaked via logs | Security breach | Low | n8n encrypts at rest, disable verbose logging |
| n8n breaking update | Workflows stop working | Medium | Pin Docker image version, test before updating |
| Client revokes OAuth token | Integration breaks silently | Medium | Daily health check workflow + alerts |

---

## 14. Pre-flight Checklist (Before Starting)

- [ ] Confirm VPS has at least 4GB RAM (`free -h`)
- [ ] Confirm Docker is installed or can be installed
- [ ] Confirm port 5678 is available (`ss -tlnp | grep 5678`)
- [ ] Have Namecheap API credentials ready for DNS
- [ ] Decide on n8n admin password
- [ ] Generate N8N_ENCRYPTION_KEY (`openssl rand -hex 32`)
- [ ] Have at least one client ready to test with (IntegrateAI itself counts)
