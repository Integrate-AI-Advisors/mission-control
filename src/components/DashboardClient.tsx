"use client";

import { useState } from "react";
import DashboardTabs, { type TabId } from "./DashboardTabs";
import MetricsBar from "./MetricsBar";
import CostAlert from "./CostAlert";
import CostOptimizations from "./CostOptimizations";
import SetupChecklist from "./SetupChecklist";
import KillSwitch from "./KillSwitch";
import AgentsTab from "./tabs/AgentsTab";
import LogsTab from "./tabs/LogsTab";
import CronTab from "./tabs/CronTab";
import SkillsTab from "./tabs/SkillsTab";
import ConfigTab from "./tabs/ConfigTab";
import type { Agent, ExecutiveGroup, CostData } from "@/lib/types";

interface Props {
  clientId: string;
  clientName: string;
  agents: Agent[];
  groups: ExecutiveGroup[];
  costs: CostData;
  gatewayRunning: boolean;
  slackEnabled: boolean;
  hasGateway: boolean;
  phase: string;
}

export default function DashboardClient({
  clientId,
  clientName,
  agents,
  groups,
  costs,
  gatewayRunning,
  slackEnabled,
  hasGateway,
  phase,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const totalAgents = agents.length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
          {/* Tabs */}
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          {activeTab === "overview" && (
            <>
              <div className="mb-4">
                <CostAlert costs={costs} />
              </div>
              <div className="mb-6">
                <MetricsBar agents={agents} costs={costs} gatewayRunning={gatewayRunning} />
              </div>
              <div className="mb-6">
                <SetupChecklist agents={agents} />
              </div>
              <div className="mb-6">
                <CostOptimizations />
              </div>
              {/* Executive summary cards on overview */}
              <div className="space-y-4">
                {groups.slice(0, 3).map((group, i) => (
                  <div
                    key={group.executive.id}
                    style={{ animationDelay: `${i * 100}ms` }}
                    className="opacity-0 animate-fade-in"
                  >
                    <div className="bg-dark-card border border-dark-border rounded-card p-4 flex items-center justify-between"
                      style={{ borderLeftColor: getExecColor(group.executive.id), borderLeftWidth: "3px" }}
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={group.executive.avatar} alt="" className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-sans text-[14px] font-semibold text-text-primary">{group.executive.name}</p>
                          <p className="font-mono text-[0.6rem] text-text-muted">
                            {group.subAgents.length} agents &middot; {group.activeCount} active
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[14px] text-text-primary">${group.totalCost.toFixed(2)}<span className="text-text-muted text-[0.6rem]">/mo</span></p>
                        <p className={`font-mono text-[0.6rem] ${group.executive.status === "Working" ? "text-brand-green" : group.executive.status === "Off" ? "text-text-muted" : "text-brand-blue"}`}>
                          {group.executive.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {groups.length > 3 && (
                  <button
                    onClick={() => setActiveTab("agents")}
                    className="w-full py-2 font-mono text-[0.65rem] text-terra hover:text-terra-light transition-colors"
                  >
                    View all {groups.length} departments →
                  </button>
                )}
              </div>
            </>
          )}

          {activeTab === "agents" && (
            <AgentsTab agents={agents} groups={groups} />
          )}

          {activeTab === "logs" && (
            <LogsTab clientId={clientId} />
          )}

          {activeTab === "cron" && (
            <CronTab clientId={clientId} />
          )}

          {activeTab === "skills" && (
            <SkillsTab agents={agents} />
          )}

          {activeTab === "config" && (
            <ConfigTab clientId={clientId} />
          )}
        </>
      )}
    </>
  );
}

const EXEC_COLORS: Record<string, string> = {
  ceo: "#7B2DFF", cmo: "#FF5630", cto: "#00B8D9",
  coo: "#36B37E", cfo: "#FFAB00", cco: "#E91E8C",
  discovery: "#6554C0",
};

function getExecColor(id: string): string {
  return EXEC_COLORS[id] || "#D97757";
}
