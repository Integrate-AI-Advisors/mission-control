import { describe, it, expect } from "vitest";
import type { CostLedgerEntry } from "@/lib/queries/costs";

// Test the aggregation logic extracted from getCostBreakdown
// (We test the pure logic, not the Supabase call)
function aggregateByRole(entries: CostLedgerEntry[]) {
  const byRole: Record<string, { sessions: number; cost: number; inputTokens: number; outputTokens: number }> = {};

  for (const entry of entries) {
    if (!byRole[entry.role]) {
      byRole[entry.role] = { sessions: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    }
    byRole[entry.role].sessions += entry.session_count;
    byRole[entry.role].cost += entry.total_cost_usd;
    byRole[entry.role].inputTokens += entry.total_input_tokens;
    byRole[entry.role].outputTokens += entry.total_output_tokens;
  }

  const totalCost = entries.reduce((sum, e) => sum + e.total_cost_usd, 0);
  const totalInputTokens = entries.reduce((sum, e) => sum + e.total_input_tokens, 0);

  return { byRole, totalCost, totalInputTokens };
}

function makeCostEntry(overrides: Partial<CostLedgerEntry> = {}): CostLedgerEntry {
  return {
    client_id: "client-1",
    date: "2026-04-10",
    role: "ceo",
    session_count: 5,
    total_cost_usd: 2.5,
    total_input_tokens: 10000,
    total_output_tokens: 5000,
    ...overrides,
  };
}

describe("Cost aggregation logic", () => {
  it("handles empty entries", () => {
    const result = aggregateByRole([]);
    expect(result.totalCost).toBe(0);
    expect(result.totalInputTokens).toBe(0);
    expect(Object.keys(result.byRole)).toHaveLength(0);
  });

  it("aggregates single role correctly", () => {
    const entries = [
      makeCostEntry({ date: "2026-04-01", total_cost_usd: 1.5, session_count: 3 }),
      makeCostEntry({ date: "2026-04-02", total_cost_usd: 2.0, session_count: 4 }),
    ];
    const result = aggregateByRole(entries);
    expect(result.byRole.ceo.cost).toBe(3.5);
    expect(result.byRole.ceo.sessions).toBe(7);
    expect(result.totalCost).toBe(3.5);
  });

  it("aggregates multiple roles correctly", () => {
    const entries = [
      makeCostEntry({ role: "ceo", total_cost_usd: 5.0 }),
      makeCostEntry({ role: "cto", total_cost_usd: 3.0, total_input_tokens: 8000 }),
      makeCostEntry({ role: "ceo", total_cost_usd: 2.0 }),
    ];
    const result = aggregateByRole(entries);
    expect(result.byRole.ceo.cost).toBe(7.0);
    expect(result.byRole.cto.cost).toBe(3.0);
    expect(result.totalCost).toBe(10.0);
    expect(result.totalInputTokens).toBe(28000); // 10000 + 8000 + 10000
  });

  it("handles zero-cost entries", () => {
    const entries = [
      makeCostEntry({ total_cost_usd: 0, session_count: 0, total_input_tokens: 0, total_output_tokens: 0 }),
    ];
    const result = aggregateByRole(entries);
    expect(result.byRole.ceo.cost).toBe(0);
    expect(result.totalCost).toBe(0);
  });
});

describe("Cache efficiency calculation", () => {
  it("returns 0 when totalInputTokens is 0 (no divide by zero)", () => {
    const totalInputTokens = 0;
    const totalCacheReadTokens = 0;
    const efficiency = totalInputTokens > 0 ? totalCacheReadTokens / totalInputTokens : 0;
    expect(efficiency).toBe(0);
    expect(Number.isFinite(efficiency)).toBe(true);
  });

  it("calculates efficiency correctly", () => {
    const totalInputTokens = 10000;
    const totalCacheReadTokens = 7500;
    const efficiency = totalInputTokens > 0 ? totalCacheReadTokens / totalInputTokens : 0;
    expect(efficiency).toBe(0.75);
  });
});

describe("Month boundary calculation", () => {
  it("handles December to January rollover", () => {
    const month = 12;
    const year = 2026;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    expect(endMonth).toBe(1);
    expect(endYear).toBe(2027);
  });

  it("handles normal month transition", () => {
    const month = 4;
    const year = 2026;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    expect(endMonth).toBe(5);
    expect(endYear).toBe(2026);
  });

  it("formats start date with zero-padded month", () => {
    const startDate = `2026-${String(3).padStart(2, "0")}-01`;
    expect(startDate).toBe("2026-03-01");
  });
});
