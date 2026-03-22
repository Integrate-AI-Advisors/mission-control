import type { Executive } from "./types";

/**
 * Maps every sub-agent ID to its parent executive.
 * Source of truth: the AGENTS.md files in each executive workspace.
 * Must be updated when agents are added/removed.
 */

const CEO_AGENTS = [
  "business-development", "client-success", "crisis-risk", "data-reporting",
  "it-systems", "legal-compliance", "meeting-facilitation", "operations-management",
  "people-culture", "process-design", "procurement", "project-management",
  "recruitment", "report-writing", "strategy-research",
];

const CMO_AGENTS = [
  "analytics-analyst", "community-manager", "content-strategist", "copywriter",
  "crisis-reputation-manager", "email-marketing-manager", "event-coordinator",
  "graphic-designer", "market-researcher", "paid-ads-manager",
  "pr-outreach-specialist", "seo-specialist", "social-media-manager", "video-director",
];

const CTO_AGENTS = [
  "ai-ml", "cloud-infrastructure", "cybersecurity", "data-engineering",
  "database-administration", "devops", "disaster-recovery", "integration-engineering",
  "product-management", "qa-testing", "software-engineering", "solutions-architecture",
  "systems-administration", "tech-support", "technical-writing", "ui-ux-design",
];

const COO_AGENTS = [
  "audit-coordination", "automation-architecture", "business-analysis",
  "capacity-planning", "change-management", "compliance-risk", "onboarding-design",
  "performance-analytics", "process-improvement", "quality-assurance",
  "resource-management", "sop-writing", "training-development", "vendor-management",
  "optimisation",
];

const CFO_AGENTS = [
  "budget-compilation", "cash-flow-manager", "compliance-tracker",
  "debt-credit-manager", "expense-auditor", "financial-controller",
  "financial-modeller", "financial-report-writer", "grants-funding-researcher",
  "insurance-risk-analyst", "invoice-processor", "management-accountant",
  "payroll-benefits", "procurement-cost-analyst", "revenue-pricing-analyst",
  "tax-strategist",
];

const CCO_AGENTS = [
  "accessibility-specialist", "asset-librarian", "brand-guardian",
  "competitive-design-analyst", "content-art-director", "copywriting-style-director",
  "creative-trend-analyst", "environmental-designer", "motion-designer",
  "photography-director", "presentation-designer", "style-guide-writer",
  "template-builder", "typography-specialist", "ux-experience-designer",
  "visual-design-director",
];

const DISCOVERY_AGENTS = [
  "data-connector", "digital-footprint-scanner", "discovery-director",
  "financial-analyst", "gap-interviewer", "industry-researcher",
  "marketing-analyst", "operations-analyst", "report-compiler",
];

const EXECUTIVE_IDS: Executive[] = ["ceo", "cmo", "cto", "coo", "cfo", "cco", "discovery"];

// Build reverse lookup
const PARENT_MAP: Record<string, Executive> = {};

function register(parent: Executive, agents: string[]) {
  for (const a of agents) {
    PARENT_MAP[a] = parent;
  }
}

register("ceo", CEO_AGENTS);
register("cmo", CMO_AGENTS);
register("cto", CTO_AGENTS);
register("coo", COO_AGENTS);
register("cfo", CFO_AGENTS);
register("cco", CCO_AGENTS);
register("discovery", DISCOVERY_AGENTS);

export function getParentExecutive(agentId: string): Executive | null {
  return PARENT_MAP[agentId] || null;
}

export function isExecutive(agentId: string): boolean {
  return EXECUTIVE_IDS.includes(agentId as Executive);
}

export function getExecutiveIds(): Executive[] {
  return EXECUTIVE_IDS;
}

export const EXECUTIVE_LABELS: Record<Executive, string> = {
  ceo: "CEO — Strategy & Leadership",
  cmo: "CMO — Marketing & Growth",
  cto: "CTO — Technology & Infrastructure",
  coo: "COO — Operations & Process",
  cfo: "CFO — Finance & Compliance",
  cco: "CCO — Creative & Brand",
  discovery: "Discovery Engine — Pre-Sales Diagnostics",
};

export const EXECUTIVE_COLOURS: Record<Executive, string> = {
  ceo: "#7B2DFF",
  cmo: "#FF5630",
  cto: "#00B8D9",
  coo: "#36B37E",
  cfo: "#FFAB00",
  cco: "#E91E8C",
  discovery: "#6554C0",
};
