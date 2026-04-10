import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient } from "@/lib/clients";
import { PhaseBadge } from "@/components/phase-badge";
import type { ClientPhase } from "@/lib/types";

function SubNav({ slug, children }: { slug: string; children: React.ReactNode }) {
  const links = [
    { href: `/clients/${slug}`, label: "Overview" },
    { href: `/clients/${slug}/sessions`, label: "Sessions" },
    { href: `/clients/${slug}/costs`, label: "Costs" },
    { href: `/clients/${slug}/queue`, label: "Queue" },
  ];

  return (
    <div className="flex h-full flex-col">
      <nav className="flex gap-1 border-b border-border px-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="relative px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
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

  return (
    <div className="flex h-full flex-col">
      {/* Client header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl text-foreground">{client.name}</h1>
          <PhaseBadge phase={client.phase as ClientPhase} />
        </div>
      </header>

      {/* Sub-nav + content */}
      <SubNav slug={params.slug}>{children}</SubNav>
    </div>
  );
}
