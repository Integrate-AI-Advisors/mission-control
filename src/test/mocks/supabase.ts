import { vi } from "vitest";

// Chainable Supabase query builder mock
export function createMockQueryBuilder(resolvedData: unknown = [], resolvedError: unknown = null, resolvedCount: number | null = null) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ["from", "select", "insert", "update", "delete", "eq", "neq", "gte", "lte", "lt", "gt", "order", "limit", "range", "single", "maybeSingle"];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal: resolves the promise
  builder.then = vi.fn((resolve: (value: unknown) => void) => {
    resolve({ data: resolvedData, error: resolvedError, count: resolvedCount });
  });

  // Make it thenable (Promise-like)
  Object.defineProperty(builder, Symbol.toStringTag, { value: "Promise" });

  return builder;
}

// Mock the supabase module
export function mockSupabaseAdmin(data: unknown = [], error: unknown = null, count: number | null = null) {
  const builder = createMockQueryBuilder(data, error, count);

  vi.doMock("@/lib/supabase", () => ({
    getSupabaseAdmin: vi.fn(() => builder),
    getSupabase: vi.fn(() => builder),
  }));

  return builder;
}
