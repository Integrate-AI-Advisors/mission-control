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
  const totalAgents = agents.length;
  const executives = agents.filter((a) => a.tier === "executive").length;
  const working = agents.filter((a) => a.status === "Working").length;
  const available = agents.filter((a) => a.status === "Available").length;

  const metrics = [
    {
      label: "Agents",
      value: totalAgents.toString(),
      sub: `${executives} executives`,
    },
    {
      label: "Active",
      value: working.toString(),
      sub: `${available} available`,
      highlight: working > 0,
    },
    {
      label: "Month to Date",
      value: `$${costs.totalMonth.toFixed(2)}`,
      sub: `${costs.callCount.toLocaleString()} calls`,
    },
    {
      label: "Projected",
      value: `$${costs.estimatedMonth.toFixed(2)}`,
      sub: "30-day estimate",
    },
    {
      label: "Gateway",
      value: gatewayRunning ? "Live" : "Offline",
      sub: gatewayRunning ? "Port 18789" : "Stopped",
      statusColor: gatewayRunning ? "text-status-green-text" : "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-dark-surface border border-dark-border rounded-card p-4 text-center"
        >
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">
            {m.label}
          </p>
          <p
            className={`font-serif text-[24px] font-bold leading-none ${
              m.statusColor
                ? m.statusColor
                : m.highlight
                  ? "text-status-green-text"
                  : "text-text-primary"
            }`}
          >
            {m.value}
          </p>
          <p className="font-mono text-[11px] text-text-muted mt-1">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}
