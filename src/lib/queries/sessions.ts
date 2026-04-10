import { getSupabaseAdmin } from "../supabase";

export interface AgentSession {
  id: string;
  client_id: string;
  role: string;
  trigger_type: string;
  status: string;
  total_cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  turns: number;
  duration_seconds: number;
  started_at: string;
  completed_at: string | null;
  result_summary: string | null;
}

interface SessionFilters {
  clientId: string;
  role?: string;
  triggerType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getSessions(filters: SessionFilters): Promise<{ data: AgentSession[]; count: number }> {
  const { clientId, role, triggerType, status, startDate, endDate, page = 1, pageSize = 50 } = filters;
  const offset = (page - 1) * pageSize;

  let query = getSupabaseAdmin()
    .from("agent_sessions")
    .select("*", { count: "exact" })
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (role) query = query.eq("role", role);
  if (triggerType) query = query.eq("trigger_type", triggerType);
  if (status) query = query.eq("status", status);
  if (startDate) query = query.gte("started_at", startDate);
  if (endDate) query = query.lte("started_at", endDate);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

export async function getRecentSessions(clientId: string, limit = 10): Promise<AgentSession[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("agent_sessions")
    .select("*")
    .eq("client_id", clientId)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getTodayStats(clientId: string) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await getSupabaseAdmin()
    .from("agent_sessions")
    .select("id, total_cost_usd, status")
    .eq("client_id", clientId)
    .gte("started_at", `${today}T00:00:00Z`);
  if (error) throw error;
  const sessions = data || [];
  return {
    count: sessions.length,
    cost: sessions.reduce((sum, s) => sum + (s.total_cost_usd || 0), 0),
    failed: sessions.filter((s) => s.status === "failed").length,
  };
}
