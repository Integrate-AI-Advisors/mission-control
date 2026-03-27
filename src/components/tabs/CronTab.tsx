"use client";

import { useState, useEffect } from "react";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: string;
  timezone: string;
  message: string;
  nextRun: string | null;
  lastRun: string | null;
  lastStatus: "ok" | "error" | "unknown";
  lastError: string | null;
  lastDuration: number | null;
  consecutiveErrors: number;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  ok: { color: "text-brand-green", bg: "bg-brand-green-bg", label: "OK" },
  error: { color: "text-brand-red", bg: "bg-[rgba(194,91,86,0.12)]", label: "ERR" },
  unknown: { color: "text-text-muted", bg: "bg-dark-surface", label: "---" },
};

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CronTab({ clientId }: { clientId: string }) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  useEffect(() => {
    fetchCron();
  }, [clientId]);

  async function fetchCron() {
    try {
      const res = await fetch(`/api/cron?client=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-card p-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-terra/30 border-t-terra rounded-full animate-spin" />
        <span className="font-mono text-[0.6rem] text-text-muted">Loading cron jobs...</span>
      </div>
    );
  }

  const enabled = jobs.filter((j) => j.enabled);
  const disabled = jobs.filter((j) => !j.enabled);
  const erroring = jobs.filter((j) => j.lastStatus === "error");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Jobs", value: jobs.length, color: "text-text-primary" },
          { label: "Active", value: enabled.length, color: "text-brand-green" },
          { label: "Disabled", value: disabled.length, color: "text-text-muted" },
          { label: "Erroring", value: erroring.length, color: erroring.length > 0 ? "text-brand-red" : "text-brand-green" },
        ].map((m) => (
          <div key={m.label} className="bg-dark-card border border-dark-border rounded-card p-3 text-center">
            <p className="font-mono text-[0.55rem] font-semibold text-terra uppercase tracking-[0.2em] mb-0.5">{m.label}</p>
            <p className={`font-serif text-[22px] leading-none ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Job list */}
      <div className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-6 text-center text-text-muted font-mono text-[0.7rem]">
            No cron jobs configured.
          </div>
        ) : (
          <div className="divide-y divide-dark-border/50">
            {jobs.map((job) => {
              const st = STATUS_STYLES[job.lastStatus] || STATUS_STYLES.unknown;
              const isExpanded = expandedJob === job.id;
              return (
                <div key={job.id}>
                  <button
                    onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-surface/50 transition-colors text-left"
                  >
                    {/* Status dot */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      !job.enabled ? "bg-text-muted/40" : job.lastStatus === "error" ? "bg-brand-red animate-breathe" : "bg-brand-green"
                    }`} />

                    {/* Name & agent */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-sans text-[13px] font-medium ${job.enabled ? "text-text-primary" : "text-text-muted"}`}>
                          {job.name}
                        </span>
                        <span className="font-mono text-[0.55rem] text-text-muted px-1.5 py-0.5 bg-dark-surface rounded">
                          {job.agentId}
                        </span>
                      </div>
                      <p className="font-mono text-[0.6rem] text-text-muted mt-0.5">
                        {job.schedule} ({job.timezone})
                      </p>
                    </div>

                    {/* Last status */}
                    <span className={`font-mono text-[0.55rem] font-semibold px-1.5 py-0.5 rounded ${st.color} ${st.bg}`}>
                      {st.label}
                    </span>

                    {/* Next run */}
                    <div className="text-right hidden sm:block">
                      <p className="font-mono text-[0.55rem] text-text-muted">Next</p>
                      <p className="font-mono text-[0.6rem] text-text-secondary">{formatTime(job.nextRun)}</p>
                    </div>

                    <svg
                      className={`w-4 h-4 text-text-muted transition-transform duration-300 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20" fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-dark-surface/30 space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.1em]">Last Run</p>
                          <p className="font-mono text-[0.65rem] text-text-secondary">{formatTime(job.lastRun)}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.1em]">Duration</p>
                          <p className="font-mono text-[0.65rem] text-text-secondary">{formatDuration(job.lastDuration)}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.1em]">Consecutive Errors</p>
                          <p className={`font-mono text-[0.65rem] ${job.consecutiveErrors > 0 ? "text-brand-red" : "text-text-secondary"}`}>{job.consecutiveErrors}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.1em]">Status</p>
                          <p className={`font-mono text-[0.65rem] ${job.enabled ? "text-brand-green" : "text-text-muted"}`}>{job.enabled ? "Enabled" : "Disabled"}</p>
                        </div>
                      </div>

                      <div>
                        <p className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.1em] mb-1">Prompt</p>
                        <p className="font-mono text-[0.6rem] text-text-secondary leading-[1.6] bg-dark-card border border-dark-border rounded-card p-2.5">
                          {job.message}
                        </p>
                      </div>

                      {job.lastError && (
                        <div>
                          <p className="font-mono text-[0.5rem] text-brand-red uppercase tracking-[0.1em] mb-1">Last Error</p>
                          <p className="font-mono text-[0.6rem] text-brand-red/80 leading-[1.6] bg-[rgba(194,91,86,0.06)] border border-brand-red/15 rounded-card p-2.5 break-all">
                            {job.lastError}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
