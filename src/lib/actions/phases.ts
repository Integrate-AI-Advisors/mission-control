"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { advancePhase } from "@/lib/clients";
import { evaluateDiscoveryGate, evaluateDashboardGate } from "@/lib/queries/phases";
import type { ClientPhase } from "@/lib/types";

export async function advanceClientPhase(
  clientId: string,
  currentPhase: ClientPhase,
  clientSlug: string
): Promise<{ success: boolean; error?: string }> {
  // Re-evaluate the gate (data may have changed between render and click)
  let gate;
  if (currentPhase === "discovery") {
    gate = await evaluateDiscoveryGate(clientId);
  } else if (currentPhase === "dashboard") {
    gate = await evaluateDashboardGate(clientId);
  } else {
    return { success: false, error: `Cannot advance from ${currentPhase} here` };
  }

  if (!gate.canAdvance) {
    return { success: false, error: gate.reason };
  }

  try {
    // Set exited_at on current phase_history row
    const supabase = getSupabaseAdmin();
    await supabase
      .from("phase_history")
      .update({ exited_at: new Date().toISOString() })
      .eq("client_id", clientId)
      .is("exited_at", null);

    // Advance the phase (atomic guard in clients.ts)
    const updated = await advancePhase(clientId, currentPhase);

    // Insert new phase_history row
    await supabase.from("phase_history").insert({
      client_id: clientId,
      phase: updated.phase,
      entered_at: new Date().toISOString(),
    });

    revalidatePath(`/clients/${clientSlug}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to advance phase";
    return { success: false, error: message };
  }
}
