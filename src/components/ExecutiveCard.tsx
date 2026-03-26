"use client";

import { useState } from "react";
import type { ExecutiveGroup } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import SubAgentRow from "./SubAgentRow";
import SkillModal from "./SkillModal";

function skillToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function ExecutiveCard({
  group,
  colour,
  label,
}: {
  group: ExecutiveGroup;
  colour: string;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeSkill, setActiveSkill] = useState<{ slug: string; name: string } | null>(null);
  const { executive, subAgents, totalCost, activeCount } = group;

  const isOff = executive.status === "Off";
  const isStandby = executive.status === "Standby";

  return (
    <>
      <div
        className={`bg-dark-card border border-dark-border rounded-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
          isOff ? "opacity-50" : isStandby ? "opacity-60" : ""
        }`}
        style={{ borderLeftColor: colour, borderLeftWidth: "3px" }}
      >
        {/* Executive Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-5 flex items-center justify-between hover:bg-dark-surface/50 transition-colors duration-300"
        >
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={executive.avatar}
              alt={executive.name}
              className="w-12 h-12 rounded-full"
              style={{ outline: `2px solid ${colour}`, outlineOffset: "2px" }}
            />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="font-sans text-[16px] font-semibold text-text-primary">
                  {executive.name}
                </h2>
                <StatusBadge status={executive.status} />
              </div>
              <p className="font-serif italic text-[0.88rem] text-text-muted">{label}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-[0.6rem] text-text-muted tracking-[0.06em] uppercase">
                  {executive.modelTier}
                </span>
                <span className="font-mono text-[0.6rem] text-text-muted">
                  {subAgents.length} agents
                </span>
                {activeCount > 0 && (
                  <span className="font-mono text-[0.6rem] text-brand-green">
                    {activeCount} active
                  </span>
                )}
                {executive.lastActive && (
                  <span className="font-mono text-[0.6rem] text-text-muted">
                    {executive.lastActive}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="font-mono text-[14px] text-text-primary">
                ${totalCost.toFixed(2)}
                <span className="text-text-muted text-[0.6rem]">/mo</span>
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-text-muted transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>

        {/* Skills — pill badges per brand spec */}
        {executive.skills.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {executive.skills.slice(0, 6).map((skill) => (
              <button
                key={skill.name}
                onClick={() => setActiveSkill({ slug: skillToSlug(skill.name), name: skill.name.replace(/-skill$/, "").replace(/-/g, " ") })}
                className="inline-flex items-center font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em] px-2.5 py-0.5 rounded-full border cursor-pointer transition-colors duration-300 hover:opacity-80"
                style={{
                  borderColor: `${colour}30`,
                  backgroundColor: `${colour}10`,
                  color: colour,
                }}
              >
                {skill.name.replace(/-skill$/, "").replace(/-/g, " ")}
              </button>
            ))}
            {executive.skills.length > 6 && (
              <span className="font-mono text-[0.55rem] text-text-muted px-1 self-center">
                +{executive.skills.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Sub-agent list */}
        {expanded && subAgents.length > 0 && (
          <div className="border-t border-dark-border">
            <div className="px-5 py-2 bg-dark-surface/30">
              <span className="font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em]">
                Team Members ({subAgents.length})
              </span>
            </div>
            <div className="divide-y divide-dark-border/50">
              {subAgents.map((agent) => (
                <SubAgentRow key={agent.id} agent={agent} colour={colour} />
              ))}
            </div>
          </div>
        )}
      </div>

      {activeSkill && (
        <SkillModal
          agentId={executive.id}
          skillSlug={activeSkill.slug}
          skillName={activeSkill.name}
          onClose={() => setActiveSkill(null)}
        />
      )}
    </>
  );
}
