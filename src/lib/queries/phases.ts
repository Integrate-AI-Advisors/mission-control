import { getSupabaseAdmin } from "../supabase";
import type {
  QuestionCategory,
  QuestionPriority,
  QuestionStatus,
  IngestionStatus,
  VaultSectionStatus,
} from "../types";

const MS_PER_DAY = 86_400_000;

// -- Row types matching Supabase tables --

export interface DiscoveryQuestion {
  id: string;
  client_id: string;
  category: QuestionCategory;
  question: string;
  context: string | null;
  priority: QuestionPriority;
  status: QuestionStatus;
  answer: string | null;
  answered_at: string | null;
  asked_at: string | null;
  asked_in_channel: string | null;
  source_integration: string | null;
  created_at: string;
}

export interface DataIngestionRow {
  id: string;
  client_id: string;
  integration: string;
  status: IngestionStatus;
  records_pulled: number;
  date_range_start: string | null;
  date_range_end: string | null;
  findings_summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface VaultSectionRow {
  id: string;
  client_id: string;
  section: string;
  status: VaultSectionStatus;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PhaseHistoryEntry {
  id: string;
  client_id: string;
  phase: string;
  entered_at: string;
  exited_at: string | null;
}

export interface DiscoveryStats {
  total: number;
  pending: number;
  asked: number;
  answered: number;
  skipped: number;
  critical: number;
  criticalAnswered: number;
}

export interface PhaseGateCheck {
  name: string;
  passed: boolean;
  value: string;
  threshold: string;
  detail: string;
}

export interface PhaseGateResult {
  canAdvance: boolean;
  reason: string;
  checks: PhaseGateCheck[];
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: "session" | "question_asked" | "question_answered" | "integration" | "vault" | "phase_change" | "finding" | "approval";
  headline: string;
  detail?: string;
  source?: string;
  phase_color?: string;
}

// -- Agent role labels --

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  cto: "CTO",
  cfo: "CFO",
  cmo: "CMO",
  coo: "COO",
  cro: "CRO",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role.toLowerCase()] || role.toUpperCase();
}

// -- Discovery questions --

