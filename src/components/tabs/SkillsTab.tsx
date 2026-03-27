"use client";

import { useState, useEffect } from "react";
import type { Agent, Skill } from "@/lib/types";

interface SkillWithAgent extends Skill {
  agentId: string;
  agentName: string;
}

export default function SkillsTab({ agents }: { agents: Agent[] }) {
  const [search, setSearch] = useState("");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState<Record<string, string>>({});

  // Collect all skills across all agents
  const allSkills: SkillWithAgent[] = agents.flatMap((agent) =>
    agent.skills.map((skill) => ({
      ...skill,
      agentId: agent.id,
      agentName: agent.name,
    }))
  );

  // Dedupe by name
  const uniqueSkills = Array.from(
    new Map(allSkills.map((s) => [s.name, s])).values()
  );

  const filtered = uniqueSkills.filter((skill) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q) ||
      skill.agentId.toLowerCase().includes(q)
    );
  });

  // Group by agent
  const grouped: Record<string, SkillWithAgent[]> = {};
  for (const skill of filtered) {
    const key = skill.agentId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(skill);
  }

  async function loadSkillContent(agentId: string, skillSlug: string) {
    const key = `${agentId}:${skillSlug}`;
    if (skillContent[key]) return;
    try {
      const res = await fetch(`/api/skills?agent=${agentId}&skill=${skillSlug}`);
      if (res.ok) {
        const data = await res.json();
        setSkillContent((prev) => ({ ...prev, [key]: data.content || "No content available" }));
      }
    } catch {
      setSkillContent((prev) => ({ ...prev, [key]: "Failed to load skill content" }));
    }
  }

  function toggleSkill(agentId: string, skillName: string) {
    const slug = skillName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const key = `${agentId}:${slug}`;
    if (expandedSkill === key) {
      setExpandedSkill(null);
    } else {
      setExpandedSkill(key);
      loadSkillContent(agentId, slug);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search skills by name, description, or agent..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-dark-card border border-dark-border rounded-card px-3 py-2 font-mono text-[0.7rem] text-text-primary placeholder-text-muted focus:outline-none focus:border-terra/40"
      />

      {/* Stats */}
      <p className="font-mono text-[0.6rem] text-text-muted">
        {filtered.length} skill{filtered.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} agent{Object.keys(grouped).length !== 1 ? "s" : ""}
      </p>

      {/* Grouped skills */}
      {Object.entries(grouped).length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-card p-6 text-center text-text-muted font-mono text-[0.7rem]">
          {allSkills.length === 0
            ? "No skills loaded. Skills are fetched from agent workspaces on the VPS."
            : "No skills match your search."}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([agentId, skills]) => (
            <div key={agentId} className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
              <div className="px-4 py-2.5 bg-dark-surface/50 border-b border-dark-border/50">
                <span className="font-sans text-[13px] font-medium text-text-primary">{skills[0]?.agentName || agentId}</span>
                <span className="font-mono text-[0.55rem] text-text-muted ml-2">{skills.length} skill{skills.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-dark-border/30">
                {skills.map((skill) => {
                  const slug = skill.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                  const key = `${agentId}:${slug}`;
                  const isExpanded = expandedSkill === key;
                  return (
                    <div key={skill.name}>
                      <button
                        onClick={() => toggleSkill(agentId, skill.name)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-dark-surface/30 transition-colors text-left"
                      >
                        <div>
                          <span className="font-mono text-[0.7rem] text-text-primary">
                            {skill.name.replace(/-skill$/, "").replace(/-/g, " ")}
                          </span>
                          {skill.description && (
                            <p className="font-mono text-[0.6rem] text-text-muted mt-0.5">{skill.description}</p>
                          )}
                        </div>
                        {skill.version && (
                          <span className="font-mono text-[0.5rem] text-text-dim">{skill.version}</span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 bg-dark-surface/20">
                          <pre className="font-mono text-[0.6rem] text-text-secondary leading-[1.6] whitespace-pre-wrap max-h-[300px] overflow-y-auto bg-dark-card border border-dark-border rounded-card p-3">
                            {skillContent[key] || "Loading..."}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
