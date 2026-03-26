import { NextRequest, NextResponse } from "next/server";
import { controlGateway, getGatewayHealth } from "@/lib/gateway";
import type { GatewayConfig } from "@/lib/gateway";
import { getClient } from "@/lib/clients";

export const dynamic = "force-dynamic";

async function gwFromRequest(request: NextRequest): Promise<GatewayConfig> {
  const clientSlug = request.nextUrl.searchParams.get("client") || "integrateai";
  const client = await getClient(clientSlug);
  return {
    url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
    token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
  };
}

export async function GET(request: NextRequest) {
  const gw = await gwFromRequest(request);
  const running = await getGatewayHealth(gw);
  return NextResponse.json({ running });
}

export async function POST(request: NextRequest) {
  try {
    const gw = await gwFromRequest(request);
    const body = await request.json();
    const action = body.action;

    if (action === "stop" || action === "start") {
      const result = await controlGateway(gw, action);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Gateway error:", error);
    return NextResponse.json({ error: "Gateway action failed" }, { status: 500 });
  }
}
