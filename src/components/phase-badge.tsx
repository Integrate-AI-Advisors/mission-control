import { cn } from "@/lib/utils";
import type { ClientPhase } from "@/lib/types";
import { PHASE_COLORS, PHASE_LABELS } from "@/lib/types";

const phaseClasses: Record<ClientPhase, string> = {
  discovery: "bg-brand-green/10 text-brand-green border-brand-green/20",
  dashboard: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  intelligence: "bg-terra/10 text-terra border-terra/20",
  operations: "bg-brand-purple/10 text-brand-purple border-brand-purple/20",
};

export function PhaseBadge({ phase, className }: { phase: ClientPhase; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em]",
        phaseClasses[phase],
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full animate-breathe"
        style={{ backgroundColor: PHASE_COLORS[phase] }}
      />
      {PHASE_LABELS[phase]}
    </span>
  );
}
