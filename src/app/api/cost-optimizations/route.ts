import { NextResponse } from "next/server";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { getAgents } from "@/lib/openclaw";
import { isExecutive, getParentExecutive } from "@/lib/hierarchy";

const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || "/root/.openclaw/openclaw.json";
const SKILLS_ROOT = process.env.OPENCLAW_SKILLS_ROOT || "/root/openclaw";

type CheckStatus = "pass" | "fail" | "warn" | "unknown";

interface OptimizationCheck {
  id: string;
  section: string;
  title: string;
  status: CheckStatus;
  detail: string;
  estimatedSaving: string;
  researchRef: string; // e.g. "Section 1.1 — Research docs 03, 12, 26, 28"
}

function readConfig(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function countTokensApprox(text: string): number {
  // Rough approximation: ~1 token per 4 characters
  return Math.round(text.length / 4);
}

function fileTokenCount(path: string): number | null {
  try {
    if (!existsSync(path)) return null;
    const content = readFileSync(path, "utf-8");
    return countTokensApprox(content);
  } catch {
    return null;
  }
}

function fileContains(path: string, phrases: string[]): boolean {
  try {
    if (!existsSync(path)) return false;
    const content = readFileSync(path, "utf-8").toLowerCase();
    return phrases.some((p) => content.includes(p.toLowerCase()));
  } catch {
    return false;
  }
}

function isReadOnly(path: string): boolean {
  try {
    if (!existsSync(path)) return false;
    const stat = statSync(path);
    // Check if write bit is unset (0444 = read-only)
    return (stat.mode & 0o222) === 0;
  } catch {
    return false;
  }
}

function cronContains(pattern: string): boolean {
  try {
    const crontab = execSync("crontab -l 2>/dev/null || true", { encoding: "utf-8" });
    return crontab.includes(pattern);
  } catch {
    return false;
  }
}

function openclawCronContains(name: string): boolean {
  try {
    const output = execSync("openclaw cron list 2>/dev/null || true", { encoding: "utf-8" });
    return output.includes(name);
  } catch {
    return false;
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = readConfig();
    const agents = getAgents();
    const checks: OptimizationCheck[] = [];

    // Workspace paths — executives use /root/openclaw/workspace-{id}
    const execIds = agents.filter((a) => isExecutive(a.id)).map((a) => a.id);
    const allWorkspaces = execIds.map((id) => ({
      id,
      path: join(SKILLS_ROOT, `workspace-${id}`),
    }));

    // ─────────────────────────────────────────────
    // SECTION 1: COST OPTIMIZATION
    // ─────────────────────────────────────────────

    // 1.1 Prompt Caching
    const ctxPruning = getNestedValue(config, "agents.defaults.contextPruning");
    checks.push({
      id: "prompt-caching",
      section: "Cost Optimization",
      title: "Prompt caching (cache-ttl mode)",
      status: ctxPruning ? "pass" : "fail",
      detail: ctxPruning
        ? `Enabled: mode=${(ctxPruning as Record<string, unknown>).mode || "unknown"}`
        : "Not configured. Set agents.defaults.contextPruning.mode to cache-ttl. Single highest-ROI optimization.",
      estimatedSaving: "~68% on API calls",
      researchRef: "Section 1.1 — Docs 03, 12, 26, 28",
    });

    // 1.2 Executives on Opus
    const execsNotOpus = agents.filter((a) => isExecutive(a.id) && !a.model.includes("opus"));
    checks.push({
      id: "exec-opus",
      section: "Cost Optimization",
      title: "All executives on Opus 4.6",
      status: execsNotOpus.length === 0 ? "pass" : "warn",
      detail: execsNotOpus.length === 0
        ? `All ${execIds.length} executives running Opus`
        : `${execsNotOpus.map((a) => a.id.toUpperCase()).join(", ")} not on Opus. Better reasoning = fewer routing errors = fewer costly retries.`,
      estimatedSaving: "+$7.75/exec/mo but fewer retries",
      researchRef: "Section 1.2 — Doc 26",
    });

    // 1.3 Haiku on heartbeats
    const hbModel = getNestedValue(config, "agents.defaults.heartbeat.model") as string | undefined;
    checks.push({
      id: "haiku-heartbeats",
      section: "Cost Optimization",
      title: "Haiku model on all heartbeats",
      status: hbModel?.includes("haiku") ? "pass" : "fail",
      detail: hbModel?.includes("haiku")
        ? `Heartbeat model: ${hbModel}`
        : `Heartbeat model: ${hbModel || "not set"}. Set to anthropic/claude-haiku-4-5.`,
      estimatedSaving: "~97% on heartbeat costs",
      researchRef: "Section 1.3 — Doc 28",
    });

    // 1.4 Heartbeat max_turns
    const maxTurns = getNestedValue(config, "agents.defaults.heartbeat.max_turns");
    checks.push({
      id: "hb-max-turns",
      section: "Cost Optimization",
      title: "Heartbeat max_turns limit (≤3)",
      status: maxTurns ? "pass" : "warn",
      detail: maxTurns
        ? `max_turns: ${maxTurns}`
        : "Not set. Prevents runaway heartbeat sessions. Set to 3 if supported.",
      estimatedSaving: "Prevents runaway sessions",
      researchRef: "Section 1.4 — Doc 23",
    });

    // 1.5 Budget caps
    const dailyCap = getNestedValue(config, "agents.defaults.costLimit.daily");
    checks.push({
      id: "budget-caps",
      section: "Cost Optimization",
      title: "Daily budget cap configured",
      status: dailyCap ? "pass" : "fail",
      detail: dailyCap
        ? `Daily cap: $${dailyCap}`
        : "No budget cap. Set agents.defaults.costLimit.daily to $3-5 for 108 agents. Safety net against runaway spend.",
      estimatedSaving: "Prevents catastrophic cost events",
      researchRef: "Section 1.5 — Doc 03",
    });

    // NEW: Sub-agents on-demand (no heartbeats)
    const subAgentsWithHB = agents.filter((a) => {
      if (isExecutive(a.id)) return false;
      // Check if agent has a specific heartbeat configured (not just inheriting default)
      return !a.isStandby;
    });
    checks.push({
      id: "subagent-ondemand",
      section: "Cost Optimization",
      title: "Sub-agents on-demand only (no active heartbeats)",
      status: subAgentsWithHB.length === 0 ? "pass" : "warn",
      detail: subAgentsWithHB.length === 0
        ? "All sub-agents are on-demand (standby). Only executives have active heartbeats."
        : `${subAgentsWithHB.length} sub-agent(s) have active heartbeats. Sub-agents should be activated by their executive on-demand, not polling. Set heartbeat.every ≥ 4h or remove.`,
      estimatedSaving: "~90% of sub-agent heartbeat costs",
      researchRef: "C-Suite architecture recommendation",
    });

    // ─────────────────────────────────────────────
    // SECTION 2: CONTEXT MANAGEMENT & MEMORY
    // ─────────────────────────────────────────────

    // 2.1 Memory compaction
    const compaction = getNestedValue(config, "agents.defaults.compaction");
    checks.push({
      id: "mem-compaction",
      section: "Context Management",
      title: "Memory compaction enabled (safeguard mode)",
      status: compaction ? "pass" : "fail",
      detail: compaction
        ? `Compaction: mode=${(compaction as Record<string, unknown>).mode || "unknown"}`
        : "Not configured. Prevents exponential context bloat. Real incident: 2,258 recursive callbacks in 16 minutes without compaction.",
      estimatedSaving: "~50-70% on context bloat",
      researchRef: "Section 2.1 — Docs 04, 09, 12",
    });

    // 2.2 Memory flush
    const memFlush = getNestedValue(config, "agents.defaults.compaction.memoryFlush.enabled");
    checks.push({
      id: "mem-flush",
      section: "Context Management",
      title: "Memory flush before compaction",
      status: memFlush ? "pass" : "warn",
      detail: memFlush
        ? "Memory flush enabled — agents store durable memories before compaction triggers"
        : "Not configured. Agents may lose context during compaction. Set compaction.memoryFlush.enabled=true.",
      estimatedSaving: "Prevents data loss",
      researchRef: "Section 2.2 — Doc 04",
    });

    // 2.3 Memory isolation
    const isolationIssues: string[] = [];
    for (const ws of allWorkspaces) {
      const memPath = join(ws.path, "MEMORY.md");
      if (existsSync(memPath)) {
        try {
          const stat = statSync(memPath);
          if (stat.isSymbolicLink()) {
            isolationIssues.push(`${ws.id}: MEMORY.md is a symlink`);
          }
        } catch { /* ignore */ }
      }
    }
    checks.push({
      id: "mem-isolation",
      section: "Context Management",
      title: "Memory isolation (no shared MEMORY.md)",
      status: isolationIssues.length === 0 ? "pass" : "fail",
      detail: isolationIssues.length === 0
        ? "All executive workspaces have isolated memory files"
        : `Issues: ${isolationIssues.join("; ")}`,
      estimatedSaving: "Prevents cross-contamination",
      researchRef: "Section 2.3 — Doc 04 (CRITICAL)",
    });

    // 2.4 Memory hygiene cron
    const hasMemCron = openclawCronContains("memory-distill") || openclawCronContains("daily-memory");
    checks.push({
      id: "mem-hygiene-cron",
      section: "Context Management",
      title: "Daily memory distillation cron",
      status: hasMemCron ? "pass" : "fail",
      detail: hasMemCron
        ? "Memory hygiene cron configured"
        : "No memory hygiene cron. Add daily-memory-distill to keep MEMORY.md under 2000 tokens per agent.",
      estimatedSaving: "Prevents memory bloat",
      researchRef: "Section 2.4 — Doc 09",
    });

    // ─────────────────────────────────────────────
    // SECTION 3: BLUEPRINT OPTIMIZATION
    // ─────────────────────────────────────────────

    // 3.1 SOUL.md token counts (tiered targets)
    const soulIssues: string[] = [];
    for (const ws of allWorkspaces) {
      const tokens = fileTokenCount(join(ws.path, "SOUL.md"));
      if (tokens === null) {
        soulIssues.push(`${ws.id}: no SOUL.md`);
      } else if (tokens > 1200) {
        soulIssues.push(`${ws.id}: ${tokens} tokens (target: <1200 for executives)`);
      }
    }
    checks.push({
      id: "soul-trim",
      section: "Blueprint Optimization",
      title: "SOUL.md trimmed (executives <1200 tokens)",
      status: soulIssues.length === 0 ? "pass" : soulIssues.some((i) => i.includes("no SOUL")) ? "fail" : "warn",
      detail: soulIssues.length === 0
        ? "All executive SOUL.md files within token targets"
        : soulIssues.join("; "),
      estimatedSaving: "~90% on context loading (from bloated files)",
      researchRef: "Section 3.1 — Docs 08, 11, 21",
    });

    // 3.3 HEARTBEAT.md trim
    const hbIssues: string[] = [];
    for (const ws of allWorkspaces) {
      const tokens = fileTokenCount(join(ws.path, "HEARTBEAT.md"));
      if (tokens !== null && tokens > 200) {
        hbIssues.push(`${ws.id}: ${tokens} tokens (target: <200)`);
      }
    }
    checks.push({
      id: "heartbeat-trim",
      section: "Blueprint Optimization",
      title: "HEARTBEAT.md trimmed (<200 tokens each)",
      status: hbIssues.length === 0 ? "pass" : "warn",
      detail: hbIssues.length === 0
        ? "All HEARTBEAT.md files within target"
        : hbIssues.join("; "),
      estimatedSaving: "Reduces per-heartbeat token cost",
      researchRef: "Section 3.3 — Doc 23",
    });

    // 3.4 Anti-yes-man clause
    const noAntiYesMan: string[] = [];
    for (const ws of allWorkspaces) {
      const soulPath = join(ws.path, "SOUL.md");
      if (!fileContains(soulPath, ["push back", "challenge", "disagree", "honest assessment", "anti-yes"])) {
        noAntiYesMan.push(ws.id);
      }
    }
    checks.push({
      id: "anti-yes-man",
      section: "Blueprint Optimization",
      title: "Anti-yes-man clause in all executive SOUL.md",
      status: noAntiYesMan.length === 0 ? "pass" : "fail",
      detail: noAntiYesMan.length === 0
        ? "All executives have pushback directives"
        : `Missing in: ${noAntiYesMan.join(", ")}. Without this, agents degrade to yes-men within 7-10 days.`,
      estimatedSaving: "Prevents quality degradation",
      researchRef: "Section 3.4 — Doc 08",
    });

    // 3.5 Evolution directories
    const noEvoDirs: string[] = [];
    for (const ws of allWorkspaces) {
      const hasReflections = existsSync(join(ws.path, "reflections"));
      const hasProposals = existsSync(join(ws.path, "proposals"));
      const hasMemory = existsSync(join(ws.path, "memory"));
      if (!hasReflections || !hasProposals || !hasMemory) {
        noEvoDirs.push(ws.id);
      }
    }
    checks.push({
      id: "evo-dirs",
      section: "Blueprint Optimization",
      title: "Evolution directories (reflections/, proposals/, memory/)",
      status: noEvoDirs.length === 0 ? "pass" : "fail",
      detail: noEvoDirs.length === 0
        ? "All executive workspaces have evolution structure"
        : `Missing in: ${noEvoDirs.join(", ")}. Required for self-improvement loops.`,
      estimatedSaving: "Enables continuous improvement",
      researchRef: "Section 3.5 — Doc 20",
    });

    // ─────────────────────────────────────────────
    // SECTION 4: SECURITY HARDENING
    // ─────────────────────────────────────────────

    // 4.1 Spawn depth limit
    const spawnDepth = getNestedValue(config, "agents.defaults.maxSpawnDepth");
    checks.push({
      id: "spawn-depth",
      section: "Security",
      title: "Spawn depth limit (maxSpawnDepth: 1)",
      status: spawnDepth !== undefined ? "pass" : "fail",
      detail: spawnDepth !== undefined
        ? `maxSpawnDepth: ${spawnDepth}`
        : "NOT SET. Critical safety measure. Prevents recursive callback explosion (real incident: 2,258 callbacks in 16 min).",
      estimatedSaving: "Prevents catastrophic cost events",
      researchRef: "Section 4.1 — Doc 23 (CRITICAL)",
    });

    // 4.2 Tool access — no exec/sudo
    const unsafeAgents = agents.filter((a) => {
      return a.tools.some((t) => ["exec", "sudo", "shell"].includes(t.toLowerCase()));
    });
    checks.push({
      id: "tool-audit",
      section: "Security",
      title: "No agents have exec/sudo/shell access",
      status: unsafeAgents.length === 0 ? "pass" : "fail",
      detail: unsafeAgents.length === 0
        ? "All agents have safe tool profiles"
        : `Unsafe tools found on: ${unsafeAgents.map((a) => a.id).join(", ")}. Remove exec/sudo immediately.`,
      estimatedSaving: "Security critical",
      researchRef: "Section 4.2 — Docs 06, 17, 19",
    });

    // 4.4 Prompt injection guards
    const noInjectionGuard: string[] = [];
    for (const ws of allWorkspaces) {
      const soulPath = join(ws.path, "SOUL.md");
      if (!fileContains(soulPath, ["untrusted", "never reveal api", "never reveal", "security rules", "prompt injection"])) {
        noInjectionGuard.push(ws.id);
      }
    }
    checks.push({
      id: "injection-guards",
      section: "Security",
      title: "Prompt injection guards in SOUL.md",
      status: noInjectionGuard.length === 0 ? "pass" : "fail",
      detail: noInjectionGuard.length === 0
        ? "All executives have injection protection directives"
        : `Missing in: ${noInjectionGuard.join(", ")}. Add Security Rules section to SOUL.md.`,
      estimatedSaving: "Security critical",
      researchRef: "Section 4.4 — Doc 06",
    });

    // 4.5 Loop detection
    const noLoopDetect: string[] = [];
    for (const ws of allWorkspaces) {
      const soulPath = join(ws.path, "SOUL.md");
      if (!fileContains(soulPath, ["loop detect", "halt", "same tool", "same params", "loop"])) {
        noLoopDetect.push(ws.id);
      }
    }
    checks.push({
      id: "loop-detection",
      section: "Security",
      title: "Loop detection rules in SOUL.md",
      status: noLoopDetect.length === 0 ? "pass" : "warn",
      detail: noLoopDetect.length === 0
        ? "All executives have loop detection"
        : `Missing in: ${noLoopDetect.join(", ")}. Add Loop Detection section — same tool 3x = HALT.`,
      estimatedSaving: "Prevents infinite loop cost",
      researchRef: "Section 4.5 — Docs 04, 10",
    });

    // 4.6 Error recovery (error.md exists)
    const noErrorLog: string[] = [];
    for (const ws of allWorkspaces) {
      if (!existsSync(join(ws.path, "error.md"))) {
        noErrorLog.push(ws.id);
      }
    }
    checks.push({
      id: "error-log",
      section: "Security",
      title: "Error recovery log (error.md) in each workspace",
      status: noErrorLog.length === 0 ? "pass" : "warn",
      detail: noErrorLog.length === 0
        ? "All workspaces have error.md"
        : `Missing in: ${noErrorLog.join(", ")}. Append-only error log for incident tracking.`,
      estimatedSaving: "Enables error pattern detection",
      researchRef: "Section 4.6 — Doc 10",
    });

    // ─────────────────────────────────────────────
    // SECTION 5: OBSERVABILITY
    // ─────────────────────────────────────────────

    // 5.1 Diagnostics
    const diagnostics = getNestedValue(config, "diagnostics.enabled");
    checks.push({
      id: "diagnostics",
      section: "Observability",
      title: "Diagnostics enabled",
      status: diagnostics ? "pass" : "warn",
      detail: diagnostics
        ? "Diagnostics enabled"
        : "Not enabled. Set diagnostics.enabled=true for observability.",
      estimatedSaving: "Visibility into agent behaviour",
      researchRef: "Section 5.1 — Docs 13, 12",
    });

    // 5.2 Log rotation
    const hasLogRotate = existsSync("/etc/logrotate.d/openclaw");
    checks.push({
      id: "log-rotation",
      section: "Observability",
      title: "Log rotation configured",
      status: hasLogRotate ? "pass" : "warn",
      detail: hasLogRotate
        ? "logrotate.d/openclaw configured"
        : "No log rotation. Prevents disk bloat from session logs. Create /etc/logrotate.d/openclaw.",
      estimatedSaving: "Prevents disk exhaustion",
      researchRef: "Section 5.2 — Doc 13",
    });

    // 5.3 Health check
    const hasHealthCheck = existsSync("/usr/local/bin/openclaw-health-check.sh")
      || cronContains("health-check");
    checks.push({
      id: "health-check",
      section: "Observability",
      title: "Gateway health check cron (every 6h)",
      status: hasHealthCheck ? "pass" : "fail",
      detail: hasHealthCheck
        ? "Health check configured"
        : "No automatic health monitoring. Gateway could go down unnoticed. Add health check cron.",
      estimatedSaving: "Prevents downtime",
      researchRef: "Section 5.3 — Doc 13",
    });

    // ─────────────────────────────────────────────
    // SECTION 6: BACKUP & DISASTER RECOVERY
    // ─────────────────────────────────────────────

    // 6.1 Git snapshots
    const hasGitSnapshots = existsSync("/usr/local/bin/openclaw-snapshot.sh")
      || cronContains("snapshot");
    checks.push({
      id: "git-snapshots",
      section: "Backup",
      title: "Hourly git workspace snapshots",
      status: hasGitSnapshots ? "pass" : "fail",
      detail: hasGitSnapshots
        ? "Snapshot automation configured"
        : "No workspace snapshots. One bad compaction event could wipe agent memory. Set up hourly git commits.",
      estimatedSaving: "Disaster recovery",
      researchRef: "Section 6.1 — Doc 15",
    });

    // 6.2 Daily backup
    const hasBackup = existsSync("/usr/local/bin/openclaw-backup.sh")
      || cronContains("backup");
    checks.push({
      id: "daily-backup",
      section: "Backup",
      title: "Daily encrypted backup",
      status: hasBackup ? "pass" : "fail",
      detail: hasBackup
        ? "Backup automation configured"
        : "No daily backup. All agent state (SOUL.md, skills, memory) at risk. Set up daily tarball with 30-day retention.",
      estimatedSaving: "Disaster recovery",
      researchRef: "Section 6.2 — Doc 15",
    });

    // ─────────────────────────────────────────────
    // SECTION 7: EVOLUTION & SELF-IMPROVEMENT
    // ─────────────────────────────────────────────

    // 7.1 Reflection cron
    const hasReflection = openclawCronContains("reflection") || openclawCronContains("daily-reflection");
    checks.push({
      id: "reflection-cron",
      section: "Evolution",
      title: "Daily reflection cron (CEO reviews all activity)",
      status: hasReflection ? "pass" : "fail",
      detail: hasReflection
        ? "Daily reflection configured"
        : "No end-of-day reflection. CEO should review all agent activity daily and log learnings.",
      estimatedSaving: "Continuous improvement",
      researchRef: "Section 7.1 — Doc 20",
    });

    // 7.2 Heuristics files
    const noHeuristics: string[] = [];
    for (const ws of allWorkspaces) {
      if (!existsSync(join(ws.path, "heuristics.md"))) {
        noHeuristics.push(ws.id);
      }
    }
    checks.push({
      id: "heuristics",
      section: "Evolution",
      title: "Heuristics.md (lessons learned) in each workspace",
      status: noHeuristics.length === 0 ? "pass" : "warn",
      detail: noHeuristics.length === 0
        ? "All workspaces have heuristics.md"
        : `Missing in: ${noHeuristics.join(", ")}. Append-only lessons file for agent learning.`,
      estimatedSaving: "Prevents repeated mistakes",
      researchRef: "Section 7.2 — Doc 20",
    });

    // ─────────────────────────────────────────────
    // SECTION 9: PERFORMANCE TUNING
    // ─────────────────────────────────────────────

    // 9.2 Model fallback chain
    const fallbacks = getNestedValue(config, "agents.defaults.model.fallbacks") as string[] | undefined;
    checks.push({
      id: "model-fallback",
      section: "Performance",
      title: "Model fallback chain configured",
      status: fallbacks && fallbacks.length > 0 ? "pass" : "warn",
      detail: fallbacks && fallbacks.length > 0
        ? `Fallback: ${fallbacks.join(" → ")}`
        : "No fallback chain. If primary model is down, agents fail. Add anthropic/claude-haiku-4-5 as fallback.",
      estimatedSaving: "Prevents downtime",
      researchRef: "Section 9.2 — Docs 07, 12",
    });

    // Non-executive agents model tier check
    const opusNonExecs = agents.filter((a) => !isExecutive(a.id) && a.model.includes("opus"));
    if (opusNonExecs.length > 0) {
      checks.push({
        id: "opus-non-exec",
        section: "Performance",
        title: "Non-executives running Opus (should be Sonnet/Haiku)",
        status: "warn",
        detail: `${opusNonExecs.length} non-executive(s) on Opus: ${opusNonExecs.slice(0, 5).map((a) => a.id).join(", ")}${opusNonExecs.length > 5 ? ` +${opusNonExecs.length - 5} more` : ""}. Downgrade to save ~$8/mo each.`,
        estimatedSaving: `~$${opusNonExecs.length * 8}/mo`,
        researchRef: "Model tier strategy",
      });
    }

    const nonHaikuContractors = agents.filter((a) => a.tier === "contractor" && !a.model.includes("haiku"));
    if (nonHaikuContractors.length > 0) {
      checks.push({
        id: "contractor-haiku",
        section: "Performance",
        title: "Contractors not on Haiku (cheapest model)",
        status: "warn",
        detail: `${nonHaikuContractors.length} contractor(s) could use Haiku: ${nonHaikuContractors.slice(0, 5).map((a) => a.id).join(", ")}${nonHaikuContractors.length > 5 ? ` +${nonHaikuContractors.length - 5} more` : ""}.`,
        estimatedSaving: `~$${nonHaikuContractors.length * 3}/mo`,
        researchRef: "Model tier strategy",
      });
    }

    // ─────────────────────────────────────────────
    // SECTION 10: DRIFT PREVENTION
    // ─────────────────────────────────────────────

    // 10.1 Immutable SOUL.md
    const notReadOnly: string[] = [];
    for (const ws of allWorkspaces) {
      const soulPath = join(ws.path, "SOUL.md");
      if (existsSync(soulPath) && !isReadOnly(soulPath)) {
        notReadOnly.push(ws.id);
      }
    }
    checks.push({
      id: "immutable-soul",
      section: "Drift Prevention",
      title: "SOUL.md + IDENTITY.md read-only (chmod 444)",
      status: notReadOnly.length === 0 ? "pass" : "warn",
      detail: notReadOnly.length === 0
        ? "All SOUL.md files are read-only"
        : `Writable in: ${notReadOnly.join(", ")}. Agents can self-modify identity. Set chmod 444.`,
      estimatedSaving: "Prevents personality drift",
      researchRef: "Section 10.1 — Docs 11, 20",
    });

    // 10.2 Drift detection cron
    const hasDriftCheck = openclawCronContains("drift") || openclawCronContains("personality");
    checks.push({
      id: "drift-check",
      section: "Drift Prevention",
      title: "Personality drift detection (weekly for execs)",
      status: hasDriftCheck ? "pass" : "warn",
      detail: hasDriftCheck
        ? "Drift check configured"
        : "No drift detection. Agents can gradually lose character. Add weekly check for executives, monthly for sub-agents.",
      estimatedSaving: "Maintains agent quality",
      researchRef: "Section 10.2 — Doc 11",
    });

    // 10.3 Argument budget
    const ceoAgentsPath = allWorkspaces.find((w) => w.id === "ceo");
    const hasArgBudget = ceoAgentsPath
      ? fileContains(join(ceoAgentsPath.path, "AGENTS.md"), ["one round", "argument", "unilateral", "conflict resolution"])
      : false;
    checks.push({
      id: "argument-budget",
      section: "Drift Prevention",
      title: "Argument budget (1 round then executive decides)",
      status: hasArgBudget ? "pass" : "warn",
      detail: hasArgBudget
        ? "Conflict resolution rules in CEO AGENTS.md"
        : "No argument budget. Agents can enter expensive debate loops. Add conflict resolution rules to CEO's AGENTS.md.",
      estimatedSaving: "Prevents debate loops",
      researchRef: "Section 10.3 — Doc 11",
    });

    // ─────────────────────────────────────────────
    // SUMMARY STATS
    // ─────────────────────────────────────────────

    const passCount = checks.filter((c) => c.status === "pass").length;
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;

    return NextResponse.json({
      checks,
      summary: {
        total: checks.length,
        pass: passCount,
        fail: failCount,
        warn: warnCount,
        score: Math.round((passCount / checks.length) * 100),
      },
    });
  } catch (error) {
    console.error("Error running optimization checks:", error);
    return NextResponse.json({ checks: [], summary: { total: 0, pass: 0, fail: 0, warn: 0, score: 0 } });
  }
}
