import { getSupabaseAdmin } from "../supabase";

export interface Schedule {
  id: string;
  client_id: string;
  role: string;
  cron: string;
  prompt_template: string;
  timezone: string;
  enabled: boolean;
}

export async function getSchedules(clientId: string): Promise<Schedule[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("schedules")
    .select("*")
    .eq("client_id", clientId)
    .order("role", { ascending: true });
  if (error) throw error;
  return data || [];
}
