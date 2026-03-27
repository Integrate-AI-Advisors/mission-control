"use client";

import { useState, useEffect } from "react";

interface ConfigData {
  meta: Record<string, unknown>;
  models: Record<string, unknown>;
  agents: { defaults: Record<string, unknown>; count: number };
  tools: Record<string, unknown>;
  cron: Record<string, unknown>;
  channels: Record<string, unknown>;
  gateway: Record<string, unknown>;
  session: Record<string, unknown>;
}

export default function ConfigTab({ clientId }: { clientId: string }) {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, [clientId]);

  async function fetchConfig() {
    try {
      const res = await fetch(`/api/config?client=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || null);
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
        <span className="font-mono text-[0.6rem] text-text-muted">Loading config...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-card p-6 text-center text-text-muted font-mono text-[0.7rem]">
        Could not load config. Gateway may be unreachable.
      </div>
    );
  }

  const sections = [
    { key: "meta", label: "Metadata", data: config.meta },
    { key: "models", label: "Models", data: config.models },
    { key: "agents", label: "Agents", data: config.agents },
    { key: "tools", label: "Tools & Sandbox", data: config.tools },
    { key: "cron", label: "Cron", data: config.cron },
    { key: "channels", label: "Channels", data: config.channels },
    { key: "gateway", label: "Gateway", data: config.gateway },
    { key: "session", label: "Session", data: config.session },
  ].filter((s) => s.data && Object.keys(s.data).length > 0);

  return (
    <div className="space-y-3">
      <p className="font-mono text-[0.6rem] text-text-muted">
        Live config from gateway &middot; Read-only view &middot; Edit via GitHub and redeploy
      </p>

      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.key;
          return (
            <div key={section.key} className="bg-dark-card border border-dark-border rounded-card overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-surface/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-sans text-[13px] font-medium text-text-primary">{section.label}</span>
                  <span className="font-mono text-[0.55rem] text-text-muted">
                    {Object.keys(section.data).length} keys
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-text-muted transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-dark-border/50">
                  <pre className="font-mono text-[0.6rem] text-text-secondary leading-[1.7] whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto bg-dark-surface rounded-card p-3 mt-2">
                    {JSON.stringify(section.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
