import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/clients";
import type { GatewayConfig } from "@/lib/gateway";

export const dynamic = "force-dynamic";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  agent?: string;
  source: string;
  message: string;
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
      return NextResponse.json({ logs: [] });
    }

    const logs: LogEntry[] = [];

    // Try multiple log sources from the gateway

    // 1. Cron logs from jobs.json state
    try {
      const res = await fetch(`${gw.url}/__openclaw__/canvas/openclaw-config.json`, {
        cache: "no-store",
        headers: gw.token ? { Authorization: `Bearer ${gw.token}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        // We can at least extract cron errors as logs
        // Full log streaming would need a dedicated gateway endpoint
      }
    } catch {
      // silent
    }

    // 2. Try fetching cron job history for error logs
    try {
      const res = await fetch(`${gw.url}/__openclaw__/cron/jobs.json`, {
        cache: "no-store",
        headers: gw.token ? { Authorization: `Bearer ${gw.token}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const jobs = data?.jobs || (Array.isArray(data) ? data : []);
        for (const job of jobs) {
          const state = job.state || {};
          if (state.lastRunAtMs) {
            const ts = new Date(state.lastRunAtMs).toISOString().replace("T", " ").slice(0, 19);
            const level = state.lastStatus === "error" ? "error" : "info";
            logs.push({
              timestamp: ts,
              level,
              agent: job.agentId,
              source: `cron:${job.name}`,
              message: state.lastError
                ? `[${job.name}] ${state.lastError.slice(0, 200)}`
                : `[${job.name}] Completed in ${state.lastDurationMs || 0}ms`,
            });
          }
        }
      }
    } catch {
      // Fallback: no logs from this source
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ logs: [] }, { status: 500 });
  }
}
