import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { isExecutive, getParentExecutive } from "@/lib/hierarchy";

const SKILLS_ROOT = process.env.OPENCLAW_SKILLS_ROOT || "/root/openclaw";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agent");
  const skillSlug = req.nextUrl.searchParams.get("skill");

  if (!agentId || !skillSlug) {
    return NextResponse.json({ error: "Missing agent or skill parameter" }, { status: 400 });
  }

  // Determine workspace
  let workspaceOwner: string;
  if (isExecutive(agentId)) {
    workspaceOwner = agentId;
  } else {
    const parent = getParentExecutive(agentId);
    if (!parent) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
    }
    workspaceOwner = parent;
  }

  const skillsDir = join(SKILLS_ROOT, `workspace-${workspaceOwner}`, "skills");
  if (!existsSync(skillsDir)) {
    return NextResponse.json({ error: "Skills directory not found" }, { status: 404 });
  }

  // Try exact match first, then with -skill suffix, then fuzzy match
  const candidates = [
    skillSlug,
    `${skillSlug}-skill`,
    // Also check all dirs for a partial match
  ];

  let skillFile: string | null = null;

  for (const candidate of candidates) {
    const path = join(skillsDir, candidate, "SKILL.md");
    if (existsSync(path)) {
      skillFile = path;
      break;
    }
  }

  // Fuzzy match: check all directories
  if (!skillFile) {
    try {
      const dirs = readdirSync(skillsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const dirClean = dir.name.replace(/-skill$/, "");
        if (dirClean === skillSlug || dirClean.includes(skillSlug) || skillSlug.includes(dirClean)) {
          const path = join(skillsDir, dir.name, "SKILL.md");
          if (existsSync(path)) {
            skillFile = path;
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!skillFile) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  try {
    const content = readFileSync(skillFile, "utf-8");
    return NextResponse.json({ content, path: skillFile });
  } catch {
    return NextResponse.json({ error: "Failed to read skill file" }, { status: 500 });
  }
}
