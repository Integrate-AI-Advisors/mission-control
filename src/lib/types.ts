export interface Agent {
  id: string;
  name: string;
  role: string;
  identityName: string;
  avatar: string;
  model: string;
  tools: string[];
  software: SoftwareItem[];
  capabilities: string[];
  skills: Skill[];
  status: AgentStatus;
  lastActive: string | null;
  monthlyCost: number;
  discordChannelId: string | null;
}

export interface SoftwareItem {
  name: string;
  status: "connected" | "needs-setup" | "pending";
}

export interface Skill {
  name: string;
  description: string;
  version: string;
}

export type AgentStatus = "Working" | "Available" | "Queued" | "Off";

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
