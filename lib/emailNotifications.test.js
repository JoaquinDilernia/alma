import { describe, it, expect } from "vitest";
import { buildOrderEmailParams } from "./emailNotifications";

const baseArgs = {
  cliente: { nombre: "Ana Pérez", email: "ana@test.com", telefono: "1122334455", direccion: "Calle Falsa 123" },
  items: [{ productoId: "p1", nombre: "Vianda pollo", precio: 2000, cantidad: 2, guarniciones: [] }],
  subtotal: 4000,
  descuentoMonto: 0,
  descuentoPorcentaje: 0,
  costoEnvio: 500,
  total: 4500,
  metodoPagoElegido: "Efectivo",
  numeroPedido: 1,
};

describe("buildOrderEmailParams", () => {
  it("maps basic order fields to template variable names", () => {
    const params = buildOrderEmailParams(baseArgs);
    expect(params.numero_pedido).toBe(1);
    expect(params.cliente_nombre).toBe("Ana Pérez");
    expect(params.cliente_email).toBe("ana@test.com");
    expect(params.cliente_telefono).toBe("1122334455");
    expect(params.cliente_direccion).toBe("Calle Falsa 123");
    expect(params.total).toBe(4500);
    expect(params.metodo_pago).toBe("Efectivo");
  });

  it("formats a single item without guarniciones", () => {
    const params = buildOrderEmailParams(baseArgs);
    expect(params.items_detalle).toBe("2x Vianda pollo — $4000");
  });

  it("formats an item with guarniciones", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [{ productoId: "p1", nombre: "Vianda pollo", precio: 2000, cantidad: 1, guarniciones: ["Puré", "Ensalada"] }],
    });
    expect(params.items_detalle).toBe("1x Vianda pollo (Puré, Ensalada) — $2000");
  });

  it("joins multiple items with newlines", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [
        { productoId: "p1", nombre: "Vianda pollo", precio: 2000, cantidad: 1, guarniciones: [] },
        { productoId: "p2", nombre: "Vianda veggie", precio: 1800, cantidad: 2, guarniciones: ["Arroz"] },
      ],
    });
    expect(params.items_detalle).toBe("1x Vianda pollo — $2000\n2x Vianda veggie (Arroz) — $3600");
  });

  it("passes discount and free-shipping values through as-is", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      descuentoMonto: 400,
      descuentoPorcentaje: 10,
      costoEnvio: 0,
    });
    expect(params.descuento_monto).toBe(400);
    expect(params.descuento_porcentaje).toBe(10);
    expect(params.costo_envio).toBe(0);
  });

  it("includes the quantity-discount breakdown when present", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      descuentoCantidadPorcentaje: 10,
      descuentoCantidadMonto: 400,
    });
    expect(params.descuento_cantidad_porcentaje).toBe(10);
    expect(params.descuento_cantidad_monto).toBe(400);
  });

  it("defaults the quantity-discount breakdown to 0 when not provided", () => {
    const params = buildOrderEmailParams(baseArgs);
    expect(params.descuento_cantidad_porcentaje).toBe(0);
    expect(params.descuento_cantidad_monto).toBe(0);
  });

  it("includes the payment-method discount amount separately from the combined total", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      descuentoCantidadMonto: 400,
      descuentoMetodoPagoMonto: 180,
      descuentoMonto: 580,
    });
    expect(params.descuento_metodo_pago_monto).toBe(180);
    expect(params.descuento_monto).toBe(580);
  });

  it("includes the gramaje in the item line when present", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [{ productoId: "p1", nombre: "Vianda pollo", precio: 4500, cantidad: 1, gramos: 500, guarniciones: [] }],
    });
    expect(params.items_detalle).toBe("1x Vianda pollo 500gr — $4500");
  });

  it("includes platos principales in the item line when present", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [{ productoId: "p1", nombre: "Pack 5", precio: 8000, cantidad: 1, platosPrincipales: ["Pollo", "Milanesa"], guarniciones: [] }],
    });
    expect(params.items_detalle).toBe("1x Pack 5 [Pollo, Milanesa] — $8000");
  });
});
