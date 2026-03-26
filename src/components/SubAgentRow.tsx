"use client";

import { useState } from "react";
import type { Agent } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import SkillModal from "./SkillModal";

function skillToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function SubAgentRow({
  agent,
  colour,
}: {
  agent: Agent;
  colour: string;
}) {
  const [activeSkill, setActiveSkill] = useState<{ slug: string; name: string } | null>(null);

  const isOff = agent.status === "Off";
  const isStandby = agent.status === "Standby";

  return (
    <>
      <div className={`px-5 py-3 flex items-center justify-between hover:bg-dark-surface/20 transition-colors duration-300 ${
        isOff ? "opacity-50" : isStandby ? "opacity-60" : ""
      }`}>
        <div className="flex items-center gap-3">
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
              <span className="font-mono text-[0.6rem] text-text-muted tracking-[0.06em] uppercase">
                {agent.modelTier}
              </span>
              {agent.skills.length > 0 && (
                <span className="font-mono text-[0.6rem] text-text-muted">
                  &middot; {agent.skills.length} skill{agent.skills.length !== 1 ? "s" : ""}
                </span>
              )}
              {agent.lastActive && (
                <span className="font-mono text-[0.6rem] text-text-muted">
                  &middot; {agent.lastActive}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Skill pills */}
          <div className="hidden md:flex flex-wrap gap-1 max-w-[200px] justify-end">
            {agent.skills.slice(0, 2).map((skill) => (
              <button
                key={skill.name}
                onClick={() => setActiveSkill({ slug: skillToSlug(skill.name), name: skill.name.replace(/-skill$/, "").replace(/-/g, " ") })}
                className="inline-flex items-center font-mono text-[0.5rem] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full border cursor-pointer transition-colors duration-300 hover:opacity-80"
                style={{
                  borderColor: `${colour}20`,
                  backgroundColor: `${colour}08`,
                  color: `${colour}CC`,
                }}
              >
                {skill.name.replace(/-skill$/, "").replace(/-/g, " ")}
              </button>
            ))}
          </div>
          <span className="font-mono text-[0.6rem] text-text-muted min-w-[60px] text-right">
            ${agent.monthlyCost.toFixed(2)}
          </span>
        </div>
      </div>

      {activeSkill && (
        <SkillModal
          agentId={agent.id}
          skillSlug={activeSkill.slug}
          skillName={activeSkill.name}
          onClose={() => setActiveSkill(null)}
        />
      )}
    </>
  );
}
