import { getSupabaseAdmin } from "./supabase";
import type { ClientPhase } from "./types";

export interface Client {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  phase: ClientPhase;
  monthly_budget_usd: number | null;
  phase_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  slug: string;
  industry?: string;
  monthly_budget_usd?: number;
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .select("id, name, slug, industry, phase, monthly_budget_usd, phase_changed_at, created_at, updated_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getClient(slug: string): Promise<Client | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .select("id, name, slug, industry, phase, monthly_budget_usd, phase_changed_at, created_at, updated_at")
    .eq("slug", slug)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .insert({
      name: input.name,
      slug: input.slug,
      industry: input.industry || null,
      monthly_budget_usd: input.monthly_budget_usd || null,
      phase: "discovery" as ClientPhase,
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
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function advancePhase(id: string, currentPhase: ClientPhase): Promise<Client> {
  const phaseOrder: ClientPhase[] = ["discovery", "dashboard", "intelligence", "operations"];
  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
    throw new Error(`Cannot advance from phase: ${currentPhase}`);
  }
  const nextPhase = phaseOrder[currentIndex + 1];
  return updateClient(id, {
    phase: nextPhase,
    phase_changed_at: new Date().toISOString(),
  });
}
