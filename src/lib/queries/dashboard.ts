import { getSupabaseAdmin } from "../supabase";
import type { Client } from "../clients";
import { getHealthSummary, type Integration } from "./integrations";
import type { HealthStatus } from "../types";

// --- Types ---

export type BusinessHealth = "green" | "amber" | "red";

export interface ClientSummaryRow {
  client: Client;
  phase: string;
  status: BusinessHealth;
  sessions24h: number;
  failed24h: number;
  costMtd: number;
  budget: number;
  retainer: number;
  margin: number | null; // null when retainer is 0
}

export interface AlertItem {
  type: "session_failure" | "integration_down";
  clientName: string;
  description: string;
  time: string;
}

export interface DashboardData {
  // Section 1: Health
  overallHealth: BusinessHealth;
  healthReason: string;

  // Section 2: Revenue & Margin
  mrr: number;
  apiCostsMtd: number;
  projectedMonthlyCost: number;
  grossMarginPct: number | null;

  // Section 3: Pending Actions
  pendingApprovals: number;

  // Section 4: Alerts
  alerts: AlertItem[];

  // Section 5: Client Summary
  clientRows: ClientSummaryRow[];

  // Section 6: Today's Activity
  sessionsToday: number;
  costToday: number;
  avgVerificationScore: number | null;
}

// --- Query functions ---

async function getAllCostsMtd(): Promise<Record<string, number>> {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endMonth = now.getMonth() + 1 === 12 ? 1 : now.getMonth() + 2;
  const endYear = now.getMonth() + 1 === 12 ? now.getFullYear() + 1 : now.getFullYear();
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { data, error } = await getSupabaseAdmin()
    .from("cost_ledger")
    .select("client_id, total_cost_usd")
    .gte("date", startDate)
    .lt("date", endDate);
  if (error) throw error;

  const byClient: Record<string, number> = {};
  for (const row of data || []) {
    byClient[row.client_id] = (byClient[row.client_id] || 0) + row.total_cost_usd;
  }
  return byClient;
}

async function getAllPendingApprovals(): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("approval_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count || 0;
}

interface SessionRow {
  client_id: string;
  status: string;
  total_cost_usd: number;
  started_at: string;
  verification_score: number | null;
}

