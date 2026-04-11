"use server";

import { createClient } from "@/lib/clients";
import type { Client } from "@/lib/clients";
import { getUser } from "@/lib/supabase-server";

interface CreateClientResult {
  client?: Client;
  error?: string;
}

export async function createClientAction(formData: FormData): Promise<CreateClientResult> {
  const user = await getUser();
  if (!user?.email?.endsWith("@integrate-ai.uk")) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const industry = formData.get("industry") as string;
  const budgetStr = formData.get("budget") as string;

  if (!name || !slug) {
    return { error: "Name and slug are required" };
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "Slug must contain only lowercase letters, numbers, and hyphens" };
  }

  try {
    const client = await createClient({
      name,
      slug,
      industry: industry || undefined,
      monthly_budget_usd: budgetStr ? parseFloat(budgetStr) : undefined,
    });
    return { client };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create client";
    return { error: message.includes("duplicate") ? "A client with this slug already exists" : message };
  }
}