export async function getDiscoveryQuestions(clientId: string): Promise<DiscoveryQuestion[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("discovery_questions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export function computeDiscoveryStats(questions: DiscoveryQuestion[]): DiscoveryStats {
  const total = questions.length;
  const pending = questions.filter((q) => q.status === "pending").length;
  const asked = questions.filter((q) => q.status === "asked").length;
  const answered = questions.filter((q) => q.status === "answered").length;
  const skipped = questions.filter((q) => q.status === "skipped").length;
  const critical = questions.filter((q) => q.priority === "critical").length;
  const criticalAnswered = questions.filter(
    (q) => q.priority === "critical" && q.status === "answered"
  ).length;
  return { total, pending, asked, answered, skipped, critical, criticalAnswered };
}

export async function getDiscoveryStats(clientId: string): Promise<DiscoveryStats> {
  const questions = await getDiscoveryQuestions(clientId);
  return computeDiscoveryStats(questions);
}

// -- Discovery data ingestion --

export async function getDiscoveryDataStatus(clientId: string): Promise<DataIngestionRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("discovery_data_status")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// -- Discovery vault --

export async function getVaultStatus(clientId: string): Promise<VaultSectionRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("discovery_vault_status")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// -- Phase gates (pure logic, testable without Supabase) --

export function computeDiscoveryGate(
  dataStatus: DataIngestionRow[],
  questions: DiscoveryQuestion[],
  vaultSections: VaultSectionRow[]
): PhaseGateResult {
  const stats = computeDiscoveryStats(questions);

  // Check 1: at least 1 integration complete
  const completeIntegrations = dataStatus.filter((d) => d.status === "complete").length;
  const check1: PhaseGateCheck = {
    name: "At least one data source connected and analysed",
    passed: completeIntegrations >= 1,
    value: `${completeIntegrations} complete`,
    threshold: "1+",
    detail: completeIntegrations === 0
      ? "No integrations have finished pulling data yet"
      : `${dataStatus.filter((d) => d.status === "complete").map((d) => d.integration).join(", ")} analysed`,
  };

  // Check 2: all critical questions answered
  const check2: PhaseGateCheck = {
    name: "All critical questions answered",
    passed: stats.critical === 0 || stats.criticalAnswered === stats.critical,
    value: `${stats.criticalAnswered}/${stats.critical}`,
    threshold: `${stats.critical}/${stats.critical}`,
    detail: stats.criticalAnswered === stats.critical
      ? "All critical questions have been answered"
      : `${stats.critical - stats.criticalAnswered} critical question${stats.critical - stats.criticalAnswered !== 1 ? "s" : ""} still need answers`,
  };

  // Check 3: at least 60% of all questions answered or skipped
  const resolvedPct = stats.total === 0 ? 100 : Math.round(((stats.answered + stats.skipped) / stats.total) * 100);
  const check3: PhaseGateCheck = {
    name: "Most questions answered or skipped",
    passed: stats.total === 0 || resolvedPct >= 60,
    value: `${resolvedPct}%`,
    threshold: "60%",
    detail: resolvedPct >= 60
      ? `${stats.answered + stats.skipped} of ${stats.total} resolved`
      : `${stats.answered + stats.skipped} of ${stats.total} resolved, need ${Math.ceil(stats.total * 0.6) - (stats.answered + stats.skipped)} more`,
  };

  // Check 4: at least 3 vault sections complete, including company_overview and brand_voice
  const completeSections = vaultSections.filter((v) => v.status === "complete");
  const requiredSections = ["company_overview", "brand_voice"];
  const hasRequired = requiredSections.every((s) =>
    completeSections.some((v) => v.section === s)
  );
  const check4: PhaseGateCheck = {
    name: "Core knowledge base sections built",
    passed: completeSections.length >= 3 && hasRequired,
    value: `${completeSections.length}/${vaultSections.length}`,
    threshold: "3+ (incl. overview & brand voice)",
    detail: !hasRequired
      ? `Need ${requiredSections.filter((s) => !completeSections.some((v) => v.section === s)).join(" and ")} sections`
      : completeSections.length < 3
        ? `${3 - completeSections.length} more section${3 - completeSections.length !== 1 ? "s" : ""} needed`
        : `${completeSections.map((v) => v.section.replace(/_/g, " ")).join(", ")} complete`,
  };

  const checks = [check1, check2, check3, check4];
  const canAdvance = checks.every((c) => c.passed);

  let reason: string;
  if (canAdvance) {
    reason = "All checks passing, ready when you are.";
  } else {
    const failing = checks.filter((c) => !c.passed);
    reason = failing.map((c) => c.detail).join(". ") + ".";
  }

  return { canAdvance, reason, checks };
}

export async function evaluateDiscoveryGate(clientId: string): Promise<PhaseGateResult> {
  const [dataStatus, questions, vaultSections] = await Promise.all([
    getDiscoveryDataStatus(clientId),
    getDiscoveryQuestions(clientId),
    getVaultStatus(clientId),
  ]);
  return computeDiscoveryGate(dataStatus, questions, vaultSections);
}

export function computeDashboardGate(
  integrations: { health_status: string }[],
  phaseDays: number,
  recentFailures: number,
  sessionCount: number
): PhaseGateResult {
  // Check 1: at least 3 integrations connected and healthy
  const healthyCount = integrations.filter((i) => i.health_status === "healthy").length;
  const check1: PhaseGateCheck = {
    name: "At least 3 integrations connected and healthy",
    passed: healthyCount >= 3,
    value: `${healthyCount} healthy`,
    threshold: "3+",
    detail: healthyCount >= 3
      ? `${healthyCount} integrations running smoothly`
      : `Need ${3 - healthyCount} more healthy integration${3 - healthyCount !== 1 ? "s" : ""}`,
  };

  // Check 2: 7+ days in Dashboard phase
  const check2: PhaseGateCheck = {
    name: "At least 7 days building baseline",
    passed: phaseDays >= 7,
    value: `${phaseDays} days`,
    threshold: "7 days",
    detail: phaseDays >= 7
      ? `${phaseDays} days of baseline data collected`
      : `${7 - phaseDays} more day${7 - phaseDays !== 1 ? "s" : ""} of baseline data needed`,
  };

  // Check 3: zero critical integration failures in last 48h
  const check3: PhaseGateCheck = {
    name: "No integration failures in last 48 hours",
    passed: recentFailures === 0,
    value: `${recentFailures} failures`,
    threshold: "0",
    detail: recentFailures === 0
      ? "All integrations stable"
      : `${recentFailures} failure${recentFailures !== 1 ? "s" : ""} in the last 48 hours`,
  };

  // Check 4: at least 10 completed agent sessions
  const check4: PhaseGateCheck = {
    name: "At least 10 completed agent sessions",
    passed: sessionCount >= 10,
    value: `${sessionCount} sessions`,
    threshold: "10+",
    detail: sessionCount >= 10
      ? `${sessionCount} sessions completed successfully`
      : `Need ${10 - sessionCount} more completed session${10 - sessionCount !== 1 ? "s" : ""}`,
  };

  const checks = [check1, check2, check3, check4];
  const canAdvance = checks.every((c) => c.passed);

  let reason: string;
  if (canAdvance) {
    reason = "Baseline built. Ready to start finding opportunities.";
  } else {
    const failing = checks.filter((c) => !c.passed);
    reason = failing.map((c) => c.detail).join(". ") + ".";
  }

  return { canAdvance, reason, checks };
}

export async function evaluateDashboardGate(clientId: string): Promise<PhaseGateResult> {
  const phaseDays = await getCurrentPhaseDays(clientId);

  const since48h = new Date(Date.now() - 2 * MS_PER_DAY).toISOString();

  const [integrationsResult, failuresResult, sessionsResult] = await Promise.all([
    getSupabaseAdmin()
      .from("integrations")
      .select("health_status")
      .eq("client_id", clientId),
    getSupabaseAdmin()
      .from("integrations")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("health_status", "down")
      .gte("health_checked_at", since48h),
    getSupabaseAdmin()
      .from("agent_sessions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "completed"),
  ]);

  if (integrationsResult.error) throw integrationsResult.error;
  if (failuresResult.error) throw failuresResult.error;
  if (sessionsResult.error) throw sessionsResult.error;

  return computeDashboardGate(
    integrationsResult.data || [],
    phaseDays,
    failuresResult.count || 0,
    sessionsResult.count || 0
  );
}

// -- Phase history --

export async function getPhaseHistory(clientId: string): Promise<PhaseHistoryEntry[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("phase_history")
    .select("*")
    .eq("client_id", clientId)
    .order("entered_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCurrentPhaseDays(clientId: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from("phase_history")
    .select("entered_at")
    .eq("client_id", clientId)
    .is("exited_at", null)
    .order("entered_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  if (!data) return 0;
  return Math.floor((Date.now() - new Date(data.entered_at).getTime()) / MS_PER_DAY);
}

// -- Discovery data check (for conditional tab visibility) --

export async function hasDiscoveryData(clientId: string): Promise<boolean> {
  const { count, error } = await getSupabaseAdmin()
    .from("discovery_questions")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  if (error) throw error;
  return (count || 0) > 0;
}

// -- Activity feed --

export async function getActivityFeed(clientId: string, limit = 20): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];

  const since = new Date(Date.now() - 7 * MS_PER_DAY).toISOString();

  const [sessions, questions, dataStatus, vault, history, patterns, approvals] = await Promise.all([
    getSupabaseAdmin()
      .from("agent_sessions")
      .select("id, role, status, result_summary, started_at, completed_at")
      .eq("client_id", clientId)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(limit),
    getSupabaseAdmin()
      .from("discovery_questions")
      .select("id, question, answer, status, asked_at, answered_at, asked_in_channel")
      .eq("client_id", clientId)
      .or(`asked_at.gte.${since},answered_at.gte.${since}`),
    getSupabaseAdmin()
      .from("discovery_data_status")
      .select("id, integration, status, records_pulled, findings_summary, started_at, completed_at")
      .eq("client_id", clientId)
      .or(`started_at.gte.${since},completed_at.gte.${since}`),
    getSupabaseAdmin()
      .from("discovery_vault_status")
      .select("id, section, status, completed_at")
      .eq("client_id", clientId)
      .gte("completed_at", since),
    getSupabaseAdmin()
      .from("phase_history")
      .select("id, phase, entered_at")
      .eq("client_id", clientId)
      .gte("entered_at", since),
    getSupabaseAdmin()
      .from("detected_patterns")
      .select("id, description, severity, insight, created_at")
      .eq("client_id", clientId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit),
    getSupabaseAdmin()
      .from("approval_queue")
      .select("id, title, agent, impact_summary, created_at")
      .eq("client_id", clientId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  // Sessions -> activity items
  for (const s of sessions.data || []) {
    const ts = s.completed_at || s.started_at;
    const role = roleLabel(s.role);
    const headline = s.status === "completed"
      ? `${role} completed ${s.result_summary ? "analysis" : "session"}`
      : s.status === "running"
        ? `${role} is running a session`
        : `${role} session ${s.status}`;
    items.push({
      id: `session-${s.id}`,
      timestamp: ts,
      type: "session",
      headline,
      detail: s.result_summary || undefined,
      source: s.role,
    });
  }

  // Questions asked
  for (const q of questions.data || []) {
    if (q.asked_at) {
      items.push({
        id: `q-asked-${q.id}`,
        timestamp: q.asked_at,
        type: "question_asked",
        headline: `CEO asked about: ${q.question.slice(0, 80)}${q.question.length > 80 ? "..." : ""}`,
        detail: q.asked_in_channel ? `via ${q.asked_in_channel}` : undefined,
        source: "ceo",
      });
    }
    if (q.answered_at && q.answer) {
      items.push({
        id: `q-answered-${q.id}`,
        timestamp: q.answered_at,
        type: "question_answered",
        headline: `Founder answered: "${q.answer.slice(0, 80)}${q.answer.length > 80 ? "..." : ""}"`,
        detail: `In response to: ${q.question.slice(0, 60)}${q.question.length > 60 ? "..." : ""}`,
        source: "founder",
      });
    }
  }

  // Data ingestion events
  for (const d of dataStatus.data || []) {
    if (d.completed_at && d.status === "complete") {
      const name = d.integration.charAt(0).toUpperCase() + d.integration.slice(1);
      items.push({
        id: `data-${d.id}`,
        timestamp: d.completed_at,
        type: "integration",
        headline: `${name} data ingested, ${d.records_pulled.toLocaleString()} records pulled`,
        detail: d.findings_summary || undefined,
        source: d.integration,
      });
    } else if (d.started_at && d.status === "ingesting") {
      const name = d.integration.charAt(0).toUpperCase() + d.integration.slice(1);
      items.push({
        id: `data-start-${d.id}`,
        timestamp: d.started_at,
        type: "integration",
        headline: `${name} connected, pulling data...`,
        detail: d.records_pulled > 0 ? `${d.records_pulled.toLocaleString()} records so far` : undefined,
        source: d.integration,
      });
    }
  }

  // Vault completion events
  for (const v of vault.data || []) {
    if (v.completed_at) {
      const sectionName = v.section.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      items.push({
        id: `vault-${v.id}`,
        timestamp: v.completed_at,
        type: "vault",
        headline: `Knowledge base: ${sectionName} section completed`,
        source: "vault",
      });
    }
  }

  // Phase changes
  for (const h of history.data || []) {
    const phaseName = h.phase.charAt(0).toUpperCase() + h.phase.slice(1);
    items.push({
      id: `phase-${h.id}`,
      timestamp: h.entered_at,
      type: "phase_change",
      headline: `Advanced to ${phaseName} phase`,
      source: "system",
    });
  }

  // Patterns / findings
  for (const p of patterns.data || []) {
    items.push({
      id: `pattern-${p.id}`,
      timestamp: p.created_at,
      type: "finding",
      headline: p.description,
      detail: p.insight || undefined,
      source: "intelligence",
    });
  }

  // Approval queue items
  for (const a of approvals.data || []) {
    const agent = roleLabel(a.agent);
    items.push({
      id: `approval-${a.id}`,
      timestamp: a.created_at,
      type: "approval",
      headline: `New action proposal from ${agent}: ${a.title}`,
      detail: a.impact_summary || undefined,
      source: a.agent,
    });
  }

  // Sort by timestamp DESC, take limit
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, limit);
}

// -- Discovery progress computation --

export function computeDiscoveryProgress(
  dataStatus: DataIngestionRow[],
  questions: DiscoveryQuestion[],
  vaultSections: VaultSectionRow[]
): { data: number; questions: number; vault: number; overall: number } {
  const dataComplete = dataStatus.length === 0
    ? 0
    : Math.round((dataStatus.filter((d) => d.status === "complete").length / dataStatus.length) * 100);

  const stats = computeDiscoveryStats(questions);
  const questionsPct = stats.total === 0
    ? 0
    : Math.round(((stats.answered + stats.skipped) / stats.total) * 100);

  const vaultPct = vaultSections.length === 0
    ? 0
    : Math.round((vaultSections.filter((v) => v.status === "complete").length / vaultSections.length) * 100);

  // Weighted average: data 30%, questions 40%, vault 30%
  const overall = Math.round(dataComplete * 0.3 + questionsPct * 0.4 + vaultPct * 0.3);

  return { data: dataComplete, questions: questionsPct, vault: vaultPct, overall };
}
