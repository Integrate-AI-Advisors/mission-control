import type { Agent } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function SubAgentRow({
  agent,
  colour,
}: {
  agent: Agent;
  colour: string;
}) {
  return (
    <div className="px-5 py-3 flex items-center justify-between hover:bg-dark-surface/20 transition-colors">
      <div className="flex items-center gap-3">
        {/* Small avatar */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={agent.avatar}
          alt={agent.name}
          className="w-7 h-7 rounded-full"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[14px] text-text-primary">
              {agent.name}
            </span>
            <StatusBadge status={agent.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-muted">
              {agent.modelTier}
            </span>
            {agent.skills.length > 0 && (
              <span className="font-mono text-[10px] text-text-muted">
                &middot; {agent.skills.length} skill{agent.skills.length !== 1 ? "s" : ""}
              </span>
            )}
            {agent.lastActive && (
              <span className="font-mono text-[10px] text-text-muted">
                &middot; {agent.lastActive}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Skill badges */}
        <div className="hidden md:flex flex-wrap gap-1 max-w-[200px] justify-end">
          {agent.skills.slice(0, 2).map((skill) => (
            <span
              key={skill.name}
              className="inline-flex items-center text-[9px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                borderColor: `${colour}20`,
                backgroundColor: `${colour}08`,
                color: `${colour}CC`,
              }}
            >
              {skill.name.replace(/-skill$/, "").replace(/-/g, " ")}
            </span>
          ))}
        </div>
        {/* Cost */}
        <span className="font-mono text-[12px] text-text-muted min-w-[60px] text-right">
          ${agent.monthlyCost.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
