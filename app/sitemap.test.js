import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("includes the home page with the highest priority", () => {
    const result = sitemap();
    const home = result.find((entry) => entry.url === "https://alma.techdi.com.ar/");
    expect(home).toBeTruthy();
    expect(home.priority).toBe(1.0);
  });

  it("includes the tienda page", () => {
    const result = sitemap();
    const tienda = result.find((entry) => entry.url === "https://alma.techdi.com.ar/tienda");
    expect(tienda).toBeTruthy();
    expect(tienda.priority).toBe(0.8);
  });

  it("does not include carrito or checkout", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);
    expect(urls).not.toContain("https://alma.techdi.com.ar/tienda/carrito");
    expect(urls).not.toContain("https://alma.techdi.com.ar/tienda/checkout");
  });
});
