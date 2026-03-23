"use client";

import { useState, useEffect } from "react";

interface Optimization {
  id: string;
  title: string;
  description: string;
  estimatedSaving: string;
  priority: "high" | "medium" | "low";
}

const priorityStyles = {
  high: "border-red-500/20 bg-red-500/5",
  medium: "border-yellow-500/20 bg-yellow-500/5",
  low: "border-slate-500/20 bg-slate-500/5",
};

const priorityLabels = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-slate-400",
};

export default function CostOptimizations() {
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchOptimizations() {
      try {
        const res = await fetch("/api/cost-optimizations");
        if (res.ok) {
          const data = await res.json();
          setOptimizations(data.optimizations || []);
        }
      } catch {
        // Silent fail — not critical
      } finally {
        setLoading(false);
      }
    }
    fetchOptimizations();
  }, []);

  if (loading || optimizations.length === 0) return null;

  return (
    <div className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-dark-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
          </svg>
          <span className="font-sans text-[14px] font-semibold text-text-primary">
            Cost Optimizations
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            ({optimizations.length})
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
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

      {!collapsed && (
        <div className="px-5 pb-4 space-y-2">
          {optimizations.map((opt) => (
            <div
              key={opt.id}
              className={`rounded-lg border px-4 py-3 ${priorityStyles[opt.priority]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-sans text-[13px] text-text-primary font-medium">
                    {opt.title}
                  </p>
                  <p className="font-mono text-[11px] text-text-muted mt-1">
                    {opt.description}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-mono text-[12px] text-status-green-text font-medium">
                    {opt.estimatedSaving}
                  </span>
                  <p className={`font-mono text-[10px] mt-0.5 ${priorityLabels[opt.priority]}`}>
                    {opt.priority}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
