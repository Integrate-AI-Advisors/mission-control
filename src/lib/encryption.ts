import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM encryption for storing integration credentials.
// ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes).
//
// TODO: The platform (Python) currently uses Fernet symmetric encryption.
// Update platform's encryption.py to use AES-256-GCM with the same key
// format so both systems can read each other's encrypted data.

export function encrypt(plaintext: string): string {
  const key = Buffer.from(getKey(), "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = Buffer.from(getKey(), "hex");
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(-16);
  const encrypted = data.subarray(12, -16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return key;
}
