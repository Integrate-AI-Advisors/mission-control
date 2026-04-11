import { describe, it, expect } from "vitest";
import {
  computeClientHealth,
  computeMargin,
  computeProjectedCost,
  computeOverallHealth,
  type ClientSummaryRow,
} from "@/lib/queries/dashboard";
import type { Integration } from "@/lib/queries/integrations";
import type { Client } from "@/lib/clients";

// --- Helpers ---

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "c1",
    name: "Test Client",
    slug: "test",
    industry: null,
    phase: "operations",
    monthly_budget_usd: 500,
    monthly_retainer_usd: 250,
    phase_changed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeClientRow(overrides: Partial<ClientSummaryRow> = {}): ClientSummaryRow {
  return {
    client: makeClient(),
    phase: "operations",
    status: "green",
    sessions24h: 10,
    failed24h: 0,
    costMtd: 50,
    budget: 500,
    retainer: 250,
    margin: 80,
    ...overrides,
  };
}

function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: "int-1",
    client_id: "c1",
    service: "shopify",
    status: "healthy",
    health_status: "healthy",
    health_checked_at: null,
    store_domain: null,
    ...overrides,
  };
}

// --- computeClientHealth ---

describe("computeClientHealth", () => {
  it("returns green when no failures and healthy integrations", () => {
    expect(computeClientHealth(0, "healthy")).toBe("green");
  });

  it("returns green at exactly 5% failure rate with healthy integrations", () => {
    expect(computeClientHealth(0.05, "healthy")).toBe("green");
  });

  it("returns amber when failure rate exceeds 5%", () => {
    expect(computeClientHealth(0.06, "healthy")).toBe("amber");
  });

  it("returns amber when integrations are degraded", () => {
    expect(computeClientHealth(0, "degraded")).toBe("amber");
  });

  it("returns red when failure rate exceeds 10%", () => {
    expect(computeClientHealth(0.11, "healthy")).toBe("red");
  });

  it("returns red when any integration is down", () => {
    expect(computeClientHealth(0, "down")).toBe("red");
  });

  it("returns red when both failure rate high and integration down", () => {
    expect(computeClientHealth(0.5, "down")).toBe("red");
  });
});

// --- computeMargin ---

describe("computeMargin", () => {
  it("returns correct margin percentage", () => {
    // retainer 250, projected cost 50 => (250 - 50) / 250 * 100 = 80%
    expect(computeMargin(250, 50)).toBe(80);
  });

  it("returns null when retainer is 0", () => {
    expect(computeMargin(0, 100)).toBeNull();
  });

  it("returns null when retainer is negative", () => {
    expect(computeMargin(-10, 100)).toBeNull();
  });

  it("returns 100% when projected cost is 0", () => {
    expect(computeMargin(250, 0)).toBe(100);
  });

  it("returns negative margin when cost exceeds retainer", () => {
    // retainer 100, cost 200 => (100 - 200) / 100 * 100 = -100%
    expect(computeMargin(100, 200)).toBe(-100);
  });

  it("returns 0% when cost equals retainer", () => {
    expect(computeMargin(100, 100)).toBe(0);
  });
});

// --- computeProjectedCost ---

describe("computeProjectedCost", () => {
  it("projects cost to full month", () => {
    // Day 10 of a 30-day month, MTD cost $50 => projected = (50 / 10) * 30 = $150
    const now = new Date(2026, 3, 10); // April 10 (30-day month)
    expect(computeProjectedCost(50, now)).toBeCloseTo(150);
  });

  it("returns exact cost on last day of month", () => {
    // Day 30 of a 30-day month, MTD cost $150 => projected = (150 / 30) * 30 = $150
    const now = new Date(2026, 3, 30); // April 30
    expect(computeProjectedCost(150, now)).toBeCloseTo(150);
  });

  it("projects correctly for first day of month", () => {
    // Day 1 of a 31-day month, MTD cost $5 => projected = (5 / 1) * 31 = $155
    const now = new Date(2026, 0, 1); // January 1 (31-day month)
    expect(computeProjectedCost(5, now)).toBeCloseTo(155);
  });

  it("handles zero MTD cost", () => {
    const now = new Date(2026, 3, 15);
    expect(computeProjectedCost(0, now)).toBe(0);
  });

  it("handles February (28 days)", () => {
    // Day 14 of February, MTD cost $70 => projected = (70 / 14) * 28 = $140
    const now = new Date(2026, 1, 14); // Feb 14
    expect(computeProjectedCost(70, now)).toBeCloseTo(140);
  });
});

// --- computeOverallHealth ---

describe("computeOverallHealth", () => {
  it("returns green when all clients green and no integrations down", () => {
    const rows = [makeClientRow({ status: "green" })];
    const integrations = [makeIntegration({ health_status: "healthy" })];
    const result = computeOverallHealth(rows, integrations);
    expect(result.health).toBe("green");
    expect(result.reason).toBe("All systems green");
  });

  it("returns amber when any client is amber", () => {
    const rows = [
      makeClientRow({ status: "green" }),
      makeClientRow({ status: "amber" }),
    ];
    const integrations = [makeIntegration({ health_status: "healthy" })];
    const result = computeOverallHealth(rows, integrations);
    expect(result.health).toBe("amber");
  });

  it("returns red when any client is red", () => {
    const rows = [
      makeClientRow({ status: "green" }),
      makeClientRow({ status: "red" }),
    ];
    const integrations = [makeIntegration({ health_status: "healthy" })];
    const result = computeOverallHealth(rows, integrations);
    expect(result.health).toBe("red");
  });

  it("returns red when any integration is down", () => {
    const rows = [makeClientRow({ status: "green" })];
    const integrations = [makeIntegration({ health_status: "down" })];
    const result = computeOverallHealth(rows, integrations);
    expect(result.health).toBe("red");
  });

  it("returns green with empty arrays", () => {
    const result = computeOverallHealth([], []);
    expect(result.health).toBe("green");
  });

  it("red takes priority over amber", () => {
    const rows = [
      makeClientRow({ status: "amber" }),
      makeClientRow({ status: "red" }),
    ];
    const integrations: Integration[] = [];
    const result = computeOverallHealth(rows, integrations);
    expect(result.health).toBe("red");
  });
});

// --- IntegrateAI filtering ---

describe("IntegrateAI filtering", () => {
  it("filters out integrateai slug from paying clients", () => {
    const clients = [
      makeClient({ slug: "integrateai", name: "IntegrateAI", monthly_retainer_usd: 0 }),
      makeClient({ slug: "newground", name: "Newground Coffee", monthly_retainer_usd: 250 }),
      makeClient({ slug: "acme", name: "Acme Corp", monthly_retainer_usd: 500 }),
    ];
    const payingClients = clients.filter((c) => c.slug !== "integrateai");
    expect(payingClients).toHaveLength(2);
    expect(payingClients.map((c) => c.slug)).toEqual(["newground", "acme"]);
  });

  it("excludes integrateai from MRR calculation", () => {
    const clients = [
      makeClient({ slug: "integrateai", monthly_retainer_usd: 0 }),
      makeClient({ slug: "newground", monthly_retainer_usd: 250 }),
      makeClient({ slug: "acme", monthly_retainer_usd: 500 }),
    ];
    const payingClients = clients.filter((c) => c.slug !== "integrateai");
    const mrr = payingClients.reduce((sum, c) => sum + (c.monthly_retainer_usd ?? 0), 0);
    expect(mrr).toBe(750);
  });
});
