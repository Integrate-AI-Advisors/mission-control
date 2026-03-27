"use client";

import { useState } from "react";
import type { Agent, ExecutiveGroup } from "@/lib/types";
import ExecutiveCard from "@/components/ExecutiveCard";
import { EXECUTIVE_LABELS, EXECUTIVE_COLOURS } from "@/lib/hierarchy";
import type { Executive } from "@/lib/types";

export default function AgentsTab({
  agents,
  groups,
}: {
  agents: Agent[];
  groups: ExecutiveGroup[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  const filteredAgents = agents.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.id.includes(q) || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredGroups = groups.map((g) => ({
    ...g,
    subAgents: g.subAgents.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.id.includes(q) || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
      }
      return true;
    }),
  })).filter((g) => {
    if (search) {
      const q = search.toLowerCase();
      const execMatch = g.executive.id.includes(q) || g.executive.name.toLowerCase().includes(q);
      return execMatch || g.subAgents.length > 0;
    }
    if (statusFilter !== "all") {
      return g.executive.status === statusFilter || g.subAgents.length > 0;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-dark-card border border-dark-border rounded-card px-3 py-1.5 font-mono text-[0.7rem] text-text-primary placeholder-text-muted flex-1 min-w-[180px] focus:outline-none focus:border-terra/40"
        />

        <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-card p-0.5">
          {["all", "Working", "Available", "Standby", "Off"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2 py-1 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.1em] rounded-[8px] transition-all duration-200 ${
                statusFilter === status
                  ? "bg-terra/15 text-terra"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-card p-0.5">
          <button
            onClick={() => setViewMode("grouped")}
            className={`px-2 py-1 font-mono text-[0.55rem] font-semibold uppercase rounded-[8px] transition-all ${
              viewMode === "grouped" ? "bg-terra/15 text-terra" : "text-text-muted"
            }`}
          >
            Grouped
          </button>
          <button
            onClick={() => setViewMode("flat")}
            className={`px-2 py-1 font-mono text-[0.55rem] font-semibold uppercase rounded-[8px] transition-all ${
              viewMode === "flat" ? "bg-terra/15 text-terra" : "text-text-muted"
            }`}
          >
            Flat
          </button>
        </div>
      </div>

      <p className="font-mono text-[0.6rem] text-text-muted">
        {filteredAgents.length} of {agents.length} agents
      </p>

      {viewMode === "grouped" ? (
        <div className="space-y-4">
          {filteredGroups.map((group, i) => (
            <div
              key={group.executive.id}
              style={{ animationDelay: `${i * 80}ms` }}
              className="opacity-0 animate-fade-in"
            >
              <ExecutiveCard
                group={group}
                colour={EXECUTIVE_COLOURS[group.executive.id as keyof typeof EXECUTIVE_COLOURS]}
                label={EXECUTIVE_LABELS[group.executive.id as keyof typeof EXECUTIVE_LABELS]}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
          <table className="w-full font-mono text-[0.7rem]">
            <thead className="bg-dark-surface border-b border-dark-border">
              <tr>
                <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em]">Agent</th>
                <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em]">Role</th>
                <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em]">Model</th>
                <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em]">Status</th>
                <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em]">Parent</th>
                <th className="px-3 py-2 text-right text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em]">Cost/mo</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="border-b border-dark-border/30 hover:bg-dark-surface/50 transition-colors">
                  <td className="px-3 py-2 text-text-primary font-medium">{agent.id}</td>
                  <td className="px-3 py-2 text-text-secondary">{agent.role}</td>
                  <td className="px-3 py-2 text-text-muted">{agent.modelTier}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[0.55rem] font-semibold ${
                      agent.status === "Working" ? "text-brand-green bg-brand-green-bg"
                        : agent.status === "Available" ? "text-brand-blue bg-brand-blue-bg"
                        : agent.status === "Off" ? "text-text-muted bg-dark-surface"
                        : "text-brand-amber bg-brand-amber-bg"
                    }`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{agent.parent || "-"}</td>
                  <td className="px-3 py-2 text-text-secondary text-right">${agent.monthlyCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
