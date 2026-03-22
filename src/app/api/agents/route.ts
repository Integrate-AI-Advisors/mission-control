import { NextResponse } from "next/server";
import { getAgents } from "@/lib/openclaw";
import { deriveAgentStatuses } from "@/lib/gateway";
import { getCosts } from "@/lib/langfuse";
import type { Agent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseAgents = getAgents();
    const statuses = await deriveAgentStatuses();
    const costs = getCosts();

    const agents: Agent[] = baseAgents.map((a) => {
      const statusInfo = statuses[a.id] || {
        status: "Available" as const,
        lastActive: null,
      };
      const monthlyCost = costs.byAgent[a.id] || costs.byAgent[a.name] || 0;
      return {
        ...a,
        status: statusInfo.status,
        lastActive: statusInfo.lastActive,
        monthlyCost,
      };
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
          byAgent: {},
          byModel: {},
          callCount: 0,
        },
      },
      { status: 500 }
    );
  }
}
