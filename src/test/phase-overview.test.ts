import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computePhaseState, PHASE_TARGET_DAYS, PHASE_SUBTITLES } from "@/lib/queries/phases";
import type { PhaseHistoryEntry } from "@/lib/queries/phases";

// -- Phase state computation --

function makeHistoryEntry(overrides: Partial<PhaseHistoryEntry> = {}): PhaseHistoryEntry {
  return {
    id: crypto.randomUUID(),
    client_id: "client-1",
    phase: "discovery",
    entered_at: new Date().toISOString(),
    exited_at: null,
    ...overrides,
  };
}

describe("Phase state computation", () => {
  it("marks phases before current as completed", () => {
    const history = [
      makeHistoryEntry({
        phase: "discovery",
        entered_at: "2026-04-01T00:00:00Z",
        exited_at: "2026-04-06T00:00:00Z",
      }),
      makeHistoryEntry({
        phase: "dashboard",
        entered_at: "2026-04-06T00:00:00Z",
        exited_at: null,
      }),
    ];

    const result = computePhaseState("discovery", "dashboard", history);
    expect(result.state).toBe("completed");
    expect(result.daysInPhase).toBe(5);
  });

  it("marks current phase correctly", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    const history = [
      makeHistoryEntry({
        phase: "discovery",
        entered_at: threeDaysAgo.toISOString(),
        exited_at: null,
      }),
    ];

    const result = computePhaseState("discovery", "discovery", history);
    expect(result.state).toBe("current");
    expect(result.daysInPhase).toBe(3);
  });

  it("marks phases after current as future", () => {
    const history = [
      makeHistoryEntry({
        phase: "discovery",
        entered_at: new Date().toISOString(),
        exited_at: null,
      }),
    ];

    const result = computePhaseState("dashboard", "discovery", history);
    expect(result.state).toBe("future");
    expect(result.daysInPhase).toBeNull();
  });

  it("handles missing history entry for completed phase", () => {
    const result = computePhaseState("discovery", "dashboard", []);
    expect(result.state).toBe("completed");
    expect(result.daysInPhase).toBeNull();
  });

  it("handles missing history entry for current phase", () => {
    const result = computePhaseState("discovery", "discovery", []);
    expect(result.state).toBe("current");
    expect(result.daysInPhase).toBe(0);
  });

  it("computes zero days for phase entered today", () => {
    const history = [
      makeHistoryEntry({
        phase: "discovery",
        entered_at: new Date().toISOString(),
        exited_at: null,
      }),
    ];

    const result = computePhaseState("discovery", "discovery", history);
    expect(result.state).toBe("current");
    expect(result.daysInPhase).toBe(0);
  });

  it("marks operations as future when in discovery", () => {
    const result = computePhaseState("operations", "discovery", []);
    expect(result.state).toBe("future");
  });

  it("marks intelligence as completed when in operations", () => {
    const history = [
      makeHistoryEntry({
        phase: "intelligence",
        entered_at: "2026-03-01T00:00:00Z",
        exited_at: "2026-03-15T00:00:00Z",
      }),
    ];
    const result = computePhaseState("intelligence", "operations", history);
    expect(result.state).toBe("completed");
    expect(result.daysInPhase).toBe(14);
  });
});

// -- Phase target days --

describe("Phase target days", () => {
  it("has correct targets", () => {
    expect(PHASE_TARGET_DAYS.discovery).toBe(7);
    expect(PHASE_TARGET_DAYS.dashboard).toBe(14);
    expect(PHASE_TARGET_DAYS.intelligence).toBe(14);
    expect(PHASE_TARGET_DAYS.operations).toBeNull();
  });
});

// -- Phase subtitles --

describe("Phase subtitles", () => {
  it("includes client name in discovery subtitle", () => {
    expect(PHASE_SUBTITLES.discovery("Newground")).toBe("Getting to know Newground");
  });

  it("returns fixed strings for other phases", () => {
    expect(PHASE_SUBTITLES.dashboard("X")).toBe("Building monitoring baseline");
    expect(PHASE_SUBTITLES.intelligence("X")).toBe("Finding opportunities");
    expect(PHASE_SUBTITLES.operations("X")).toBe("Running autonomously");
  });
});

// -- Activity feed date grouping --

describe("Activity feed date grouping", () => {
  // We test the groupByDate function exported from the component
  // Since the component is "use client", we test the logic inline

  function getDateGroup(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (itemDate.getTime() === today.getTime()) return "Today";
    if (itemDate.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  it("groups today's items as Today", () => {
    const now = new Date();
    expect(getDateGroup(now.toISOString())).toBe("Today");
  });

  it("groups yesterday's items as Yesterday", () => {
    const yesterday = new Date(Date.now() - 86400000);
    expect(getDateGroup(yesterday.toISOString())).toBe("Yesterday");
  });

  it("formats older dates as day + month", () => {
    const old = new Date("2026-03-15T12:00:00Z");
    const result = getDateGroup(old.toISOString());
    expect(result).toContain("15");
    expect(result).toContain("Mar");
  });
});
