import { NextResponse } from "next/server";
import { getClients, createClient } from "@/lib/clients";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ clients: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, industry, founder_name, founder_email, founder_phone, gateway_url, gateway_token, vps_ip, vps_port } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name and slug are required" },
        { status: 400 }
      );
    }

    const client = await createClient({
      name,
      slug,
      industry,
      founder_name,
      founder_email,
      founder_phone,
      gateway_url,
      gateway_token,
      vps_ip,
      vps_port,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating client:", error);
    const message = error instanceof Error ? error.message : "Failed to create client";
    const status = message.includes("duplicate") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
