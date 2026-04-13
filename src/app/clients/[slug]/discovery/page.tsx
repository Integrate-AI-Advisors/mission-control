import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import {
  getDiscoveryQuestions,
  getDiscoveryDataStatus,
  getVaultStatus,
  evaluateDiscoveryGate,
  computeDiscoveryProgress,
  computeDiscoveryStats,
} from "@/lib/queries/phases";
import { VAULT_SECTION_LABELS } from "@/lib/types";
import type { ClientPhase } from "@/lib/types";
import type { DataIngestionRow, VaultSectionRow, PhaseGateResult } from "@/lib/queries/phases";
import { DiscoveryQuestions } from "@/components/discovery-questions";
import { AdvancePhaseButton } from "@/components/advance-phase-button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// -- Progress Ring SVG --

function ProgressRing({
  percentage,
  label,
  subtext,
}: {
  percentage: number;
  label: string;
  subtext: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="6"
        />
        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#4A7C59"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        {/* Percentage text */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground font-mono text-lg font-medium"
          style={{ fontSize: "18px" }}
        >
          {percentage}%
        </text>
      </svg>
      <p className="brand-label mt-2">{label}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtext}</p>
    </div>
  );
}

// -- Data Connection Card --

function DataConnectionCard({ row }: { row: DataIngestionRow }) {
  const name = row.integration.charAt(0).toUpperCase() + row.integration.slice(1);

  const statusDisplay: Record<string, { label: string; dot: string }> = {
    complete: { label: "Connected", dot: "bg-brand-green" },
    ingesting: { label: "Pulling data...", dot: "bg-brand-blue animate-breathe" },
    connected: { label: "Connected", dot: "bg-brand-green" },
    not_connected: { label: "Not connected", dot: "bg-muted-foreground/40" },
    failed: { label: "Failed", dot: "bg-brand-red" },
  };
  const display = statusDisplay[row.status] || statusDisplay.not_connected;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", display.dot)} />
        <p className="text-sm font-medium text-foreground">{name}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{display.label}</p>

      {row.status === "complete" && row.records_pulled > 0 && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {row.records_pulled.toLocaleString()} records
          {row.date_range_start && row.date_range_end && (
            <> &middot; {row.date_range_start} &ndash; {row.date_range_end}</>
          )}
        </p>
      )}

      {row.status === "ingesting" && row.records_pulled > 0 && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {row.records_pulled.toLocaleString()} records so far
        </p>
      )}

      {row.findings_summary && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          &ldquo;{row.findings_summary}&rdquo;
        </p>
      )}

      {row.status === "not_connected" && (
        <p className="mt-2 text-xs text-primary">
          Set up in Integrations tab
        </p>
      )}

      {row.status === "failed" && row.error_message && (
        <p className="mt-2 text-xs text-brand-red">{row.error_message}</p>
      )}

      {/* Click-in detail */}
      {(row.started_at || row.completed_at) && (
        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-[0.6rem] uppercase tracking-[0.06em] text-muted-foreground/60 hover:text-muted-foreground">
            Detail
          </summary>
          <div className="mt-1 rounded bg-secondary/30 px-2 py-1.5 font-mono text-[0.55rem] text-muted-foreground">
            {row.started_at && <p>Started: {new Date(row.started_at).toLocaleString()}</p>}
            {row.completed_at && <p>Completed: {new Date(row.completed_at).toLocaleString()}</p>}
            <p>Records: {row.records_pulled.toLocaleString()}</p>
          </div>
        </details>
      )}
    </div>
  );
}

// -- Vault Checklist --

