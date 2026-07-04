import { describe, it, expect } from "vitest";
import { initials, formatDate, formatDateTime, generateId } from "../lib/utils";
import type { Request } from "../types";

// ─── initials ────────────────────────────────────────────────────────────────

describe("initials()", () => {
  it("returns two uppercase initials from a full name", () => {
    expect(initials("Damilola Ogunlade")).toBe("DO");
  });

  it("returns first letter for a single-word name", () => {
    expect(initials("Janet")).toBe("J");
  });

  it("only takes the first two words", () => {
    expect(initials("Prominence Damilola Ogunlade")).toBe("PD");
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe("formatDate()", () => {
  it("formats an ISO date string to readable UK format", () => {
    const result = formatDate("2026-06-19T14:00:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("Jun");
  });

  it("returns a non-empty string for any valid ISO date", () => {
    const result = formatDate("2026-01-01T00:00:00Z");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── formatDateTime ───────────────────────────────────────────────────────────

describe("formatDateTime()", () => {
  it("includes time information", () => {
    const result = formatDateTime("2026-06-19T14:30:00Z");
    expect(result).toContain("2026");
    // Should contain hour information
    expect(result.length).toBeGreaterThan(10);
  });
});

// ─── generateId ───────────────────────────────────────────────────────────────

describe("generateId()", () => {
  it("returns next sequential ID when requests exist", () => {
    const existing = [
      { id: "MR-2026-015" },
      { id: "MR-2026-010" },
      { id: "MR-2026-003" },
    ] as Request[];
    expect(generateId(existing)).toBe("MR-2026-016");
  });

  it("returns MR-2026-001 when no requests exist", () => {
    expect(generateId([])).toBe("MR-2026-001");
  });

  it("pads the number to 3 digits", () => {
    const existing = [{ id: "MR-2026-009" }] as Request[];
    expect(generateId(existing)).toBe("MR-2026-010");
  });

  it("always increments by 1 from the highest ID", () => {
    const existing = [
      { id: "MR-2026-001" },
      { id: "MR-2026-099" },
      { id: "MR-2026-050" },
    ] as Request[];
    expect(generateId(existing)).toBe("MR-2026-100");
  });
});
