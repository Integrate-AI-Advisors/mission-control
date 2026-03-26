import type { CostData } from "@/lib/types";
import { DAILY_COST_ALERT_THRESHOLD } from "@/lib/types";

export default function CostAlert({ costs }: { costs: CostData }) {
  if (costs.todayCost < DAILY_COST_ALERT_THRESHOLD) return null;

  return (
    <div className="bg-[rgba(194,91,86,0.06)] border border-brand-red/20 rounded-card px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-brand-red flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="font-sans text-[13px] text-brand-red font-medium">
          Daily spend alert — ${costs.todayCost.toFixed(2)} today
        </p>
        <p className="font-mono text-[0.6rem] text-text-muted mt-0.5 leading-[1.6]">
          Threshold: ${DAILY_COST_ALERT_THRESHOLD.toFixed(2)}/day &middot; Monthly projection: ${costs.estimatedMonth.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
