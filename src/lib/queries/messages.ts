"use server";

import { getSupabaseAdmin } from "../supabase";

export interface SessionMessage {
  id: string;
  session_id: string;
  message_type: string;
  tool_name: string | null;
  content: string;
  created_at: string;
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("session_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
