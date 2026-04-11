import { getSupabaseAdmin } from "../supabase";
import type { HealthStatus, IntegrationStatus } from "../types";

export interface Integration {
  id: string;
  client_id: string;
  service: string;
  status: string;
  health_status: HealthStatus;
  health_checked_at: string | null;
  store_domain: string | null;
}

export interface IntegrationDetail {
  id: string;
  client_id: string;
  service: string;
  health_status: string;
  credentials_encrypted: string | null;
  webhook_token: string;
  store_domain: string | null;
  health_checked_at: string | null;
  updated_at: string;
}

export async function getIntegrations(clientId: string): Promise<Integration[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("integrations")
    .select("id, client_id, service, status, health_status, health_checked_at, store_domain")
    .eq("client_id", clientId)
    .order("health_status", { ascending: true }); // broken first
  if (error) throw error;
  return data || [];
}

export async function getIntegrationDetails(
  clientId: string
): Promise<IntegrationDetail[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("integrations")
    .select(
      "id, client_id, service, health_status, credentials_encrypted, webhook_token, store_domain, health_checked_at, updated_at"
    )
    .eq("client_id", clientId)
    .order("service", { ascending: true });
  if (error) throw error;
  return data || [];
}

export function getHealthSummary(integrations: Integration[]) {
  const healthy = integrations.filter((i) => i.health_status === "healthy").length;
  const degraded = integrations.filter((i) => i.health_status === "degraded").length;
  const down = integrations.filter((i) => i.health_status === "down").length;
  const total = integrations.length;

  const overallStatus: HealthStatus = down > 0 ? "down" : degraded > 0 ? "degraded" : "healthy";

  return { healthy, degraded, down, total, overallStatus };
}
