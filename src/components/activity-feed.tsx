"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/queries/phases";

const TYPE_ACCENT: Record<string, string> = {
  session: "border-l-brand-blue",
  question_asked: "border-l-terra",
  question_answered: "border-l-brand-green",
  integration: "border-l-brand-purple",
  vault: "border-l-brand-green",
  phase_change: "border-l-terra",
  finding: "border-l-brand-amber",
  approval: "border-l-brand-red",
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function getDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() === today.getTime()) return "Today";
  if (itemDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function groupByDate(items: ActivityItem[]): Map<string, ActivityItem[]> {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const group = getDateGroup(item.timestamp);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }
  return groups;
}

const INITIAL_SHOW = 10;

interface Props {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: Props) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? items : items.slice(0, INITIAL_SHOW);
  const grouped = groupByDate(visible);
  const hasMore = items.length > INITIAL_SHOW && !showAll;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="font-serif text-base text-foreground">No recent activity</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Agent activity will appear here as sessions run.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-3">
        <p className="brand-label">Recent Activity</p>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {Array.from(grouped.entries()).map(([dateLabel, groupItems]) => (
          <div key={dateLabel}>
            {/* Date separator */}
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
              <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
                {dateLabel}
              </span>
            </div>

            {/* Items */}
            <div>
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "border-b border-border/50 border-l-2 px-4 py-3 last:border-b-0",
                    TYPE_ACCENT[item.type] || "border-l-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Time */}
                    <span className="mt-0.5 shrink-0 font-mono text-[0.6rem] text-muted-foreground/50">
                      {formatTime(item.timestamp)}
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{item.headline}</p>

                      {item.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.detail}
                        </p>
                      )}

                      {item.source && (
                        <details className="mt-1">
                          <summary className="cursor-pointer font-mono text-[0.5rem] uppercase tracking-[0.06em] text-muted-foreground/40 hover:text-muted-foreground/60">
                            Detail
                          </summary>
                          <div className="mt-1 rounded bg-secondary/30 px-2 py-1 font-mono text-[0.55rem] text-muted-foreground">
                            <p>Source: {item.source}</p>
                            <p>Time: {new Date(item.timestamp).toLocaleString("en-GB")}</p>
                            <p>Type: {item.type.replace(/_/g, " ")}</p>
                            <p>ID: {item.id}</p>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full text-center font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Show {items.length - INITIAL_SHOW} more
          </button>
        </div>
      )}
    </div>
  );
}

// Export for testing
export { groupByDate, getDateGroup, formatTime };
