import { getSupabase } from "./supabase";

export type ClientPhase =
  | "onboarding"
  | "discovery"
  | "dashboard"
  | "intelligence"
  | "operations";

export interface Client {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  founder_name: string | null;
  founder_email: string | null;
  founder_phone: string | null;
  phase: ClientPhase;
  gateway_url: string | null;
  gateway_token: string | null;
  vps_ip: string | null;
  vps_port: number;
  slack_workspace_id: string | null;
  slack_channel_ids: Record<string, string> | null;
  integrations: Record<string, unknown> | null;
  discovery_report_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  slug: string;
  industry?: string;
  founder_name?: string;
  founder_email?: string;
  founder_phone?: string;
  gateway_url?: string;
  gateway_token?: string;
  vps_ip?: string;
  vps_port?: number;
}

export async function getClients(): Promise<Client[]> {
  try {
    const { data, error } = await getSupabase()
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch {
    // Supabase not configured — return empty
    return [];
  }
}

export async function getClient(idOrSlug: string): Promise<Client | null> {
  try {
    // Try by slug first (most common in URLs), then by id
    const { data } = await getSupabase()
      .from("clients")
      .select("*")
      .eq("slug", idOrSlug)
      .single();
    if (data) return data;

    const { data: byId } = await getSupabase()
      .from("clients")
      .select("*")
      .eq("id", idOrSlug)
      .single();
    return byId || null;
  } catch {
    // Supabase not configured
    return null;
  }
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const { data, error } = await getSupabase()
    .from("clients")
    .insert({
      name: input.name,
      slug: input.slug,
      industry: input.industry || null,
      founder_name: input.founder_name || null,
      founder_email: input.founder_email || null,
      founder_phone: input.founder_phone || null,
      gateway_url: input.gateway_url || null,
      gateway_token: input.gateway_token || null,
      vps_ip: input.vps_ip || null,
      vps_port: input.vps_port || 2222,
      phase: "onboarding",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<Client, "id" | "created_at">>
): Promise<Client> {
  const { data, error } = await getSupabase()
    .from("clients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
