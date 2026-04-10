import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseBadge } from "@/components/phase-badge";
import { formatCurrency } from "@/lib/utils";
import type { Client } from "@/lib/clients";
import type { ClientPhase } from "@/lib/types";
import { PHASE_COLORS } from "@/lib/types";

interface ClientCardProps {
  client: Client;
  currentMonthSpend?: number;
  healthySummary?: { healthy: number; total: number; overallStatus: string };
  pendingApprovals?: number;
}

export function ClientCard({ client, currentMonthSpend = 0, healthySummary, pendingApprovals = 0 }: ClientCardProps) {
  const budgetPct =
    client.monthly_budget_usd && client.monthly_budget_usd > 0
      ? Math.min((currentMonthSpend / client.monthly_budget_usd) * 100, 100)
      : null;
  const overBudget = client.monthly_budget_usd ? currentMonthSpend > client.monthly_budget_usd : false;

  return (
    <Link href={`/clients/${client.slug}`}>
      <Card className="group relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg">
        {/* Phase accent bar */}
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ backgroundColor: PHASE_COLORS[client.phase as ClientPhase] }}
        />
        <CardHeader className="pb-2 pt-5">
          <div className="flex items-start justify-between">
            <CardTitle className="font-serif text-lg font-normal">{client.name}</CardTitle>
            <PhaseBadge phase={client.phase as ClientPhase} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Budget bar */}
          {budgetPct !== null && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="brand-caption">Budget</span>
                <span className={`font-mono text-xs ${overBudget ? "text-brand-red" : "text-muted-foreground"}`}>
                  {formatCurrency(currentMonthSpend)} / {formatCurrency(client.monthly_budget_usd!)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-border">
                <div
                  className={`h-1 rounded-full transition-all ${overBudget ? "bg-brand-red" : "bg-primary"}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Bottom indicators */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {healthySummary && (
              <span className="flex items-center gap-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    healthySummary.overallStatus === "healthy"
                      ? "bg-brand-green"
                      : healthySummary.overallStatus === "degraded"
                      ? "bg-brand-amber"
                      : "bg-brand-red"
                  }`}
                />
                {healthySummary.healthy}/{healthySummary.total}
              </span>
            )}
            {pendingApprovals > 0 && (
              <span className="flex items-center gap-1 text-brand-amber">
                {pendingApprovals} pending
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
