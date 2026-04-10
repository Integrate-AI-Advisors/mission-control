# TODOS

## Next.js 16 Upgrade
**What:** Upgrade from Next.js 14.2.35 to Next.js 16.
**Why:** Latest framework features (Cache Components, Turbopack default, proxy.ts). Current version works but accumulates migration debt.
**Includes:** proxy.ts migration from middleware.ts, async request APIs (await cookies/headers), Turbopack config changes.
**Depends on:** Sprint 4 redesign shipped and stable.
**Added:** 2026-04-10 (plan-eng-review)

## Supabase Realtime (replace polling)
**What:** Switch from Server Actions polling to Supabase Realtime WebSocket subscriptions for agent_sessions, event_stream, and integrations tables.
**Why:** Instant updates instead of 10-15s polling delay. Better UX for live session monitoring.
**Blocked by:** Platform repo needs to add client-scoped RLS policies on these tables. Currently anon key sees nothing (Sprint 1 decision: no permissive RLS policies).
**When:** After platform repo ships RLS changes.
**Added:** 2026-04-10 (plan-eng-review)

## Tailwind v4 Migration
**What:** Upgrade from Tailwind v3.4.1 to v4. Convert tailwind.config.ts to CSS-based config. Update shadcn from v3 compat to v4 native.
**Why:** Better performance, modern config pattern. Currently pinned to v3 compat for stability.
**Bundle with:** Next.js 16 upgrade. One framework migration at a time.
**Added:** 2026-04-10 (plan-eng-review)
