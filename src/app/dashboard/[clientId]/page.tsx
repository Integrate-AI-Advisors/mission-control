import Sidebar from "@/components/Sidebar";
import ExecutiveCard from "@/components/ExecutiveCard";
import MetricsBar from "@/components/MetricsBar";
import CostAlert from "@/components/CostAlert";
import CostOptimizations from "@/components/CostOptimizations";
import KillSwitch from "@/components/KillSwitch";
import SetupChecklist from "@/components/SetupChecklist";
import { getAgents, getSlackEnabled } from "@/lib/openclaw";
import { deriveAgentStatuses, getGatewayHealth } from "@/lib/gateway";
import type { GatewayConfig } from "@/lib/gateway";
import { getClient } from "@/lib/clients";
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

  // Look up client in DB to get their gateway URL
  const client = await getClient(clientId);
  const clientName = client?.name || clientId;

  // Build gateway config from client record
  const gw: GatewayConfig = {
    url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
    token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
  };

  const hasGateway = !!gw.url;

  // Fetch data from client's gateway
  const [baseAgents, statuses, gatewayRunning, slackEnabled] = await Promise.all([
    getAgents(gw),
    hasGateway ? deriveAgentStatuses(gw) : Promise.resolve({} as Record<string, { status: import("@/lib/types").AgentStatus; lastActive: string | null }>),
    hasGateway ? getGatewayHealth(gw) : Promise.resolve(false),
    getSlackEnabled(gw),
  ]);

  // Costs: for now, zero — per-client cost tracking comes in Sprint 2+
  const costs: CostData = {
    totalMonth: 0,
    estimatedMonth: 0,
    todayCost: 0,
    byAgent: {},
    byModel: {},
    callCount: 0,
  };

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

  const totalAgents = agents.length;
  const phase = client?.phase || "unknown";

  return (
    <div className="flex min-h-screen">
      <Sidebar activeClient={clientId} />

      <main className="flex-1 p-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-[24px] font-bold text-text-primary">
              Mission Control
            </h1>
            <p className="font-mono text-[12px] text-text-secondary tracking-wide">
              {clientName}
              {totalAgents > 0 && <> &middot; {totalAgents} agents</>}
              {" "}&middot;{" "}
              {!hasGateway ? (
                <span className="text-text-muted">No gateway configured</span>
              ) : (
                <span
                  className={
                    gatewayRunning ? "text-status-green-text" : "text-red-400"
                  }
                >
                  {gatewayRunning ? "Live" : "Offline"}
                </span>
              )}
              {slackEnabled && (
                <span className="text-text-muted"> &middot; Slack connected</span>
              )}
              {phase !== "unknown" && (
                <span className="text-text-muted">
                  {" "}&middot; Phase: {phase}
                </span>
              )}
            </p>
          </div>
          {hasGateway && <KillSwitch initialState={gatewayRunning} />}
        </div>

        {/* No gateway state */}
        {!hasGateway && (
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 mb-6">
            <h2 className="font-serif text-lg font-semibold text-text-primary mb-2">
              Gateway Not Configured
            </h2>
            <p className="text-text-muted text-sm">
              This client doesn&apos;t have a VPS gateway connected yet.
              Configure the gateway URL in client settings to see agent data.
            </p>
          </div>
        )}

        {/* Full dashboard when gateway is connected */}
        {hasGateway && (
          <>
            {/* Cost Alert Banner */}
            <div className="mb-4">
              <CostAlert costs={costs} />
            </div>

            {/* Metrics */}
            <div className="mb-6">
              <MetricsBar
                agents={agents}
                costs={costs}
                gatewayRunning={gatewayRunning}
              />
            </div>

            {/* Setup Checklist */}
            <div className="mb-6">
              <SetupChecklist agents={agents} />
            </div>

            {/* Cost Optimizations */}
            <div className="mb-6">
              <CostOptimizations />
            </div>

            {/* Executive Groups */}
            <div className="space-y-4">
              {groups.map((group, i) => (
                <div
                  key={group.executive.id}
                  style={{ animationDelay: `${i * 100}ms` }}
                  className="opacity-0 animate-fade-in"
                >
                  <ExecutiveCard
                    group={group}
                    colour={
                      EXECUTIVE_COLOURS[
                        group.executive.id as keyof typeof EXECUTIVE_COLOURS
                      ]
                    }
                    label={
                      EXECUTIVE_LABELS[
                        group.executive.id as keyof typeof EXECUTIVE_LABELS
                      ]
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
