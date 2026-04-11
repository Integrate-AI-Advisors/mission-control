import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { getClients } from "@/lib/clients";
import { getDashboardData } from "@/lib/queries/dashboard";
import type { BusinessHealth, AlertItem, ClientSummaryRow } from "@/lib/queries/dashboard";
import { PhaseBadge } from "@/components/phase-badge";
import { formatCurrency } from "@/lib/utils";
import type { ClientPhase } from "@/lib/types";

export const dynamic = "force-dynamic";

// --- Health banner colors ---
const healthBannerClasses: Record<BusinessHealth, string> = {
  green: "border-brand-green/30 bg-brand-green/5",
  amber: "border-brand-amber/30 bg-brand-amber/5",
  red: "border-destructive/30 bg-destructive/5",
};

const healthDotClasses: Record<BusinessHealth, string> = {
  green: "bg-brand-green",
  amber: "bg-brand-amber",
  red: "bg-destructive",
};

const healthTextClasses: Record<BusinessHealth, string> = {
  green: "text-brand-green",
  amber: "text-brand-amber",
  red: "text-destructive",
};

const healthLabels: Record<BusinessHealth, string> = {
  green: "All Systems Green",
  amber: "Issues Detected",
  red: "Critical Alert",
};

// --- Margin color ---
function marginColorClass(pct: number | null): string {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 70) return "text-brand-green";
  if (pct >= 50) return "text-brand-amber";
  return "text-destructive";
}

export default async function DashboardPage() {
  const clients = await getClients();
  const dashboard = await getDashboardData(clients);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar clients={clients} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6">
          <h1 className="mb-6 font-serif text-2xl text-foreground">Dashboard</h1>

          {/* Section 1: Business Health Banner */}
          <div
            className={`mb-6 flex items-center gap-3 rounded-lg border p-4 ${healthBannerClasses[dashboard.overallHealth]}`}
          >
            <span
              className={`h-3 w-3 shrink-0 rounded-full animate-breathe ${healthDotClasses[dashboard.overallHealth]}`}
            />
            <span className={`font-mono text-sm font-medium ${healthTextClasses[dashboard.overallHealth]}`}>
              {healthLabels[dashboard.overallHealth]}
            </span>
            {dashboard.overallHealth !== "green" && (
              <span className="text-xs text-muted-foreground">
                — {dashboard.healthReason}
              </span>
            )}
          </div>

          {/* Section 2: Revenue & Margin */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="brand-label mb-1">Monthly Revenue</p>
              <p className="font-mono text-2xl font-medium tracking-tight text-foreground">
                {formatCurrency(dashboard.mrr)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dashboard.clientRows.length} paying client{dashboard.clientRows.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="brand-label mb-1">API Costs (this month)</p>
              <p className="font-mono text-2xl font-medium tracking-tight text-foreground">
                {formatCurrency(dashboard.apiCostsMtd)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Projected: {formatCurrency(dashboard.projectedMonthlyCost)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="brand-label mb-1">Gross Margin</p>
              <p className={`font-mono text-2xl font-medium tracking-tight ${marginColorClass(dashboard.grossMarginPct)}`}>
                {dashboard.grossMarginPct !== null
                  ? `${dashboard.grossMarginPct.toFixed(0)}%`
                  : "N/A"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Revenue minus projected costs
              </p>
            </div>
          </div>

          {/* Section 3: Pending Actions */}
          <div className="mb-6">
            {dashboard.pendingApprovals > 0 ? (
              <Link
                href="/clients"
                className="flex items-center gap-3 rounded-lg border border-brand-amber/30 bg-brand-amber/5 p-4 transition-colors hover:bg-brand-amber/10"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-amber animate-breathe" />
                <span className="text-sm text-brand-amber font-medium">
                  {dashboard.pendingApprovals} pending approval{dashboard.pendingApprovals !== 1 ? "s" : ""}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">View clients &rarr;</span>
              </Link>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-brand-green/30 bg-brand-green/5 p-4">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green" />
                <span className="text-sm text-brand-green font-medium">No pending actions</span>
              </div>
            )}
          </div>

          {/* Section 4: Alerts (Last 24h) */}
          <div className="mb-6">
            <h2 className="brand-label mb-3">Alerts (Last 24h)</h2>
            {dashboard.alerts.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">No issues in the last 24 hours</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dashboard.alerts.slice(0, 5).map((alert, i) => (
                  <AlertRow key={i} alert={alert} />
                ))}
                {dashboard.alerts.length > 5 && (
                  <Link
                    href="/clients"
                    className="block text-xs text-primary hover:underline"
                  >
                    View all {dashboard.alerts.length} alerts &rarr;
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Client Summary Table */}
          <div className="mb-6">
            <h2 className="brand-label mb-3">Client Summary</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="px-4 py-2.5 text-left font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Client</th>
                    <th className="px-4 py-2.5 text-left font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Phase</th>
                    <th className="px-4 py-2.5 text-center font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-right font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Sessions (24h)</th>
                    <th className="px-4 py-2.5 text-right font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Cost (MTD)</th>
                    <th className="px-4 py-2.5 text-right font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Budget</th>
                    <th className="px-4 py-2.5 text-right font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.clientRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                        No paying clients yet
                      </td>
                    </tr>
                  ) : (
                    dashboard.clientRows.map((row) => (
                      <ClientRow key={row.client.id} row={row} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 6: Today's Activity */}
          <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <span>
              <span className="font-mono font-medium text-foreground">{dashboard.sessionsToday}</span>{" "}
              session{dashboard.sessionsToday !== 1 ? "s" : ""} run today
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span>
              Total cost today:{" "}
              <span className="font-mono font-medium text-foreground">{formatCurrency(dashboard.costToday)}</span>
            </span>
            {dashboard.avgVerificationScore !== null && (
              <>
                <span className="text-muted-foreground/30">|</span>
                <span>
                  Avg verification score:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {dashboard.avgVerificationScore.toFixed(0)}%
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sub-components ---

function AlertRow({ alert }: { alert: AlertItem }) {
  const icon = alert.type === "session_failure" ? "\u26a0" : "\u25cf";
  const iconColor = alert.type === "session_failure" ? "text-brand-amber" : "text-destructive";
  const timeStr = formatRelativeShort(alert.time);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
      <span className={`text-xs ${iconColor}`}>{icon}</span>
      <span className="text-sm text-foreground">
        <span className="font-medium">{alert.clientName}</span>{" "}
        — {alert.description}
      </span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeStr}</span>
    </div>
  );
}

function ClientRow({ row }: { row: ClientSummaryRow }) {
  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
      <td className="px-4 py-2.5">
        <Link
          href={`/clients/${row.client.slug}`}
          className="font-medium text-foreground hover:text-primary"
        >
          {row.client.name}
        </Link>
      </td>
      <td className="px-4 py-2.5">
        <PhaseBadge phase={row.client.phase as ClientPhase} />
      </td>
      <td className="px-4 py-2.5 text-center">
        <span
          className={`inline-block h-2 w-2 rounded-full ${healthDotClasses[row.status]}`}
          role="img"
          aria-label={`Status: ${row.status}`}
        />
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
        {row.sessions24h}
        {row.failed24h > 0 && (
          <span className="ml-1 text-destructive">({row.failed24h} failed)</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
        {formatCurrency(row.costMtd)}
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
        {formatCurrency(row.budget)}
      </td>
      <td className={`px-4 py-2.5 text-right font-mono font-medium ${marginColorClass(row.margin)}`}>
        {row.margin !== null ? `${row.margin.toFixed(0)}%` : "N/A"}
      </td>
    </tr>
  );
}

function formatRelativeShort(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
