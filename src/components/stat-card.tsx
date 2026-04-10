import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  alert?: boolean;
}

export function StatCard({ label, value, subtext, alert }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        alert && "border-destructive/30 bg-destructive/5"
      )}
    >
      <p className="brand-label mb-1">{label}</p>
      <p
        className={cn(
          "font-mono text-2xl font-medium tracking-tight",
          alert ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}
