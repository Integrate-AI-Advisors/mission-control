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
      statusColor: gatewayRunning ? "text-brand-green" : "text-brand-red",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-dark-surface border border-dark-border rounded-card p-2 sm:p-4 text-center hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
        >
          <p className="font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1">
            {m.label}
          </p>
          <p
            className={`font-serif text-[22px] sm:text-[28px] leading-none ${
              m.statusColor
                ? m.statusColor
                : m.highlight
                  ? "text-brand-red"
                  : "text-text-primary"
            }`}
          >
            {m.value}
          </p>
          <p className="font-mono text-[0.6rem] text-text-muted mt-1.5 leading-[1.6]">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}
