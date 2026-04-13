import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient } from "@/lib/clients";
import { getTodayStats } from "@/lib/queries/sessions";
import { getIntegrations, getHealthSummary } from "@/lib/queries/integrations";
import type { Integration } from "@/lib/queries/integrations";
import { getPendingCount } from "@/lib/queries/approvals";
import { getRecentPatterns } from "@/lib/queries/patterns";
import { getCurrentMonthSpend } from "@/lib/queries/costs";
import { getRollingVerificationScore } from "@/lib/queries/verification";
import {
  getPhaseHistory,
  getCurrentPhaseDays,
  getActivityFeed,
  getDiscoveryStats,
  getDiscoveryDataStatus,
  getVaultStatus,
  evaluateDiscoveryGate,
  evaluateDashboardGate,
  computeDiscoveryProgress,
  getWeeklySessionsByRole,
  getWeeklyCost,
  getThirtyDayStats,
} from "@/lib/queries/phases";
import type { ClientPhase } from "@/lib/types";
import type {
  PhaseGateResult,
  DiscoveryStats,
  DataIngestionRow,
  VaultSectionRow,
  SessionsByRole,
} from "@/lib/queries/phases";
import type { VerificationRolling } from "@/lib/queries/verification";
import { PhaseProgress } from "@/components/phase-progress";
import { ActivityFeed } from "@/components/activity-feed";
import { StatCard } from "@/components/stat-card";
import { IntegrationGrid } from "@/components/integration-grid";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  cto: "CTO",
  cfo: "CFO",
  cmo: "CMO",
  coo: "COO",
  cro: "CRO",
};

const severityColor: Record<string, string> = {
  critical: "text-brand-red",
  high: "text-brand-amber",
  medium: "text-foreground",
  low: "text-muted-foreground",
};

// -- Discovery Hero --

