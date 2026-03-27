import Sidebar from "@/components/Sidebar";
import DashboardClient from "@/components/DashboardClient";
import { getAgents, getSlackEnabled } from "@/lib/openclaw";
import { deriveAgentStatuses, getGatewayHealth } from "@/lib/gateway";
import type { GatewayConfig } from "@/lib/gateway";
import { getClient } from "@/lib/clients";
import { getCosts } from "@/lib/langfuse";
import type { Agent, ExecutiveGroup, CostData } from "@/lib/types";
import {
  isExecutive,
  getExecutiveIds,
  EXECUTIVE_LABELS,
  EXECUTIVE_COLOURS,
} from "@/lib/hierarchy";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: { clientId: string };
}) {
  const { clientId } = params;

  const client = await getClient(clientId);
  const clientName = client?.name || clientId;

  const gw: GatewayConfig = {
    url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
    token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
  };

  const hasGateway = !!gw.url;

  const [baseAgents, statuses, gatewayRunning, slackEnabled, costs] = await Promise.all([
    getAgents(gw),
    hasGateway ? deriveAgentStatuses(gw) : Promise.resolve({} as Record<string, { status: import("@/lib/types").AgentStatus; lastActive: string | null }>),
    hasGateway ? getGatewayHealth(gw) : Promise.resolve(false),
    getSlackEnabled(gw),
    getCosts(),
  ]);

  const agents: Agent[] = baseAgents.map((a) => {
    let statusInfo = gatewayRunning
      ? statuses[a.id] || { status: "Available" as const, lastActive: null }
      : { status: "Off" as const, lastActive: null };
    if (a.isStandby && statusInfo.status === "Available") {
      statusInfo = {
        status: "Standby" as const,
        lastActive: statusInfo.lastActive,
      };
    }
    const monthlyCost = costs.byAgent[a.id] || costs.byAgent[a.name] || 0;
    return { ...a, status: statusInfo.status, lastActive: statusInfo.lastActive, monthlyCost };
  });

  // Build executive groups
  const executiveIds = getExecutiveIds();
  const groups: ExecutiveGroup[] = executiveIds
    .map((execId) => {
      const executive = agents.find((a) => a.id === execId);
      if (!executive) return null;

      const subAgents = agents.filter((a) => a.parent === execId);
      const totalCost =
        executive.monthlyCost +
        subAgents.reduce((s, a) => s + a.monthlyCost, 0);
      const activeCount = subAgents.filter(
        (a) => a.status === "Working" || a.status === "Available"
      ).length;

      return { executive, subAgents, totalCost, activeCount };
    })
    .filter(Boolean) as ExecutiveGroup[];

  const phase = client?.phase || "unknown";

  return (
    <div className="flex min-h-screen">
      <Sidebar activeClient={clientId} />

      <main className="flex-1 p-6 max-w-[1400px]">
        <DashboardClient
          clientId={clientId}
          clientName={clientName}
          agents={agents}
          groups={groups}
          costs={costs}
          gatewayRunning={gatewayRunning}
          slackEnabled={slackEnabled}
          hasGateway={hasGateway}
          phase={phase}
        />
      </main>
    </div>
  );
}
