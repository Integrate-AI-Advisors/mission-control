import Sidebar from "@/components/Sidebar";
import AgentCard from "@/components/AgentCard";
import MetricsBar from "@/components/MetricsBar";
import KillSwitch from "@/components/KillSwitch";
import SetupChecklist from "@/components/SetupChecklist";
import { getAgents, getDiscordGuildId } from "@/lib/openclaw";
import { deriveAgentStatuses, getGatewayHealth } from "@/lib/gateway";
import { getCosts } from "@/lib/langfuse";
import type { Agent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: { clientId: string };
}) {
  const { clientId } = params;
  const guildId = getDiscordGuildId();

  // Fetch all data server-side
  const baseAgents = getAgents();
  const [statuses, gatewayRunning] = await Promise.all([
    deriveAgentStatuses(),
    getGatewayHealth(),
  ]);
  const costs = getCosts();

  const agents: Agent[] = baseAgents.map((a) => {
    const statusInfo = gatewayRunning
      ? statuses[a.id] || { status: "Available" as const, lastActive: null }
      : { status: "Off" as const, lastActive: null };
    const monthlyCost =
      costs.byAgent[a.id] || costs.byAgent[a.identityName] || 0;
    return {
      ...a,
      status: statusInfo.status,
      lastActive: statusInfo.lastActive,
      monthlyCost,
    };
  });

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
              IntegrateAI Advisors &middot;{" "}
              <span
                className={
                  gatewayRunning ? "text-status-green-text" : "text-red-400"
                }
              >
                {gatewayRunning ? "Live" : "Offline"}
              </span>
            </p>
          </div>
          <KillSwitch initialState={gatewayRunning} />
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

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <div
              key={agent.id}
              style={{ animationDelay: `${i * 80}ms` }}
              className="opacity-0 animate-fade-in"
            >
              <AgentCard agent={agent} guildId={guildId} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
