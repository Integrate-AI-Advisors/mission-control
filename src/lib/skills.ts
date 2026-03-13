import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import type { Skill } from "./types";

const BASE_PATH = process.env.OPENCLAW_BASE_PATH || "/root/.openclaw";

export function getSkillsForAgent(agentId: string): Skill[] {
  const skillsDir = join(BASE_PATH, `workspace-${agentId}`, "skills");
  if (!existsSync(skillsDir)) return [];

  const skills: Skill[] = [];
  try {
    const dirs = readdirSync(skillsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
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
