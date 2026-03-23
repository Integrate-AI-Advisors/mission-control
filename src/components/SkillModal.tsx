"use client";

import { useState, useEffect } from "react";

interface SkillModalProps {
  agentId: string;
  skillSlug: string;
  skillName: string;
  onClose: () => void;
}

export default function SkillModal({ agentId, skillSlug, skillName, onClose }: SkillModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSkill() {
      try {
        const res = await fetch(`/api/skills?agent=${agentId}&skill=${skillSlug}`);
        if (!res.ok) {
          setError("Could not load skill file");
          return;
        }
        const data = await res.json();
        setContent(data.content || "No content found");
      } catch {
        setError("Failed to fetch skill");
      } finally {
        setLoading(false);
      }
    }
    fetchSkill();
  }, [agentId, skillSlug]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-dark-card border border-dark-border rounded-card w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <div>
            <h3 className="font-sans text-[16px] font-bold text-text-primary">{skillName}</h3>
            <p className="font-mono text-[11px] text-text-muted mt-0.5">{agentId} &middot; {skillSlug}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-surface transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-terra/30 border-t-terra rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <p className="font-mono text-[12px] text-red-400 text-center py-8">{error}</p>
          )}
          {content && (
            <pre className="font-mono text-[12px] text-text-secondary whitespace-pre-wrap leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