async function getRecentSessions24h(): Promise<SessionRow[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("agent_sessions")
    .select("client_id, status, total_cost_usd, started_at, verification_score")
    .gte("started_at", since)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function deriveTodaySessions(sessions24h: SessionRow[]): SessionRow[] {
  const today = new Date().toISOString().split("T")[0];
  return sessions24h.filter((s) => s.started_at >= `${today}T00:00:00Z`);
}

async function getAllIntegrations(): Promise<Integration[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("integrations")
    .select("id, client_id, service, status, health_status, health_checked_at, store_domain");
  if (error) throw error;
  return data || [];
}

// --- Computation ---

export function computeClientHealth(
  failedRate: number,
  integrationHealth: HealthStatus
): BusinessHealth {
  if (failedRate > 0.1 || integrationHealth === "down") return "red";
  if (failedRate > 0.05 || integrationHealth === "degraded") return "amber";
  return "green";
}

export function computeMargin(retainer: number, projectedCost: number): number | null {
  if (retainer <= 0) return null;
  return ((retainer - projectedCost) / retainer) * 100;
}

export function computeProjectedCost(mtdCost: number, now: Date): number {
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (mtdCost / dayOfMonth) * daysInMonth;
}

export function computeOverallHealth(
  clientRows: ClientSummaryRow[],
  integrations: Integration[]
): { health: BusinessHealth; reason: string } {
  const anyDown = integrations.some((i) => i.health_status === "down");
  const anyRed = clientRows.some((r) => r.status === "red");
  const anyAmber = clientRows.some((r) => r.status === "amber");

  if (anyRed || anyDown) {
    return { health: "red", reason: "Critical issues detected" };
  }
  if (anyAmber) {
    return { health: "amber", reason: "Issues detected" };
  }
  return { health: "green", reason: "All systems green" };
}

// --- Main dashboard data loader ---

export async function getDashboardData(allClients: Client[]): Promise<DashboardData> {
  const [
    costsByClient,
    pendingApprovals,
    sessions24h,
    integrations,
  ] = await Promise.all([
    getAllCostsMtd(),
    getAllPendingApprovals(),
    getRecentSessions24h(),
    getAllIntegrations(),
  ]);

  const now = new Date();

  // Filter out IntegrateAI (platform operator)
  const payingClients = allClients.filter((c) => c.slug !== "integrateai");
  const payingClientIds = new Set(payingClients.map((c) => c.id));

  // Derive today's sessions from the 24h set (avoids a second DB query)
  const todaySessions = deriveTodaySessions(sessions24h);

  // Group sessions by client
  const sessions24hByClient: Record<string, SessionRow[]> = {};
  for (const s of sessions24h) {
    if (!sessions24hByClient[s.client_id]) sessions24hByClient[s.client_id] = [];
    sessions24hByClient[s.client_id].push(s);
  }

  // Group integrations by client
  const integrationsByClient: Record<string, Integration[]> = {};
  for (const i of integrations) {
    if (!integrationsByClient[i.client_id]) integrationsByClient[i.client_id] = [];
    integrationsByClient[i.client_id].push(i);
  }

  // Build client rows
  const clientRows: ClientSummaryRow[] = payingClients.map((client) => {
    const clientSessions = sessions24hByClient[client.id] || [];
    const total24h = clientSessions.length;
    const failed24h = clientSessions.filter((s) => s.status === "failed").length;
    const failedRate = total24h > 0 ? failed24h / total24h : 0;

    const clientIntegrations = integrationsByClient[client.id] || [];
    const healthSummary = getHealthSummary(clientIntegrations);

    const costMtd = costsByClient[client.id] || 0;
    const retainer = client.monthly_retainer_usd ?? 0;
    const projectedCost = computeProjectedCost(costMtd, now);
    const margin = computeMargin(retainer, projectedCost);

    return {
      client,
      phase: client.phase,
      status: computeClientHealth(failedRate, healthSummary.overallStatus),
      sessions24h: total24h,
      failed24h,
      costMtd,
      budget: client.monthly_budget_usd ?? 0,
      retainer,
      margin,
    };
  });

  // Section 2: Revenue (scoped to paying clients only)
  const mrr = payingClients.reduce((sum, c) => sum + (c.monthly_retainer_usd ?? 0), 0);
  const totalCostMtd = Object.entries(costsByClient)
    .filter(([clientId]) => payingClientIds.has(clientId))
    .reduce((sum, [, v]) => sum + v, 0);
  const projectedMonthlyCost = computeProjectedCost(totalCostMtd, now);
  const grossMarginPct = computeMargin(mrr, projectedMonthlyCost);

  // Scope integrations to paying clients
  const payingIntegrations = integrations.filter((i) => payingClientIds.has(i.client_id));

  // Section 4: Alerts
  const alerts: AlertItem[] = [];

  // Failed sessions by client
  for (const client of payingClients) {
    const clientSessions = sessions24hByClient[client.id] || [];
    const failed = clientSessions.filter((s) => s.status === "failed");
    if (failed.length > 0) {
      alerts.push({
        type: "session_failure",
        clientName: client.name,
        description: `${failed.length} failed session${failed.length > 1 ? "s" : ""} in last 24h`,
        time: failed[0].started_at,
      });
    }
  }

  // Down integrations (paying clients only)
  const clientById = new Map(allClients.map((c) => [c.id, c]));
  const downIntegrations = payingIntegrations.filter((i) => i.health_status === "down");
  for (const integration of downIntegrations) {
    const client = clientById.get(integration.client_id);
    alerts.push({
      type: "integration_down",
      clientName: client?.name || "Unknown",
      description: `${integration.service} integration is down`,
      time: integration.health_checked_at || now.toISOString(),
    });
  }

  // Sort alerts by time (newest first), limit to 5
  alerts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Section 1: Overall health
  const { health: overallHealth, reason: healthReason } = computeOverallHealth(
    clientRows,
    payingIntegrations
  );

  // Section 6: Today's activity
  const sessionsToday = todaySessions.length;
  const costToday = todaySessions.reduce((sum, s) => sum + (s.total_cost_usd || 0), 0);
  const verifiedToday = todaySessions.filter(
    (s) => s.verification_score != null
  );
  const avgVerificationScore =
    verifiedToday.length > 0
      ? verifiedToday.reduce((sum, s) => sum + s.verification_score!, 0) / verifiedToday.length
      : null;

  return {
    overallHealth,
    healthReason,
    mrr,
    apiCostsMtd: totalCostMtd,
    projectedMonthlyCost,
    grossMarginPct,
    pendingApprovals,
    alerts,
    clientRows,
    sessionsToday,
    costToday,
    avgVerificationScore,
  };
}
