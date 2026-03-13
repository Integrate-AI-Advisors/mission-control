import type { AgentStatus } from "@/lib/types";

const statusStyles: Record<AgentStatus, string> = {
  Working:
    "bg-[rgba(34,197,94,0.15)] text-[#4ade80] border-[rgba(34,197,94,0.25)] animate-pulse-green",
  Queued:
    "bg-[rgba(245,158,11,0.12)] text-[#facc15] border-[rgba(245,158,11,0.25)]",
  Available:
    "bg-[rgba(250,249,245,0.05)] text-text-dim border-[rgba(250,249,245,0.1)]",
  Off:
    "bg-[rgba(239,68,68,0.12)] text-red-400 border-[rgba(239,68,68,0.25)]",
};

export default function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[11px] font-medium px-3 py-1 rounded-full border tracking-wide ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