function DiscoveryHero({
  clientName,
  stats,
  dataStatus,
  vaultSections,
  gate,
  slug,
  currentPhaseDays,
}: {
  clientName: string;
  stats: DiscoveryStats;
  dataStatus: DataIngestionRow[];
  vaultSections: VaultSectionRow[];
  gate: PhaseGateResult;
  slug: string;
  currentPhaseDays: number;
}) {
  const progress = computeDiscoveryProgress(dataStatus, [], vaultSections);
  const completeData = dataStatus.filter((d) => d.status === "complete").length;
  const completeVault = vaultSections.filter((v) => v.status === "complete").length;
  const passingCount = gate.checks.filter((c) => c.passed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-foreground">
          Getting to know {clientName}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          Day {currentPhaseDays} of ~7
        </span>
      </div>

      <Link href={`/clients/${slug}/discovery`} className="block">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Data Connections */}
          <div className="rounded-lg border border-border p-4 transition-transform hover:-translate-y-1">
            <p className="brand-label mb-2">Data Connections</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-brand-green transition-[width] duration-500"
                style={{ width: `${dataStatus.length === 0 ? 0 : Math.round((completeData / dataStatus.length) * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-sm text-foreground">
              {completeData}/{dataStatus.length}
              <span className="ml-1 text-xs text-muted-foreground">connected</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dataStatus.filter((d) => d.status === "complete").map((d) =>
                d.integration.charAt(0).toUpperCase() + d.integration.slice(1)
              ).join(", ") || "No data yet"}
            </p>
          </div>

          {/* Questions */}
          <div className="rounded-lg border border-border p-4 transition-transform hover:-translate-y-1">
            <p className="brand-label mb-2">Questions for Founder</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-brand-green transition-[width] duration-500"
                style={{ width: `${stats.total === 0 ? 0 : Math.round((stats.answered / stats.total) * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-sm text-foreground">
              {stats.answered}/{stats.total}
              <span className="ml-1 text-xs text-muted-foreground">answered</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.critical - stats.criticalAnswered > 0
                ? `${stats.critical - stats.criticalAnswered} critical answer${stats.critical - stats.criticalAnswered !== 1 ? "s" : ""} still needed`
                : "All critical questions answered"}
            </p>
          </div>

          {/* Knowledge Base */}
          <div className="rounded-lg border border-border p-4 transition-transform hover:-translate-y-1">
            <p className="brand-label mb-2">Knowledge Base</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-brand-green transition-[width] duration-500"
                style={{ width: `${vaultSections.length === 0 ? 0 : Math.round((completeVault / vaultSections.length) * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-sm text-foreground">
              {completeVault}/{vaultSections.length}
              <span className="ml-1 text-xs text-muted-foreground">sections built</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {vaultSections.filter((v) => v.status === "complete").map((v) =>
                v.section.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
              ).join(", ") || "Not started"}
            </p>
          </div>
        </div>
      </Link>

      {/* Compact gate line */}
      <div className={cn(
        "rounded-lg border px-4 py-2.5",
        gate.canAdvance ? "border-brand-green/30 bg-brand-green/5" : "border-border"
      )}>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-xs font-semibold">
            {gate.canAdvance ? "\u2713" : ""}
          </span>
          {" "}Ready to advance?{" "}
          <span className="font-mono text-xs">
            {passingCount}/{gate.checks.length} gate checks passing
          </span>
          {!gate.canAdvance && (
            <span className="text-xs"> — {gate.reason}</span>
          )}
        </p>
      </div>
    </div>
  );
}

// -- Dashboard Hero --

function DashboardHero({
  sessionsByRole,
  totalWeeklySessions,
  weeklyCost,
  healthyCount,
  totalIntegrations,
  gate,
  currentPhaseDays,
}: {
  sessionsByRole: SessionsByRole[];
  totalWeeklySessions: number;
  weeklyCost: number;
  healthyCount: number;
  totalIntegrations: number;
  gate: PhaseGateResult;
  currentPhaseDays: number;
}) {
  const maxCount = sessionsByRole.length > 0 ? sessionsByRole[0].count : 1;
  const passingCount = gate.checks.filter((c) => c.passed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-foreground">Building baseline</h2>
        <span className="font-mono text-xs text-muted-foreground">
          Day {currentPhaseDays} of ~14
        </span>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="brand-label mb-3">Agent Activity This Week</p>

        {sessionsByRole.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions this week</p>
        ) : (
          <div className="space-y-2">
            {sessionsByRole.map((s) => (
              <div key={s.role} className="flex items-center gap-3">
                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                  {ROLE_LABELS[s.role] || s.role.toUpperCase()}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-brand-blue transition-[width] duration-500"
                    style={{ width: `${Math.round((s.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {s.count} session{s.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          {totalWeeklySessions} sessions this week
          {" "}&middot;{" "}{formatCurrency(weeklyCost)} API cost
          {" "}&middot;{" "}{healthyCount}/{totalIntegrations} integrations healthy
        </p>
      </div>

      {/* Compact gate line */}
      <div className={cn(
        "rounded-lg border px-4 py-2.5",
        gate.canAdvance ? "border-brand-green/30 bg-brand-green/5" : "border-border"
      )}>
        <p className="text-sm text-muted-foreground">
          Ready to advance?{" "}
          <span className="font-mono text-xs">
            {passingCount}/{gate.checks.length} gate checks passing
          </span>
          {!gate.canAdvance && (
            <span className="text-xs"> — {gate.reason}</span>
          )}
        </p>
      </div>
    </div>
  );
}

// -- Intelligence Hero --

const PILLARS = [
  { key: "save_money", label: "Save Money", borderColor: "border-l-brand-green", types: ["cost_reduction", "cost_saving", "payment", "pricing"] },
  { key: "grow_revenue", label: "Grow Revenue", borderColor: "border-l-terra", types: ["revenue", "revenue_growth", "upsell", "conversion"] },
  { key: "get_efficient", label: "Get Efficient", borderColor: "border-l-brand-blue", types: ["efficiency", "automation", "process", "operations"] },
  { key: "keep_customers", label: "Keep Customers", borderColor: "border-l-brand-purple", types: ["retention", "churn", "satisfaction", "loyalty"] },
];

function IntelligenceHero({
  patterns,
  pendingApprovals,
  slug,
}: {
  patterns: { pattern_type: string; description: string; insight: string | null }[];
  pendingApprovals: number;
  slug: string;
}) {
  // Group patterns by pillar
  const pillarData = PILLARS.map((pillar) => {
    const matched = patterns.filter((p) =>
      pillar.types.some((t) => p.pattern_type.toLowerCase().includes(t))
    );
    return { ...pillar, patterns: matched };
  });

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-lg text-foreground">Finding opportunities</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {pillarData.map((pillar) => (
          <div
            key={pillar.key}
            className={cn("rounded-lg border border-border border-l-2 p-4", pillar.borderColor)}
          >
            <p className="brand-label">{pillar.label}</p>
            {pillar.patterns.length > 0 ? (
              <>
                <p className="mt-2 font-mono text-lg font-medium text-foreground">
                  {pillar.patterns.length} opportunit{pillar.patterns.length !== 1 ? "ies" : "y"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pillar.patterns[0].description.slice(0, 80)}
                  {pillar.patterns[0].description.length > 80 ? "..." : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                0 opportunities found yet
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Pending approvals banner */}
      {pendingApprovals > 0 ? (
        <Link
          href={`/clients/${slug}/queue`}
          className="block rounded-lg border border-brand-amber/30 bg-brand-amber/5 px-4 py-2.5 transition-colors hover:bg-brand-amber/10"
        >
          <p className="text-sm text-foreground">
            {pendingApprovals} pending approval{pendingApprovals !== 1 ? "s" : ""} — review in Queue tab
          </p>
        </Link>
      ) : (
        <div className="rounded-lg border border-border px-4 py-2.5">
          <p className="text-sm text-muted-foreground">No pending approvals</p>
        </div>
      )}
    </div>
  );
}

// -- Operations Hero --

function OperationsHero({
  verification,
  thirtyDayStats,
  pendingApprovals,
  currentPhaseDays,
}: {
  verification: VerificationRolling;
  thirtyDayStats: { sessions: number; cost: number; actionsExecuted: number };
  pendingApprovals: number;
  currentPhaseDays: number;
}) {
  function trendArrow(trend: number): { arrow: string; color: string } {
    if (trend > 0.01) return { arrow: "\u2191", color: "text-brand-green" };
    if (trend < -0.01) return { arrow: "\u2193", color: "text-brand-red" };
    return { arrow: "\u2192", color: "text-muted-foreground" };
  }

  const verTrend = trendArrow(verification.trend);

  const metrics = [
    { label: "Sessions", value: String(thirtyDayStats.sessions), trend: null },
    { label: "Verification", value: `${(verification.avgScore * 100).toFixed(1)}%`, trend: verTrend },
    { label: "Actions Executed", value: String(thirtyDayStats.actionsExecuted), trend: null },
    { label: "API Cost", value: formatCurrency(thirtyDayStats.cost), trend: null },
    { label: "Verified Claims", value: String(verification.totalVerified), trend: null },
    { label: "Pending Approvals", value: String(pendingApprovals), trend: null },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-foreground">Running autonomously</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {currentPhaseDays} days
        </span>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="brand-label mb-3">Last 30 Days</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {m.label}
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-xl font-medium text-foreground">
                  {m.value}
                </span>
                {m.trend && (
                  <span className={cn("font-mono text-sm", m.trend.color)}>
                    {m.trend.arrow}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Phase Context Panels (right column) --

function DiscoveryContext({ gate }: { gate: PhaseGateResult }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="brand-label mb-2">Phase Gate</p>
      <div className="space-y-1.5">
        {gate.checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={cn(
              "shrink-0 font-mono text-xs",
              check.passed ? "text-brand-green" : "text-brand-red"
            )}>
              {check.passed ? "\u2713" : "\u2715"}
            </span>
            <span className="text-xs text-muted-foreground">{check.name}</span>
            <span className="ml-auto shrink-0 font-mono text-[0.55rem] text-muted-foreground/60">
              {check.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardContext({
  integrations,
  health,
}: {
  integrations: Integration[];
  health: { healthy: number; degraded: number; down: number; total: number };
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4">
        <p className="brand-label mb-2">Integration Health</p>
        <IntegrationGrid integrations={integrations} />
      </div>
      <div className="rounded-lg border border-border p-4">
        <p className="brand-label mb-1">Next Milestone</p>
        <p className="text-sm text-muted-foreground">Mid-point review call</p>
      </div>
    </div>
  );
}

function IntelligenceContext({
  pendingApprovals,
  slug,
}: {
  pendingApprovals: number;
  slug: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="brand-label mb-2">Approval Queue</p>
      <p className="font-mono text-xl font-medium text-foreground">
        {pendingApprovals}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        pending approval{pendingApprovals !== 1 ? "s" : ""}
      </p>
      {pendingApprovals > 0 && (
        <Link
          href={`/clients/${slug}/queue`}
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          Review queue
        </Link>
      )}
    </div>
  );
}

function OperationsContext({ verification }: { verification: VerificationRolling }) {
  const scoreColor = verification.avgScore >= 0.98
    ? "text-brand-green"
    : verification.avgScore >= 0.9
      ? "text-primary"
      : "text-brand-red";

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="brand-label mb-2">Verification Health</p>
      <p className={cn("font-mono text-xl font-medium", scoreColor)}>
        {(verification.avgScore * 100).toFixed(1)}%
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {verification.totalSessions} sessions verified
        {verification.totalFailed > 0 && (
          <span className="text-brand-red"> &middot; {verification.totalFailed} failed</span>
        )}
      </p>
    </div>
  );
}

// -- Page --

export default async function ClientOverviewPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const phase = client.phase as ClientPhase;

  // Common data (all phases)
  const [
    phaseHistory,
    currentPhaseDays,
    activityFeed,
    todayStats,
    integrations,
    pendingApprovals,
    monthSpend,
  ] = await Promise.all([
    getPhaseHistory(client.id),
    getCurrentPhaseDays(client.id),
    getActivityFeed(client.id),
    getTodayStats(client.id),
    getIntegrations(client.id),
    getPendingCount(client.id),
    getCurrentMonthSpend(client.id),
  ]);

  const health = getHealthSummary(integrations);
  const overBudget = client.monthly_budget_usd
    ? monthSpend > client.monthly_budget_usd
    : false;

  // Phase-specific data
  let discoveryData: {
    stats: DiscoveryStats;
    dataStatus: DataIngestionRow[];
    vaultSections: VaultSectionRow[];
    gate: PhaseGateResult;
  } | null = null;

  let dashboardData: {
    sessionsByRole: SessionsByRole[];
    weeklyCost: number;
    gate: PhaseGateResult;
  } | null = null;

  let intelligenceData: {
    patterns: { pattern_type: string; description: string; insight: string | null }[];
  } | null = null;

  let operationsData: {
    verification: VerificationRolling;
    thirtyDayStats: { sessions: number; cost: number; actionsExecuted: number };
  } | null = null;

  if (phase === "discovery") {
    const [stats, dataStatus, vaultSections, gate] = await Promise.all([
      getDiscoveryStats(client.id),
      getDiscoveryDataStatus(client.id),
      getVaultStatus(client.id),
      evaluateDiscoveryGate(client.id),
    ]);
    discoveryData = { stats, dataStatus, vaultSections, gate };
  } else if (phase === "dashboard") {
    const [sessionsByRole, weeklyCost, gate] = await Promise.all([
      getWeeklySessionsByRole(client.id),
      getWeeklyCost(client.id),
      evaluateDashboardGate(client.id),
    ]);
    dashboardData = { sessionsByRole, weeklyCost, gate };
  } else if (phase === "intelligence") {
    const patterns = await getRecentPatterns(client.id, 20);
    intelligenceData = { patterns };
  } else if (phase === "operations") {
    const [verification, thirtyDayStats] = await Promise.all([
      getRollingVerificationScore(client.id),
      getThirtyDayStats(client.id),
    ]);
    operationsData = { verification, thirtyDayStats };
  }

  const totalWeeklySessions = dashboardData
    ? dashboardData.sessionsByRole.reduce((sum, s) => sum + s.count, 0)
    : 0;

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

      {/* Phase Progress Stepper */}
      <PhaseProgress
        currentPhase={phase}
        phaseHistory={phaseHistory}
        clientName={client.name}
      />

      {/* Phase-Specific Hero */}
      {phase === "discovery" && discoveryData && (
        <DiscoveryHero
          clientName={client.name}
          stats={discoveryData.stats}
          dataStatus={discoveryData.dataStatus}
          vaultSections={discoveryData.vaultSections}
          gate={discoveryData.gate}
          slug={client.slug}
          currentPhaseDays={currentPhaseDays}
        />
      )}
      {phase === "dashboard" && dashboardData && (
        <DashboardHero
          sessionsByRole={dashboardData.sessionsByRole}
          totalWeeklySessions={totalWeeklySessions}
          weeklyCost={dashboardData.weeklyCost}
          healthyCount={health.healthy}
          totalIntegrations={health.total}
          gate={dashboardData.gate}
          currentPhaseDays={currentPhaseDays}
        />
      )}
      {phase === "intelligence" && intelligenceData && (
        <IntelligenceHero
          patterns={intelligenceData.patterns}
          pendingApprovals={pendingApprovals}
          slug={client.slug}
        />
      )}
      {phase === "operations" && operationsData && (
        <OperationsHero
          verification={operationsData.verification}
          thirtyDayStats={operationsData.thirtyDayStats}
          pendingApprovals={pendingApprovals}
          currentPhaseDays={currentPhaseDays}
        />
      )}

      {/* Two-column: Activity Feed + Phase Context */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Activity Feed */}
        <ActivityFeed items={activityFeed} />

        {/* Phase Context + Stat Cards */}
        <div className="space-y-4">
          {/* Phase-specific context */}
          {phase === "discovery" && discoveryData && (
            <DiscoveryContext gate={discoveryData.gate} />
          )}
          {phase === "dashboard" && (
            <DashboardContext integrations={integrations} health={health} />
          )}
          {phase === "intelligence" && (
            <IntelligenceContext pendingApprovals={pendingApprovals} slug={client.slug} />
          )}
          {phase === "operations" && operationsData && (
            <OperationsContext verification={operationsData.verification} />
          )}

          {/* Stat cards (detail layer) */}
          <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>
    </div>
  );
}
