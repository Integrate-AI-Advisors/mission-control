import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Cost tracking will be implemented per-client in a future sprint.
  // Previously this ran a shell script on the VPS — not viable from Vercel.
  // Future: per-client cost data from gateway API or Langfuse.
  return NextResponse.json({
    totalMonth: 0,
    estimatedMonth: 0,
    todayCost: 0,
    byAgent: {},
    byModel: {},
    callCount: 0,
  });
}
