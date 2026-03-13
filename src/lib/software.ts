import type { SoftwareItem } from "./types";

// Per-employee software stack — what they use to do their job
// Status: "connected" = ready, "pending" = account created but not connected, "needs-setup" = not yet created
const SOFTWARE_MAP: Record<string, SoftwareItem[]> = {
  lead: [
    { name: "Discord", status: "connected" },
    { name: "Mission Control", status: "connected" },
  ],
  strategist: [
    { name: "Discord", status: "connected" },
    { name: "Google Docs", status: "needs-setup" },
  ],
  "content-creator": [
    { name: "Browser", status: "connected" },
    { name: "Canva", status: "needs-setup" },
    { name: "Beehiiv", status: "connected" },
    { name: "Discord", status: "connected" },
  ],
  "social-media-manager": [
    { name: "Buffer", status: "connected" },
    { name: "Canva", status: "needs-setup" },
    { name: "Instagram", status: "connected" },
    { name: "LinkedIn", status: "pending" },
    { name: "Facebook", status: "pending" },
    { name: "Browser", status: "connected" },
    { name: "Discord", status: "connected" },
  ],
  "email-marketer": [
    { name: "Beehiiv", status: "connected" },
    { name: "Discord", status: "connected" },
  ],
  "market-researcher": [
    { name: "Browser", status: "connected" },
    { name: "Google Trends", status: "connected" },
    { name: "SEO Tools", status: "connected" },
    { name: "Discord", status: "connected" },
  ],
  "data-analyst": [
    { name: "Google Analytics", status: "connected" },
    { name: "Search Console", status: "connected" },
    { name: "Discord", status: "connected" },
  ],
  "sales-rep": [
    { name: "HubSpot", status: "connected" },
    { name: "Browser", status: "connected" },
    { name: "LinkedIn", status: "pending" },
    { name: "Cal.com", status: "connected" },
    { name: "Discord", status: "connected" },
  ],
  pa: [
    { name: "Discord", status: "connected" },
    { name: "Telegram", status: "connected" },
  ],
};

// Human-readable capability names derived from skills
const CAPABILITY_MAP: Record<string, string> = {
  "seo-research": "SEO Research",
  "linkedin-post": "LinkedIn Publishing",
  "beehiiv-publish": "Email Marketing",
  "hubspot-crm": "CRM Management",
  "ga4-report": "Analytics Reporting",
  "content-brief": "Content Strategy",
  "visual-design": "Visual Design",
};

export function getSoftwareForEmployee(agentId: string): SoftwareItem[] {
  return SOFTWARE_MAP[agentId] || [{ name: "Discord", status: "connected" }];
}

export function getCapabilityName(skillName: string): string {
  return CAPABILITY_MAP[skillName] || skillName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
