"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/types";
import type { DiscoveryQuestion } from "@/lib/queries/phases";
import type { QuestionCategory } from "@/lib/types";

const statusIcon: Record<string, { icon: string; color: string }> = {
  answered: { icon: "\u2713", color: "text-brand-green" },
  asked: { icon: "\u25F7", color: "text-brand-blue" },
  pending: { icon: "\u25CB", color: "text-muted-foreground" },
  skipped: { icon: "\u2298", color: "text-muted-foreground line-through" },
};

interface Props {
  questions: DiscoveryQuestion[];
}

export function DiscoveryQuestions({ questions }: Props) {
  // Group by category
  const grouped = questions.reduce<Record<string, DiscoveryQuestion[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});

  // Determine default open state: expanded if category has unanswered critical questions
  const categoryOrder: QuestionCategory[] = ["revenue", "retention", "finance", "marketing", "operations", "growth", "general"];
  const categories = categoryOrder.filter((c) => grouped[c]);

  const defaultOpen = new Set<string>();
  for (const cat of categories) {
    const catQuestions = grouped[cat];
    const hasUnansweredCritical = catQuestions.some(
      (q) => q.priority === "critical" && q.status !== "answered" && q.status !== "skipped"
    );
    const allResolved = catQuestions.every(
      (q) => q.status === "answered" || q.status === "skipped"
    );
    if (hasUnansweredCritical || !allResolved) {
      defaultOpen.add(cat);
    }
  }

  const [openCategories, setOpenCategories] = useState<Set<string>>(defaultOpen);

  function toggle(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const catQuestions = grouped[cat];
        const answeredCount = catQuestions.filter(
          (q) => q.status === "answered" || q.status === "skipped"
        ).length;
        const isOpen = openCategories.has(cat);

        return (
          <div key={cat} className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => toggle(cat)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-serif text-base text-foreground">
                {CATEGORY_LABELS[cat] || cat}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {answeredCount}/{catQuestions.length} answered
                <span className="ml-2 text-muted-foreground/60">{isOpen ? "\u25B2" : "\u25BC"}</span>
              </span>
            </button>

            {isOpen && (
              <div className="space-y-1 border-t border-border px-4 pb-4 pt-2">
                {catQuestions.map((q) => {
                  const si = statusIcon[q.status] || statusIcon.pending;
                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "rounded-md px-3 py-3",
                        q.priority === "critical" && q.status !== "answered" && "border-l-2 border-l-brand-red"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn("mt-0.5 shrink-0 font-mono text-sm", si.color)}>
                          {si.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-foreground">
                              &ldquo;{q.question}&rdquo;
                            </p>
                            {(q.asked_at || q.answered_at) && (
                              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                {formatRelativeTime(q.answered_at || q.asked_at || q.created_at)}
                              </span>
                            )}
                          </div>

                          {q.priority === "critical" && q.status !== "answered" && (
                            <span className="mt-1 inline-flex rounded-full border border-brand-red/20 bg-brand-red/10 px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em] text-brand-red">
                              Critical
                            </span>
                          )}

                          {q.status === "answered" && q.answer && (
                            <p className="mt-1.5 text-sm text-muted-foreground">
                              Founder replied: &ldquo;{q.answer}&rdquo;
                            </p>
                          )}
                          {q.status === "asked" && (
                            <p className="mt-1 text-xs text-brand-blue">
                              Sent{q.asked_in_channel ? ` in ${q.asked_in_channel}` : ""} — waiting for reply
                            </p>
                          )}
                          {q.status === "pending" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Not yet asked — queued for next CEO session
                            </p>
                          )}
                          {q.status === "skipped" && (
                            <p className="mt-1 text-xs text-muted-foreground line-through">
                              Skipped — not needed at this stage
                            </p>
                          )}

                          {/* Click-in technical detail */}
                          {(q.context || q.source_integration) && (
                            <details className="mt-2">
                              <summary className="cursor-pointer font-mono text-[0.6rem] uppercase tracking-[0.06em] text-muted-foreground/60 hover:text-muted-foreground">
                                Detail
                              </summary>
                              <div className="mt-1 rounded bg-secondary/30 px-2 py-1.5 text-xs text-muted-foreground">
                                {q.context && <p>{q.context}</p>}
                                {q.source_integration && (
                                  <p className="mt-1 font-mono text-[0.55rem]">
                                    Source: {q.source_integration}
                                    {q.asked_in_channel && ` | Channel: ${q.asked_in_channel}`}
                                  </p>
                                )}
                              </div>
                            </details>
                          )}
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
  );
}
