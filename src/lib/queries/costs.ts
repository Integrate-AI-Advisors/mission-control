import { getSupabaseAdmin } from "../supabase";

export interface CostLedgerEntry {
  client_id: string;
  date: string;
  role: string;
  session_count: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

export async function getMonthlyCosts(clientId: string, year: number, month: number): Promise<CostLedgerEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { data, error } = await getSupabaseAdmin()
    .from("cost_ledger")
    .select("*")
    .eq("client_id", clientId)
    .gte("date", startDate)
    .lt("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCostBreakdown(clientId: string, year: number, month: number) {
  const entries = await getMonthlyCosts(clientId, year, month);
  const byRole: Record<string, { sessions: number; cost: number; inputTokens: number; outputTokens: number }> = {};

  for (const entry of entries) {
    if (!byRole[entry.role]) {
      byRole[entry.role] = { sessions: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    }
    byRole[entry.role].sessions += entry.session_count;
    byRole[entry.role].cost += entry.total_cost_usd;
    byRole[entry.role].inputTokens += entry.total_input_tokens;
    byRole[entry.role].outputTokens += entry.total_output_tokens;
  }

  const totalCost = entries.reduce((sum, e) => sum + e.total_cost_usd, 0);
  const totalInputTokens = entries.reduce((sum, e) => sum + e.total_input_tokens, 0);
  const totalCacheReadTokens = 0; // cost_ledger doesn't have cache_read, derive from sessions if needed

  return {
    entries,
    byRole,
    totalCost,
    totalInputTokens,
    cacheEfficiency: totalInputTokens > 0 ? totalCacheReadTokens / totalInputTokens : 0,
  };
}

export async function getCurrentMonthSpend(clientId: string): Promise<number> {
  const now = new Date();
  const entries = await getMonthlyCosts(clientId, now.getFullYear(), now.getMonth() + 1);
  return entries.reduce((sum, e) => sum + e.total_cost_usd, 0);
}
