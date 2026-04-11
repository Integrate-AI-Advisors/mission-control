import { getSupabaseAdmin } from "../supabase";

const MS_PER_DAY = 86_400_000;

export interface VerificationRolling {
  avgScore: number;
  totalSessions: number;
  totalVerified: number;
  totalFailed: number;
  totalUnverifiable: number;
  trend: number;
}

export interface VerificationByRole {
  role: string;
  avgScore: number;
  sessionCount: number;
  claimsVerified: number;
  claimsFailed: number;
}

export interface VerificationHistoryPoint {
  date: string;
  avgScore: number;
  sessionCount: number;
  claimsFailed: number;
}

export interface VerifiedSession {
  id: string;
  role: string;
  started_at: string;
  verification_score: number;
  claims_verified: number;
  claims_failed: number;
  claims_unverifiable: number;
  result_summary: string | null;
}

export interface Phase4GateCheck {
  name: string;
  passed: boolean;
  value: string;
}

export interface Phase4GateStatus {
  canAdvance: boolean;
  reason: string;
  checks: Phase4GateCheck[];
}

export async function getRollingVerificationScore(
  clientId: string,
  days: number = 30
): Promise<VerificationRolling> {
  const since = new Date(Date.now() - days * MS_PER_DAY).toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from("agent_sessions")
    .select(
      "verification_score, claims_verified, claims_failed, claims_unverifiable, started_at"
    )
    .eq("client_id", clientId)
    .gte("started_at", since)
    .not("verification_score", "is", null)
    .order("started_at", { ascending: false });
  if (error) throw error;

  const sessions = data || [];
  if (sessions.length === 0) {
    return {
      avgScore: 0,
      totalSessions: 0,
      totalVerified: 0,
      totalFailed: 0,
      totalUnverifiable: 0,
      trend: 0,
    };
  }

  const avgScore =
    sessions.reduce((sum, s) => sum + s.verification_score, 0) /
    sessions.length;
  const totalVerified = sessions.reduce(
    (sum, s) => sum + s.claims_verified,
    0
  );
  const totalFailed = sessions.reduce((sum, s) => sum + s.claims_failed, 0);
  const totalUnverifiable = sessions.reduce(
    (sum, s) => sum + s.claims_unverifiable,
    0
  );

  // Trend: compare current 7d avg vs previous 7d avg
  const trend = computeTrend(sessions);

  return {
    avgScore,
    totalSessions: sessions.length,
    totalVerified,
    totalFailed,
    totalUnverifiable,
    trend,
  };
}

export function computeTrend(
  sessions: Array<{
    verification_score: number;
    started_at: string;
  }>
): number {
  const now = Date.now();
  const sevenDaysMs = 7 * MS_PER_DAY;

  const current = sessions.filter(
    (s) => now - new Date(s.started_at).getTime() <= sevenDaysMs
  );
  const previous = sessions.filter((s) => {
    const age = now - new Date(s.started_at).getTime();
    return age > sevenDaysMs && age <= 2 * sevenDaysMs;
  });

  if (current.length === 0 || previous.length === 0) return 0;

  const currentAvg =
    current.reduce((sum, s) => sum + s.verification_score, 0) / current.length;
  const previousAvg =
    previous.reduce((sum, s) => sum + s.verification_score, 0) /
    previous.length;

  return currentAvg - previousAvg;
}

export async function getVerificationByRole(
  clientId: string,
  days: number = 30
): Promise<VerificationByRole[]> {
  const since = new Date(Date.now() - days * MS_PER_DAY).toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from("agent_sessions")
    .select(
      "role, verification_score, claims_verified, claims_failed"
    )
    .eq("client_id", clientId)
    .gte("started_at", since)
    .not("verification_score", "is", null);
  if (error) throw error;

  const sessions = data || [];
  const byRole: Record<
    string,
    { scores: number[]; claimsVerified: number; claimsFailed: number }
  > = {};

  for (const s of sessions) {
    if (!byRole[s.role]) {
      byRole[s.role] = { scores: [], claimsVerified: 0, claimsFailed: 0 };
    }
    byRole[s.role].scores.push(s.verification_score);
    byRole[s.role].claimsVerified += s.claims_verified;
    byRole[s.role].claimsFailed += s.claims_failed;
  }

  return Object.entries(byRole)
    .map(([role, data]) => ({
      role,
      avgScore:
        data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
      sessionCount: data.scores.length,
      claimsVerified: data.claimsVerified,
      claimsFailed: data.claimsFailed,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);
}

export async function getVerificationHistory(
  clientId: string,
  days: number = 30
): Promise<VerificationHistoryPoint[]> {
  const since = new Date(Date.now() - days * MS_PER_DAY).toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from("agent_sessions")
    .select("started_at, verification_score, claims_failed")
    .eq("client_id", clientId)
    .gte("started_at", since)
    .not("verification_score", "is", null)
    .order("started_at", { ascending: true });
  if (error) throw error;

  const sessions = data || [];
  const byDate: Record<
    string,
    { scores: number[]; claimsFailed: number }
  > = {};

  for (const s of sessions) {
    const date = s.started_at.split("T")[0];
    if (!byDate[date]) {
      byDate[date] = { scores: [], claimsFailed: 0 };
    }
    byDate[date].scores.push(s.verification_score);
    byDate[date].claimsFailed += s.claims_failed;
  }

  return Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      avgScore:
        data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
      sessionCount: data.scores.length,
      claimsFailed: data.claimsFailed,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRecentVerifiedSessions(
  clientId: string,
  limit: number = 20
): Promise<VerifiedSession[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("agent_sessions")
    .select(
      "id, role, started_at, verification_score, claims_verified, claims_failed, claims_unverifiable, result_summary"
    )
    .eq("client_id", clientId)
    .not("verification_score", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export function computePhase4Gate(sessions: {
  totalSessions: number;
  avgScore: number;
  totalFailed: number;
  totalVerified: number;
}): Phase4GateStatus {
  const checks: Phase4GateCheck[] = [
    {
      name: "30+ verified sessions in last 30 days",
      passed: sessions.totalSessions >= 30,
      value: `${sessions.totalSessions} sessions`,
    },
    {
      name: "Average score >= 98%",
      passed: sessions.avgScore >= 0.98,
      value: `${(sessions.avgScore * 100).toFixed(1)}%`,
    },
    {
      name: "Zero failed claims",
      passed: sessions.totalFailed === 0,
      value: `${sessions.totalFailed} failed`,
    },
    {
      name: "50+ verified claims",
      passed: sessions.totalVerified >= 50,
      value: `${sessions.totalVerified} verified`,
    },
  ];

  const canAdvance = checks.every((c) => c.passed);
  const failing = checks.filter((c) => !c.passed);

  let reason: string;
  if (canAdvance) {
    reason = "All criteria met. Ready to advance to Operations.";
  } else {
    reason = failing.map((c) => c.name).join("; ");
  }

  return { canAdvance, reason, checks };
}

export async function getPhase4GateStatus(
  clientId: string
): Promise<Phase4GateStatus> {
  const rolling = await getRollingVerificationScore(clientId, 30);
  return computePhase4Gate({
    totalSessions: rolling.totalSessions,
    avgScore: rolling.avgScore,
    totalFailed: rolling.totalFailed,
    totalVerified: rolling.totalVerified,
  });
}
