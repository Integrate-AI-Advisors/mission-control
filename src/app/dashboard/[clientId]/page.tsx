import Sidebar from "@/components/Sidebar";
import ExecutiveCard from "@/components/ExecutiveCard";
import MetricsBar from "@/components/MetricsBar";
import CostAlert from "@/components/CostAlert";
import CostOptimizations from "@/components/CostOptimizations";
import KillSwitch from "@/components/KillSwitch";
import SetupChecklist from "@/components/SetupChecklist";
import { getAgents, getSlackEnabled } from "@/lib/openclaw";
import { deriveAgentStatuses, getGatewayHealth } from "@/lib/gateway";
import { getCosts } from "@/lib/langfuse";
import type { Agent, ExecutiveGroup } from "@/lib/types";
import { isExecutive, getExecutiveIds, EXECUTIVE_LABELS, EXECUTIVE_COLOURS } from "@/lib/hierarchy";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: { clientId: string };
}) {
  const { clientId } = params;

  const baseAgents = getAgents();
  const [statuses, gatewayRunning] = await Promise.all([
    deriveAgentStatuses(),
    getGatewayHealth(),
  ]);
  const costs = getCosts();
  const slackEnabled = getSlackEnabled();

  const agents: Agent[] = baseAgents.map((a) => {
    let statusInfo = gatewayRunning
      ? statuses[a.id] || { status: "Available" as const, lastActive: null }
      : { status: "Off" as const, lastActive: null };
    // Standby agents show as "Standby" unless actively working
    if (a.isStandby && statusInfo.status === "Available") {
      statusInfo = { status: "Standby" as const, lastActive: statusInfo.lastActive };
    }
    const monthlyCost =
      costs.byAgent[a.id] || costs.byAgent[a.name] || 0;
    return {
      ...a,
      status: statusInfo.status,
      lastActive: statusInfo.lastActive,
      monthlyCost,
    };
  });

  // Build executive groups
  const executiveIds = getExecutiveIds();
  const groups: ExecutiveGroup[] = executiveIds.map((execId) => {
    const executive = agents.find((a) => a.id === execId);
    if (!executive) {
      return {
        executive: {
          id: execId,
          name: execId.toUpperCase(),
          role: EXECUTIVE_LABELS[execId],
          avatar: "",
          model: "unknown",
          modelTier: "Unknown",
          tools: [],
          skills: [],
          status: "Off" as const,
          lastActive: null,
          monthlyCost: 0,
          tier: "executive" as const,
          parent: null,
          slackChannelUrl: null,
          isStandby: false,
        },
        subAgents: [],
        totalCost: 0,
        activeCount: 0,
      };
    }

    const subAgents = agents.filter((a) => a.parent === execId);
    const totalCost =
      executive.monthlyCost + subAgents.reduce((s, a) => s + a.monthlyCost, 0);
    const activeCount = subAgents.filter(
      (a) => a.status === "Working" || a.status === "Available"
    ).length;

    return { executive, subAgents, totalCost, activeCount };
  });

  const totalAgents = agents.length;

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
              IntegrateAI Advisors &middot; {totalAgents} agents &middot;{" "}
              <span
                className={
                  gatewayRunning ? "text-status-green-text" : "text-red-400"
                }
              >
                {gatewayRunning ? "Live" : "Offline"}
              </span>
              {slackEnabled && (
                <span className="text-text-muted"> &middot; Slack connected</span>
              )}
            </p>
          </div>
          <KillSwitch initialState={gatewayRunning} />
        </div>

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
                colour={EXECUTIVE_COLOURS[group.executive.id as keyof typeof EXECUTIVE_COLOURS]}
                label={EXECUTIVE_LABELS[group.executive.id as keyof typeof EXECUTIVE_LABELS]}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
