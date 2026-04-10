# Changelog

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
