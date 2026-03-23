"use client";

import { useState, useEffect } from "react";

type CheckStatus = "pass" | "fail" | "warn" | "unknown";

interface OptimizationCheck {
  id: string;
  section: string;
  title: string;
  status: CheckStatus;
  detail: string;
  estimatedSaving: string;
  researchRef: string;
}

interface Summary {
  total: number;
  pass: number;
  fail: number;
  warn: number;
  score: number;
}

const statusIcon: Record<CheckStatus, { icon: string; color: string; bg: string }> = {
  pass: { icon: "✓", color: "text-[#4ade80]", bg: "bg-[rgba(34,197,94,0.12)]" },
  fail: { icon: "✗", color: "text-red-400", bg: "bg-[rgba(239,68,68,0.12)]" },
  warn: { icon: "!", color: "text-yellow-400", bg: "bg-[rgba(245,158,11,0.12)]" },
  unknown: { icon: "?", color: "text-slate-400", bg: "bg-[rgba(148,163,184,0.12)]" },
};

const sectionOrder = [
  "Cost Optimization",
  "Context Management",
  "Blueprint Optimization",
  "Security",
  "Observability",
  "Backup",
  "Evolution",
  "Performance",
  "Drift Prevention",
];

export default function CostOptimizations() {
  const [checks, setChecks] = useState<OptimizationCheck[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/cost-optimizations");
        if (res.ok) {
          const data = await res.json();
          setChecks(data.checks || []);
          setSummary(data.summary || null);
          // Auto-expand sections with failures
          const failSections = new Set<string>();
          (data.checks || []).forEach((c: OptimizationCheck) => {
            if (c.status === "fail") failSections.add(c.section);
          });
          setExpandedSections(failSections);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-terra/30 border-t-terra rounded-full animate-spin" />
          <span className="font-mono text-[12px] text-text-muted">Running optimization checks...</span>
        </div>
      </div>
    );
  }

  if (!summary || checks.length === 0) return null;

  // Group checks by section
  const grouped: Record<string, OptimizationCheck[]> = {};
  for (const check of checks) {
    if (!grouped[check.section]) grouped[check.section] = [];
    grouped[check.section].push(check);
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const scoreColor =
    summary.score >= 80 ? "text-[#4ade80]" : summary.score >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
      {/* Header with score */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-dark-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
            summary.score >= 80 ? "border-[#4ade80]/30" : summary.score >= 50 ? "border-yellow-400/30" : "border-red-400/30"
          }`}>
            <span className={`font-serif text-[16px] font-bold ${scoreColor}`}>
              {summary.score}
            </span>
          </div>
          <div className="text-left">
            <span className="font-sans text-[14px] font-semibold text-text-primary">
              Elite Optimization Score
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="font-mono text-[11px] text-[#4ade80]">
                {summary.pass} passed
              </span>
              {summary.fail > 0 && (
                <span className="font-mono text-[11px] text-red-400">
                  {summary.fail} failed
                </span>
              )}
              {summary.warn > 0 && (
                <span className="font-mono text-[11px] text-yellow-400">
                  {summary.warn} warnings
                </span>
              )}
              <span className="font-mono text-[11px] text-text-muted">
                {summary.total} checks
              </span>
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-text-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Score bar */}
      {!collapsed && (
        <div className="px-5 pb-3">
          <div className="w-full h-2 bg-dark-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.score >= 80 ? "bg-[#4ade80]" : summary.score >= 50 ? "bg-yellow-400" : "bg-red-400"
              }`}
              style={{ width: `${summary.score}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-text-muted mt-1.5">
            Based on Elite Agent Optimization research (29 docs) &middot; Adapted for 108-agent C-Suite
          </p>
        </div>
      )}

      {/* Sections */}
      {!collapsed && (
        <div className="border-t border-dark-border">
          {sectionOrder.map((section) => {
            const sectionChecks = grouped[section];
            if (!sectionChecks || sectionChecks.length === 0) return null;

            const sectionPass = sectionChecks.filter((c) => c.status === "pass").length;
            const sectionFail = sectionChecks.filter((c) => c.status === "fail").length;
            const isExpanded = expandedSections.has(section);

            return (
              <div key={section} className="border-b border-dark-border/50 last:border-b-0">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-dark-surface/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${
                      sectionFail > 0 ? "bg-red-400" : sectionPass === sectionChecks.length ? "bg-[#4ade80]" : "bg-yellow-400"
                    }`} />
                    <span className="font-sans text-[13px] font-medium text-text-primary">
                      {section}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">
                      {sectionPass}/{sectionChecks.length}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Individual checks */}
                {isExpanded && (
                  <div className="px-5 pb-3 space-y-2">
                    {sectionChecks.map((check) => {
                      const si = statusIcon[check.status];
                      return (
                        <div
                          key={check.id}
                          className={`rounded-lg border px-4 py-3 ${
                            check.status === "fail"
                              ? "border-red-500/20 bg-red-500/5"
                              : check.status === "warn"
                                ? "border-yellow-500/20 bg-yellow-500/5"
                                : "border-[#4ade80]/15 bg-[#4ade80]/5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full ${si.bg} flex items-center justify-center font-mono text-[11px] font-bold ${si.color}`}>
                              {si.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-sans text-[12px] text-text-primary font-medium">
                                  {check.title}
                                </p>
                                <span className="flex-shrink-0 font-mono text-[10px] text-status-green-text whitespace-nowrap">
                                  {check.estimatedSaving}
                                </span>
                              </div>
                              <p className="font-mono text-[10px] text-text-muted mt-1 leading-relaxed">
                                {check.detail}
                              </p>
                              <p className="font-mono text-[9px] text-text-muted/60 mt-1">
                                {check.researchRef}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
