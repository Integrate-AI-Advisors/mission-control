import { describe, it, expect } from "vitest";
import { getHealthSummary } from "@/lib/queries/integrations";
import type { Integration } from "@/lib/queries/integrations";

function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: "int-1",
    client_id: "client-1",
    service: "Shopify",
    status: "active",
    health_status: "healthy",
    health_checked_at: "2026-04-10T10:00:00Z",
    store_domain: null,
    ...overrides,
  };
}

describe("getHealthSummary", () => {
  it("returns all zeros for empty array", () => {
    const result = getHealthSummary([]);
    expect(result).toEqual({
      healthy: 0,
      degraded: 0,
      down: 0,
      total: 0,
      overallStatus: "healthy",
    });
  });

  it("counts all healthy integrations", () => {
    const integrations = [
      makeIntegration({ id: "1", service: "Shopify" }),
      makeIntegration({ id: "2", service: "Stripe" }),
      makeIntegration({ id: "3", service: "Xero" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.healthy).toBe(3);
    expect(result.total).toBe(3);
    expect(result.overallStatus).toBe("healthy");
  });

  it("returns degraded when any integration is degraded", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "healthy" }),
      makeIntegration({ id: "2", health_status: "degraded" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("degraded");
    expect(result.degraded).toBe(1);
    expect(result.healthy).toBe(1);
  });

  it("returns down when any integration is down (even with degraded)", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "healthy" }),
      makeIntegration({ id: "2", health_status: "degraded" }),
      makeIntegration({ id: "3", health_status: "down" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("down");
    expect(result.down).toBe(1);
    expect(result.degraded).toBe(1);
    expect(result.healthy).toBe(1);
    expect(result.total).toBe(3);
  });

  it("handles unknown health status", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "unknown" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("healthy");
    expect(result.healthy).toBe(0);
    expect(result.total).toBe(1);
  });

  it("handles all integrations down", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "down" }),
      makeIntegration({ id: "2", health_status: "down" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("down");
    expect(result.down).toBe(2);
    expect(result.total).toBe(2);
  });
});
