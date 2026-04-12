import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import {
  getRollingVerificationScore,
  getVerificationByRole,
  getVerificationHistory,
  getRecentVerifiedSessions,
  computePhase4Gate,
} from "@/lib/queries/verification";
import { formatNumber, formatRelativeTime, cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerificationChart } from "./verification-chart";

export const dynamic = "force-dynamic";

function scoreColor(score: number): string {
  if (score >= 0.98) return "text-brand-green";
  if (score >= 0.9) return "text-primary";
  return "text-brand-red";
}

function scoreBg(score: number): string {
  if (score >= 0.98) return "bg-brand-green";
  if (score >= 0.9) return "bg-primary";
  return "bg-brand-red";
}

export default async function VerificationPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const [rolling, byRole, history, recentSessions] = await Promise.all([
    getRollingVerificationScore(client.id),
    getVerificationByRole(client.id),
    getVerificationHistory(client.id),
    getRecentVerifiedSessions(client.id),
  ]);

  const gateStatus = computePhase4Gate({
    totalSessions: rolling.totalSessions,
    avgScore: rolling.avgScore,
    totalFailed: rolling.totalFailed,
    totalVerified: rolling.totalVerified,
  });

  const totalClaims =
    rolling.totalVerified + rolling.totalFailed + rolling.totalUnverifiable;

  if (rolling.totalSessions === 0) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="font-serif text-lg text-foreground">
            No verification data yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verification scores will appear here once the data verification
            layer processes agent sessions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      {/* Score card */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="brand-label mb-1">30-Day Verification Score</p>
            <p
              className={cn(
                "font-mono text-2xl font-medium",
                scoreColor(rolling.avgScore)
              )}
            >
              {(rolling.avgScore * 100).toFixed(1)}%
            </p>
            {rolling.trend !== 0 && (
              <p
                className={cn(
                  "mt-1 font-mono text-xs",
                  rolling.trend > 0
                    ? "text-brand-green"
                    : "text-brand-red"
                )}
              >
                {rolling.trend > 0 ? "+" : ""}
                {(rolling.trend * 100).toFixed(1)}% vs last week
              </p>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>
              <span className="font-mono">{rolling.totalSessions}</span>{" "}
              sessions verified
            </p>
            <p>
              <span className="font-mono">{formatNumber(totalClaims)}</span>{" "}
              claims checked
            </p>
            {rolling.totalFailed > 0 && (
              <p className="text-brand-red">
                <span className="font-mono">{rolling.totalFailed}</span> failed
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Per-role breakdown */}
      {byRole.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="brand-label">Verification by Role</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">
                  Role
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">
                  Score
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">
                  Sessions
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">
                  Claims Verified
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">
                  Claims Failed
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byRole.map((row) => (
                <TableRow key={row.role}>
                  <TableCell className="text-sm">{row.role}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-border">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            scoreBg(row.avgScore)
                          )}
                          style={{
                            width: `${Math.min(row.avgScore * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-mono text-sm",
                          scoreColor(row.avgScore)
                        )}
                      >
                        {(row.avgScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {row.sessionCount}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatNumber(row.claimsVerified)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-sm",
                      row.claimsFailed > 0
                        ? "text-brand-red"
                        : "text-muted-foreground"
                    )}
                  >
                    {row.claimsFailed}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Trend chart */}
      {history.length > 1 && (
        <div className="rounded-lg border border-border p-4">
          <p className="brand-label mb-3">Score Trend</p>
          <VerificationChart data={history} />
        </div>
      )}

      {/* Recent verified sessions */}
      {recentSessions.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="brand-label">Recent Verified Sessions</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">
                  Time
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">
                  Role
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">
                  Score
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">
                  Verified
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">
                  Failed
                </TableHead>
                <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">
                  Unverifiable
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(session.started_at)}
                  </TableCell>
                  <TableCell className="text-sm">{session.role}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-sm",
                      scoreColor(session.verification_score)
                    )}
                  >
                    {(session.verification_score * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {session.claims_verified}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-sm",
                      session.claims_failed > 0
                        ? "text-brand-red"
                        : "text-muted-foreground"
                    )}
                  >
                    {session.claims_failed}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {session.claims_unverifiable}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Phase 4 gate */}
      <div className="rounded-lg border border-border p-4">
        <p className="brand-label mb-3">Operations Phase Gate</p>
        <div className="space-y-2">
          {gateStatus.checks.map((check) => (
            <div key={check.name} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  check.passed
                    ? "bg-brand-green/10 text-brand-green"
                    : "bg-brand-red/10 text-brand-red"
                )}
              >
                {check.passed ? "\u2713" : "\u2717"}
              </span>
              <span className="text-sm text-foreground">{check.name}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {check.value}
              </span>
            </div>
          ))}
        </div>
        <div
          className={cn(
            "mt-4 rounded-md px-3 py-2 text-center text-sm",
            gateStatus.canAdvance
              ? "bg-brand-green/10 text-brand-green"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {gateStatus.canAdvance
            ? "Ready to advance to Operations"
            : `Needs: ${gateStatus.reason}`}
        </div>
      </div>
    </div>
  );
}
