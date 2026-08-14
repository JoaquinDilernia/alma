import { describe, it, expect } from "vitest";
import { contarSeleccion, agregarSeleccion, quitarSeleccion } from "./seleccionMultiple";

describe("contarSeleccion", () => {
  it("returns an empty object for an empty list", () => {
    expect(contarSeleccion([])).toEqual({});
  });

  it("counts occurrences per name, including repeats", () => {
    expect(contarSeleccion(["Pollo", "Pollo", "Milanesa"])).toEqual({ Pollo: 2, Milanesa: 1 });
  });
});

describe("agregarSeleccion", () => {
  it("appends the name when below the max", () => {
    expect(agregarSeleccion(["Pollo"], "Milanesa", 5)).toEqual(["Pollo", "Milanesa"]);
  });

  it("does nothing when already at the max", () => {
    expect(agregarSeleccion(["Pollo", "Milanesa"], "Pastel", 2)).toEqual(["Pollo", "Milanesa"]);
  });
});

describe("quitarSeleccion", () => {
  it("removes one instance of the name", () => {
    expect(quitarSeleccion(["Pollo", "Pollo", "Milanesa"], "Pollo")).toEqual(["Pollo", "Milanesa"]);
  });

  it("does nothing when the name isn't present", () => {
    expect(quitarSeleccion(["Pollo"], "Milanesa")).toEqual(["Pollo"]);
  });
});
