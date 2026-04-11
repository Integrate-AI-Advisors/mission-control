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
