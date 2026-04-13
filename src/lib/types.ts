// Phase lifecycle for client journey
export type ClientPhase = "discovery" | "dashboard" | "intelligence" | "operations";

// Phase color mapping
export const PHASE_COLORS: Record<ClientPhase, string> = {
  discovery: "#4A7C59",
  dashboard: "#4A6FA5",
  intelligence: "#D97757",
  operations: "#7B61A5",
};

export const PHASE_LABELS: Record<ClientPhase, string> = {
  discovery: "Discovery",
  dashboard: "Dashboard",
  intelligence: "Intelligence",
  operations: "Operations",
};

// Session status
export type SessionStatus = "running" | "completed" | "failed" | "cancelled";

// Integration health
export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

// Integration connection status
export type IntegrationStatus = "not_connected" | "healthy" | "degraded" | "down";

// Approval lifecycle
export type ApprovalStatus = "pending" | "approved" | "executing" | "done" | "declined";

// Pattern severity
export type PatternSeverity = "low" | "medium" | "high" | "critical";

// Discovery question types
export type QuestionPriority = "critical" | "normal" | "nice_to_have";
export type QuestionCategory = "revenue" | "operations" | "marketing" | "finance" | "retention" | "growth" | "general";
export type QuestionStatus = "pending" | "asked" | "answered" | "skipped";
export type IngestionStatus = "not_connected" | "connected" | "ingesting" | "complete" | "failed";
export type VaultSectionStatus = "pending" | "in_progress" | "complete";

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  revenue: "Revenue & Sales",
  operations: "Operations",
  marketing: "Marketing & Growth",
  finance: "Finance & Cash Flow",
  retention: "Customer Retention",
  growth: "Strategy & Growth",
  general: "General",
};

export const PRIORITY_LABELS: Record<QuestionPriority, string> = {
  critical: "Critical",
  normal: "Normal",
  nice_to_have: "Nice to Have",
};

export const VAULT_SECTION_LABELS: Record<string, string> = {
  company_overview: "Company Overview",
  brand_voice: "Brand Voice Guide",
  team_directory: "Team Directory",
  processes: "Standard Operating Procedures",
  target_audience: "Target Audience Profile",
  competitor_landscape: "Competitor Landscape",
  kpi_config: "KPI & Dashboard Config",
};
