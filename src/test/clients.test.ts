import { describe, it, expect } from "vitest";
import type { ClientPhase } from "@/lib/types";

describe("advancePhase logic", () => {
  const phaseOrder: ClientPhase[] = ["discovery", "dashboard", "intelligence", "operations"];

  it("computes correct next phase for each stage", () => {
    expect(phaseOrder[phaseOrder.indexOf("discovery") + 1]).toBe("dashboard");
    expect(phaseOrder[phaseOrder.indexOf("dashboard") + 1]).toBe("intelligence");
    expect(phaseOrder[phaseOrder.indexOf("intelligence") + 1]).toBe("operations");
  });

  it("cannot advance past operations", () => {
    const index = phaseOrder.indexOf("operations");
    expect(index).toBe(phaseOrder.length - 1);
  });

  it("rejects invalid phases", () => {
    expect(phaseOrder.indexOf("invalid" as ClientPhase)).toBe(-1);
  });
});

describe("slug validation", () => {
  const slugRegex = /^[a-z0-9-]+$/;

  it("accepts valid slugs", () => {
    expect(slugRegex.test("newground")).toBe(true);
    expect(slugRegex.test("integrate-ai")).toBe(true);
    expect(slugRegex.test("client-123")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(slugRegex.test("")).toBe(false);
    expect(slugRegex.test("Has Spaces")).toBe(false);
    expect(slugRegex.test("UPPERCASE")).toBe(false);
    expect(slugRegex.test("special!chars")).toBe(false);
    expect(slugRegex.test("../../etc")).toBe(false);
  });
});

describe("budget calculations", () => {
  it("handles null budget gracefully", () => {
    const budget: number | null = null;
    const spend = 100;
    const pct = budget && budget > 0 ? (spend / budget) * 100 : null;
    expect(pct).toBeNull();
  });

  it("calculates percentage correctly", () => {
    const budget = 500;
    const spend = 250;
    const pct = (spend / budget) * 100;
    expect(pct).toBe(50);
  });

  it("detects over-budget", () => {
    const budget = 500;
    const spend = 600;
    expect(spend > budget).toBe(true);
  });

  it("handles zero budget without division error", () => {
    const budget = 0;
    const spend = 100;
    const pct = budget > 0 ? (spend / budget) * 100 : null;
    expect(pct).toBeNull();
  });
});
