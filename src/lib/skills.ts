import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import type { Skill } from "./types";
import { isExecutive, getParentExecutive } from "./hierarchy";

// Skills live at /root/openclaw/workspace-{executive}/skills/{skill-name}/SKILL.md
const SKILLS_ROOT = process.env.OPENCLAW_SKILLS_ROOT || "/root/openclaw";

export function getSkillsForAgent(agentId: string): Skill[] {
  // Determine which workspace to look in
  let workspaceOwner: string;
  if (isExecutive(agentId)) {
    workspaceOwner = agentId;
  } else {
    const parent = getParentExecutive(agentId);
    if (!parent) return [];
    workspaceOwner = parent;
  }

  const skillsDir = join(SKILLS_ROOT, `workspace-${workspaceOwner}`, "skills");
  if (!existsSync(skillsDir)) return [];

  // For executives, return all skills in their workspace
  // For sub-agents, return only skills matching their ID
  const skills: Skill[] = [];
  try {
    const dirs = readdirSync(skillsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      // For sub-agents, only include their specific skill
      if (!isExecutive(agentId)) {
        const dirName = dir.name.replace(/-skill$/, "");
        if (dirName !== agentId) continue;
      }

      const skillFile = join(skillsDir, dir.name, "SKILL.md");
      if (!existsSync(skillFile)) continue;

      try {
        const content = readFileSync(skillFile, "utf-8");
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const frontmatter = yaml.load(match[1]) as Record<string, string>;
          skills.push({
            name: frontmatter.name || dir.name,
            description: frontmatter.description || "",
            version: frontmatter.version || "1.0",
          });
        } else {
          skills.push({ name: dir.name, description: "", version: "1.0" });
        }
      } catch {
        skills.push({ name: dir.name, description: "", version: "1.0" });
      }
    }
  } catch {
    // workspace or skills dir not readable
  }
  return skills;
}
