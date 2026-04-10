import type { Integration } from "@/lib/queries/integrations";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

const healthDot: Record<string, string> = {
  healthy: "bg-brand-green",
  degraded: "bg-brand-amber",
  down: "bg-brand-red",
  unknown: "bg-muted-foreground",
};

export function IntegrationGrid({ integrations }: { integrations: Integration[] }) {
  if (integrations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="font-serif text-lg text-foreground">No integrations configured</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up integrations to monitor service health.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {integrations.map((integration) => (
        <div
          key={integration.id}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              healthDot[integration.health_status] || healthDot.unknown,
              integration.health_status === "healthy" && "animate-breathe"
            )}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{integration.service}</p>
            <p className="brand-caption">
              {integration.health_checked_at
                ? formatRelativeTime(integration.health_checked_at)
                : "Never checked"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
