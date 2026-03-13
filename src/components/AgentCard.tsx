import type { Agent } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import SoftwareStack from "./ToolsList";

export default function AgentCard({
  agent,
  guildId,
}: {
  agent: Agent;
  guildId: string;
}) {
  const discordUrl = agent.discordChannelId
    ? `https://discord.com/channels/${guildId}/${agent.discordChannelId}`
    : null;

  return (
    <div className="bg-dark-card border border-dark-border rounded-card p-5 flex flex-col gap-3 animate-fade-in">
      {/* Header: avatar + name + discord icon + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={agent.avatar}
            alt={agent.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-sans text-[16px] font-semibold text-text-primary leading-tight">
                {agent.name}
              </h3>
              {discordUrl && (
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-terra transition-colors"
                  title="Open Discord channel"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                </a>
              )}
            </div>
            <p className="font-sans text-[12px] text-text-secondary">
              {agent.role}
            </p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Model + Last Active */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-text-muted">
          {agent.model}
        </span>
        {agent.lastActive && (
          <span className="font-mono text-[11px] text-text-muted">
            {agent.lastActive}
          </span>
        )}
      </div>

      {/* Software */}
      {agent.software && agent.software.length > 0 && (
        <div>
          <p className="font-sans text-[10px] text-text-muted mb-1 uppercase tracking-wider">
            Software
          </p>
          <SoftwareStack items={agent.software} />
        </div>
      )}

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div>
          <p className="font-sans text-[10px] text-text-muted mb-1 uppercase tracking-wider">
            Capabilities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded border border-terra/30 bg-terra/10 text-terra"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: cost */}
      <div className="flex items-center justify-between pt-2 border-t border-dark-border">
        <span className="font-mono text-[13px] text-text-primary">
          $<span className="font-serif">{agent.monthlyCost.toFixed(2)}</span>
          <span className="text-text-muted text-[11px]">/mo</span>
        </span>
      </div>
    </div>
  );
}
