import { NextResponse } from "next/server";
import { getCosts } from "@/lib/langfuse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const costs = getCosts();
    return NextResponse.json(costs);
  } catch (error) {
    console.error("Error fetching costs:", error);
    return NextResponse.json({ totalMonth: 0, todayCost: 0, estimatedMonth: 0, byAgent: {}, byModel: {}, callCount: 0 }, { status: 500 });
  }
}
