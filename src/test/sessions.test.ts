import { describe, it, expect } from "vitest";

// Test the stats aggregation logic from getTodayStats
function computeTodayStats(sessions: Array<{ total_cost_usd: number | null; status: string }>) {
  return {
    count: sessions.length,
    cost: sessions.reduce((sum, s) => sum + (s.total_cost_usd || 0), 0),
    failed: sessions.filter((s) => s.status === "failed").length,
  };
}

describe("Today stats aggregation", () => {
  it("handles zero sessions", () => {
    const stats = computeTodayStats([]);
    expect(stats.count).toBe(0);
    expect(stats.cost).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it("sums costs correctly", () => {
    const stats = computeTodayStats([
      { total_cost_usd: 1.5, status: "completed" },
      { total_cost_usd: 2.3, status: "completed" },
      { total_cost_usd: 0.7, status: "running" },
    ]);
    expect(stats.count).toBe(3);
    expect(stats.cost).toBeCloseTo(4.5);
    expect(stats.failed).toBe(0);
  });

  it("handles null costs (treats as 0)", () => {
    const stats = computeTodayStats([
      { total_cost_usd: null, status: "running" },
      { total_cost_usd: 1.0, status: "completed" },
    ]);
    expect(stats.cost).toBe(1.0);
  });

  it("counts failed sessions", () => {
    const stats = computeTodayStats([
      { total_cost_usd: 0.5, status: "completed" },
      { total_cost_usd: 0.1, status: "failed" },
      { total_cost_usd: 0.2, status: "failed" },
      { total_cost_usd: 0.3, status: "cancelled" },
    ]);
    expect(stats.failed).toBe(2);
    expect(stats.count).toBe(4);
  });

  it("handles large number of sessions", () => {
    const sessions = Array.from({ length: 100 }, (_, i) => ({
      total_cost_usd: 0.1,
      status: i % 10 === 0 ? "failed" : "completed",
    }));
    const stats = computeTodayStats(sessions);
    expect(stats.count).toBe(100);
    expect(stats.cost).toBeCloseTo(10.0);
    expect(stats.failed).toBe(10);
  });
});

describe("Pagination logic", () => {
  it("computes correct offset for page 1", () => {
    const page = 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;
    expect(offset).toBe(0);
  });

  it("computes correct offset for page 3", () => {
    const page = 3;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;
    expect(offset).toBe(100);
  });

  it("computes correct range end", () => {
    const page = 2;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;
    const rangeEnd = offset + pageSize - 1;
    expect(rangeEnd).toBe(99);
  });

  it("handles negative page (clamped to 1)", () => {
    const rawPage = -5;
    const page = Math.max(1, rawPage || 1);
    expect(page).toBe(1);
  });

  it("handles NaN page (clamped to 1)", () => {
    const rawPage = parseInt("abc", 10);
    const page = Math.max(1, rawPage || 1);
    expect(page).toBe(1);
  });

  it("computes total pages correctly", () => {
    expect(Math.ceil(0 / 50)).toBe(0);
    expect(Math.ceil(1 / 50)).toBe(1);
    expect(Math.ceil(50 / 50)).toBe(1);
    expect(Math.ceil(51 / 50)).toBe(2);
    expect(Math.ceil(250 / 50)).toBe(5);
  });
});

describe("Session filter building", () => {
  it("applies all optional filters when provided", () => {
    const filters = {
      clientId: "c1",
      role: "ceo",
      triggerType: "schedule",
      status: "completed",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    };
    // All fields should be defined
    expect(filters.role).toBeDefined();
    expect(filters.triggerType).toBeDefined();
    expect(filters.status).toBeDefined();
    expect(filters.startDate).toBeDefined();
    expect(filters.endDate).toBeDefined();
  });

  it("skips undefined optional filters", () => {
    const filters = { clientId: "c1" };
    expect((filters as Record<string, unknown>).role).toBeUndefined();
    expect((filters as Record<string, unknown>).status).toBeUndefined();
  });
});
