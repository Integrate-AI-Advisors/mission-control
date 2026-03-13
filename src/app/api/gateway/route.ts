import { NextResponse } from "next/server";
import { startGateway, stopGateway, getGatewayHealth } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  const running = await getGatewayHealth();
  return NextResponse.json({ running });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "stop") {
      const result = stopGateway();
      return NextResponse.json(result);
    } else if (action === "start") {
      const result = startGateway();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Gateway error:", error);
    return NextResponse.json({ error: "Gateway action failed" }, { status: 500 });
  }
}
