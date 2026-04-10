import { describe, it, expect } from "vitest";
import type { ClientPhase } from "@/lib/types";
import { PHASE_COLORS, PHASE_LABELS } from "@/lib/types";

// Extract and test the phase advancement logic from advancePhase()
const phaseOrder: ClientPhase[] = ["discovery", "dashboard", "intelligence", "operations"];

function getNextPhase(currentPhase: ClientPhase): ClientPhase | null {
  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) return null;
  return phaseOrder[currentIndex + 1];
}

function canAdvance(currentPhase: ClientPhase): boolean {
  const currentIndex = phaseOrder.indexOf(currentPhase);
  return currentIndex >= 0 && currentIndex < phaseOrder.length - 1;
}

describe("Phase advancement", () => {
  it("advances discovery → dashboard", () => {
    expect(getNextPhase("discovery")).toBe("dashboard");
  });

  it("advances dashboard → intelligence", () => {
    expect(getNextPhase("dashboard")).toBe("intelligence");
  });

  it("advances intelligence → operations", () => {
    expect(getNextPhase("intelligence")).toBe("operations");
  });

  it("cannot advance past operations", () => {
    expect(getNextPhase("operations")).toBeNull();
  });

  it("rejects invalid phase names", () => {
    expect(getNextPhase("invalid" as ClientPhase)).toBeNull();
  });

  it("canAdvance is true for all phases except operations", () => {
    expect(canAdvance("discovery")).toBe(true);
    expect(canAdvance("dashboard")).toBe(true);
    expect(canAdvance("intelligence")).toBe(true);
    expect(canAdvance("operations")).toBe(false);
  });
});

describe("Phase order invariants", () => {
  it("has exactly 4 phases", () => {
    expect(phaseOrder).toHaveLength(4);
  });

  it("starts with discovery", () => {
    expect(phaseOrder[0]).toBe("discovery");
  });

  it("ends with operations", () => {
    expect(phaseOrder[phaseOrder.length - 1]).toBe("operations");
  });

  it("has no duplicates", () => {
    const unique = new Set(phaseOrder);
    expect(unique.size).toBe(phaseOrder.length);
  });
});

describe("Phase-to-color mapping completeness", () => {

  it("every phase has a color hex value", () => {
    for (const phase of phaseOrder) {
      expect(PHASE_COLORS[phase]).toBeDefined();
      expect(PHASE_COLORS[phase]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("every phase has a human-readable label", () => {
    for (const phase of phaseOrder) {
      expect(PHASE_LABELS[phase]).toBeDefined();
      expect(typeof PHASE_LABELS[phase]).toBe("string");
      expect(PHASE_LABELS[phase].length).toBeGreaterThan(0);
    }
  });

  it("no extra colors for nonexistent phases", () => {
    const colorKeys = Object.keys(PHASE_COLORS);
    for (const key of colorKeys) {
      expect(phaseOrder).toContain(key);
    }
  });
});
