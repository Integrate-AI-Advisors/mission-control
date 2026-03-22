export type AgentTier = "executive" | "core" | "specialist" | "contractor";
export type AgentStatus = "Working" | "Available" | "Queued" | "Off";
export type Executive = "ceo" | "cmo" | "cto" | "coo" | "cfo" | "cco" | "discovery";

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  model: string;
  modelTier: string;
  tools: string[];
  skills: Skill[];
  status: AgentStatus;
  lastActive: string | null;
  monthlyCost: number;
  tier: AgentTier;
  parent: Executive | null;
  slackChannelUrl: string | null;
}

export interface ExecutiveGroup {
  executive: Agent;
  subAgents: Agent[];
  totalCost: number;
  activeCount: number;
}

export interface Skill {
  name: string;
  description: string;
  version: string;
}

export interface CostData {
  totalMonth: number;
  estimatedMonth: number;
  byAgent: Record<string, number>;
  byModel: Record<string, number>;
  callCount: number;
}

export interface GatewayState {
  running: boolean;
}
