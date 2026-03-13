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

      // Wait for gateway to fully stop/start, then verify
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
          <span className="font-mono text-[11px] text-red-400">
            Stop all employees?
          </span>
          <button
            onClick={toggle}
            disabled={loading}
            className="font-mono text-[11px] px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            {loading ? "..." : "Confirm"}
          </button>
          <button
            onClick={cancelStop}
            className="font-mono text-[11px] px-2 py-1 rounded bg-dark-surface text-text-muted border border-dark-border hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {!confirmStop && (
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
            running
              ? "bg-status-green/30 border border-[rgba(34,197,94,0.3)]"
              : "bg-dark-surface border border-dark-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
              running
                ? "left-[26px] bg-status-green shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                : "left-0.5 bg-text-dim"
            }`}
          />
        </button>
      )}
    </div>
  );
}
