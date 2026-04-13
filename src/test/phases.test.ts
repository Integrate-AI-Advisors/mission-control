import { describe, it, expect } from "vitest";
import {
  computeDiscoveryStats,
  computeDiscoveryGate,
  computeDashboardGate,
  computeDiscoveryProgress,
} from "@/lib/queries/phases";
import type {
  DiscoveryQuestion,
  DataIngestionRow,
  VaultSectionRow,
} from "@/lib/queries/phases";

// -- Factory helpers --

function makeQuestion(overrides: Partial<DiscoveryQuestion> = {}): DiscoveryQuestion {
  return {
    id: crypto.randomUUID(),
    client_id: "client-1",
    category: "revenue",
    question: "Test question?",
    context: null,
    priority: "normal",
    status: "pending",
    answer: null,
    answered_at: null,
    asked_at: null,
    asked_in_channel: null,
    source_integration: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeDataRow(overrides: Partial<DataIngestionRow> = {}): DataIngestionRow {
  return {
    id: crypto.randomUUID(),
    client_id: "client-1",
    integration: "shopify",
    status: "not_connected",
    records_pulled: 0,
    date_range_start: null,
    date_range_end: null,
    findings_summary: null,
    started_at: null,
    completed_at: null,
    error_message: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeVaultSection(overrides: Partial<VaultSectionRow> = {}): VaultSectionRow {
  return {
    id: crypto.randomUUID(),
    client_id: "client-1",
    section: "company_overview",
    status: "pending",
    notes: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// -- Discovery Stats --

describe("Discovery stats computation", () => {
  it("returns zeroes for empty input", () => {
    const stats = computeDiscoveryStats([]);
    expect(stats).toEqual({
      total: 0,
      pending: 0,
      asked: 0,
      answered: 0,
      skipped: 0,
      critical: 0,
      criticalAnswered: 0,
    });
  });

  it("counts all statuses correctly", () => {
    const questions = [
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "asked" }),
      makeQuestion({ status: "answered" }),
      makeQuestion({ status: "answered" }),
      makeQuestion({ status: "answered" }),
      makeQuestion({ status: "skipped" }),
    ];
    const stats = computeDiscoveryStats(questions);
    expect(stats.total).toBe(7);
    expect(stats.pending).toBe(2);
    expect(stats.asked).toBe(1);
    expect(stats.answered).toBe(3);
    expect(stats.skipped).toBe(1);
  });

  it("counts critical questions correctly", () => {
    const questions = [
      makeQuestion({ priority: "critical", status: "answered" }),
      makeQuestion({ priority: "critical", status: "asked" }),
      makeQuestion({ priority: "critical", status: "pending" }),
      makeQuestion({ priority: "normal", status: "answered" }),
    ];
    const stats = computeDiscoveryStats(questions);
    expect(stats.critical).toBe(3);
    expect(stats.criticalAnswered).toBe(1);
  });
});

// -- Discovery Gate --

describe("Discovery gate evaluation", () => {
  const baseData = [
    makeDataRow({ integration: "shopify", status: "complete" }),
    makeDataRow({ integration: "stripe", status: "complete" }),
  ];
  const baseQuestions = [
    makeQuestion({ priority: "critical", status: "answered" }),
    makeQuestion({ priority: "critical", status: "answered" }),
    makeQuestion({ priority: "normal", status: "answered" }),
    makeQuestion({ priority: "normal", status: "answered" }),
    makeQuestion({ priority: "normal", status: "pending" }),
  ];
  const baseVault = [
    makeVaultSection({ section: "company_overview", status: "complete" }),
    makeVaultSection({ section: "brand_voice", status: "complete" }),
    makeVaultSection({ section: "team_directory", status: "complete" }),
    makeVaultSection({ section: "processes", status: "pending" }),
  ];

  it("passes when all criteria met", () => {
    const gate = computeDiscoveryGate(baseData, baseQuestions, baseVault);
    expect(gate.canAdvance).toBe(true);
    expect(gate.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when no integrations complete", () => {
    const data = [makeDataRow({ status: "not_connected" })];
    const gate = computeDiscoveryGate(data, baseQuestions, baseVault);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[0].passed).toBe(false);
  });

  it("fails when critical questions unanswered", () => {
    const questions = [
      makeQuestion({ priority: "critical", status: "answered" }),
      makeQuestion({ priority: "critical", status: "asked" }),
      makeQuestion({ priority: "normal", status: "answered" }),
      makeQuestion({ priority: "normal", status: "answered" }),
      makeQuestion({ priority: "normal", status: "answered" }),
    ];
    const gate = computeDiscoveryGate(baseData, questions, baseVault);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[1].passed).toBe(false);
    expect(gate.checks[1].value).toBe("1/2");
  });

  it("fails when less than 60% questions resolved", () => {
    const questions = [
      makeQuestion({ priority: "critical", status: "answered" }),
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "pending" }),
    ];
    const gate = computeDiscoveryGate(baseData, questions, baseVault);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[2].passed).toBe(false);
  });

  it("counts skipped questions as resolved", () => {
    const questions = [
      makeQuestion({ priority: "critical", status: "answered" }),
      makeQuestion({ status: "skipped" }),
      makeQuestion({ status: "skipped" }),
      makeQuestion({ status: "answered" }),
      makeQuestion({ status: "pending" }),
    ];
    // 4/5 = 80% resolved
    const gate = computeDiscoveryGate(baseData, questions, baseVault);
    expect(gate.checks[2].passed).toBe(true);
  });

  it("fails when vault sections insufficient", () => {
    const vault = [
      makeVaultSection({ section: "company_overview", status: "complete" }),
      makeVaultSection({ section: "brand_voice", status: "pending" }),
      makeVaultSection({ section: "team_directory", status: "pending" }),
    ];
    const gate = computeDiscoveryGate(baseData, baseQuestions, vault);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[3].passed).toBe(false);
  });

  it("requires company_overview and brand_voice specifically", () => {
    const vault = [
      makeVaultSection({ section: "team_directory", status: "complete" }),
      makeVaultSection({ section: "processes", status: "complete" }),
      makeVaultSection({ section: "target_audience", status: "complete" }),
    ];
    const gate = computeDiscoveryGate(baseData, baseQuestions, vault);
    expect(gate.checks[3].passed).toBe(false);
  });

  it("handles zero questions (vacuous pass)", () => {
    const gate = computeDiscoveryGate(baseData, [], baseVault);
    // No critical questions = check 2 passes, 100% resolved = check 3 passes
    expect(gate.checks[1].passed).toBe(true);
    expect(gate.checks[2].passed).toBe(true);
  });

  it("handles zero integrations", () => {
    const gate = computeDiscoveryGate([], baseQuestions, baseVault);
    expect(gate.checks[0].passed).toBe(false);
  });

  it("handles zero vault sections", () => {
    const gate = computeDiscoveryGate(baseData, baseQuestions, []);
    expect(gate.checks[3].passed).toBe(false);
  });

  it("reason is plain English when failing", () => {
    const questions = [
      makeQuestion({ priority: "critical", status: "pending" }),
      makeQuestion({ status: "pending" }),
    ];
    const gate = computeDiscoveryGate(baseData, questions, baseVault);
    expect(gate.reason).not.toContain("PGRST");
    expect(gate.reason).not.toContain("undefined");
    expect(gate.reason.length).toBeGreaterThan(10);
  });
});

