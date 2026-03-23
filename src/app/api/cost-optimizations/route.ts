import { NextResponse } from "next/server";
import { getAgents } from "@/lib/openclaw";

interface Optimization {
  id: string;
  title: string;
  description: string;
  estimatedSaving: string;
  priority: "high" | "medium" | "low";
}

export async function GET() {
  try {
    const agents = getAgents();
    const optimizations: Optimization[] = [];

    // Check for agents using Opus that could be downgraded
    const opusNonExecutives = agents.filter(
      (a) => a.model.includes("opus") && a.tier !== "executive"
    );
    if (opusNonExecutives.length > 0) {
      optimizations.push({
        id: "downgrade-opus",
        title: `${opusNonExecutives.length} non-executive agent(s) running Opus`,
        description: `Consider downgrading ${opusNonExecutives.map((a) => a.name).join(", ")} to Sonnet for cost savings.`,
        estimatedSaving: `~$${(opusNonExecutives.length * 8).toFixed(0)}/mo`,
        priority: "high",
      });
    }

    // Check for agents with no skills (possibly misconfigured)
    const noSkills = agents.filter((a) => a.skills.length === 0 && a.tier !== "executive");
    if (noSkills.length > 0) {
      optimizations.push({
        id: "no-skills",
        title: `${noSkills.length} agent(s) have no skills loaded`,
        description: `${noSkills.slice(0, 5).map((a) => a.name).join(", ")}${noSkills.length > 5 ? ` and ${noSkills.length - 5} more` : ""} — these agents may not be functional.`,
        estimatedSaving: "Avoid wasted API calls",
        priority: "medium",
      });
    }

    // Check for too many tools exposed
    const heavyToolAgents = agents.filter((a) => a.tools.length > 15);
    if (heavyToolAgents.length > 0) {
      optimizations.push({
        id: "heavy-tools",
        title: `${heavyToolAgents.length} agent(s) with 15+ tools enabled`,
        description: "Large tool sets increase token usage per call. Consider restricting tools to only what each agent needs.",
        estimatedSaving: "~10-20% token reduction",
        priority: "low",
      });
    }

    // Check Haiku usage for contractors
    const nonHaikuContractors = agents.filter(
      (a) => a.tier === "contractor" && !a.model.includes("haiku")
    );
    if (nonHaikuContractors.length > 0) {
      optimizations.push({
        id: "contractor-model",
        title: `${nonHaikuContractors.length} contractor(s) not using Haiku`,
        description: "Contractor-tier agents are designed for simple tasks. Haiku 4.5 is usually sufficient and much cheaper.",
        estimatedSaving: `~$${(nonHaikuContractors.length * 3).toFixed(0)}/mo`,
        priority: "medium",
      });
    }

    return NextResponse.json({ optimizations });
  } catch (error) {
    console.error("Error generating cost optimizations:", error);
    return NextResponse.json({ optimizations: [] });
  }
}
