import { getSupabaseAdmin } from "../supabase";

export interface StreamEvent {
  id: string;
  client_id: string;
  source: string;
  event_type: string;
  normalised_type: string;
  classification: string | null;
  handled: boolean;
  created_at: string;
}

export async function getRecentEvents(clientId: string, limit = 20): Promise<StreamEvent[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("event_stream")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
