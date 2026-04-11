import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("encryption", () => {
  const TEST_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    vi.resetModules();
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  it("round-trips encrypt then decrypt", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = '{"access_token":"shpat_abc123","secret":"s3cr3t"}';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertexts for same input (random IV)", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const a = encrypt("same-input");
    const b = encrypt("same-input");
    expect(a).not.toBe(b);
  });

  it("throws on missing ENCRYPTION_KEY", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
  });

  it("throws on short ENCRYPTION_KEY", async () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow("64-character hex string");
  });

  it("throws on non-hex ENCRYPTION_KEY", async () => {
    process.env.ENCRYPTION_KEY = "g".repeat(64);
    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow("64-character hex string");
  });
});
