import { readFileSync } from "fs";
import type { Agent } from "./types";
import { getSkillsForAgent } from "./skills";
import { getSoftwareForEmployee, getCapabilityName } from "./software";

const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || "/root/.openclaw/openclaw.json";

interface OpenClawConfig {
  agents: {
    defaults: {
      model: { primary: string };
      sandbox: Record<string, unknown>;
    };
    list: Array<{
      id: string;
      name: string;
      workspace: string;
      agentDir: string;
      model?: { primary: string };
      identity: { name: string; avatar: string };
      tools: { profile: string; deny: string[] };
      heartbeat: {
        to?: string;
      };
    }>;
  };
  tools: {
    sandbox: {
      tools: {
        allow: string[];
        deny: string[];
      };
    };
  };
}

let configCache: { data: OpenClawConfig; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

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

export function getAgents(): Omit<Agent, "status" | "lastActive" | "monthlyCost">[] {
  const config = readConfig();
  const globalAllow = config.tools.sandbox.tools.allow;

  return config.agents.list.map((agent) => {
    const deny = agent.tools.deny || [];
    const effectiveTools = globalAllow.filter((t) => !deny.includes(t));
    const modelRaw = agent.model?.primary || config.agents.defaults.model.primary;
    const model = modelRaw.replace(/^.*\//, "").replace("claude-", "");
    const skills = getSkillsForAgent(agent.id);
    const role = agent.name.replace(/\s*\(.*\)/, "");
    const software = getSoftwareForEmployee(agent.id);
    const capabilities = skills.map((s) => getCapabilityName(s.name));

    return {
      id: agent.id,
      name: agent.identity.name,
      role,
      identityName: agent.identity.name,
      avatar: agent.identity.avatar,
      model,
      tools: effectiveTools,
      software,
      capabilities,
      skills,
      discordChannelId: agent.heartbeat.to || null,
    };
  });
}

export function getDiscordGuildId(): string {
  return process.env.DISCORD_GUILD_ID || "1468785013188198464";
}
