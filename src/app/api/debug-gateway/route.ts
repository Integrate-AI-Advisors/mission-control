import { NextResponse } from "next/server";
import { getClient } from "@/lib/clients";
import { getGatewayHealth, getAgentConfig } from "@/lib/gateway";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { GatewayConfig } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  const debug: Record<string, unknown> = {};

  try {
    // Step 1: Get client from Supabase
    const client = await getClient("integrateai");
    debug.client_found = !!client;
    debug.gateway_url = client?.gateway_url || "MISSING";
    debug.has_token = !!client?.gateway_token;
    debug.token_prefix = client?.gateway_token?.substring(0, 8) || "NONE";

    if (!client?.gateway_url) {
      return NextResponse.json({ ...debug, error: "No gateway URL in Supabase" });
    }

    const gw: GatewayConfig = {
      url: client.gateway_url,
      token: client.gateway_token || "",
    };

    // Step 2: Health check
    const healthy = await getGatewayHealth(gw);
    debug.health = healthy;

    // Step 3: Fetch config
    const config = await getAgentConfig(gw);
    debug.config_fetched = !!config;
    debug.agent_count = (config as { agents?: { list?: unknown[] } })?.agents?.list?.length || 0;

    return NextResponse.json(debug);
  } catch (err) {
    debug.error = String(err);
    return NextResponse.json(debug, { status: 500 });
  }
}
