import { NextRequest, NextResponse } from "next/server";
import { getAgents } from "@/lib/openclaw";
import { deriveAgentStatuses } from "@/lib/gateway";
import type { GatewayConfig } from "@/lib/gateway";
import { getClient } from "@/lib/clients";
import { getCosts } from "@/lib/langfuse";
import type { Agent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientSlug = request.nextUrl.searchParams.get("client") || "integrateai";
    const client = await getClient(clientSlug);

    const gw: GatewayConfig = {
      url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
      token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
    };

    const [baseAgents, statuses, costs] = await Promise.all([
      getAgents(gw),
      gw.url ? deriveAgentStatuses(gw) : Promise.resolve({} as Record<string, { status: import("@/lib/types").AgentStatus; lastActive: string | null }>),
      getCosts(),
    ]);

    const agents: Agent[] = baseAgents.map((a) => {
      const statusInfo = statuses[a.id] || {
        status: "Available" as const,
        lastActive: null,
      };
      const monthlyCost = costs.byAgent[a.id] || costs.byAgent[a.name] || 0;
      return { ...a, status: statusInfo.status, lastActive: statusInfo.lastActive, monthlyCost };
    });

    return NextResponse.json({ agents, costs });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      {
        agents: [],
        costs: {
          totalMonth: 0,
          estimatedMonth: 0,
          todayCost: 0,
          byAgent: {},
          byModel: {},
          callCount: 0,
        },
      },
      { status: 500 }
    );
  }
}
