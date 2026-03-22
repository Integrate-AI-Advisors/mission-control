// Legacy component — replaced by ExecutiveCard + SubAgentRow
// Kept for backward compatibility if referenced elsewhere
import type { Agent } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function AgentCard({ agent }: { agent: Agent; guildId?: string }) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.avatar} alt={agent.name} className="w-10 h-10 rounded-full" />
          <div>
            <h3 className="font-sans text-[16px] font-semibold text-text-primary leading-tight">
              {agent.name}
            </h3>
            <p className="font-sans text-[12px] text-text-secondary">{agent.role}</p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-text-muted">{agent.modelTier}</span>
        {agent.lastActive && (
          <span className="font-mono text-[11px] text-text-muted">{agent.lastActive}</span>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-dark-border">
        <span className="font-mono text-[13px] text-text-primary">
          ${agent.monthlyCost.toFixed(2)}<span className="text-text-muted text-[11px]">/mo</span>
        </span>
      </div>
    </div>
  );
}
