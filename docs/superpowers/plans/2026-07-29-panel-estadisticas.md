# Panel de Estadísticas del Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `/admin` landing (a greeting + a link to Contenido) with a full stats dashboard: revenue, order count, average ticket, garnishes/viandas sold, top products, and breakdowns by order status, payment method, and delivery zone — all filterable by a date range.

**Architecture:** All computation is pure functions in `lib/dashboardStats.js` operating on the existing `alma_pedidos` documents (no schema changes), fed by a new `usePedidos()` read hook mirroring `useProductos()`. A small presentational `BarList` component is reused three times (status/payment-method/zone breakdowns). `DashboardStats.jsx` owns the date-range UI state and wires the pure functions to the hooks.

**Tech Stack:** Next.js 14 (App Router, client components), Firebase v10 modular SDK (Firestore `onSnapshot`), Vitest, CSS Modules.

## Global Constraints

- No changes to `alma_pedidos` schema, `lib/submitOrder.js`, or `components/admin/PedidosManager.jsx` — this dashboard reads the same collection independently.
- Cancelled orders (`estado === "cancelado"`) are excluded from revenue, order count, average ticket, viandas sold, top products, payment-method breakdown, and zone breakdown. They **are** included in the "pedidos por estado" breakdown (the only metric meant to show the full funnel).
- "Producto más vendido" ranks by summed `item.cantidad` (units sold), not by `cantidadViandas`.
- Date range default is **Últimos 30 días**; other options are **Hoy**, **Última semana**, and **Personalizado** (two date inputs).
- Follow existing conventions: `onSnapshot`-based hooks returning `{ data, loading }`, pure logic in `lib/*.js` tested with Vitest, CSS Modules per component.

---

### Task 1: Pure stats logic

**Files:**
- Create: `lib/dashboardStats.js`
- Test: `lib/dashboardStats.test.js`

**Interfaces:**
- Produces: `filtrarPorRango(pedidos, {desde, hasta})`, `excluirCancelados(pedidos)`, `calcularResumen(pedidos)` → `{ingresos, cantidadPedidos, ticketPromedio, viandasVendidas}`, `rankearProductos(pedidos)` → `Array<{nombre, cantidad}>` sorted descending, `contarPorEstado(pedidos)` → `{pendiente, confirmado, en_preparacion, entregado, cancelado}`, `contarPorMetodoPago(pedidos)` → `Array<{label, cantidad}>` sorted descending, `contarPorZona(pedidos)` → `Array<{zonaEnvioId, cantidad}>` sorted descending, `rangoDesdeAtajo(atajo, hoy)` → `{desde, hasta}` (both `Date`) for `atajo` in `"hoy" | "semana" | "30dias"`. Task 4 imports and calls all of these.

- [ ] **Step 1: Write the failing tests**

Create `lib/dashboardStats.test.js`:

```js
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

describe("rangoDesdeAtajo", () => {
  const hoy = new Date("2026-07-29T15:30:00");

  it("hoy covers just the reference day", () => {
    const { desde, hasta } = rangoDesdeAtajo("hoy", hoy);
    expect(desde.toISOString().slice(0, 10)).toBe("2026-07-29");
    expect(hasta.toISOString().slice(0, 10)).toBe("2026-07-29");
    expect(desde.getHours()).toBe(0);
    expect(hasta.getHours()).toBe(23);
  });

  it("semana covers the last 7 days including today", () => {
    const { desde } = rangoDesdeAtajo("semana", hoy);
    expect(desde.toISOString().slice(0, 10)).toBe("2026-07-23");
  });

  it("30dias covers the last 30 days including today", () => {
    const { desde } = rangoDesdeAtajo("30dias", hoy);
    expect(desde.toISOString().slice(0, 10)).toBe("2026-06-30");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/dashboardStats.test.js`
Expected: FAIL — cannot find module `./dashboardStats`.

- [ ] **Step 3: Implement the module**

Create `lib/dashboardStats.js`:

