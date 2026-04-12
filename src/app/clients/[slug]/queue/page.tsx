import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getApprovals } from "@/lib/queries/approvals";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusStyle: Record<ApprovalStatus, string> = {
  pending: "bg-brand-amber/10 text-brand-amber border-brand-amber/20",
  approved: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  executing: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  done: "bg-brand-green/10 text-brand-green border-brand-green/20",
  declined: "bg-brand-red/10 text-brand-red border-brand-red/20",
};

export default async function QueuePage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const approvals = await getApprovals(client.id);
  const pending = approvals.filter((a) => a.status === "pending");
  const others = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="brand-label">Approval Queue</p>
        <p className="text-xs text-muted-foreground">{pending.length} pending</p>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="font-serif text-lg text-foreground">No pending approvals</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All clear. Approvals will appear here when agents propose actions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending first */}
          {pending.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-brand-amber/20 bg-brand-amber/8 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.agent} &middot; {item.action_type} &middot; {formatRelativeTime(item.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em]",
                    statusStyle[item.status]
                  )}
                >
                  {item.status}
                </span>
              </div>
              {item.impact_summary && (
                <p className="mt-2 text-xs text-muted-foreground">{item.impact_summary}</p>
              )}
            </div>
          ))}

          {/* Other statuses */}
          {others.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.agent} &middot; {item.action_type} &middot; {formatRelativeTime(item.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em]",
                    statusStyle[item.status]
                  )}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
