import { describe, it, expect } from "vitest";
import { resolveOpcionesGramaje, formatGramos } from "./gramaje";

describe("resolveOpcionesGramaje", () => {
  it("returns an empty list when no gramaje is configured", () => {
    expect(resolveOpcionesGramaje({ precio: 3500 })).toEqual([]);
  });

  it("returns an empty list when only gramajeBase is set (no variants)", () => {
    expect(resolveOpcionesGramaje({ precio: 3500, gramajeBase: 250 })).toEqual([]);
  });

  it("returns an empty list when only variantesGramaje is set (no base)", () => {
    expect(
      resolveOpcionesGramaje({ precio: 3500, variantesGramaje: [{ gramos: 500, precio: 4500 }] })
    ).toEqual([]);
  });

  it("returns base + variants when both are configured", () => {
    const producto = {
      precio: 3500,
      gramajeBase: 250,
      variantesGramaje: [
        { gramos: 500, precio: 4500 },
        { gramos: 1000, precio: 8000 },
      ],
    };
    expect(resolveOpcionesGramaje(producto)).toEqual([
      { gramos: 250, precio: 3500 },
      { gramos: 500, precio: 4500 },
      { gramos: 1000, precio: 8000 },
    ]);
  });
});

describe("formatGramos", () => {
  it("formats grams under 1000 as 'Ngr'", () => {
    expect(formatGramos(250)).toBe("250gr");
  });

  it("formats exactly 1000 as '1kg'", () => {
    expect(formatGramos(1000)).toBe("1kg");
  });

  it("formats non-round kilos with one decimal", () => {
    expect(formatGramos(1500)).toBe("1.5kg");
  });

  it("formats a round multiple of 1000 without decimals", () => {
    expect(formatGramos(2000)).toBe("2kg");
  });
});
