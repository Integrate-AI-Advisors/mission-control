"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/clients";
import type { ClientPhase } from "@/lib/types";
import { PHASE_COLORS } from "@/lib/types";

export function Sidebar({ clients }: { clients: Client[] }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
          <svg viewBox="0 0 32 32" className="h-5 w-5">
            <circle cx="8" cy="11" r="3" fill="#D97757" />
            <circle cx="18" cy="11" r="3" fill="#D97757" opacity="0.4" />
            <circle cx="8" cy="21" r="3" fill="#D97757" opacity="0.2" />
            <circle cx="18" cy="21" r="3" fill="#D97757" />
          </svg>
        </div>
        <span className="font-serif text-sm text-foreground">
          Integrate<span className="text-primary">AI</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 border-b border-border px-2 py-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-colors",
            pathname === "/"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          Dashboard
        </Link>
        <Link
          href="/clients"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-colors",
            pathname === "/clients"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          Clients
        </Link>
      </nav>

      {/* Client list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide">
        <p className="brand-label mb-2 px-2">
          Clients ({clients.length})
        </p>
        <nav className="space-y-0.5">
          {clients.map((client) => {
            const isActive = pathname.startsWith(`/clients/${client.slug}`);
            return (
              <Link
                key={client.id}
                href={`/clients/${client.slug}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: PHASE_COLORS[client.phase as ClientPhase] }}
                />
                <span className="truncate">{client.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Add client */}
      <div className="border-t border-border p-2">
        <Link
          href="/clients/new"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + Add Client
        </Link>
      </div>
    </aside>
  );
}
