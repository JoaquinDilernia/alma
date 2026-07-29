import { describe, it, expect } from "vitest";
import {
  filtrarPorRango,
  excluirCancelados,
  calcularResumen,
  rankearProductos,
  contarPorEstado,
  contarPorMetodoPago,
  contarPorZona,
  rangoDesdeAtajo,
} from "./dashboardStats";

const pedido = (overrides = {}) => ({
  createdAt: new Date("2026-07-15T12:00:00"),
  estado: "entregado",
  total: 1000,
  items: [{ nombre: "Milanesa", cantidad: 2, cantidadViandas: 1 }],
  metodoPagoElegido: "Transferencia",
  zonaEnvioId: "zona1",
  ...overrides,
});

describe("filtrarPorRango", () => {
  const desde = new Date("2026-07-10T00:00:00");
  const hasta = new Date("2026-07-20T23:59:59");

  it("includes a pedido whose createdAt falls inside the range", () => {
    expect(filtrarPorRango([pedido()], { desde, hasta })).toHaveLength(1);
  });

  it("includes the exact boundary dates (inclusive)", () => {
    const enElBorde = pedido({ createdAt: new Date("2026-07-10T00:00:00") });
    expect(filtrarPorRango([enElBorde], { desde, hasta })).toHaveLength(1);
  });

  it("excludes a pedido before the range", () => {
    const antes = pedido({ createdAt: new Date("2026-07-01T00:00:00") });
    expect(filtrarPorRango([antes], { desde, hasta })).toHaveLength(0);
  });

  it("excludes a pedido after the range", () => {
    const despues = pedido({ createdAt: new Date("2026-08-01T00:00:00") });
    expect(filtrarPorRango([despues], { desde, hasta })).toHaveLength(0);
  });

  it("reads a Firestore-Timestamp-like createdAt via toDate()", () => {
    const conTimestamp = pedido({ createdAt: { toDate: () => new Date("2026-07-15T12:00:00") } });
    expect(filtrarPorRango([conTimestamp], { desde, hasta })).toHaveLength(1);
  });
});

describe("excluirCancelados", () => {
  it("removes pedidos with estado cancelado", () => {
    const pedidos = [pedido({ estado: "cancelado" }), pedido({ estado: "entregado" })];
    expect(excluirCancelados(pedidos)).toHaveLength(1);
  });
});

describe("calcularResumen", () => {
  it("returns all zeros when there are no pedidos", () => {
    expect(calcularResumen([])).toEqual({ ingresos: 0, cantidadPedidos: 0, ticketPromedio: 0, viandasVendidas: 0 });
  });

  it("sums ingresos and computes ticketPromedio", () => {
    const pedidos = [pedido({ total: 1000 }), pedido({ total: 2000 })];
    const resumen = calcularResumen(pedidos);
    expect(resumen.ingresos).toBe(3000);
    expect(resumen.cantidadPedidos).toBe(2);
    expect(resumen.ticketPromedio).toBe(1500);
  });

  it("sums viandasVendidas across items and pedidos, weighting by cantidadViandas", () => {
    const pedidos = [
      pedido({ items: [{ nombre: "Individual", cantidad: 2, cantidadViandas: 1 }] }),
      pedido({ items: [{ nombre: "Pack x4", cantidad: 1, cantidadViandas: 4 }] }),
    ];
    expect(calcularResumen(pedidos).viandasVendidas).toBe(6);
  });
});

describe("rankearProductos", () => {
  it("aggregates the same product name across different pedidos", () => {
    const pedidos = [
      pedido({ items: [{ nombre: "Milanesa", cantidad: 2, cantidadViandas: 1 }] }),
      pedido({ items: [{ nombre: "Milanesa", cantidad: 3, cantidadViandas: 1 }] }),
    ];
    expect(rankearProductos(pedidos)).toEqual([{ nombre: "Milanesa", cantidad: 5 }]);
  });

  it("sorts descending by cantidad", () => {
    const pedidos = [
      pedido({
        items: [
          { nombre: "Poco vendido", cantidad: 1, cantidadViandas: 1 },
          { nombre: "Muy vendido", cantidad: 10, cantidadViandas: 1 },
        ],
      }),
    ];
    expect(rankearProductos(pedidos).map((p) => p.nombre)).toEqual(["Muy vendido", "Poco vendido"]);
  });
});

describe("contarPorEstado", () => {
  it("counts every estado, including cancelado, and defaults missing ones to 0", () => {
    const pedidos = [pedido({ estado: "cancelado" }), pedido({ estado: "cancelado" }), pedido({ estado: "entregado" })];
    expect(contarPorEstado(pedidos)).toEqual({
      pendiente: 0,
      confirmado: 0,
      en_preparacion: 0,
      entregado: 1,
      cancelado: 2,
    });
  });
});

describe("contarPorMetodoPago", () => {
  it("groups and sorts descending", () => {
    const pedidos = [
      pedido({ metodoPagoElegido: "Efectivo" }),
      pedido({ metodoPagoElegido: "Transferencia" }),
      pedido({ metodoPagoElegido: "Transferencia" }),
    ];
    expect(contarPorMetodoPago(pedidos)).toEqual([
      { label: "Transferencia", cantidad: 2 },
      { label: "Efectivo", cantidad: 1 },
    ]);
  });
});

describe("contarPorZona", () => {
  it("groups and sorts descending", () => {
    const pedidos = [
      pedido({ zonaEnvioId: "z1" }),
      pedido({ zonaEnvioId: "z2" }),
      pedido({ zonaEnvioId: "z2" }),
    ];
    expect(contarPorZona(pedidos)).toEqual([
      { zonaEnvioId: "z2", cantidad: 2 },
      { zonaEnvioId: "z1", cantidad: 1 },
    ]);
  });
});

function fechaLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("rangoDesdeAtajo", () => {
  const hoy = new Date("2026-07-29T15:30:00");

  it("hoy covers just the reference day", () => {
    const { desde, hasta } = rangoDesdeAtajo("hoy", hoy);
    expect(fechaLocal(desde)).toBe("2026-07-29");
    expect(fechaLocal(hasta)).toBe("2026-07-29");
    expect(desde.getHours()).toBe(0);
    expect(hasta.getHours()).toBe(23);
  });

  it("semana covers the last 7 days including today", () => {
    const { desde } = rangoDesdeAtajo("semana", hoy);
    expect(fechaLocal(desde)).toBe("2026-07-23");
  });

  it("30dias covers the last 30 days including today", () => {
    const { desde } = rangoDesdeAtajo("30dias", hoy);
    expect(fechaLocal(desde)).toBe("2026-06-30");
  });
});
