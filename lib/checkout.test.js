import { describe, it, expect } from "vitest";
import { calculateTotal, validateCheckoutForm, validateStockAvailability, calculateDiscount } from "./checkout";

const validData = {
  nombre: "Ana Pérez",
  telefono: "11 4444-5555",
  email: "ana@mail.com",
  direccion: "Av. Siempre Viva 742",
  zonaEnvioId: "z1",
  metodoPago: "transferencia",
};

describe("calculateTotal", () => {
  it("adds subtotal and shipping cost", () => {
    expect(calculateTotal(1000, 300)).toBe(1300);
  });
});

describe("calculateDiscount", () => {
  it("returns 0 when the percentage is 0", () => {
    expect(calculateDiscount(1000, 0)).toBe(0);
  });

  it("calculates a percentage of the subtotal", () => {
    expect(calculateDiscount(1000, 10)).toBe(100);
  });

  it("treats a missing percentage as 0", () => {
    expect(calculateDiscount(1000, undefined)).toBe(0);
    expect(calculateDiscount(1000, null)).toBe(0);
  });
});

describe("validateCheckoutForm", () => {
  it("accepts fully valid data", () => {
    expect(validateCheckoutForm(validData)).toEqual({ valid: true, errors: {} });
  });

  it("rejects a missing nombre", () => {
    const result = validateCheckoutForm({ ...validData, nombre: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.nombre).toBeDefined();
  });

  it("rejects an invalid email", () => {
    const result = validateCheckoutForm({ ...validData, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("rejects a missing zonaEnvioId", () => {
    const result = validateCheckoutForm({ ...validData, zonaEnvioId: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.zonaEnvioId).toBeDefined();
  });

  it("rejects a missing metodoPago", () => {
    const result = validateCheckoutForm({ ...validData, metodoPago: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.metodoPago).toBeDefined();
  });
});

describe("validateStockAvailability", () => {
  const cart = [
    { productoId: "p1", nombre: "Vianda A", precio: 100, cantidad: 3 },
    { productoId: "p2", nombre: "Vianda B", precio: 200, cantidad: 1 },
  ];

  it("passes when stock covers every item", () => {
    const result = validateStockAvailability(cart, { p1: 5, p2: 2 });
    expect(result).toEqual({ valid: true, errors: {} });
  });

  it("fails when an item exceeds available stock", () => {
    const result = validateStockAvailability(cart, { p1: 2, p2: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors.p1).toMatch(/Vianda A/);
  });

  it("treats a missing stock entry as 0 available", () => {
    const result = validateStockAvailability(cart, { p1: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors.p2).toBeDefined();
  });
});
