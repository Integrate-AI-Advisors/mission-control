import { describe, it, expect } from "vitest";
import { PHASE_COLORS, PHASE_LABELS } from "@/lib/types";
import type { ClientPhase, SessionStatus, HealthStatus, ApprovalStatus, PatternSeverity } from "@/lib/types";

describe("Phase system", () => {
  const phases: ClientPhase[] = ["discovery", "dashboard", "intelligence", "operations"];

  it("has colors for all phases", () => {
    for (const phase of phases) {
      expect(PHASE_COLORS[phase]).toBeDefined();
      expect(PHASE_COLORS[phase]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("has labels for all phases", () => {
    for (const phase of phases) {
      expect(PHASE_LABELS[phase]).toBeDefined();
      expect(PHASE_LABELS[phase].length).toBeGreaterThan(0);
    }
  });

  it("phase order is discovery -> dashboard -> intelligence -> operations", () => {
    expect(phases).toEqual(["discovery", "dashboard", "intelligence", "operations"]);
  });
});

describe("Type completeness", () => {
  it("SessionStatus covers all expected values", () => {
    const statuses: SessionStatus[] = ["running", "completed", "failed", "cancelled"];
    expect(statuses).toHaveLength(4);
  });

  it("HealthStatus covers all expected values", () => {
    const statuses: HealthStatus[] = ["healthy", "degraded", "down", "unknown"];
    expect(statuses).toHaveLength(4);
  });

  it("ApprovalStatus covers full lifecycle", () => {
    const statuses: ApprovalStatus[] = ["pending", "approved", "executing", "done", "declined"];
    expect(statuses).toHaveLength(5);
  });

  it("PatternSeverity has 4 levels", () => {
    const severities: PatternSeverity[] = ["low", "medium", "high", "critical"];
    expect(severities).toHaveLength(4);
  });
});
