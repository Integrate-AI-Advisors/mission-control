"use server";

import { encrypt } from "@/lib/encryption";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUser } from "@/lib/supabase-server";

async function requireAuth(): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user?.email?.endsWith("@integrate-ai.uk")) {
    return { error: "Unauthorized" };
  }
  return {};
}

interface ActionResult {
  success?: boolean;
  error?: string;
}

interface TestResult extends ActionResult {
  status?: string;
}

export async function connectIntegration(
  integrationId: string,
  credentials: Record<string, string>,
  storeDomain?: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error) return auth as ActionResult;
  if (!integrationId) return { error: "Integration ID is required" };

  const hasEmpty = Object.values(credentials).some((v) => !v.trim());
  if (Object.keys(credentials).length === 0 || hasEmpty) {
    return { error: "All credential fields are required" };
  }

  try {
    const encrypted = encrypt(JSON.stringify(credentials));

    const update: Record<string, unknown> = {
      credentials_encrypted: encrypted,
      health_status: "healthy",
      updated_at: new Date().toISOString(),
    };

    if (storeDomain) {
      update.store_domain = storeDomain;
    }

    const { error } = await getSupabaseAdmin()
      .from("integrations")
      .update(update)
      .eq("id", integrationId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect";
    return { error: message };
  }
}

export async function disconnectIntegration(
  integrationId: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error) return auth as ActionResult;
  if (!integrationId) return { error: "Integration ID is required" };

  try {
    const { error } = await getSupabaseAdmin()
      .from("integrations")
      .update({
        credentials_encrypted: null,
        health_status: "not_connected",
        store_domain: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to disconnect";
    return { error: message };
  }
}

const VALID_STATUSES = new Set(["not_connected", "healthy", "degraded", "down"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function testIntegration(
  integrationId: string
): Promise<TestResult> {
  const auth = await requireAuth();
  if (auth.error) return auth as TestResult;
  if (!integrationId) return { error: "Integration ID is required" };
  if (!UUID_RE.test(integrationId)) return { error: "Invalid integration ID" };

  try {
    const platformUrl =
      process.env.PLATFORM_API_URL || "https://api.integrate-ai.uk";

    const res = await fetch(
      `${platformUrl}/integrations/${integrationId}/health`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      return {
        error: `Health check returned ${res.status}`,
        status: "down",
      };
    }

    const body = await res.json();
    const status = VALID_STATUSES.has(body.status) ? body.status : "healthy";

    const { error: updateError } = await getSupabaseAdmin()
      .from("integrations")
      .update({
        health_status: status,
        health_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId);

    if (updateError) {
      return { success: true, status, error: "Status checked but failed to persist result" };
    }

    return { success: true, status };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { error: "Health check timed out", status: "down" };
    }
    const message = err instanceof Error ? err.message : "Health check failed";
    return { error: message, status: "down" };
  }
}
