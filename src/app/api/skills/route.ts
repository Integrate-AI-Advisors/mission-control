import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/clients";
import type { GatewayConfig } from "@/lib/gateway";

export const dynamic = "force-dynamic";

interface SkillEntry {
  name: string;
  agent: string;
  description: string;
  path: string;
  content: string;
}

interface SkillsIndex {
  generated: string;
  source: string;
  count: number;
  skills: SkillEntry[];
}

// Cache the skills index (it's ~1.6MB)
let skillsCache: { data: SkillsIndex; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

async function fetchSkillsIndex(gw: GatewayConfig): Promise<SkillsIndex | null> {
  const now = Date.now();
  if (skillsCache && now - skillsCache.ts < CACHE_TTL) {
    return skillsCache.data;
  }

  if (!gw.url) return null;

  try {
    const res = await fetch(`${gw.url}/__openclaw__/canvas/skills-index.json`, {
      cache: "no-store",
      headers: gw.token ? { Authorization: `Bearer ${gw.token}` } : {},
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json() as SkillsIndex;
    skillsCache = { data, ts: now };
    return data;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const clientSlug = req.nextUrl.searchParams.get("client") || "integrateai";
  const agentFilter = req.nextUrl.searchParams.get("agent");
  const skillSlug = req.nextUrl.searchParams.get("skill");

  const client = await getClient(clientSlug);
  const gw: GatewayConfig = {
    url: client?.gateway_url || process.env.OPENCLAW_GATEWAY_URL || "",
    token: client?.gateway_token || process.env.OPENCLAW_GATEWAY_TOKEN || "",
  };

  const index = await fetchSkillsIndex(gw);

  if (!index) {
    return NextResponse.json({
      error: "Skills index not available. Run build-skills-index.sh on VPS.",
      skills: [],
      count: 0,
    });
  }

  // If requesting a specific skill's content
  if (agentFilter && skillSlug) {
    const skill = index.skills.find(
      (s) => s.agent === agentFilter && s.name === skillSlug
    );
    if (skill) {
      return NextResponse.json({ content: skill.content, path: skill.path });
    }
    // Fuzzy match
    const fuzzy = index.skills.find(
      (s) =>
        s.agent === agentFilter &&
        (s.name.includes(skillSlug) || skillSlug.includes(s.name))
    );
    if (fuzzy) {
      return NextResponse.json({ content: fuzzy.content, path: fuzzy.path });
    }
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Return index (without full content to keep response small)
  const skills = index.skills
    .filter((s) => !agentFilter || s.agent === agentFilter)
    .map(({ name, agent, description }) => ({ name, agent, description }));

  return NextResponse.json({
    skills,
    count: skills.length,
    generated: index.generated,
  });
}
