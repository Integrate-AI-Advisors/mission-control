"use client";

import { useState, useEffect } from "react";

interface SkillEntry {
  name: string;
  agent: string;
  description: string;
}

const EXEC_LABELS: Record<string, string> = {
  ceo: "CEO Office",
  cmo: "Marketing (CMO)",
  cto: "Technology (CTO)",
  coo: "Operations (COO)",
  cfo: "Finance (CFO)",
  cco: "Creative (CCO)",
  shared: "Shared / Discovery",
};

export default function SkillsTab({ clientId }: { clientId: string }) {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<string | null>(null);

  useEffect(() => {
    fetchSkills();
  }, [clientId]);

  async function fetchSkills() {
    try {
      const res = await fetch(`/api/skills?client=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
        setGenerated(data.generated || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function loadSkillContent(agent: string, skillName: string) {
    const key = `${agent}:${skillName}`;
    if (skillContent[key]) return;
    try {
      const res = await fetch(`/api/skills?client=${clientId}&agent=${agent}&skill=${skillName}`);
      if (res.ok) {
        const data = await res.json();
        setSkillContent((prev) => ({ ...prev, [key]: data.content || "No content available" }));
      } else {
        setSkillContent((prev) => ({ ...prev, [key]: "Failed to load skill content" }));
      }
    } catch {
      setSkillContent((prev) => ({ ...prev, [key]: "Failed to load skill content" }));
    }
  }

  function toggleSkill(agent: string, skillName: string) {
    const key = `${agent}:${skillName}`;
    if (expandedSkill === key) {
      setExpandedSkill(null);
    } else {
      setExpandedSkill(key);
      loadSkillContent(agent, skillName);
    }
  }

  const filtered = skills.filter((skill) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q) ||
      skill.agent.toLowerCase().includes(q)
    );
  });

  // Group by agent
  const grouped: Record<string, SkillEntry[]> = {};
  for (const skill of filtered) {
    if (!grouped[skill.agent]) grouped[skill.agent] = [];
    grouped[skill.agent].push(skill);
  }

  // Sort agents by executive order
  const agentOrder = ["ceo", "cmo", "cto", "coo", "cfo", "cco", "shared"];
  const sortedAgents = Object.keys(grouped).sort(
    (a, b) => (agentOrder.indexOf(a) ?? 99) - (agentOrder.indexOf(b) ?? 99)
  );

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-card p-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-terra/30 border-t-terra rounded-full animate-spin" />
        <span className="font-mono text-[0.6rem] text-text-muted">Loading skills from VPS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search skills by name, description, or department..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-dark-card border border-dark-border rounded-card px-3 py-2 font-mono text-[0.7rem] text-text-primary placeholder-text-muted focus:outline-none focus:border-terra/40"
      />

      {/* Stats */}
      <p className="font-mono text-[0.6rem] text-text-muted">
        {filtered.length} of {skills.length} skills across {sortedAgents.length} department{sortedAgents.length !== 1 ? "s" : ""}
        {generated && <span> &middot; Indexed {new Date(generated).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
      </p>

      {/* Grouped skills */}
      {skills.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-card p-6 text-center text-text-muted font-mono text-[0.7rem]">
          No skills index found. Run <code className="bg-dark-surface px-1.5 py-0.5 rounded">build-skills-index.sh</code> on VPS to generate.
        </div>
      ) : sortedAgents.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-card p-6 text-center text-text-muted font-mono text-[0.7rem]">
          No skills match your search.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAgents.map((agent) => {
            const agentSkills = grouped[agent];
            return (
              <div key={agent} className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
                <div className="px-4 py-2.5 bg-dark-surface/50 border-b border-dark-border/50 flex items-center justify-between">
                  <div>
                    <span className="font-sans text-[13px] font-medium text-text-primary">
                      {EXEC_LABELS[agent] || agent.toUpperCase()}
                    </span>
                    <span className="font-mono text-[0.55rem] text-text-muted ml-2">
                      {agentSkills.length} skill{agentSkills.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-dark-border/30">
                  {agentSkills.map((skill) => {
                    const key = `${skill.agent}:${skill.name}`;
                    const isExpanded = expandedSkill === key;
                    return (
                      <div key={skill.name}>
                        <button
                          onClick={() => toggleSkill(skill.agent, skill.name)}
                          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-dark-surface/30 transition-colors text-left"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[0.7rem] text-text-primary">
                              {skill.name.replace(/-skill$/, "").replace(/-/g, " ")}
                            </span>
                            {skill.description && (
                              <p className="font-mono text-[0.6rem] text-text-muted mt-0.5 truncate">{skill.description}</p>
                            )}
                          </div>
                          <svg
                            className={`w-4 h-4 text-text-muted transition-transform duration-300 flex-shrink-0 ml-2 ${isExpanded ? "rotate-180" : ""}`}
                            viewBox="0 0 20 20" fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 bg-dark-surface/20">
                            <pre className="font-mono text-[0.6rem] text-text-secondary leading-[1.6] whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-dark-card border border-dark-border rounded-card p-3">
                              {skillContent[key] || "Loading..."}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
