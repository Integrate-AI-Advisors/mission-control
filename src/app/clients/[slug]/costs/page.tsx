import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getCostBreakdown } from "@/lib/queries/costs";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function CostsPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const now = new Date();
  const breakdown = await getCostBreakdown(client.id, now.getFullYear(), now.getMonth() + 1);

  const budgetPct =
    client.monthly_budget_usd && client.monthly_budget_usd > 0
      ? (breakdown.totalCost / client.monthly_budget_usd) * 100
      : null;
  const overBudget = client.monthly_budget_usd
    ? breakdown.totalCost > client.monthly_budget_usd
    : false;

  const roles = Object.entries(breakdown.byRole).sort((a, b) => b[1].cost - a[1].cost);

  // Daily costs for chart-like display
  const dailyCosts = breakdown.entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.date] = (acc[entry.date] || 0) + entry.total_cost_usd;
    return acc;
  }, {});

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      {/* Budget utilization */}
      {client.monthly_budget_usd && (
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="brand-label">Monthly Budget</p>
            <p className={`font-mono text-sm ${overBudget ? "text-brand-red" : "text-foreground"}`}>
              {formatCurrency(breakdown.totalCost)} / {formatCurrency(client.monthly_budget_usd)}
            </p>
          </div>
          <div className="h-2 rounded-full bg-border">
            <div
              className={`h-2 rounded-full transition-all ${overBudget ? "bg-brand-red" : "bg-primary"}`}
              style={{ width: `${Math.min(budgetPct || 0, 100)}%` }}
            />
          </div>
          {budgetPct !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {budgetPct.toFixed(1)}% utilised
            </p>
          )}
        </div>
      )}

      {/* Daily cost trend (ASCII-bar style, no JS chart dep needed for MVP) */}
      {Object.keys(dailyCosts).length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <p className="brand-label mb-3">Daily Cost Trend</p>
          <div className="space-y-1">
            {Object.entries(dailyCosts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, cost]) => {
                const maxCost = Math.max(...Object.values(dailyCosts));
                const barWidth = maxCost > 0 ? (cost / maxCost) * 100 : 0;
                return (
                  <div key={date} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                      {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-4 rounded-sm bg-primary/20"
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      >
                        <div
                          className="h-4 rounded-sm bg-primary"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-xs">
                      {formatCurrency(cost)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Cost breakdown by role */}
      {roles.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="font-serif text-lg text-foreground">No cost data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sessions will generate cost records as agents run.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="brand-label">Cost Breakdown by Role</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">Role</TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Sessions</TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Total Cost</TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Avg/Session</TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Input Tokens</TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Output Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map(([role, data]) => (
                <TableRow key={role}>
                  <TableCell className="text-sm">{role}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{data.sessions}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(data.cost)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatCurrency(data.sessions > 0 ? data.cost / data.sessions : 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatNumber(data.inputTokens)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatNumber(data.outputTokens)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
