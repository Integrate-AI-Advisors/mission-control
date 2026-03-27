import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/clients";
import type { GatewayConfig } from "@/lib/gateway";

export const dynamic = "force-dynamic";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: string;
  timezone: string;
  message: string;
  nextRun: string | null;
  lastRun: string | null;
  lastStatus: "ok" | "error" | "unknown";
  lastError: string | null;
  lastDuration: number | null;
  consecutiveErrors: number;
}

export async function GET(request: NextRequest) {
  try {
    const clientSlug = request.nextUrl.searchParams.get("client") || "integrateai";
    const client = await getClient(clientSlug);

    const gw: GatewayConfig = {
      url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
      token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
    };

    if (!gw.url) {
      return NextResponse.json({ jobs: [] });
    }

    // Fetch cron jobs from the gateway's static file
    const authHeaders: Record<string, string> = gw.token
      ? { Authorization: `Bearer ${gw.token}` }
      : {};

    // Try the cron jobs file directly
    let jobs: CronJob[] = [];

    try {
      const res = await fetch(`${gw.url}/__openclaw__/cron/jobs.json`, {
        cache: "no-store",
        headers: authHeaders,
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const rawJobs = data?.jobs || (Array.isArray(data) ? data : []);

        jobs = rawJobs.map((job: Record<string, unknown>) => {
          const schedule = job.schedule as Record<string, string> | undefined;
          const payload = job.payload as Record<string, unknown> | undefined;
          const state = (job.state || {}) as Record<string, unknown>;

          return {
            id: job.id as string,
            agentId: job.agentId as string,
            name: job.name as string,
            enabled: job.enabled !== false,
            schedule: schedule?.expr || "unknown",
            timezone: schedule?.tz || "UTC",
            message: (payload?.message as string) || "",
            nextRun: state.nextRunAtMs
              ? new Date(state.nextRunAtMs as number).toISOString()
              : null,
            lastRun: state.lastRunAtMs
              ? new Date(state.lastRunAtMs as number).toISOString()
              : null,
            lastStatus: state.lastStatus === "error" ? "error"
              : state.lastRunAtMs ? "ok"
              : "unknown",
            lastError: (state.lastError as string) || null,
            lastDuration: (state.lastDurationMs as number) || null,
            consecutiveErrors: (state.consecutiveErrors as number) || 0,
          } satisfies CronJob;
        });
      }
    } catch {
      // Try fallback: config file
      try {
        const configRes = await fetch(
          `${gw.url}/__openclaw__/canvas/openclaw-config.json`,
          {
            cache: "no-store",
            headers: authHeaders,
            signal: AbortSignal.timeout(8000),
          }
        );
        if (configRes.ok) {
          const config = await configRes.json();
          const cronConfig = config?.cron || {};
          // Config only has settings, not job list — return empty
          return NextResponse.json({
            jobs: [],
            config: cronConfig,
          });
        }
      } catch {
        // silent
      }
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching cron jobs:", error);
    return NextResponse.json({ jobs: [] }, { status: 500 });
  }
}
