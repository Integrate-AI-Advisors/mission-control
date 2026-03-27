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
  pass: { icon: "\u2713", color: "text-brand-green", bg: "bg-[rgba(74,124,89,0.12)]" },
  fail: { icon: "\u2717", color: "text-brand-red", bg: "bg-[rgba(194,91,86,0.12)]" },
  warn: { icon: "!", color: "text-brand-amber", bg: "bg-[rgba(196,148,58,0.12)]" },
  unknown: { icon: "?", color: "text-text-muted", bg: "bg-[rgba(154,149,144,0.12)]" },
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
  "C-Suite Integration",
  "Self-Improvement",
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
          <span className="font-mono text-[0.6rem] text-text-muted leading-[1.6]">Running optimization checks...</span>
        </div>
      </div>
    );
  }

  if (!summary || checks.length === 0) return null;

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
    summary.score >= 80 ? "text-brand-green" : summary.score >= 50 ? "text-brand-amber" : "text-brand-red";
  const scoreBorder =
    summary.score >= 80 ? "border-brand-green/30" : summary.score >= 50 ? "border-brand-amber/30" : "border-brand-red/30";
  const scoreBar =
    summary.score >= 80 ? "bg-brand-green" : summary.score >= 50 ? "bg-brand-amber" : "bg-brand-red";

  return (
    <div className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
      {/* Header with score */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-dark-surface/50 transition-colors duration-300"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${scoreBorder}`}>
            <span className={`font-serif text-[16px] ${scoreColor}`}>
              {summary.score}
            </span>
          </div>
          <div className="text-left">
            <span className="font-sans text-[14px] font-semibold text-text-primary">
              Optimization Score
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="font-mono text-[0.6rem] text-brand-green">
                {summary.pass} passed
              </span>
              {summary.fail > 0 && (
                <span className="font-mono text-[0.6rem] text-brand-red">
                  {summary.fail} failed
                </span>
              )}
              {summary.warn > 0 && (
                <span className="font-mono text-[0.6rem] text-brand-amber">
                  {summary.warn} warnings
                </span>
              )}
              <span className="font-mono text-[0.6rem] text-text-muted">
                {summary.total} checks
              </span>
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-text-muted transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
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

      {/* Score bar — 4px per brand spec */}
      {!collapsed && (
        <div className="px-5 pb-3">
          <div className="w-full h-1 bg-dark-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreBar}`}
              style={{ width: `${summary.score}%` }}
            />
          </div>
          <p className="font-mono text-[0.5rem] text-text-muted mt-1.5 tracking-[0.06em]">
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
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-dark-surface/30 transition-colors duration-300"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${
                      sectionFail > 0 ? "bg-brand-red" : sectionPass === sectionChecks.length ? "bg-brand-green" : "bg-brand-amber"
                    }`} />
                    <span className="font-sans text-[13px] font-medium text-text-primary">
                      {section}
                    </span>
                    <span className="font-mono text-[0.6rem] text-text-muted">
                      {sectionPass}/{sectionChecks.length}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-text-muted transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
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

                {isExpanded && (
                  <div className="px-5 pb-3 space-y-2">
                    {sectionChecks.map((check) => {
                      const si = statusIcon[check.status];
                      return (
                        <div
                          key={check.id}
                          className={`rounded-card border px-4 py-3 ${
                            check.status === "fail"
                              ? "border-brand-red/20 bg-[rgba(194,91,86,0.04)]"
                              : check.status === "warn"
                                ? "border-brand-amber/20 bg-[rgba(196,148,58,0.04)]"
                                : "border-brand-green/15 bg-[rgba(74,124,89,0.04)]"
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
                                <span className="flex-shrink-0 font-mono text-[0.6rem] text-brand-green whitespace-nowrap">
                                  {check.estimatedSaving}
                                </span>
                              </div>
                              <p className="font-mono text-[0.6rem] text-text-muted mt-1 leading-[1.6]">
                                {check.detail}
                              </p>
                              <p className="font-mono text-[0.5rem] text-text-dim mt-1">
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
