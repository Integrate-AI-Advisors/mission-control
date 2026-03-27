import { NextRequest, NextResponse } from "next/server";
import { getAgents } from "@/lib/openclaw";
import { getClient } from "@/lib/clients";
import { isExecutive } from "@/lib/hierarchy";
import type { GatewayConfig } from "@/lib/gateway";

type CheckStatus = "pass" | "fail" | "warn" | "unknown";

interface OptimizationCheck {
  id: string;
  section: string;
  title: string;
  status: CheckStatus;
  detail: string;
  estimatedSaving: string;
  researchRef: string;
}

export const dynamic = "force-dynamic";

/**
 * Derive health service URL from gateway URL.
 * Gateway runs on :18789, health service on :18790.
 */
function getHealthServiceUrl(gatewayUrl: string, healthOverride?: string | null): string {
  if (healthOverride) return healthOverride;
  // Replace gateway port with health service port
  return gatewayUrl.replace(/:18789\b/, ":18790").replace(/:3000\b/, ":18790");
}

/**
 * Try to fetch all 43 checks from the VPS health service.
 * Returns null if unreachable (falls back to gateway-only checks).
 */
async function fetchHealthService(
  healthUrl: string,
  token: string
): Promise<{ checks: OptimizationCheck[]; summary: any } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${healthUrl}/health`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fallback: run the 4 basic checks that work via gateway API only.
 */
function runGatewayOnlyChecks(
  agents: Array<{ id: string; model: string; tools: string[]; isStandby: boolean }>
): OptimizationCheck[] {
  const checks: OptimizationCheck[] = [];

  const execsNotOpus = agents.filter(
    (a) => isExecutive(a.id) && !a.model.includes("opus")
  );
  const execIds = agents.filter((a) => isExecutive(a.id)).map((a) => a.id);
  checks.push({
    id: "exec-opus",
    section: "Cost Optimization",
    title: "All executives on Opus 4.6",
    status: execsNotOpus.length === 0 ? "pass" : "warn",
    detail:
      execsNotOpus.length === 0
        ? `All ${execIds.length} executives running Opus`
        : `${execsNotOpus.map((a) => a.id.toUpperCase()).join(", ")} not on Opus.`,
    estimatedSaving: "+$7.75/exec/mo but fewer retries",
    researchRef: "Section 1.2 — Doc 26",
  });

  const subAgentsWithHB = agents.filter((a) => !isExecutive(a.id) && !a.isStandby);
  checks.push({
    id: "subagent-ondemand",
    section: "Cost Optimization",
    title: "Sub-agents on-demand only (no active heartbeats)",
    status: subAgentsWithHB.length === 0 ? "pass" : "warn",
    detail:
      subAgentsWithHB.length === 0
        ? "All sub-agents are on-demand (standby)."
        : `${subAgentsWithHB.length} sub-agent(s) have active heartbeats.`,
    estimatedSaving: "~90% of sub-agent heartbeat costs",
    researchRef: "C-Suite architecture recommendation",
  });

  const unsafeAgents = agents.filter((a) =>
    a.tools.some((t) => ["exec", "sudo", "shell"].includes(t.toLowerCase()))
  );
  checks.push({
    id: "tool-audit",
    section: "Security",
    title: "No agents have exec/sudo/shell access",
    status: unsafeAgents.length === 0 ? "pass" : "fail",
    detail:
      unsafeAgents.length === 0
        ? "All agents have safe tool profiles"
        : `Unsafe tools on: ${unsafeAgents.map((a) => a.id).join(", ")}`,
    estimatedSaving: "Security critical",
    researchRef: "Section 4.2 — Docs 06, 17, 19",
  });

  const opusNonExecs = agents.filter(
    (a) => !isExecutive(a.id) && a.model.includes("opus")
  );
  if (opusNonExecs.length > 0) {
    checks.push({
      id: "opus-non-exec",
      section: "Performance",
      title: "Non-executives running Opus (should be Sonnet/Haiku)",
      status: "warn",
      detail: `${opusNonExecs.length} non-executive(s) on Opus: ${opusNonExecs.slice(0, 5).map((a) => a.id).join(", ")}`,
      estimatedSaving: `~$${opusNonExecs.length * 8}/mo`,
      researchRef: "Model tier strategy",
    });
  }

  return checks;
}

export async function GET(request: NextRequest) {
  try {
    const clientSlug = request.nextUrl.searchParams.get("client") || "integrateai";
    const client = await getClient(clientSlug);

    const gw: GatewayConfig = {
      url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
      token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
    };

    // Try the full VPS health service first (43 checks)
    const healthUrl = getHealthServiceUrl(
      gw.url,
      (client as any)?.health_service_url
    );
    const healthResult = await fetchHealthService(healthUrl, gw.token);

    if (healthResult) {
      // Health service returned all 43 checks
      return NextResponse.json(healthResult);
    }

    // Fallback: gateway-only checks (4 checks)
    const agents = await getAgents(gw);

    if (agents.length === 0) {
      return NextResponse.json({
        checks: [],
        summary: { total: 0, pass: 0, fail: 0, warn: 0, score: 0 },
        message: "No agents found — gateway may be unreachable",
      });
    }

    const checks = runGatewayOnlyChecks(agents);
    const passCount = checks.filter((c) => c.status === "pass").length;
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;

    return NextResponse.json({
      checks,
      summary: {
        total: checks.length,
        pass: passCount,
        fail: failCount,
        warn: warnCount,
        score: checks.length > 0 ? Math.round((passCount / checks.length) * 100) : 0,
      },
      fallback: true,
      message: "Health service unreachable — showing gateway-only checks",
    });
  } catch (error) {
    console.error("Error running optimization checks:", error);
    return NextResponse.json({
      checks: [],
      summary: { total: 0, pass: 0, fail: 0, warn: 0, score: 0 },
    });
  }
}