function VaultChecklist({ sections }: { sections: VaultSectionRow[] }) {
  const statusIcon: Record<string, { icon: string; color: string }> = {
    complete: { icon: "\u2713", color: "text-brand-green" },
    in_progress: { icon: "\u25F7", color: "text-brand-blue" },
    pending: { icon: "\u25CB", color: "text-muted-foreground" },
  };

  const statusText: Record<string, string> = {
    complete: "Complete",
    in_progress: "Building...",
    pending: "Pending",
  };

  return (
    <div className="space-y-1">
      {sections.map((s) => {
        const si = statusIcon[s.status] || statusIcon.pending;
        const label = VAULT_SECTION_LABELS[s.section] || s.section;
        return (
          <div key={s.id} className="flex items-center gap-3 rounded-md px-3 py-2">
            <span className={cn("shrink-0 font-mono text-sm", si.color)}>{si.icon}</span>
            <span className="flex-1 text-sm text-foreground">{label}</span>
            <span className="dotted-leader mx-2 flex-1 border-b border-dotted border-border" />
            <span className={cn(
              "text-xs",
              s.status === "complete" ? "text-brand-green" :
              s.status === "in_progress" ? "text-brand-blue" :
              "text-muted-foreground"
            )}>
              {statusText[s.status] || s.status}
            </span>
          </div>
        );
      })}
      {sections.some((s) => s.status === "in_progress" && s.notes) && (
        <div className="mt-1 px-3">
          {sections
            .filter((s) => s.status === "in_progress" && s.notes)
            .map((s) => (
              <p key={s.id} className="text-xs text-muted-foreground italic">
                {s.notes}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

// -- Gate Panel --

function GatePanel({
  gate,
  clientId,
  clientSlug,
  currentPhase,
}: {
  gate: PhaseGateResult;
  clientId: string;
  clientSlug: string;
  currentPhase: ClientPhase;
}) {
  const passingCount = gate.checks.filter((c) => c.passed).length;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        gate.canAdvance
          ? "border-brand-green/30 bg-brand-green/5"
          : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="brand-label">Ready to move to Dashboard?</p>
        <span className="font-mono text-xs text-muted-foreground">
          {passingCount}/{gate.checks.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {gate.checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className={cn(
                "mt-0.5 shrink-0 font-mono text-sm",
                check.passed ? "text-brand-green" : "text-brand-red"
              )}
            >
              {check.passed ? "\u2713" : "\u2715"}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-foreground">{check.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{check.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        {gate.canAdvance ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-green">
              All checks passing, ready when you are.
            </p>
            <AdvancePhaseButton
              clientId={clientId}
              currentPhase={currentPhase}
              clientSlug={clientSlug}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {gate.reason}
          </p>
        )}
      </div>
    </div>
  );
}

// -- Progress Bar --

function ProgressBar({ percentage, label }: { percentage: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="font-mono text-xs text-muted-foreground">{percentage}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand-green transition-[width] duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// -- Page --

export default async function DiscoveryPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const [questions, dataStatus, vaultSections, gate] = await Promise.all([
    getDiscoveryQuestions(client.id),
    getDiscoveryDataStatus(client.id),
    getVaultStatus(client.id),
    evaluateDiscoveryGate(client.id),
  ]);

  const stats = computeDiscoveryStats(questions);
  const progress = computeDiscoveryProgress(dataStatus, questions, vaultSections);

  const completeData = dataStatus.filter((d) => d.status === "complete").length;
  const completeVault = vaultSections.filter((v) => v.status === "complete").length;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6">
      {/* Section 1: Progress Rings */}
      <section>
        <div className="flex flex-wrap items-start justify-center gap-8 sm:gap-12">
          <ProgressRing
            percentage={progress.data}
            label="Data Connections"
            subtext={`${completeData} of ${dataStatus.length} done`}
          />
          <ProgressRing
            percentage={progress.questions}
            label="Questions"
            subtext={`${stats.answered} of ${stats.total} answered`}
          />
          <ProgressRing
            percentage={progress.vault}
            label="Knowledge Base"
            subtext={`${completeVault} of ${vaultSections.length} sections`}
          />
        </div>

        <div className="mx-auto mt-6 max-w-md">
          <ProgressBar percentage={progress.overall} label="Overall Discovery Progress" />
        </div>
      </section>

      {/* Section 2: Data Connections */}
      <section>
        <p className="brand-label mb-3">Data Connections</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dataStatus.map((row) => (
            <DataConnectionCard key={row.id} row={row} />
          ))}
        </div>
      </section>

      {/* Section 3: Questions */}
      <section>
        <p className="brand-label mb-3">Questions for the Founder</p>
        <DiscoveryQuestions questions={questions} />
      </section>

      {/* Section 4: Knowledge Base */}
      <section>
        <div className="flex items-center justify-between">
          <p className="brand-label">Knowledge Base</p>
          <span className="font-mono text-xs text-muted-foreground">
            {completeVault} of {vaultSections.length} sections
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-border py-2">
          <VaultChecklist sections={vaultSections} />
        </div>
      </section>

      {/* Section 5: Discovery Gate */}
      <section>
        <GatePanel
          gate={gate}
          clientId={client.id}
          clientSlug={client.slug}
          currentPhase={client.phase as ClientPhase}
        />
      </section>
    </div>
  );
}
