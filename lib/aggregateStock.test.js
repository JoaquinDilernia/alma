import { describe, it, expect } from "vitest";
import { aggregateStockNeeds } from "./aggregateStock";

describe("aggregateStockNeeds", () => {
  it("sums quantity per productoId across lines", () => {
    const cart = [
      { productoId: "p1", nombre: "Milanesa", guarniciones: ["Puré"], cantidad: 2 },
      { productoId: "p1", nombre: "Milanesa", guarniciones: ["Ensalada"], cantidad: 1 },
      { productoId: "p2", nombre: "Tarta", guarniciones: [], cantidad: 4 },
    ];
    expect(aggregateStockNeeds(cart)).toEqual([
      { productoId: "p1", cantidadTotal: 3, nombre: "Milanesa" },
      { productoId: "p2", cantidadTotal: 4, nombre: "Tarta" },
    ]);
  });

  it("returns an empty array for an empty cart", () => {
    expect(aggregateStockNeeds([])).toEqual([]);
  });
});
