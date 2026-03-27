import type { CostData } from "./types";

/**
 * Langfuse HTTP API integration for cost tracking.
 *
 * Replaces the old shell-based usage-report.sh that ran on VPS.
 * Uses Langfuse's public REST API to fetch cost data.
 *
 * Required env vars:
 *   LANGFUSE_PUBLIC_KEY - Langfuse public API key
 *   LANGFUSE_SECRET_KEY - Langfuse secret API key
 *   LANGFUSE_HOST       - Langfuse host (default: https://cloud.langfuse.com)
 */

const LANGFUSE_HOST = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || "";
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || "";

let costCache: { data: CostData; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString("base64");
}

function isConfigured(): boolean {
  return !!(LANGFUSE_PUBLIC_KEY && LANGFUSE_SECRET_KEY);
}

interface LangfuseTrace {
  id: string;
  name: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  totalCost?: number;
  createdAt: string;
}

interface LangfuseObservation {
  id: string;
  traceId: string;
  name: string;
  model?: string;
  totalCost?: number;
  usage?: {
    input?: number;
    output?: number;
    total?: number;
    unit?: string;
  };
}

async function langfuseGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  if (!isConfigured()) return null;

  const url = new URL(path, LANGFUSE_HOST);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Langfuse API error: ${res.status} ${res.statusText} for ${path}`);
      return null;
    }

    return await res.json() as T;
  } catch (error) {
    console.error(`Langfuse API request failed for ${path}:`, error);
    return null;
  }
}

/**
 * Fetch the daily cost summary from Langfuse.
 * Uses the /api/public/metrics/daily endpoint for aggregated cost data.
 */
async function fetchDailyCosts(fromDate: string, toDate: string): Promise<{
  totalCost: number;
  dailyCosts: { date: string; cost: number }[];
} | null> {
  const data = await langfuseGet<{
    data: Array<{
      date: string;
      countTraces: number;
      countObservations: number;
      totalCost: number;
      usage: Array<{ model: string; inputUsage: number; outputUsage: number; totalCost: number }>;
    }>;
  }>("/api/public/metrics/daily", {
    fromTimestamp: new Date(fromDate).toISOString(),
    toTimestamp: new Date(toDate + "T23:59:59Z").toISOString(),
  });

  if (data?.data) {
    const dailyCosts = data.data.map((d) => ({ date: d.date, cost: d.totalCost || 0 }));
    const totalCost = dailyCosts.reduce((sum, d) => sum + d.cost, 0);
    return { totalCost, dailyCosts };
  }

  return null;
}

/**
 * Fetch cost breakdown by model from recent observations.
 */
async function fetchModelCosts(): Promise<Record<string, number>> {
  const byModel: Record<string, number> = {};

  const data = await langfuseGet<{
    data: LangfuseObservation[];
  }>("/api/public/observations", {
    limit: "500",
    orderBy: "startTime.desc",
  });

  if (data?.data) {
    for (const obs of data.data) {
      if (obs.model && obs.totalCost) {
        const model = obs.model.replace(/^.*\//, "");
        byModel[model] = (byModel[model] || 0) + obs.totalCost;
      }
    }
  }

  return byModel;
}

/**
 * Fetch cost breakdown by agent from traces.
 * Looks for agent ID in trace name, userId, or metadata.
 */
async function fetchAgentCosts(): Promise<{ byAgent: Record<string, number>; callCount: number }> {
  const byAgent: Record<string, number> = {};
  let callCount = 0;

  const data = await langfuseGet<{
    data: LangfuseTrace[];
    meta?: { totalItems?: number };
  }>("/api/public/traces", {
    limit: "500",
    orderBy: "timestamp.desc",
  });

  if (data?.data) {
    callCount = data.meta?.totalItems || data.data.length;
    for (const trace of data.data) {
      const cost = trace.totalCost || 0;
      if (cost <= 0) continue;

      const agentId =
        (trace.metadata?.agentId as string) ||
        (trace.metadata?.agent_id as string) ||
        trace.userId ||
        trace.name;

      if (agentId) {
        byAgent[agentId] = (byAgent[agentId] || 0) + cost;
      }
    }
  }

  return { byAgent, callCount };
}

/**
 * Main cost data fetcher. Returns aggregated cost data from Langfuse.
 * Falls back to zeros if Langfuse is not configured or unreachable.
 */
export async function getCosts(): Promise<CostData> {
  const now = Date.now();
  if (costCache && now - costCache.ts < CACHE_TTL) {
    return costCache.data;
  }

  if (!isConfigured()) {
    return {
      totalMonth: 0,
      estimatedMonth: 0,
      todayCost: 0,
      byAgent: {},
      byModel: {},
      callCount: 0,
    };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";

    const [dailyData, byModel, agentData] = await Promise.all([
      fetchDailyCosts(monthStart, today),
      fetchModelCosts(),
      fetchAgentCosts(),
    ]);

    const totalMonth = dailyData?.totalCost || 0;
    const todayCostEntry = dailyData?.dailyCosts.find((d) => d.date === today);
    const todayCost = todayCostEntry?.cost || 0;

    const daysElapsed = dailyData?.dailyCosts.length || 1;
    const dailyAvg = totalMonth / Math.max(1, daysElapsed);
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const estimatedMonth = dailyAvg * daysInMonth;

    const data: CostData = {
      totalMonth,
      estimatedMonth,
      todayCost,
      byAgent: agentData.byAgent,
      byModel,
      callCount: agentData.callCount,
    };

    costCache = { data, ts: now };
    return data;
  } catch (error) {
    console.error("Error fetching Langfuse costs:", error);
    return {
      totalMonth: 0,
      estimatedMonth: 0,
      todayCost: 0,
      byAgent: {},
      byModel: {},
      callCount: 0,
    };
  }
}
