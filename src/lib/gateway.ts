import { execSync } from "child_process";
import type { AgentStatus, GatewayState } from "./types";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

interface SessionData {
  agentId?: string;
  agent?: string;
  lastUpdated?: number;
  state?: string;
}

export async function getGatewayHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getSessions(): Promise<SessionData[]> {
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tool: "sessions_list", args: {} }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // OpenClaw wraps response: { ok, result: { details: { sessions: [...] } } }
    const sessions = data?.result?.details?.sessions
      || data?.result?.sessions
      || data?.sessions
      || (Array.isArray(data) ? data : []);
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

export async function deriveAgentStatuses(): Promise<Record<string, { status: AgentStatus; lastActive: string | null }>> {
  const healthy = await getGatewayHealth();
  if (!healthy) return {};

  const sessions = await getSessions();
  const result: Record<string, { status: AgentStatus; lastActive: string | null }> = {};
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

    const lastActive = lastUpdated > 0 ? formatRelativeTime(lastUpdated, now) : null;
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

export function stopGateway(): GatewayState {
  try {
    execSync("openclaw gateway stop </dev/null", {
      timeout: 15_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { running: false };
  } catch {
    return { running: true };
  }
}

export function startGateway(): GatewayState {
  try {
    execSync("openclaw gateway start </dev/null", {
      timeout: 15_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { running: true };
  } catch {
    return { running: false };
  }
}