```js
function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

export function filtrarPorRango(pedidos, { desde, hasta }) {
  return pedidos.filter((p) => {
    const fecha = toDate(p.createdAt);
    if (!fecha) return false;
    return fecha >= desde && fecha <= hasta;
  });
}

export function excluirCancelados(pedidos) {
  return pedidos.filter((p) => p.estado !== "cancelado");
}

export function calcularResumen(pedidos) {
  const ingresos = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
  const cantidadPedidos = pedidos.length;
  const ticketPromedio = cantidadPedidos > 0 ? ingresos / cantidadPedidos : 0;
  const viandasVendidas = pedidos.reduce(
    (sum, p) => sum + (p.items || []).reduce((s, item) => s + (item.cantidadViandas || 1) * item.cantidad, 0),
    0
  );
  return { ingresos, cantidadPedidos, ticketPromedio, viandasVendidas };
}

export function rankearProductos(pedidos) {
  const conteo = new Map();
  for (const pedido of pedidos) {
    for (const item of pedido.items || []) {
      conteo.set(item.nombre, (conteo.get(item.nombre) || 0) + item.cantidad);
    }
  }
  return Array.from(conteo.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

const ESTADOS = ["pendiente", "confirmado", "en_preparacion", "entregado", "cancelado"];

export function contarPorEstado(pedidos) {
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  for (const pedido of pedidos) {
    if (conteo[pedido.estado] !== undefined) conteo[pedido.estado] += 1;
  }
  return conteo;
}

export function contarPorMetodoPago(pedidos) {
  const conteo = new Map();
  for (const pedido of pedidos) {
    const label = pedido.metodoPagoElegido || "Sin especificar";
    conteo.set(label, (conteo.get(label) || 0) + 1);
  }
  return Array.from(conteo.entries())
    .map(([label, cantidad]) => ({ label, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function contarPorZona(pedidos) {
  const conteo = new Map();
  for (const pedido of pedidos) {
    const zonaEnvioId = pedido.zonaEnvioId || "sin-zona";
    conteo.set(zonaEnvioId, (conteo.get(zonaEnvioId) || 0) + 1);
  }
  return Array.from(conteo.entries())
    .map(([zonaEnvioId, cantidad]) => ({ zonaEnvioId, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function rangoDesdeAtajo(atajo, hoy) {
  const hasta = new Date(hoy);
  hasta.setHours(23, 59, 59, 999);
  const desde = new Date(hoy);
  desde.setHours(0, 0, 0, 0);
  if (atajo === "semana") {
    desde.setDate(desde.getDate() - 6);
  } else if (atajo === "30dias") {
    desde.setDate(desde.getDate() - 29);
  }
  return { desde, hasta };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/dashboardStats.test.js`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboardStats.js lib/dashboardStats.test.js
git commit -m "feat: add pure dashboard stats calculations"
```

---

### Task 2: `usePedidos` read hook

**Files:**
- Create: `lib/usePedidos.js`

**Interfaces:**
- Produces: `usePedidos()` → `{ pedidos: Array<{id, ...}>, loading: boolean }`. Task 4 calls this.

- [ ] **Step 1: Implement the hook**

Create `lib/usePedidos.js`, mirroring `lib/useProductos.js`:

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function usePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_pedidos"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPedidos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setPedidos([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { pedidos, loading };
}
```

- [ ] **Step 2: Verify no regressions**

Run: `npm test`
Expected: PASS (client hook with no unit coverage, same as `useProductos`/`useCategorias` — guards against unrelated breakage).

- [ ] **Step 3: Commit**

```bash
git add lib/usePedidos.js
git commit -m "feat: add usePedidos read hook"
```

---

### Task 3: `BarList` presentational component

**Files:**
- Create: `components/admin/BarList.jsx`
- Create: `components/admin/BarList.module.css`

**Interfaces:**
- Produces: `<BarList items={Array<{label: string, value: number, color?: string}>} />`. Renders a "Sin datos en este período." message when `items` is empty, otherwise one row per item (label + proportional horizontal bar + value), sized relative to the max `value` in the array. `color` defaults to `var(--color-verde-principal)` when not provided. Task 4 passes it pre-sorted arrays from Task 1's functions.

- [ ] **Step 1: Create the CSS module**

Create `components/admin/BarList.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.row {
  display: grid;
  grid-template-columns: 140px 1fr 40px;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.9rem;
}

.label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barTrack {
  height: 10px;
  background: var(--color-beige);
  border-radius: 999px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.value {
  text-align: right;
  font-weight: 600;
}

.vacio {
  opacity: 0.7;
  font-size: 0.9rem;
}
```

