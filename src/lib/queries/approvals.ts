import { getSupabaseAdmin } from "../supabase";
import type { ApprovalStatus } from "../types";

export interface ApprovalItem {
  id: string;
  client_id: string;
  action_type: string;
  agent: string;
  status: ApprovalStatus;
  title: string;
  detail: string | null;
  impact_summary: string | null;
  created_at: string;
}

export async function getApprovals(clientId: string, status?: ApprovalStatus): Promise<ApprovalItem[]> {
  let query = getSupabaseAdmin()
    .from("approval_queue")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPendingCount(clientId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("approval_queue")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("status", "pending");
  if (error) throw error;
  return count || 0;
}
