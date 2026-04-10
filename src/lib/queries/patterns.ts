import { getSupabaseAdmin } from "../supabase";
import type { PatternSeverity } from "../types";

export interface DetectedPattern {
  id: string;
  client_id: string;
  pattern_type: string;
  description: string;
  severity: PatternSeverity;
  insight: string | null;
  acted_on: boolean;
  created_at: string;
}

export async function getRecentPatterns(clientId: string, limit = 5): Promise<DetectedPattern[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("detected_patterns")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
