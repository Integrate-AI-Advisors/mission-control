"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const industry = formData.get("industry") as string;
    const budget = formData.get("budget") as string;

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          industry: industry || undefined,
          monthly_budget_usd: budget ? parseFloat(budget) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create client");
      }

      const client = await res.json();
      router.push(`/clients/${client.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="font-serif text-2xl text-foreground">Add Client</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a new client to start monitoring their AI agent operations.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Client Name</Label>
          <Input id="name" name="name" required placeholder="Newground Coffee" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            required
            placeholder="newground"
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className="mt-1 font-mono"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Used in URLs: app.integrate-ai.uk/clients/<span className="text-primary">slug</span>
          </p>
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" name="industry" placeholder="Coffee roasting" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="budget">Monthly Budget (USD)</Label>
          <Input
            id="budget"
            name="budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="500.00"
            className="mt-1 font-mono"
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Client"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
