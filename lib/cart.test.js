import { describe, it, expect } from "vitest";
import { addItem, removeItem, updateQuantity, calculateSubtotal, cartLineId, countViandas } from "./cart";

const product = { id: "p1", nombre: "Vianda Clásica", precio: 3500, cantidadViandas: 1 };

describe("cart", () => {
  it("adds a new item with the given quantity and default garnish/vianda fields", () => {
    const result = addItem([], product, 2);
    expect(result).toEqual([
      { productoId: "p1", nombre: "Vianda Clásica", cantidadViandas: 1, guarniciones: [], precio: 3500, cantidad: 2 },
    ]);
  });

  it("defaults quantity to 1 when not given", () => {
    expect(addItem([], product)[0].cantidad).toBe(1);
  });

  it("stores the effective price and chosen garnishes", () => {
    const result = addItem([], product, 1, ["Papas"], 4000);
    expect(result[0].precio).toBe(4000);
    expect(result[0].guarniciones).toEqual(["Papas"]);
  });

  it("stacks the same plate + same garnishes into one line", () => {
    let cart = addItem([], product, 1, ["Puré"], 3500);
    cart = addItem(cart, product, 2, ["Puré"], 3500);
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(3);
  });

  it("keeps the same plate with different garnishes as separate lines", () => {
    let cart = addItem([], product, 1, ["Puré"], 3500);
    cart = addItem(cart, product, 1, ["Ensalada"], 3500);
    expect(cart).toHaveLength(2);
  });

  it("builds a line id from productoId and garnishes", () => {
    expect(cartLineId({ productoId: "p1", guarniciones: ["Puré", "Ensalada"] })).toBe("p1::Puré|Ensalada");
    expect(cartLineId({ productoId: "p1" })).toBe("p1::");
  });

  it("removes an item by lineId", () => {
    const cart = addItem([], product, 1, ["Puré"], 3500);
    expect(removeItem(cart, "p1::Puré")).toEqual([]);
  });

  it("updates the quantity of an existing line", () => {
    const cart = addItem([], product, 1, ["Puré"], 3500);
    expect(updateQuantity(cart, "p1::Puré", 5)[0].cantidad).toBe(5);
  });

  it("removes the line when quantity is updated to 0 or less", () => {
    const cart = addItem([], product, 1, ["Puré"], 3500);
    expect(updateQuantity(cart, "p1::Puré", 0)).toEqual([]);
  });

  it("calculates subtotal as the sum of precio * cantidad", () => {
    let cart = addItem([], { id: "p1", nombre: "A", precio: 1000, cantidadViandas: 1 }, 2);
    cart = addItem(cart, { id: "p2", nombre: "B", precio: 500, cantidadViandas: 1 }, 3);
    expect(calculateSubtotal(cart)).toBe(1000 * 2 + 500 * 3);
  });

  it("counts viandas weighting each line by cantidadViandas", () => {
    let cart = addItem([], { id: "p1", nombre: "Ind", precio: 1000, cantidadViandas: 1 }, 2); // 2 viandas
    cart = addItem(cart, { id: "p2", nombre: "Pack", precio: 5000, cantidadViandas: 4 }, 1); // 4 viandas
    expect(countViandas(cart)).toBe(6);
  });

  it("treats a legacy item without cantidadViandas as 1 vianda", () => {
    expect(countViandas([{ productoId: "x", precio: 1, cantidad: 3 }])).toBe(3);
  });
});