- [ ] **Step 2: Create the component**

Create `components/admin/BarList.jsx`:

```jsx
import styles from "./BarList.module.css";

export default function BarList({ items }) {
  if (items.length === 0) {
    return <p className={styles.vacio}>Sin datos en este período.</p>;
  }

  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <div key={item.label} className={styles.row}>
          <span className={styles.label}>{item.label}</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${(item.value / max) * 100}%`, background: item.color || "var(--color-verde-principal)" }}
            />
          </div>
          <span className={styles.value}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Expected: PASS (this component isn't wired into any page yet — Task 4 does that).

- [ ] **Step 4: Commit**

```bash
git add components/admin/BarList.jsx components/admin/BarList.module.css
git commit -m "feat: add BarList presentational component"
```

---

### Task 4: `DashboardStats` and wiring into `/admin`

**Files:**
- Create: `components/admin/DashboardStats.jsx`
- Create: `components/admin/DashboardStats.module.css`
- Modify: `app/admin/page.jsx`

**Interfaces:**
- Consumes: `usePedidos()` (Task 2), `useZonasEnvio()` (existing, from `@/lib/useZonasEnvio`), all of `lib/dashboardStats.js` (Task 1), `<BarList>` (Task 3), `ESTADO_LABELS` exported from `./StatusBadge` (existing).
- Produces: `<DashboardStats />`, rendered by `app/admin/page.jsx`.

- [ ] **Step 1: Create the CSS module**

Create `components/admin/DashboardStats.module.css`:

```css
.rangoSelector {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}

.rangoBtn {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: 0.5rem 1rem;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
}

.rangoBtnActivo {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  border-color: var(--color-verde-principal);
}

.fechasPersonalizadas {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.fechasPersonalizadas input {
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.tarjetas {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

@media (min-width: 760px) {
  .tarjetas {
    grid-template-columns: repeat(4, 1fr);
  }
}

.tarjeta {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.tarjetaLabel {
  font-size: 0.85rem;
  opacity: 0.7;
}

.tarjetaValor {
  font-family: var(--font-display);
  font-size: 1.6rem;
  color: var(--color-verde-principal);
}

.secciones {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 900px) {
  .secciones {
    grid-template-columns: 1fr 1fr;
  }
}

.seccion {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
}

.seccionTitulo {
  font-family: var(--font-display);
  color: var(--color-verde-principal);
  font-size: 1.1rem;
  margin-bottom: var(--space-sm);
}
```

- [ ] **Step 2: Create the component**

Create `components/admin/DashboardStats.jsx`:

```jsx
"use client";

import { useState } from "react";
import { usePedidos } from "@/lib/usePedidos";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import {
  filtrarPorRango,
  excluirCancelados,
  calcularResumen,
  rankearProductos,
  contarPorEstado,
  contarPorMetodoPago,
  contarPorZona,
  rangoDesdeAtajo,
} from "@/lib/dashboardStats";
import { ESTADO_LABELS } from "./StatusBadge";
import BarList from "./BarList";
import styles from "./DashboardStats.module.css";

const ESTADO_COLORES = {
  pendiente: "#8a6d1d",
  confirmado: "#1d4d8a",
  en_preparacion: "#5b2d8a",
  entregado: "#1d6b3f",
  cancelado: "#8a2d2d",
};

const ATAJOS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Última semana" },
  { value: "30dias", label: "Últimos 30 días" },
  { value: "personalizado", label: "Personalizado" },
];

export default function DashboardStats() {
  const { pedidos, loading } = usePedidos();
  const { zonasEnvio } = useZonasEnvio();
  const [atajo, setAtajo] = useState("30dias");
  const [desdeInput, setDesdeInput] = useState("");
  const [hastaInput, setHastaInput] = useState("");

  if (loading) return <p>Cargando…</p>;

  let pedidosEnRango;
  if (atajo === "personalizado") {
    const desde = desdeInput ? new Date(`${desdeInput}T00:00:00`) : null;
    const hasta = hastaInput ? new Date(`${hastaInput}T23:59:59.999`) : null;
    pedidosEnRango = desde && hasta && desde <= hasta ? filtrarPorRango(pedidos, { desde, hasta }) : [];
  } else {
    pedidosEnRango = filtrarPorRango(pedidos, rangoDesdeAtajo(atajo, new Date()));
  }

  const pedidosFacturables = excluirCancelados(pedidosEnRango);

  const resumen = calcularResumen(pedidosFacturables);
  const productos = rankearProductos(pedidosFacturables)
    .slice(0, 10)
    .map((p) => ({ label: p.nombre, value: p.cantidad }));
  const porEstado = contarPorEstado(pedidosEnRango);
  const estadoItems = Object.entries(porEstado).map(([estado, cantidad]) => ({
    label: ESTADO_LABELS[estado],
    value: cantidad,
    color: ESTADO_COLORES[estado],
  }));
  const metodoItems = contarPorMetodoPago(pedidosFacturables).map((m) => ({ label: m.label, value: m.cantidad }));
  const zonaItems = contarPorZona(pedidosFacturables).map((z) => ({
    label: zonasEnvio.find((zona) => zona.id === z.zonaEnvioId)?.nombre || "Zona eliminada",
    value: z.cantidad,
  }));

  return (
    <div>
      <div className={styles.rangoSelector}>
        {ATAJOS.map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            className={`${styles.rangoBtn} ${atajo === opcion.value ? styles.rangoBtnActivo : ""}`}
            onClick={() => setAtajo(opcion.value)}
          >
            {opcion.label}
          </button>
        ))}
        {atajo === "personalizado" && (
          <div className={styles.fechasPersonalizadas}>
            <input type="date" value={desdeInput} onChange={(e) => setDesdeInput(e.target.value)} />
            <span>a</span>
            <input type="date" value={hastaInput} onChange={(e) => setHastaInput(e.target.value)} />
          </div>
        )}
      </div>

      <div className={styles.tarjetas}>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Ingresos</span>
          <span className={styles.tarjetaValor}>${resumen.ingresos}</span>
        </div>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Pedidos</span>
          <span className={styles.tarjetaValor}>{resumen.cantidadPedidos}</span>
        </div>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Ticket promedio</span>
          <span className={styles.tarjetaValor}>${Math.round(resumen.ticketPromedio)}</span>
        </div>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Viandas vendidas</span>
          <span className={styles.tarjetaValor}>{resumen.viandasVendidas}</span>
        </div>
      </div>

      <div className={styles.secciones}>
        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Productos más vendidos</p>
          <BarList items={productos} />
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Pedidos por estado</p>
          <BarList items={estadoItems} />
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Métodos de pago</p>
          <BarList items={metodoItems} />
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Zonas de envío</p>
          <BarList items={zonaItems} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `/admin`**

Replace the full contents of `app/admin/page.jsx`:

```jsx
"use client";

import Link from "next/link";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function AdminHomePage() {
  const { adminDoc } = useAdminAuth();

  return (
    <div>
      <h1>Hola{adminDoc?.email ? `, ${adminDoc.email}` : ""}</h1>
      <p style={{ margin: "1rem 0 2rem" }}>
        Desde acá gestionás el contenido editable de la landing de ALMA.
      </p>
      <p>
        <Link href="/admin/contenido" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Ir a Contenido de la landing →
        </Link>
      </p>
    </div>
  );
}
```

with:

```jsx
"use client";

import { useAdminAuth } from "@/lib/useAdminAuth";
import DashboardStats from "@/components/admin/DashboardStats";

export default function AdminHomePage() {
  const { adminDoc } = useAdminAuth();

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Hola{adminDoc?.email ? `, ${adminDoc.email}` : ""}</h1>
      <DashboardStats />
    </div>
  );
}
```

- [ ] **Step 4: Verify no regressions**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run `npm run dev`, log in, open `/admin/` (Panel), and confirm: the 4 KPI cards render with real numbers from existing `alma_pedidos`, "Productos más vendidos" shows a sensible ranking, "Pedidos por estado" shows all 5 statuses with matching `StatusBadge` colors (including cancelados even though they're 0 in the other cards/lists), switching between Hoy/Última semana/Últimos 30 días changes the numbers, and Personalizado with a valid date range works (and shows "Sin datos en este período." for an empty/invalid range).

- [ ] **Step 6: Commit**

```bash
git add components/admin/DashboardStats.jsx components/admin/DashboardStats.module.css app/admin/page.jsx
git commit -m "feat: add stats dashboard as the admin landing page"
```
