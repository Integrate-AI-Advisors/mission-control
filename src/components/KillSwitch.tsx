"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function KillSwitch({
  initialState,
}: {
  initialState: boolean;
}) {
  const [running, setRunning] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const router = useRouter();

  const toggle = useCallback(async () => {
    if (running && !confirmStop) {
      setConfirmStop(true);
      return;
    }

    setLoading(true);
    setConfirmStop(false);

    try {
      const action = running ? "stop" : "start";
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setRunning(data.running);

      const delay = action === "stop" ? 3000 : 8000;
      setTimeout(async () => {
        const healthRes = await fetch("/api/gateway");
        const health = await healthRes.json();
        setRunning(health.running);
        router.refresh();
      }, delay);
    } catch {
      // Failed — don't change state
    } finally {
      setLoading(false);
    }
  }, [running, confirmStop, router]);

  function cancelStop() {
    setConfirmStop(false);
  }

  return (
    <div className="flex items-center gap-3">
      {confirmStop && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.6rem] text-brand-red uppercase tracking-[0.06em]">
            Stop all agents?
          </span>
          <button
            onClick={toggle}
            disabled={loading}
            className="font-mono text-[0.6rem] font-semibold px-2 py-1 rounded-card bg-[rgba(194,91,86,0.10)] text-brand-red border border-brand-red/30 hover:bg-[rgba(194,91,86,0.20)] transition-colors duration-300 uppercase tracking-[0.06em]"
          >
            {loading ? "..." : "Confirm"}
          </button>
          <button
            onClick={cancelStop}
            className="font-mono text-[0.6rem] px-2 py-1 rounded-card bg-dark-surface text-text-muted border border-dark-border hover:text-text-primary transition-colors duration-300"
          >
            Cancel
          </button>
        </div>
      )}
      {!confirmStop && (
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
            running
              ? "bg-[rgba(74,124,89,0.20)] border border-[rgba(74,124,89,0.3)]"
              : "bg-dark-surface border border-dark-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
              running
                ? "left-[26px] bg-brand-green shadow-[0_0_8px_rgba(74,124,89,0.3)]"
                : "left-0.5 bg-text-muted"
            }`}
          />
        </button>
      )}
    </div>
  );
}
