import { readFileSync } from "fs";
import type { Agent, AgentTier } from "./types";
import { getSkillsForAgent } from "./skills";
import { isExecutive, getParentExecutive } from "./hierarchy";

const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || "/root/.openclaw/openclaw.json";

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

let configCache: { data: OpenClawConfig; ts: number } | null = null;
const CACHE_TTL = 30_000;

function readConfig(): OpenClawConfig {
  const now = Date.now();
  if (configCache && now - configCache.ts < CACHE_TTL) {
    return configCache.data;
  }
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const data = JSON.parse(raw) as OpenClawConfig;
  configCache = { data, ts: now };
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

export function getAgents(): Omit<Agent, "status" | "lastActive" | "monthlyCost">[] {
  const config = readConfig();
  const globalAllow = config.tools?.sandbox?.tools?.allow || [];

  return config.agents.list.map((agent) => {
    const deny = agent.tools?.deny || [];
    const effectiveTools = globalAllow.filter((t) => !deny.includes(t));
    const modelRaw = agent.model?.primary || config.agents.defaults.model.primary;
    const modelTier = deriveModelTier(modelRaw);
    const skills = getSkillsForAgent(agent.id);
    const role = agent.name.replace(/\s*\(.*\)/, "");
    const parent = getParentExecutive(agent.id);
    const tier = deriveTier(agent.id, modelRaw);

    return {
      id: agent.id,
      name: agent.identity?.name || agent.name,
      role,
      avatar: agent.identity?.avatar || `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(agent.id)}&size=128`,
      model: modelRaw.replace(/^.*\//, ""),
      modelTier,
      tools: effectiveTools,
      skills,
      tier,
      parent,
      slackChannelUrl: null, // Populated later from gateway session data
    };
  });
}

export function getSlackEnabled(): boolean {
  try {
    const config = readConfig();
    return config.channels?.slack?.enabled || false;
  } catch {
    return false;
  }
}
