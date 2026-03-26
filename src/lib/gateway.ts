import type { AgentStatus, GatewayState } from "./types";

/** Per-client gateway connection config */
export interface GatewayConfig {
  url: string;
  token: string;
}

interface SessionData {
  agentId?: string;
  agent?: string;
  lastUpdated?: number;
  state?: string;
}

export async function getGatewayHealth(gw: GatewayConfig): Promise<boolean> {
  if (!gw.url) return false;
  try {
    const res = await fetch(`${gw.url}/health`, {
      cache: "no-store",
      headers: gw.token ? { Authorization: `Bearer ${gw.token}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getSessions(gw: GatewayConfig): Promise<SessionData[]> {
  if (!gw.url) return [];
  try {
    const res = await fetch(`${gw.url}/tools/invoke`, {
      method: "POST",
      cache: "no-store",
      headers: {
        ...(gw.token ? { Authorization: `Bearer ${gw.token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tool: "sessions_list", args: {} }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const sessions =
      data?.result?.details?.sessions ||
      data?.result?.sessions ||
      data?.sessions ||
      (Array.isArray(data) ? data : []);
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

export async function getAgentConfig(gw: GatewayConfig): Promise<unknown | null> {
  if (!gw.url) return null;
  const authHeaders: Record<string, string> = gw.token ? { Authorization: `Bearer ${gw.token}` } : {};
  try {
    // Primary: read config from canvas static file
    const configUrl = `${gw.url}/__openclaw__/canvas/openclaw-config.json`;
    console.log(`[gateway] fetching config from ${configUrl}`);
    const res = await fetch(configUrl, {
      cache: "no-store",
      headers: authHeaders,
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[gateway] config response: ${res.status} ${res.statusText}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[gateway] config has agents.list: ${!!data?.agents?.list}, count: ${data?.agents?.list?.length || 0}`);
      if (data?.agents?.list) return data;
    }

    // Fallback: try tools/invoke
    const toolRes = await fetch(`${gw.url}/tools/invoke`, {
      method: "POST",
      cache: "no-store",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "config_get", args: {} }),
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[gateway] tools/invoke response: ${toolRes.status}`);
    if (toolRes.ok) {
      const data = await toolRes.json();
      return data?.result || data;
    }

    return null;
  } catch (err) {
    console.error(`[gateway] getAgentConfig error:`, err);
    return null;
  }
}

export async function deriveAgentStatuses(
  gw: GatewayConfig
): Promise<Record<string, { status: AgentStatus; lastActive: string | null }>> {
  const healthy = await getGatewayHealth(gw);
  if (!healthy) return {};

  const sessions = await getSessions(gw);
  const result: Record<
    string,
    { status: AgentStatus; lastActive: string | null }
  > = {};
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  for (const session of sessions) {
    const agentId = session.agentId || session.agent;
    if (!agentId) continue;

    const lastUpdated = session.lastUpdated || 0;
    const state = session.state || "";

    const existing = result[agentId];
    if (existing && existing.status === "Working") continue;

    let status: AgentStatus = "Available";
    if (state === "active" && lastUpdated > fiveMinAgo) {
      status = "Working";
    } else if (state === "queued") {
      status = "Queued";
    }

    const lastActive =
      lastUpdated > 0 ? formatRelativeTime(lastUpdated, now) : null;
    result[agentId] = { status, lastActive };
  }

  return result;
}

function formatRelativeTime(timestamp: number, now: number): string {
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Active now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function controlGateway(
  gw: GatewayConfig,
  action: "start" | "stop"
): Promise<GatewayState> {
  // Gateway start/stop is only possible on the VPS itself.
  // For now, we just report inability to control remote gateways.
  // Future: SSH-based or API-based control.
  console.warn(`Gateway ${action} requested for ${gw.url} — remote control not yet implemented`);
  const running = await getGatewayHealth(gw);
  return { running };
}
