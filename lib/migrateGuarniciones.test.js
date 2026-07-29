import { describe, it, expect } from "vitest";
import { collectGuarnicionesUnicas, remapProductoGuarniciones, normalizeNombre } from "./migrateGuarniciones";

describe("normalizeNombre", () => {
  it("trims and lowercases", () => {
    expect(normalizeNombre("  Puré DE Batata  ")).toBe("puré de batata");
  });

  it("treats a missing value as an empty string", () => {
    expect(normalizeNombre(undefined)).toBe("");
  });
});

describe("collectGuarnicionesUnicas", () => {
  it("returns an empty array when no products have guarniciones", () => {
    expect(collectGuarnicionesUnicas([{ guarniciones: [] }, {}])).toEqual([]);
  });

  it("collects guarniciones from a single product", () => {
    const productos = [{ guarniciones: [{ nombre: "Puré de batata", precioExtra: 300 }] }];
    expect(collectGuarnicionesUnicas(productos)).toEqual([{ nombre: "Puré de batata", precioExtra: 300 }]);
  });

  it("dedupes by name across products, case-insensitive and trimmed, first price wins", () => {
    const productos = [
      { guarniciones: [{ nombre: "Puré de batata", precioExtra: 300 }] },
      { guarniciones: [{ nombre: " puré DE BATATA ", precioExtra: 999 }] },
    ];
    expect(collectGuarnicionesUnicas(productos)).toEqual([{ nombre: "Puré de batata", precioExtra: 300 }]);
  });

  it("skips entries with an empty name", () => {
    const productos = [{ guarniciones: [{ nombre: "   ", precioExtra: 100 }] }];
    expect(collectGuarnicionesUnicas(productos)).toEqual([]);
  });

  it("treats a missing precioExtra as 0", () => {
    const productos = [{ guarniciones: [{ nombre: "Ensalada" }] }];
    expect(collectGuarnicionesUnicas(productos)).toEqual([{ nombre: "Ensalada", precioExtra: 0 }]);
  });
});

describe("remapProductoGuarniciones", () => {
  const nombreToId = { "puré de batata": "id1", "brócoli salteado": "id2" };

  it("maps embedded guarniciones to their new ids", () => {
    const producto = { guarniciones: [{ nombre: "Puré de batata" }, { nombre: "Brócoli salteado" }] };
    expect(remapProductoGuarniciones(producto, nombreToId)).toEqual(["id1", "id2"]);
  });

  it("ignores names with no match", () => {
    const producto = { guarniciones: [{ nombre: "Puré de batata" }, { nombre: "Inexistente" }] };
    expect(remapProductoGuarniciones(producto, nombreToId)).toEqual(["id1"]);
  });

  it("returns an empty array for a product without guarniciones", () => {
    expect(remapProductoGuarniciones({}, nombreToId)).toEqual([]);
  });
});
