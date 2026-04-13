import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient } from "@/lib/clients";
import { hasDiscoveryData } from "@/lib/queries/phases";
import { PhaseBadge } from "@/components/phase-badge";
import { PollingProvider } from "@/components/polling-provider";
import type { ClientPhase } from "@/lib/types";

function SubNav({
  slug,
  showDiscovery,
  children,
}: {
  slug: string;
  showDiscovery: boolean;
  children: React.ReactNode;
}) {
  const links = [
    { href: `/clients/${slug}`, label: "Overview" },
    ...(showDiscovery
      ? [{ href: `/clients/${slug}/discovery`, label: "Discovery" }]
      : []),
    { href: `/clients/${slug}/sessions`, label: "Sessions" },
    { href: `/clients/${slug}/costs`, label: "Costs" },
    { href: `/clients/${slug}/queue`, label: "Queue" },
    { href: `/clients/${slug}/verification`, label: "Verification" },
    { href: `/clients/${slug}/integrations`, label: "Integrations" },
  ];

  return (
    <div className="flex h-full flex-col">
      <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 sm:px-6 scrollbar-hide">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="relative shrink-0 px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const showDiscovery =
    client.phase === "discovery" || (await hasDiscoveryData(client.id));

  return (
    <div className="flex h-full flex-col">
      {/* Client header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl text-foreground">{client.name}</h1>
          <PhaseBadge phase={client.phase as ClientPhase} />
        </div>
      </header>

      {/* Sub-nav + content with 15s polling */}
      <PollingProvider intervalMs={15_000}>
        <SubNav slug={params.slug} showDiscovery={showDiscovery}>
          {children}
        </SubNav>
      </PollingProvider>
    </div>
  );
}
