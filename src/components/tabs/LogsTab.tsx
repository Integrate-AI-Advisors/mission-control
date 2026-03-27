"use client";

import { useState, useEffect, useRef } from "react";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  agent?: string;
  source: string;
  message: string;
}

const LEVEL_STYLES: Record<string, { color: string; bg: string }> = {
  info: { color: "text-brand-blue", bg: "bg-brand-blue-bg" },
  warn: { color: "text-brand-amber", bg: "bg-brand-amber-bg" },
  error: { color: "text-brand-red", bg: "bg-[rgba(194,91,86,0.12)]" },
  debug: { color: "text-text-muted", bg: "bg-dark-surface" },
};

export default function LogsTab({ clientId }: { clientId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [autoFollow, setAutoFollow] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [clientId]);

  useEffect(() => {
    if (autoFollow && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoFollow]);

  async function fetchLogs() {
    try {
      const res = await fetch(`/api/logs?client=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const filtered = logs.filter((log) => {
    if (filter !== "all" && log.level !== filter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase()) && !log.agent?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-card p-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-terra/30 border-t-terra rounded-full animate-spin" />
        <span className="font-mono text-[0.6rem] text-text-muted">Loading logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-card p-0.5">
          {["all", "error", "warn", "info", "debug"].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] rounded-[8px] transition-all duration-200 ${
                filter === level
                  ? "bg-terra/15 text-terra"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-dark-card border border-dark-border rounded-card px-3 py-1.5 font-mono text-[0.7rem] text-text-primary placeholder-text-muted flex-1 min-w-[180px] focus:outline-none focus:border-terra/40"
        />

        <button
          onClick={() => setAutoFollow(!autoFollow)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] rounded-card border transition-all duration-200 ${
            autoFollow
              ? "border-brand-green/30 text-brand-green bg-brand-green-bg"
              : "border-dark-border text-text-muted"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autoFollow ? "bg-brand-green animate-breathe" : "bg-text-muted"}`} />
          Follow
        </button>

        <button
          onClick={fetchLogs}
          className="px-2.5 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] rounded-card border border-dark-border text-text-muted hover:text-terra hover:border-terra/30 transition-all duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Log entries */}
      <div className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto font-mono text-[0.7rem]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-text-muted">
              {logs.length === 0 ? "No logs available. Logs appear when agents run via cron or direct invocation." : "No logs match your filters."}
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-surface border-b border-dark-border">
                <tr>
                  <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em] w-[140px]">Time</th>
                  <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em] w-[50px]">Level</th>
                  <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em] w-[120px]">Agent</th>
                  <th className="px-3 py-2 text-left text-[0.55rem] font-semibold text-terra uppercase tracking-[0.15em]">Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
                  return (
                    <tr key={i} className="border-b border-dark-border/30 hover:bg-dark-surface/50 transition-colors">
                      <td className="px-3 py-1.5 text-text-muted whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[0.55rem] font-semibold uppercase ${style.color} ${style.bg}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-text-secondary">{log.agent || log.source}</td>
                      <td className="px-3 py-1.5 text-text-primary break-all">{log.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <p className="font-mono text-[0.55rem] text-text-muted">
        {filtered.length} of {logs.length} entries &middot; Auto-refresh every 10s
      </p>
    </div>
  );
}
