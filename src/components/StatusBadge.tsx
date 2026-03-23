import type { AgentStatus } from "@/lib/types";

const statusConfig: Record<AgentStatus, { style: string; dot: string; label: string }> = {
  Working: {
    style: "bg-[rgba(34,197,94,0.15)] text-[#4ade80] border-[rgba(34,197,94,0.25)] animate-pulse-green",
    dot: "bg-[#4ade80] animate-pulse",
    label: "Working",
  },
  Queued: {
    style: "bg-[rgba(245,158,11,0.12)] text-[#facc15] border-[rgba(245,158,11,0.25)]",
    dot: "bg-[#facc15]",
    label: "Queued",
  },
  Available: {
    style: "bg-[rgba(34,197,94,0.08)] text-[#4ade80] border-[rgba(34,197,94,0.15)]",
    dot: "bg-[#4ade80]",
    label: "Online",
  },
  Standby: {
    style: "bg-[rgba(148,163,184,0.10)] text-slate-400 border-[rgba(148,163,184,0.20)]",
    dot: "bg-slate-400",
    label: "Standby",
  },
  Off: {
    style: "bg-[rgba(239,68,68,0.12)] text-red-400 border-[rgba(239,68,68,0.25)]",
    dot: "bg-red-400",
    label: "Off",
  },
};

export default function StatusBadge({ status }: { status: AgentStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-medium px-3 py-1 rounded-full border tracking-wide ${config.style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
