"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls by calling router.refresh() on an interval.
 * This re-fetches all Server Component data without a full page reload.
 * Uses the service role key server-side, so no RLS concerns.
 */
export function usePolling(intervalMs = 15_000) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    intervalRef.current = setInterval(refresh, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, intervalMs]);

  return { refresh };
}
