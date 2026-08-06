import { describe, it, expect } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("allows all crawlers on public routes", () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/admin" });
  });

  it("points to the production sitemap", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://alma.techdi.com.ar/sitemap.xml");
  });
});
