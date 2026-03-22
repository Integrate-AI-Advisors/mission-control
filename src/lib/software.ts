// Software/tool mapping is now derived dynamically from agent skills and tools.
// This file kept for backward compatibility but returns empty arrays.
// The real capability data comes from skills.ts and openclaw.ts.

import type { Skill } from "./types";

export function getCapabilityName(skillName: string): string {
  return skillName
    .replace(/-skill$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getCapabilitiesFromSkills(skills: Skill[]): string[] {
  return skills.map((s) => getCapabilityName(s.name));
}
