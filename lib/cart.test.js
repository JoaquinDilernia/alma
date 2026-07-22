import { describe, it, expect } from "vitest";
import { addItem, removeItem, updateQuantity, calculateSubtotal } from "./cart";

const product = { id: "p1", nombre: "Vianda Clásica", precio: 3500 };

describe("cart", () => {
  it("adds a new item with the given quantity", () => {
    const result = addItem([], product, 2);
    expect(result).toEqual([{ productoId: "p1", nombre: "Vianda Clásica", precio: 3500, cantidad: 2 }]);
  });

  it("defaults quantity to 1 when not given", () => {
    const result = addItem([], product);
    expect(result[0].cantidad).toBe(1);
  });

  it("increments quantity when adding an item already in the cart", () => {
    const cart = addItem([], product, 1);
    const result = addItem(cart, product, 2);
    expect(result).toHaveLength(1);
    expect(result[0].cantidad).toBe(3);
  });

  it("removes an item by productoId", () => {
    const cart = addItem([], product, 1);
    expect(removeItem(cart, "p1")).toEqual([]);
  });

  it("updates the quantity of an existing item", () => {
    const cart = addItem([], product, 1);
    const result = updateQuantity(cart, "p1", 5);
    expect(result[0].cantidad).toBe(5);
  });

  it("removes the item when quantity is updated to 0 or less", () => {
    const cart = addItem([], product, 1);
    expect(updateQuantity(cart, "p1", 0)).toEqual([]);
  });

  it("calculates subtotal as the sum of precio * cantidad", () => {
    let cart = addItem([], { id: "p1", nombre: "A", precio: 1000 }, 2);
    cart = addItem(cart, { id: "p2", nombre: "B", precio: 500 }, 3);
    expect(calculateSubtotal(cart)).toBe(1000 * 2 + 500 * 3);
  });

  it("returns 0 for an empty cart", () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});
