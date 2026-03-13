import type { Agent, CostData } from "@/lib/types";

export default function MetricsBar({
  agents,
  costs,
  gatewayRunning,
}: {
  agents: Agent[];
  costs: CostData;
  gatewayRunning: boolean;
}) {
  const activeCount = agents.filter((a) => a.status === "Working").length;
  const totalAgents = agents.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        value={`${activeCount}/${totalAgents}`}
        label="Employees Working"
        suffix=""
        highlight={!gatewayRunning}
      />
      <MetricCard
        value={`$${costs.totalMonth.toFixed(2)}`}
        label="Monthly Cost"
        suffix=""
      />
      <MetricCard
        value={`~$${costs.estimatedMonth.toFixed(2)}`}
        label="30-Day Estimate"
        suffix=""
      />
      <MetricCard
        value={gatewayRunning ? "Online" : "Offline"}
        label="Team Status"
        suffix=""
        highlight={!gatewayRunning}
        isStatus
        statusColor={gatewayRunning ? "text-status-green-text" : "text-red-400"}
      />
    </div>
  );
}

function MetricCard({
  value,
  label,
  highlight,
  isStatus,
  statusColor,
}: {
  value: string;
  label: string;
  suffix: string;
  highlight?: boolean;
  isStatus?: boolean;
  statusColor?: string;
}) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-card p-4 text-center">
      <div
        className={`font-serif text-[28px] font-bold leading-none tracking-tight ${
          isStatus
            ? statusColor
            : highlight
            ? "text-red-400"
            : "text-text-primary"
        }`}
      >
        {value}
      </div>
      <div className="font-sans text-[12px] text-text-secondary mt-1">
        {label}
      </div>
    </div>
  );
}
