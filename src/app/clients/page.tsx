import Link from "next/link";
import { getClients } from "@/lib/clients";
import { getCurrentMonthSpend } from "@/lib/queries/costs";
import { getIntegrations, getHealthSummary } from "@/lib/queries/integrations";
import { getPendingCount } from "@/lib/queries/approvals";
import { ClientCard } from "@/components/client-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClients();

  if (clients.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <h1 className="font-serif text-2xl text-foreground">No clients yet</h1>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
          Add your first client to start monitoring their AI agent operations,
          costs, and integrations.
        </p>
        <Link href="/clients/new" className="mt-4">
          <Button>Add your first client</Button>
        </Link>
      </div>
    );
  }

  // Fetch enrichment data for all clients in parallel
  const enriched = await Promise.all(
    clients.map(async (client) => {
      const [spend, integrations, pendingApprovals] = await Promise.all([
        getCurrentMonthSpend(client.id).catch(() => 0),
        getIntegrations(client.id).catch(() => []),
        getPendingCount(client.id).catch(() => 0),
      ]);
      return {
        client,
        spend,
        healthSummary: getHealthSummary(integrations),
        pendingApprovals,
      };
    })
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-foreground">Clients</h1>
        <Link href="/clients/new">
          <Button variant="outline" size="sm">
            + Add Client
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enriched.map(({ client, spend, healthSummary, pendingApprovals }) => (
          <ClientCard
            key={client.id}
            client={client}
            currentMonthSpend={spend}
            healthySummary={healthSummary}
            pendingApprovals={pendingApprovals}
          />
        ))}
      </div>
    </div>
  );
}
