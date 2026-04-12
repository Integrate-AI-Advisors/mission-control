"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Menu, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/clients";
import type { ClientPhase } from "@/lib/types";
import { PHASE_COLORS } from "@/lib/types";

function Logo() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1614]">
      <svg viewBox="0 0 40 24" className="h-5 w-8">
        <circle cx="5" cy="7" r="3" fill="#D97757" />
        <circle cx="15" cy="7" r="3" fill="#4A2E24" />
        <circle cx="25" cy="7" r="3" fill="#D97757" />
        <circle cx="35" cy="7" r="3" fill="#6B3D2E" />
        <circle cx="5" cy="17" r="3" fill="#6B3D2E" />
        <circle cx="15" cy="17" r="3" fill="#D97757" />
        <circle cx="25" cy="17" r="3" fill="#4A2E24" />
        <circle cx="35" cy="17" r="3" fill="#D97757" />
      </svg>
    </div>
  );
}

export function Sidebar({ clients }: { clients: Client[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Scroll-lock body when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Escape key closes drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger — visible only on < md */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-card/80 p-3 backdrop-blur md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          role="button"
          aria-label="Close menu"
        />
      )}

      {/* Sidebar: fixed overlay on mobile, static on md+ */}
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col backdrop-blur-xl bg-[rgba(26,26,25,0.95)] border-r border-terra/15 transition-transform duration-200",
          "fixed inset-y-0 left-0 z-50 w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0 md:z-auto md:w-16",
          "lg:w-60"
        )}
      >
        {/* Mobile close */}
        <button
          ref={closeButtonRef}
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-3 rounded-md p-2 md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-terra/15 px-4 py-4 md:justify-center md:px-2 lg:justify-start lg:px-4">
          <Logo />
          <span className="font-serif text-sm text-foreground md:hidden lg:inline">
            Integrate<span className="text-primary">AI</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-0.5 border-b border-terra/15 px-2 py-3 md:px-1.5 lg:px-2">
          <Link
            href="/"
            title="Dashboard"
            aria-label="Dashboard"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-colors",
              "md:justify-center md:px-0 lg:justify-start lg:px-2.5",
              pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="md:hidden lg:inline">Dashboard</span>
          </Link>
          <Link
            href="/clients"
            title="Clients"
            aria-label="Clients"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-colors",
              "md:justify-center md:px-0 lg:justify-start lg:px-2.5",
              pathname === "/clients"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="md:hidden lg:inline">Clients</span>
          </Link>
        </nav>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide md:px-1.5 lg:px-2">
          <p className="brand-label mb-2 px-2 md:hidden lg:block">
            Clients ({clients.length})
          </p>
          <nav className="space-y-0.5">
            {clients.map((client) => {
              const isActive = pathname.startsWith(`/clients/${client.slug}`);
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.slug}`}
                  title={client.name}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    "md:justify-center md:px-0 md:py-3 lg:justify-start lg:px-2.5 lg:py-2",
                    "border-l-[3px] md:border-l-0 lg:border-l-[3px]",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent"
                  )}
                  style={isActive ? { borderLeftColor: PHASE_COLORS[client.phase as ClientPhase] } : undefined}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PHASE_COLORS[client.phase as ClientPhase] }}
                  />
                  <span className="truncate md:hidden lg:inline">{client.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Add client */}
        <div className="border-t border-terra/15 p-2 md:p-1.5 lg:p-2">
          <Link
            href="/clients/new"
            title="Add Client"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="md:hidden lg:inline">Add Client</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
