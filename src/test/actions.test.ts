import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase module before importing actions
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: "new-id", name: "Test", slug: "test", phase: "discovery", created_at: "2026-04-10", updated_at: "2026-04-10" },
      error: null,
    }),
  })),
}));

// Mock server-only (no-op in tests)
vi.mock("server-only", () => ({}));

// Mock auth for server actions
vi.mock("@/lib/supabase-server", () => ({
  getUser: vi.fn(() => Promise.resolve({ email: "test@integrate-ai.uk" })),
}));

import { createClientAction } from "@/lib/actions/clients";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("createClientAction", () => {
  it("returns error when name is missing", async () => {
    const result = await createClientAction(makeFormData({ slug: "test" }));
    expect(result.error).toBe("Name and slug are required");
    expect(result.client).toBeUndefined();
  });

  it("returns error when slug is missing", async () => {
    const result = await createClientAction(makeFormData({ name: "Test" }));
    expect(result.error).toBe("Name and slug are required");
  });

  it("returns error when both name and slug are missing", async () => {
    const result = await createClientAction(makeFormData({}));
    expect(result.error).toBe("Name and slug are required");
  });

  it("rejects slug with uppercase letters", async () => {
    const result = await createClientAction(makeFormData({ name: "Test", slug: "MySlug" }));
    expect(result.error).toBe("Slug must contain only lowercase letters, numbers, and hyphens");
  });

  it("rejects slug with spaces", async () => {
    const result = await createClientAction(makeFormData({ name: "Test", slug: "my slug" }));
    expect(result.error).toContain("lowercase");
  });

  it("rejects slug with special characters", async () => {
    const result = await createClientAction(makeFormData({ name: "Test", slug: "slug!" }));
    expect(result.error).toContain("lowercase");
  });

  it("rejects slug with path traversal", async () => {
    const result = await createClientAction(makeFormData({ name: "Test", slug: "../../etc" }));
    expect(result.error).toContain("lowercase");
  });

  it("accepts valid slug with hyphens and numbers", async () => {
    const result = await createClientAction(makeFormData({ name: "Test Co", slug: "test-co-123" }));
    expect(result.error).toBeUndefined();
    expect(result.client).toBeDefined();
  });

  it("handles empty industry and budget gracefully", async () => {
    const result = await createClientAction(makeFormData({
      name: "Test",
      slug: "test",
      industry: "",
      budget: "",
    }));
    expect(result.error).toBeUndefined();
  });

  it("parses budget as float", async () => {
    const result = await createClientAction(makeFormData({
      name: "Test",
      slug: "test",
      budget: "499.99",
    }));
    expect(result.error).toBeUndefined();
  });
});
