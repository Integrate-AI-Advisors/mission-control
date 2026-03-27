import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/clients";
import { getAgentConfig } from "@/lib/gateway";
import type { GatewayConfig } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientSlug = request.nextUrl.searchParams.get("client") || "integrateai";
    const client = await getClient(clientSlug);

    const gw: GatewayConfig = {
      url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
      token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
    };

    if (!gw.url) {
      return NextResponse.json({ config: null });
    }

    const rawConfig = await getAgentConfig(gw);
    if (!rawConfig) {
      return NextResponse.json({ config: null });
    }

    // Extract safe config sections (strip agent list to avoid huge payload)
    const cfg = rawConfig as Record<string, unknown>;
    const agents = cfg.agents as Record<string, unknown> | undefined;

    const config = {
      meta: cfg.meta || {},
      models: cfg.models || {},
      agents: {
        defaults: agents?.defaults || {},
        count: Array.isArray(agents?.list) ? (agents.list as unknown[]).length : 0,
      },
      tools: cfg.tools || {},
      cron: cfg.cron || {},
      channels: cfg.channels || {},
      gateway: cfg.gateway || {},
      session: cfg.session || {},
    };

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json({ config: null }, { status: 500 });
  }
}
