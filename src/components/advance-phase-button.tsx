"use client";

import { useState, useTransition } from "react";
import { advanceClientPhase } from "@/lib/actions/phases";
import type { ClientPhase } from "@/lib/types";
import { PHASE_LABELS } from "@/lib/types";

const NEXT_PHASE: Partial<Record<ClientPhase, ClientPhase>> = {
  discovery: "dashboard",
  dashboard: "intelligence",
  intelligence: "operations",
};

interface Props {
  clientId: string;
  currentPhase: ClientPhase;
  clientSlug: string;
}

export function AdvancePhaseButton({ clientId, currentPhase, clientSlug }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextPhase = NEXT_PHASE[currentPhase];
  if (!nextPhase) return null;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await advanceClientPhase(clientId, currentPhase, clientSlug);
      if (!result.success) {
        setError(result.error || "Failed to advance phase");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-brand-green px-4 py-2 font-mono text-sm font-semibold text-white transition-colors hover:bg-brand-green/90 disabled:opacity-50"
      >
        {isPending ? "Advancing..." : `Advance to ${PHASE_LABELS[nextPhase]}`}
      </button>
      {error && (
        <p className="mt-2 text-sm text-brand-red">{error}</p>
      )}
    </div>
  );
}
