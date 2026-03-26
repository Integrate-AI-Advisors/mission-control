import type { Agent, AgentTier } from "./types";
import { isExecutive, getParentExecutive } from "./hierarchy";
import type { GatewayConfig } from "./gateway";
import { getAgentConfig } from "./gateway";

interface OpenClawAgent {
  id: string;
  name: string;
  workspace: string;
  agentDir: string;
  model?: { primary: string; fallbacks?: string[] };
  identity?: { name: string; avatar: string };
  tools?: { profile: string; deny: string[] };
  heartbeat?: {
    every?: string;
    to?: string;
    target?: string;
    activeHours?: { start: string; end: string; timezone: string };
  };
}

interface OpenClawConfig {
  agents: {
    defaults: {
      model: { primary: string };
    };
    list: OpenClawAgent[];
  };
  tools?: {
    sandbox?: {
      tools?: {
        allow?: string[];
        deny?: string[];
      };
    };
  };
  channels?: {
    slack?: {
      enabled: boolean;
    };
  };
}

// Per-client config cache (keyed by gateway URL)
const configCache = new Map<string, { data: OpenClawConfig; ts: number }>();
const CACHE_TTL = 30_000;

async function fetchConfig(gw: GatewayConfig): Promise<OpenClawConfig | null> {
  const cacheKey = gw.url;
  const now = Date.now();
  const cached = configCache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const raw = await getAgentConfig(gw);
  if (!raw) return null;

  // The gateway may return the config directly or nested
  const data = (raw as { config?: OpenClawConfig }).config || raw as OpenClawConfig;
  if (!data.agents?.list) return null;

  configCache.set(cacheKey, { data, ts: now });
  return data;
}

function deriveModelTier(modelStr: string): string {
  if (modelStr.includes("opus")) return "Opus 4.6";
  if (modelStr.includes("sonnet")) return "Sonnet 4.6";
  if (modelStr.includes("haiku")) return "Haiku 4.5";
  return modelStr.replace(/^.*\//, "").replace("claude-", "");
}

function deriveTier(agentId: string, modelStr: string): AgentTier {
  if (isExecutive(agentId)) return "executive";
  if (modelStr.includes("opus")) return "core";
  if (modelStr.includes("sonnet")) return "specialist";
  return "contractor";
}

export async function getAgents(
  gw: GatewayConfig
): Promise<Omit<Agent, "status" | "lastActive" | "monthlyCost">[]> {
  const config = await fetchConfig(gw);
  if (!config) return [];

  const globalAllow = config.tools?.sandbox?.tools?.allow || [];

  return config.agents.list.map((agent) => {
    const deny = agent.tools?.deny || [];
    const effectiveTools = globalAllow.filter((t) => !deny.includes(t));
    const modelRaw =
      agent.model?.primary || config.agents.defaults.model.primary;
    const modelTier = deriveModelTier(modelRaw);
    const role = agent.name.replace(/\s*\(.*\)/, "");
    const parent = getParentExecutive(agent.id);
    const tier = deriveTier(agent.id, modelRaw);

    const hbEvery = agent.heartbeat?.every || "4h";
    const hbHours = parseInt(hbEvery) || 4;
    const isStandby = hbHours >= 4;

    return {
      id: agent.id,
      name: agent.identity?.name || agent.name,
      role,
      avatar:
        agent.identity?.avatar ||
        `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(agent.id)}&size=128`,
      model: modelRaw.replace(/^.*\//, ""),
      modelTier,
      tools: effectiveTools,
      skills: [], // Skills loaded from VPS — future: fetch via gateway
      tier,
      parent,
      slackChannelUrl: null,
      isStandby,
    };
  });
}

export async function getSlackEnabled(gw: GatewayConfig): Promise<boolean> {
  try {
    const config = await fetchConfig(gw);
    return config?.channels?.slack?.enabled || false;
  } catch {
    return false;
  }
}
