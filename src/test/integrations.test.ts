import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHealthSummary } from "@/lib/queries/integrations";
import type { Integration } from "@/lib/queries/integrations";

function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: "int-1",
    client_id: "client-1",
    service: "Shopify",
    status: "active",
    health_status: "healthy",
    health_checked_at: "2026-04-10T10:00:00Z",
    store_domain: null,
    ...overrides,
  };
}

describe("getHealthSummary", () => {
  it("returns all zeros for empty array", () => {
    const result = getHealthSummary([]);
    expect(result).toEqual({
      healthy: 0,
      degraded: 0,
      down: 0,
      total: 0,
      overallStatus: "healthy",
    });
  });

  it("counts all healthy integrations", () => {
    const integrations = [
      makeIntegration({ id: "1", service: "Shopify" }),
      makeIntegration({ id: "2", service: "Stripe" }),
      makeIntegration({ id: "3", service: "Xero" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.healthy).toBe(3);
    expect(result.total).toBe(3);
    expect(result.overallStatus).toBe("healthy");
  });

  it("returns degraded when any integration is degraded", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "healthy" }),
      makeIntegration({ id: "2", health_status: "degraded" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("degraded");
    expect(result.degraded).toBe(1);
    expect(result.healthy).toBe(1);
  });

  it("returns down when any integration is down (even with degraded)", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "healthy" }),
      makeIntegration({ id: "2", health_status: "degraded" }),
      makeIntegration({ id: "3", health_status: "down" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("down");
    expect(result.down).toBe(1);
    expect(result.degraded).toBe(1);
    expect(result.healthy).toBe(1);
    expect(result.total).toBe(3);
  });

  it("handles unknown health status", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "unknown" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("healthy");
    expect(result.healthy).toBe(0);
    expect(result.total).toBe(1);
  });

  it("handles all integrations down", () => {
    const integrations = [
      makeIntegration({ id: "1", health_status: "down" }),
      makeIntegration({ id: "2", health_status: "down" }),
    ];
    const result = getHealthSummary(integrations);
    expect(result.overallStatus).toBe("down");
    expect(result.down).toBe(2);
    expect(result.total).toBe(2);
  });
});

// --- Server action tests ---

vi.mock("@/lib/supabase-server", () => ({
  getUser: vi.fn(() => Promise.resolve({ email: "test@integrate-ai.uk" })),
}));

const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return Promise.resolve({ error: null });
          },
        };
      },
    })),
  })),
}));

vi.mock("@/lib/encryption", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/encryption")>(
      "@/lib/encryption"
    );
  return { ...actual, encrypt: vi.fn(() => "encrypted-blob") };
});

describe("connectIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("stores encrypted credentials and sets status to healthy", async () => {
    const { connectIntegration } = await import(
      "@/lib/actions/integrations"
    );
    const result = await connectIntegration("int-1", {
      access_token: "shpat_abc",
    });
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials_encrypted: "encrypted-blob",
        health_status: "healthy",
      })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "int-1");
  });

  it("includes store_domain when provided", async () => {
    const { connectIntegration } = await import(
      "@/lib/actions/integrations"
    );
    await connectIntegration(
      "int-1",
      { access_token: "tok" },
      "test.myshopify.com"
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ store_domain: "test.myshopify.com" })
    );
  });

  it("rejects empty credentials object", async () => {
    const { connectIntegration } = await import(
      "@/lib/actions/integrations"
    );
    const result = await connectIntegration("int-1", {});
    expect(result.error).toBe("All credential fields are required");
  });

  it("rejects credentials with blank values", async () => {
    const { connectIntegration } = await import(
      "@/lib/actions/integrations"
    );
    const result = await connectIntegration("int-1", { api_key: "  " });
    expect(result.error).toBe("All credential fields are required");
  });

  it("rejects missing integration ID", async () => {
    const { connectIntegration } = await import(
      "@/lib/actions/integrations"
    );
    const result = await connectIntegration("", { api_key: "test" });
    expect(result.error).toBe("Integration ID is required");
  });
});

describe("disconnectIntegration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears credentials and sets status to not_connected", async () => {
    const { disconnectIntegration } = await import(
      "@/lib/actions/integrations"
    );
    const result = await disconnectIntegration("int-1");
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials_encrypted: null,
        health_status: "not_connected",
        store_domain: null,
      })
    );
  });

  it("rejects missing integration ID", async () => {
    const { disconnectIntegration } = await import(
      "@/lib/actions/integrations"
    );
    const result = await disconnectIntegration("");
    expect(result.error).toBe("Integration ID is required");
  });
});

// --- Webhook URL tests ---

describe("buildWebhookUrl", () => {
  it("constructs correct URL for each provider", async () => {
    const { buildWebhookUrl } = await import(
      "@/components/integration-setup/integration-cards"
    );
    expect(buildWebhookUrl("shopify", "abc-123")).toBe(
      "https://api.integrate-ai.uk/webhooks/shopify/abc-123"
    );
    expect(buildWebhookUrl("stripe", "def-456")).toBe(
      "https://api.integrate-ai.uk/webhooks/stripe/def-456"
    );
    expect(buildWebhookUrl("xero", "ghi-789")).toBe(
      "https://api.integrate-ai.uk/webhooks/xero/ghi-789"
    );
  });
});
