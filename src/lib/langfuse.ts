import { execSync } from "child_process";
import type { CostData } from "./types";

const SCRIPT_PATH = process.env.USAGE_REPORT_SCRIPT || "/root/.openclaw/scripts/usage-report.sh";

let costCache: { data: CostData; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCosts(): CostData {
  const now = Date.now();
  if (costCache && now - costCache.ts < CACHE_TTL) {
    return costCache.data;
  }

  try {
    const output = execSync(`bash ${SCRIPT_PATH} --month --json`, {
      timeout: 30_000,
      encoding: "utf-8",
    });

    const parsed = JSON.parse(output);
    // Script outputs: { total: { cost_usd, calls }, agents: { id: { cost_usd } }, models: { name: cost } }
    const byAgent: Record<string, number> = {};
    if (parsed.agents) {
      for (const [id, info] of Object.entries(parsed.agents)) {
        byAgent[id] = (info as { cost_usd: number }).cost_usd || 0;
      }
    }
    // Calculate 30-day estimate from hourly data
    let estimatedMonth = 0;
    const hourly: Record<string, number> = parsed.hourly || {};
    const hours = Object.keys(hourly).sort();
    if (hours.length >= 2) {
      const first = new Date(hours[0].replace(" ", "T") + ":00Z").getTime();
      const last = new Date(hours[hours.length - 1].replace(" ", "T") + ":00Z").getTime();
      const hoursElapsed = Math.max(1, (last - first) / 3600000 + 1);
      const costPerHour = (parsed.total?.cost_usd || 0) / hoursElapsed;
      // Assume 12 active hours/day (07:00–19:00)
      estimatedMonth = costPerHour * 12 * 30;
    } else {
      estimatedMonth = parsed.total?.cost_usd || 0;
    }

    const data: CostData = {
      totalMonth: parsed.total?.cost_usd || 0,
      estimatedMonth,
      byAgent,
      byModel: parsed.models || {},
      callCount: parsed.total?.calls || 0,
    };

    costCache = { data, ts: now };
    return data;
  } catch {
    // Script failed or not available — return zeros
    return {
      totalMonth: 0,
      estimatedMonth: 0,
      byAgent: {},
      byModel: {},
      callCount: 0,
    };
  }
}