// -- Dashboard Gate --

describe("Dashboard gate evaluation", () => {
  it("passes when all criteria met", () => {
    const integrations = [
      { health_status: "healthy" },
      { health_status: "healthy" },
      { health_status: "healthy" },
    ];
    const gate = computeDashboardGate(integrations, 10, 0, 15);
    expect(gate.canAdvance).toBe(true);
    expect(gate.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when fewer than 3 healthy integrations", () => {
    const integrations = [
      { health_status: "healthy" },
      { health_status: "degraded" },
    ];
    const gate = computeDashboardGate(integrations, 10, 0, 15);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[0].passed).toBe(false);
  });

  it("fails when fewer than 7 days in phase", () => {
    const integrations = [
      { health_status: "healthy" },
      { health_status: "healthy" },
      { health_status: "healthy" },
    ];
    const gate = computeDashboardGate(integrations, 3, 0, 15);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[1].passed).toBe(false);
    expect(gate.checks[1].value).toBe("3 days");
  });

  it("fails when recent failures exist", () => {
    const integrations = [
      { health_status: "healthy" },
      { health_status: "healthy" },
      { health_status: "healthy" },
    ];
    const gate = computeDashboardGate(integrations, 10, 2, 15);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[2].passed).toBe(false);
  });

  it("fails when fewer than 10 sessions", () => {
    const integrations = [
      { health_status: "healthy" },
      { health_status: "healthy" },
      { health_status: "healthy" },
    ];
    const gate = computeDashboardGate(integrations, 10, 0, 5);
    expect(gate.canAdvance).toBe(false);
    expect(gate.checks[3].passed).toBe(false);
  });

  it("passes at exact boundary values", () => {
    const integrations = [
      { health_status: "healthy" },
      { health_status: "healthy" },
      { health_status: "healthy" },
    ];
    const gate = computeDashboardGate(integrations, 7, 0, 10);
    expect(gate.canAdvance).toBe(true);
  });

  it("handles no integrations", () => {
    const gate = computeDashboardGate([], 10, 0, 15);
    expect(gate.checks[0].passed).toBe(false);
  });
});

