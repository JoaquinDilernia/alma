import { describe, it, expect } from "vitest";
import { validateImageUpload } from "./validateImageUpload";

function makeFile({ type = "image/jpeg", size = 1024 } = {}) {
  return { type, size };
}

describe("validateImageUpload", () => {
  it("rejects when no file is given", () => {
    const result = validateImageUpload(null);
    expect(result.valid).toBe(false);
  });

  it("accepts a valid jpeg under the size limit", () => {
    const result = validateImageUpload(makeFile({ type: "image/jpeg", size: 2 * 1024 * 1024 }));
    expect(result).toEqual({ valid: true, error: null });
  });

  it("accepts png and webp", () => {
    expect(validateImageUpload(makeFile({ type: "image/png" })).valid).toBe(true);
    expect(validateImageUpload(makeFile({ type: "image/webp" })).valid).toBe(true);
  });

  it("rejects unsupported file types", () => {
    const result = validateImageUpload(makeFile({ type: "application/pdf" }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/formato/i);
  });

  it("rejects files over 5MB", () => {
    const result = validateImageUpload(makeFile({ size: 6 * 1024 * 1024 }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/5MB/);
  });
});
