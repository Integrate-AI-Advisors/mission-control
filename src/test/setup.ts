import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock server-only package (throws in client context, no-op in tests)
vi.mock("server-only", () => ({}));
