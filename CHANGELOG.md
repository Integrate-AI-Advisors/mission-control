# Changelog

## [0.2.0.0] - 2026-04-11

### Added
- Integrations tab on client deep dive page: card grid with status badges, connect/manage/disconnect flows, provider-specific setup instructions for Shopify, Stripe, Xero, Klaviyo, and SKIO
- AES-256-GCM encryption module for storing API credentials (server-only, matching platform key format)
- Server Actions for integration management: connect with encrypted credential storage, disconnect with credential clearing, health check via platform API
- Webhook URL display with copy button and provider-specific configuration hints
- Dialog-based connect flow with numbered setup instructions, masked credential fields with show/hide toggle, and store domain input for Shopify
- Manage dialog with connection test, credential update, and disconnect confirmation
- 19 new tests: encryption round-trip, random IV, key validation, server action CRUD, webhook URL construction
- Auth guards on all server actions (getUser() verification with @integrate-ai.uk domain check)
- UUID validation on integration IDs in health check endpoint to prevent path traversal

### Changed
- getSupabaseAdmin() now throws when SUPABASE_SERVICE_ROLE_KEY is missing instead of silently falling back to anon key
- ENCRYPTION_KEY validates both length and hex format (rejects non-hex characters)
- Platform API health check response status validated against allowlist before DB write
- Health check Supabase write errors now surfaced to caller instead of silently swallowed

### Fixed
- Open redirect in auth callback: next parameter now validated (must start with / and not //)

### Security
- Encrypted credentials stripped at server boundary before passing to client components
- All credential input fields are password-type with explicit show/hide toggle
- .gitignore updated to cover bare .env files (previously only .env*.local was covered)

## [0.1.1.0] - 2026-04-11

### Added
- Verification tab on client deep dive page: 30-day rolling score, per-role breakdown with progress bars, Recharts trend chart with 98% gate reference line, recent verified sessions table, and Operations Phase Gate checklist
- 5 Supabase query functions for verification data (rolling score, by-role, history, recent sessions, phase gate status)
- 23 Vitest tests covering trend computation, phase gate logic, score thresholds, and aggregation
- Loading skeleton for verification page

### Changed
- Chart colors use CSS custom properties (var(--terra), var(--green)) instead of hardcoded hex values
- Extracted MS_PER_DAY constant to eliminate magic number repetition in query file
- Phase gate computation reuses rolling score data instead of making a duplicate DB query

### Fixed
- Chart X-axis date labels off-by-one for negative-UTC timezones (parse as local time, not UTC midnight)
- Security reports directory (.gstack/) removed from git tracking and added to .gitignore

## [0.1.0.1] - 2026-04-10

### Added
- Full Vitest test suite: 88 tests across 9 files covering utilities, types, phase logic, cost aggregation, session stats, integration health, auth routing, and server action validation
- Playwright E2E setup with Chromium: auth redirect tests, route existence, navigation structure
- Supabase mock factory for unit testing query modules
- Test scripts: `npm run test:e2e` and `npm run test:all`

## [0.1.0.0] - 2026-04-10

Complete rebuild of Mission Control as the IntegrateAI Client Intelligence Platform.

### Added
- Multi-client dashboard reading from Supabase (replacing OpenClaw gateway + Langfuse)
- Client card grid at /clients with phase badges, budget utilization bars, health indicators
- Client deep dive at /clients/[slug] with two-column layout: sessions table + integration health grid
- Session history at /clients/[slug]/sessions with server-side pagination (50/page) and status filters
- Cost analytics at /clients/[slug]/costs with daily trend bars, budget utilization, role breakdown
- Approval queue at /clients/[slug]/queue with full lifecycle status badges
- Client onboarding via Server Action at /clients/new with slug validation
- Live data polling (15s interval via router.refresh, server-side)
- Brand design system: DM Serif Display headings, Inter body, JetBrains Mono data, Terra #D97757 accent
- shadcn/ui component library (Tailwind v3 compat) with 14 UI primitives
- DESIGN.md capturing brand-to-shadcn token mapping, typography specs, responsive breakpoints
- Error boundaries, loading skeletons, and empty states on all routes
- Over-budget alert banner on client pages
- Phase-colored accent bars on client cards (discovery=green, dashboard=blue, intelligence=terra, operations=purple)
- Atomic phase advancement with concurrent-safe WHERE clause
- Query layer: 8 files in lib/queries/ with shared patterns
- Vitest test suite: 28 tests covering utilities, types, business logic

### Changed
- All data now comes from Supabase (service role key, server-side only)
- Auth middleware enforces login on ALL routes (removed API bypass)
- Fonts loaded via next/font instead of Google Fonts link tags
- Root redirect: / → /clients (was / → /dashboard)

### Removed
- OpenClaw gateway integration (108-agent dashboard)
- Langfuse cost tracking API
- All agent hierarchy, executive grouping, skills, and cron job UI
- /api/clients route (replaced by Server Action)
- VPS health service integration
