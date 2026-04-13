import { cn } from "@/lib/utils";
import { PHASE_LABELS, PHASE_COLORS } from "@/lib/types";
import type { ClientPhase } from "@/lib/types";
import type { PhaseHistoryEntry } from "@/lib/queries/phases";
import {
  computePhaseState,
  PHASE_TARGET_DAYS,
  PHASE_SUBTITLES,
} from "@/lib/queries/phases";

const PHASE_ORDER: ClientPhase[] = ["discovery", "dashboard", "intelligence", "operations"];

interface Props {
  currentPhase: ClientPhase;
  phaseHistory: PhaseHistoryEntry[];
  clientName: string;
}

function PhaseNode({
  phase,
  state,
  daysInPhase,
  clientName,
}: {
  phase: ClientPhase;
  state: "completed" | "current" | "future";
  daysInPhase: number | null;
  clientName: string;
}) {
  const color = PHASE_COLORS[phase];
  const target = PHASE_TARGET_DAYS[phase];
  const subtitle = PHASE_SUBTITLES[phase](clientName);
  const overdue = state === "current" && target && daysInPhase !== null && daysInPhase > target * 2;

  let dayLabel: string;
  if (state === "completed") {
    dayLabel = daysInPhase !== null ? `Completed in ${daysInPhase} day${daysInPhase !== 1 ? "s" : ""}` : "Completed";
  } else if (state === "current") {
    if (overdue) {
      dayLabel = `Day ${daysInPhase}`;
    } else if (target) {
      dayLabel = `Day ${daysInPhase ?? 0} of ~${target}`;
    } else {
      dayLabel = daysInPhase !== null ? `${daysInPhase} day${daysInPhase !== 1 ? "s" : ""}` : "";
    }
  } else {
    dayLabel = "Locked";
  }

  return (
    <div className="flex flex-col items-center text-center">
      {/* Circle indicator */}
      <div className="relative flex h-10 w-10 items-center justify-center">
        {state === "completed" ? (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: color }}
          >
            <span className="text-sm font-semibold text-white">{"\u2713"}</span>
          </div>
        ) : state === "current" ? (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border-2"
            style={{ borderColor: color }}
          >
            <span
              className="h-3 w-3 rounded-full animate-breathe"
              style={{ backgroundColor: color }}
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border">
            <span className="h-3 w-3 rounded-full bg-border" />
          </div>
        )}
      </div>

      {/* Phase label */}
      <p
        className={cn(
          "mt-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]",
          state === "future" ? "text-muted-foreground/50" : ""
        )}
        style={state !== "future" ? { color } : undefined}
      >
        {PHASE_LABELS[phase]}
      </p>

      {/* Subtitle */}
      <p
        className={cn(
          "mt-0.5 max-w-[160px] text-xs",
          state === "future" ? "text-muted-foreground/40" : "text-muted-foreground"
        )}
      >
        {subtitle}
      </p>

      {/* Day counter */}
      <p
        className={cn(
          "mt-0.5 font-mono text-[0.55rem]",
          state === "future" ? "text-muted-foreground/30" : "text-muted-foreground"
        )}
      >
        {dayLabel}
      </p>
      {overdue && (
        <p className="mt-0.5 text-[0.5rem] text-muted-foreground/60">
          Taking longer than usual
        </p>
      )}
    </div>
  );
}

function ConnectingLine({ completed }: { completed: boolean }) {
  return (
    <div className="mt-5 hidden flex-1 sm:block">
      <div
        className={cn(
          "h-0.5 w-full",
          completed
            ? "bg-brand-green"
            : "border-b border-dashed border-border"
        )}
      />
    </div>
  );
}

function ConnectingLineVertical({ completed }: { completed: boolean }) {
  return (
    <div className="flex justify-center sm:hidden">
      <div
        className={cn(
          "h-6 w-0.5",
          completed
            ? "bg-brand-green"
            : "border-l border-dashed border-border"
        )}
      />
    </div>
  );
}

export function PhaseProgress({ currentPhase, phaseHistory, clientName }: Props) {
  const states = PHASE_ORDER.map((phase) =>
    computePhaseState(phase, currentPhase, phaseHistory)
  );

  return (
    <div className="rounded-lg border border-border p-4 sm:p-6">
      {/* Desktop: horizontal */}
      <div className="hidden items-start sm:flex">
        {PHASE_ORDER.map((phase, i) => (
          <div key={phase} className="contents">
            <PhaseNode
              phase={phase}
              state={states[i].state}
              daysInPhase={states[i].daysInPhase}
              clientName={clientName}
            />
            {i < PHASE_ORDER.length - 1 && (
              <ConnectingLine completed={states[i].state === "completed"} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="space-y-0 sm:hidden">
        {PHASE_ORDER.map((phase, i) => (
          <div key={phase}>
            <div className="flex items-center gap-3">
              {/* Circle */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                {states[i].state === "completed" ? (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: PHASE_COLORS[phase] }}
                  >
                    <span className="text-xs font-semibold text-white">{"\u2713"}</span>
                  </div>
                ) : states[i].state === "current" ? (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                    style={{ borderColor: PHASE_COLORS[phase] }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full animate-breathe"
                      style={{ backgroundColor: PHASE_COLORS[phase] }}
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border">
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]",
                    states[i].state === "future" ? "text-muted-foreground/50" : ""
                  )}
                  style={states[i].state !== "future" ? { color: PHASE_COLORS[phase] } : undefined}
                >
                  {PHASE_LABELS[phase]}
                </p>
                <p className={cn(
                  "text-xs",
                  states[i].state === "future" ? "text-muted-foreground/40" : "text-muted-foreground"
                )}>
                  {PHASE_SUBTITLES[phase](clientName)}
                </p>
              </div>

              {/* Day label */}
              <span className={cn(
                "ml-auto shrink-0 font-mono text-[0.55rem]",
                states[i].state === "future" ? "text-muted-foreground/30" : "text-muted-foreground"
              )}>
                {states[i].state === "completed"
                  ? states[i].daysInPhase !== null
                    ? `${states[i].daysInPhase}d`
                    : ""
                  : states[i].state === "current"
                    ? PHASE_TARGET_DAYS[phase]
                      ? `Day ${states[i].daysInPhase ?? 0}/~${PHASE_TARGET_DAYS[phase]}`
                      : `${states[i].daysInPhase ?? 0}d`
                    : "Locked"}
              </span>
            </div>

            {i < PHASE_ORDER.length - 1 && (
              <ConnectingLineVertical completed={states[i].state === "completed"} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
