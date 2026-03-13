import type { SoftwareItem } from "@/lib/types";

const statusDot: Record<SoftwareItem["status"], string> = {
  connected: "bg-status-green",
  pending: "bg-status-amber",
  "needs-setup": "bg-text-dim",
};

const statusTooltip: Record<SoftwareItem["status"], string> = {
  connected: "Connected",
  pending: "Account created, needs connecting",
  "needs-setup": "Needs setup",
};

export default function SoftwareStack({ items }: { items: SoftwareItem[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.name}
          className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-dark-border bg-dark-surface text-text-secondary"
          title={`${item.name}: ${statusTooltip[item.status]}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${statusDot[item.status]}`}
          />
          {item.name}
        </span>
      ))}
    </div>
  );
}
