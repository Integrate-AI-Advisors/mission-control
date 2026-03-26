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
            <p className="font-mono text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-terra mb-1">
              Mission Control
            </p>
            <h1 className="font-serif text-[clamp(1.4rem,2.5vw,1.8rem)] text-text-primary leading-[1.12]">
              {clientName}
            </h1>
            <p className="font-mono text-[0.6rem] text-text-muted mt-1 leading-[1.6]">
              {totalAgents > 0 && <>{totalAgents} agents</>}
              {" "}&middot;{" "}
              {!hasGateway ? (
                <span>No gateway configured</span>
              ) : (
                <span className={gatewayRunning ? "text-brand-green" : "text-brand-red"}>
                  {gatewayRunning ? "Live" : "Offline"}
                </span>
              )}
              {slackEnabled && <span> &middot; Slack connected</span>}
              {phase !== "unknown" && <span> &middot; Phase: {phase}</span>}
            </p>
          </div>
          {hasGateway && <KillSwitch initialState={gatewayRunning} />}
        </div>

        {/* No gateway state */}
        {!hasGateway && (
          <div className="bg-dark-card border border-dark-border rounded-card p-6 mb-6">
            <p className="font-mono text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-terra mb-2">
              Setup Required
            </p>
            <h2 className="font-serif text-[1.15rem] text-text-primary mb-2">
              Gateway Not Configured
            </h2>
            <p className="font-sans text-[0.88rem] text-text-muted leading-[1.7] max-w-[700px]">
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
