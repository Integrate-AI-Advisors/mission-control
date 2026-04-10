"use client";

import { usePolling } from "@/lib/hooks/use-polling";

/**
 * Drop this into any layout to enable server data polling.
 * Uses router.refresh() to re-render Server Components every 15s.
 * No client-side Supabase connection needed (all server-side via service key).
 */
export function PollingProvider({
  intervalMs = 15_000,
  children,
}: {
  intervalMs?: number;
  children: React.ReactNode;
}) {
  usePolling(intervalMs);
  return <>{children}</>;
}
