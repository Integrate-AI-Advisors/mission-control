import { NextResponse } from "next/server";
import { getCosts } from "@/lib/langfuse";

export const dynamic = "force-dynamic";

export async function GET() {
  const costs = await getCosts();
  return NextResponse.json(costs);
}
