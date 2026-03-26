import type { AgentStatus } from "@/lib/types";

const statusConfig: Record<AgentStatus, { style: string; dot: string; label: string }> = {
  Working: {
    style: "bg-[rgba(74,124,89,0.12)] text-brand-green border-[rgba(74,124,89,0.25)]",
    dot: "bg-brand-green animate-breathe",
    label: "Working",
  },
  Queued: {
    style: "bg-[rgba(196,148,58,0.10)] text-brand-amber border-[rgba(196,148,58,0.25)]",
    dot: "bg-brand-amber",
    label: "Queued",
  },
  Available: {
    style: "bg-[rgba(74,124,89,0.06)] text-brand-green border-[rgba(74,124,89,0.15)]",
    dot: "bg-brand-green",
    label: "Online",
  },
  Standby: {
    style: "bg-[rgba(154,149,144,0.10)] text-text-muted border-[rgba(154,149,144,0.20)]",
    dot: "bg-text-muted",
    label: "Standby",
  },
  Off: {
    style: "bg-[rgba(194,91,86,0.10)] text-brand-red border-[rgba(194,91,86,0.25)]",
    dot: "bg-brand-red",
    label: "Off",
  },
};

export default function StatusBadge({ status }: { status: AgentStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-medium px-2.5 py-0.5 rounded-full border tracking-[0.06em] uppercase ${config.style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