// -- Discovery Progress --

describe("Discovery progress computation", () => {
  it("computes weighted average correctly", () => {
    const data = [
      makeDataRow({ status: "complete" }),
      makeDataRow({ integration: "stripe", status: "complete" }),
    ];
    const questions = [
      makeQuestion({ status: "answered" }),
      makeQuestion({ status: "answered" }),
    ];
    const vault = [
      makeVaultSection({ status: "complete" }),
    ];

    const progress = computeDiscoveryProgress(data, questions, vault);
    expect(progress.data).toBe(100);
    expect(progress.questions).toBe(100);
    expect(progress.vault).toBe(100);
    expect(progress.overall).toBe(100);
  });

  it("handles empty inputs", () => {
    const progress = computeDiscoveryProgress([], [], []);
    expect(progress.data).toBe(0);
    expect(progress.questions).toBe(0);
    expect(progress.vault).toBe(0);
    expect(progress.overall).toBe(0);
  });

  it("handles partial progress", () => {
    const data = [
      makeDataRow({ status: "complete" }),
      makeDataRow({ integration: "stripe", status: "not_connected" }),
    ];
    const questions = [
      makeQuestion({ status: "answered" }),
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "pending" }),
    ];
    const vault = [
      makeVaultSection({ section: "company_overview", status: "complete" }),
      makeVaultSection({ section: "brand_voice", status: "pending" }),
      makeVaultSection({ section: "team_directory", status: "pending" }),
    ];

    const progress = computeDiscoveryProgress(data, questions, vault);
    expect(progress.data).toBe(50);     // 1/2
    expect(progress.questions).toBe(25); // 1/4
    expect(progress.vault).toBe(33);     // 1/3 rounded
    // Weighted: 50*0.3 + 25*0.4 + 33*0.3 = 15 + 10 + 9.9 = 34.9 -> 35
    expect(progress.overall).toBe(35);
  });

  it("counts skipped as resolved in question progress", () => {
    const questions = [
      makeQuestion({ status: "answered" }),
      makeQuestion({ status: "skipped" }),
      makeQuestion({ status: "pending" }),
      makeQuestion({ status: "pending" }),
    ];
    const progress = computeDiscoveryProgress([], questions, []);
    expect(progress.questions).toBe(50); // 2/4
  });
});
