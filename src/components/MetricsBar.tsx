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
  const onDutyCount = agents.filter((a) => a.status !== "Standby" && a.status !== "Off").length;
  const working = agents.filter((a) => a.status === "Working").length;

  const dailyAlert = costs.todayCost >= 2.0;

  const metrics = [
    {
      label: "On Duty",
      value: `${onDutyCount}/${totalAgents}`,
      sub: `${executives} executives`,
      highlight: !gatewayRunning,
    },
    {
      label: "Today",
      value: `$${costs.todayCost.toFixed(2)}`,
      sub: `${working} working now`,
      highlight: dailyAlert,
    },
    {
      label: "This Month",
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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-dark-surface border border-dark-border rounded-card p-2 sm:p-4 text-center"
        >
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">
            {m.label}
          </p>
          <p
            className={`font-serif text-[22px] sm:text-[28px] font-bold leading-none ${
              m.statusColor
                ? m.statusColor
                : m.highlight
                  ? "text-red-400"
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
