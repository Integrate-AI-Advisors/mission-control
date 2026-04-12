import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getTodayStats, getRecentSessions } from "@/lib/queries/sessions";
import { getIntegrations, getHealthSummary } from "@/lib/queries/integrations";
import { getPendingCount } from "@/lib/queries/approvals";
import { getRecentPatterns } from "@/lib/queries/patterns";
import { getCurrentMonthSpend } from "@/lib/queries/costs";
import { StatCard } from "@/components/stat-card";
import { IntegrationGrid } from "@/components/integration-grid";
import { formatCurrency, formatRelativeTime, formatDuration } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, string> = {
  completed: "bg-brand-green/10 text-brand-green border-brand-green/20",
  running: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  failed: "bg-brand-red/10 text-brand-red border-brand-red/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const severityColor: Record<string, string> = {
  critical: "text-brand-red",
  high: "text-brand-amber",
  medium: "text-foreground",
  low: "text-muted-foreground",
};

export default async function ClientOverviewPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const [todayStats, recentSessions, integrations, pendingApprovals, patterns, monthSpend] =
    await Promise.all([
      getTodayStats(client.id),
      getRecentSessions(client.id),
      getIntegrations(client.id),
      getPendingCount(client.id),
      getRecentPatterns(client.id),
      getCurrentMonthSpend(client.id),
    ]);

  const health = getHealthSummary(integrations);
  const overBudget = client.monthly_budget_usd
    ? monthSpend > client.monthly_budget_usd
    : false;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      {/* Over-budget alert */}
      {overBudget && client.monthly_budget_usd && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            {client.name} is {Math.round(((monthSpend - client.monthly_budget_usd) / client.monthly_budget_usd) * 100)}% over budget this month ({formatCurrency(monthSpend)} / {formatCurrency(client.monthly_budget_usd)})
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Sessions"
          value={String(todayStats.count)}
          subtext={todayStats.failed > 0 ? `${todayStats.failed} failed` : undefined}
          alert={todayStats.failed > 0}
        />
        <StatCard
          label="Today's Cost"
          value={formatCurrency(todayStats.cost)}
        />
        <StatCard
          label="Integrations"
          value={`${health.healthy}/${health.total}`}
          subtext={health.down > 0 ? `${health.down} down` : undefined}
          alert={health.down > 0}
        />
        <StatCard
          label="Pending Approvals"
          value={String(pendingApprovals)}
          alert={pendingApprovals > 0}
        />
      </div>

      {/* Two-column: sessions + integrations */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Recent sessions */}
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="brand-label">Recent Sessions</p>
          </div>
          {recentSessions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="font-serif text-base text-foreground">No sessions today</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Agents haven&apos;t run in the last 24 hours.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">Role</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">Status</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Cost</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Duration</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className={cn(
                      session.status === "failed" && "bg-brand-red/8"
                    )}
                  >
                    <TableCell className="text-sm">{session.role}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em]",
                          statusVariant[session.status] || statusVariant.cancelled
                        )}
                      >
                        {session.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(session.total_cost_usd)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatDuration(session.duration_seconds)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatRelativeTime(session.started_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Integration health */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <p className="brand-label mb-3">Integration Health</p>
            <IntegrationGrid integrations={integrations} />
          </div>

          {/* Patterns */}
          {patterns.length > 0 && (
            <div className="rounded-lg border border-border p-4">
              <p className="brand-label mb-3">Recent Insights</p>
              <div className="space-y-2">
                {patterns.map((pattern) => (
                  <div key={pattern.id} className="rounded-md bg-secondary/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono text-[0.55rem] font-semibold uppercase", severityColor[pattern.severity])}>
                        {pattern.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(pattern.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{pattern.description}</p>
                    {pattern.insight && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{pattern.insight}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
