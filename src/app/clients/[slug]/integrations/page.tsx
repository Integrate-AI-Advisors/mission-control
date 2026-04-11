import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getIntegrationDetails } from "@/lib/queries/integrations";
import { IntegrationCards } from "@/components/integration-setup/integration-cards";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const integrations = await getIntegrationDetails(client.id);

  // Remap DB column names and strip encrypted credentials before client
  const safeIntegrations = integrations.map(
    ({ credentials_encrypted, service, health_status, ...rest }) => ({
      ...rest,
      provider: service,
      status: health_status,
      has_credentials: credentials_encrypted !== null,
    })
  );

  if (safeIntegrations.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="font-serif text-lg text-foreground">
            No integrations configured
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Integrations will appear here once they are set up for this client.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="brand-label mb-1">Client Integrations</p>
        <p className="text-sm text-muted-foreground">
          Connect and manage third-party API integrations for this client.
        </p>
      </div>
      <IntegrationCards integrations={safeIntegrations} />
    </div>
  );
}
