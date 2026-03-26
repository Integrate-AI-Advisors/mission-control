import { redirect } from "next/navigation";
import { getClients } from "@/lib/clients";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const clients = await getClients();
    if (clients.length > 0) {
      redirect(`/dashboard/${clients[0].slug}`);
    }
  } catch {
    // Supabase not configured yet — fall back to default
  }
  redirect("/dashboard/integrateai");
}
