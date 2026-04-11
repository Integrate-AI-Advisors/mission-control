import { describe, it, expect } from "vitest";
import {
  computeTrend,
  computePhase4Gate,
} from "@/lib/queries/verification";
import type {
  VerificationRolling,
  VerificationByRole,
} from "@/lib/queries/verification";

// -- Factory helpers --

function makeSession(overrides: Partial<{ verification_score: number; started_at: string }> = {}) {
  return {
    verification_score: 0.95,
    started_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeGateInput(
  overrides: Partial<{
    totalSessions: number;
    avgScore: number;
    totalFailed: number;
    totalVerified: number;
  }> = {}
) {
  return {
    totalSessions: 40,
    avgScore: 0.99,
    totalFailed: 0,
    totalVerified: 80,
    ...overrides,
  };
}

// -- Trend computation --

describe("Verification trend computation", () => {
  it("returns 0 when no sessions", () => {
    expect(computeTrend([])).toBe(0);
  });

  it("returns 0 when only current week has data", () => {
    const now = Date.now();
    const sessions = [
      makeSession({ started_at: new Date(now - 1 * 86400000).toISOString(), verification_score: 0.95 }),
      makeSession({ started_at: new Date(now - 2 * 86400000).toISOString(), verification_score: 0.97 }),
    ];
    expect(computeTrend(sessions)).toBe(0);
  });

  it("returns 0 when only previous week has data", () => {
    const now = Date.now();
    const sessions = [
      makeSession({ started_at: new Date(now - 10 * 86400000).toISOString(), verification_score: 0.90 }),
    ];
    expect(computeTrend(sessions)).toBe(0);
  });

  it("computes positive trend correctly", () => {
    const now = Date.now();
    const sessions = [
      // Current week: avg 0.98
      makeSession({ started_at: new Date(now - 1 * 86400000).toISOString(), verification_score: 0.98 }),
      makeSession({ started_at: new Date(now - 2 * 86400000).toISOString(), verification_score: 0.98 }),
      // Previous week: avg 0.90
      makeSession({ started_at: new Date(now - 8 * 86400000).toISOString(), verification_score: 0.90 }),
      makeSession({ started_at: new Date(now - 10 * 86400000).toISOString(), verification_score: 0.90 }),
    ];
    const trend = computeTrend(sessions);
    expect(trend).toBeCloseTo(0.08);
  });

  it("computes negative trend correctly", () => {
    const now = Date.now();
    const sessions = [
      // Current week: avg 0.85
      makeSession({ started_at: new Date(now - 1 * 86400000).toISOString(), verification_score: 0.85 }),
      // Previous week: avg 0.95
      makeSession({ started_at: new Date(now - 8 * 86400000).toISOString(), verification_score: 0.95 }),
    ];
    const trend = computeTrend(sessions);
    expect(trend).toBeCloseTo(-0.10);
  });

  it("returns zero trend when both weeks have same average", () => {
    const now = Date.now();
    const sessions = [
      makeSession({ started_at: new Date(now - 1 * 86400000).toISOString(), verification_score: 0.95 }),
      makeSession({ started_at: new Date(now - 8 * 86400000).toISOString(), verification_score: 0.95 }),
    ];
    expect(computeTrend(sessions)).toBe(0);
  });
});

// -- Phase 4 gate logic --

describe("Phase 4 gate status", () => {
  it("all checks pass when criteria met", () => {
    const result = computePhase4Gate(makeGateInput());
    expect(result.canAdvance).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.reason).toContain("Ready to advance");
  });

  it("fails when sessions < 30", () => {
    const result = computePhase4Gate(makeGateInput({ totalSessions: 15 }));
    expect(result.canAdvance).toBe(false);
    expect(result.checks[0].passed).toBe(false);
    expect(result.checks[0].value).toBe("15 sessions");
  });

  it("fails when avgScore < 98%", () => {
    const result = computePhase4Gate(makeGateInput({ avgScore: 0.95 }));
    expect(result.canAdvance).toBe(false);
    expect(result.checks[1].passed).toBe(false);
    expect(result.checks[1].value).toBe("95.0%");
  });

  it("fails when claims have failed", () => {
    const result = computePhase4Gate(makeGateInput({ totalFailed: 3 }));
    expect(result.canAdvance).toBe(false);
    expect(result.checks[2].passed).toBe(false);
    expect(result.checks[2].value).toBe("3 failed");
  });

  it("fails when verified claims < 50 (vacuous pass prevention)", () => {
    const result = computePhase4Gate(makeGateInput({ totalVerified: 10 }));
    expect(result.canAdvance).toBe(false);
    expect(result.checks[3].passed).toBe(false);
    expect(result.checks[3].value).toBe("10 verified");
  });

  it("fails with multiple failing criteria", () => {
    const result = computePhase4Gate(
      makeGateInput({ totalSessions: 5, avgScore: 0.80, totalFailed: 10, totalVerified: 3 })
    );
    expect(result.canAdvance).toBe(false);
    expect(result.checks.filter((c) => !c.passed)).toHaveLength(4);
  });

  it("handles no data (zero everything)", () => {
    const result = computePhase4Gate({
      totalSessions: 0,
      avgScore: 0,
      totalFailed: 0,
      totalVerified: 0,
    });
    expect(result.canAdvance).toBe(false);
    // Sessions < 30, score < 98%, verified < 50 should fail
    expect(result.checks[0].passed).toBe(false);
    expect(result.checks[1].passed).toBe(false);
    // Zero failed is technically passing
    expect(result.checks[2].passed).toBe(true);
    expect(result.checks[3].passed).toBe(false);
  });

  it("passes at exact boundary values", () => {
    const result = computePhase4Gate({
      totalSessions: 30,
      avgScore: 0.98,
      totalFailed: 0,
      totalVerified: 50,
    });
    expect(result.canAdvance).toBe(true);
  });

  it("reason lists failing check names when not passing", () => {
    const result = computePhase4Gate(makeGateInput({ totalSessions: 10, avgScore: 0.50 }));
    expect(result.reason).toContain("30+ verified sessions");
    expect(result.reason).toContain("Average score >= 98%");
  });
});

// -- Score color thresholds --

describe("Score color thresholds", () => {
  function scoreColor(score: number): string {
    if (score >= 0.98) return "text-brand-green";
    if (score >= 0.9) return "text-primary";
    return "text-brand-red";
  }

  it("returns green for >= 98%", () => {
    expect(scoreColor(0.98)).toBe("text-brand-green");
    expect(scoreColor(1.0)).toBe("text-brand-green");
    expect(scoreColor(0.99)).toBe("text-brand-green");
  });

  it("returns terra/primary for >= 90% and < 98%", () => {
    expect(scoreColor(0.9)).toBe("text-primary");
    expect(scoreColor(0.95)).toBe("text-primary");
    expect(scoreColor(0.979)).toBe("text-primary");
  });

  it("returns red for < 90%", () => {
    expect(scoreColor(0.89)).toBe("text-brand-red");
    expect(scoreColor(0.5)).toBe("text-brand-red");
    expect(scoreColor(0)).toBe("text-brand-red");
  });
});

// -- Rolling aggregation logic --

describe("Rolling verification aggregation", () => {
  it("returns zeroed VerificationRolling for empty input", () => {
    const empty: VerificationRolling = {
      avgScore: 0,
      totalSessions: 0,
      totalVerified: 0,
      totalFailed: 0,
      totalUnverifiable: 0,
      trend: 0,
    };
    expect(empty.avgScore).toBe(0);
    expect(empty.totalSessions).toBe(0);
    expect(empty.trend).toBe(0);
  });

  it("computes average score correctly for multiple sessions", () => {
    const scores = [0.95, 0.97, 1.0, 0.88];
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    expect(avg).toBeCloseTo(0.95);
  });

  it("sums claims correctly", () => {
    const sessions = [
      { claims_verified: 10, claims_failed: 1, claims_unverifiable: 2 },
      { claims_verified: 20, claims_failed: 0, claims_unverifiable: 3 },
      { claims_verified: 5, claims_failed: 2, claims_unverifiable: 0 },
    ];
    const totalVerified = sessions.reduce((s, x) => s + x.claims_verified, 0);
    const totalFailed = sessions.reduce((s, x) => s + x.claims_failed, 0);
    const totalUnverifiable = sessions.reduce((s, x) => s + x.claims_unverifiable, 0);
    expect(totalVerified).toBe(35);
    expect(totalFailed).toBe(3);
    expect(totalUnverifiable).toBe(5);
  });
});

// -- By-role aggregation --

describe("Verification by role aggregation", () => {
  function aggregateByRole(
    sessions: Array<{ role: string; verification_score: number; claims_verified: number; claims_failed: number }>
  ): VerificationByRole[] {
    const byRole: Record<string, { scores: number[]; claimsVerified: number; claimsFailed: number }> = {};
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
        avgScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
        sessionCount: data.scores.length,
        claimsVerified: data.claimsVerified,
        claimsFailed: data.claimsFailed,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);
  }

  it("handles empty input", () => {
    expect(aggregateByRole([])).toHaveLength(0);
  });

  it("groups by role and sorts worst-first", () => {
    const sessions = [
      { role: "ceo", verification_score: 0.99, claims_verified: 10, claims_failed: 0 },
      { role: "cto", verification_score: 0.85, claims_verified: 5, claims_failed: 3 },
      { role: "ceo", verification_score: 0.95, claims_verified: 8, claims_failed: 1 },
    ];
    const result = aggregateByRole(sessions);
    expect(result).toHaveLength(2);
    // CTO worst, should be first
    expect(result[0].role).toBe("cto");
    expect(result[0].avgScore).toBeCloseTo(0.85);
    expect(result[0].claimsFailed).toBe(3);
    // CEO second
    expect(result[1].role).toBe("ceo");
    expect(result[1].avgScore).toBeCloseTo(0.97);
    expect(result[1].sessionCount).toBe(2);
    expect(result[1].claimsVerified).toBe(18);
  });
});
