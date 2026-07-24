# Guarniciones, mínimo de viandas y horarios de reparto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable guarniciones per plate (one selector per vianda), a `cantidadViandas` count that drives both the purchase minimum and the number of garnish selectors, a global minimum-viandas requirement shown across the store, and per-zone delivery days/hours surfaced on PDP, cart, and checkout.

**Architecture:** Client-only Next.js static export over Firestore. Pure cart/checkout logic in `lib/` (TDD with Vitest); live config via `onSnapshot` hooks; admin managers write to Firestore; the tienda reads and enforces. Cart line identity moves from `productoId` to `productoId + guarniciones` so the same plate with different garnishes forms separate lines.

**Tech Stack:** Next.js 14 App Router (JS, no TS), Firebase JS SDK v10 (Firestore), CSS Modules, Vitest, GSAP (unchanged here).

## Global Constraints

- JavaScript only, no TypeScript.
- `output: 'export'` static export; `trailingSlash: true` in `next.config.mjs`.
- CSS Modules only; reuse `adminShared.module.css` for admin tables.
- Firestore collections prefixed `alma_`. Project `pedidos-lett-2` is shared — Firestore rules are local-only files, never auto-deployed.
- All new pure logic is TDD: failing test first, then implementation.
- Retrocompat: products/zones without new fields use defaults (`cantidadViandas = 1`, `guarniciones = []`, delivery strings `""`, `minimoViandas = 0`). Old localStorage cart items lacking `guarniciones`/`cantidadViandas` resolve to `[]` / `1`.
- Commit after every task. Work directly on `main` (user's standing choice).
- Spanish UI copy throughout.

---

## Task 1: Cart line identity + guarniciones in `lib/cart.js`

**Files:**
- Modify: `lib/cart.js`
- Test: `lib/cart.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `cartLineId(item)` → `string` = `${item.productoId}::${(item.guarniciones || []).join("|")}`
  - `addItem(cart, product, cantidad = 1, guarniciones = [], precioEfectivo = product.precio)` → new cart array; new item shape `{ productoId, nombre, cantidadViandas, guarniciones, precio, cantidad }` where `precio = precioEfectivo` and `cantidadViandas = product.cantidadViandas || 1`. Stacks by `cartLineId`.
  - `removeItem(cart, lineId)` → filters by `cartLineId(item) !== lineId`
  - `updateQuantity(cart, lineId, cantidad)` → matches by `cartLineId`; `<= 0` removes
  - `calculateSubtotal(cart)` → unchanged (`sum(precio × cantidad)`)
  - `countViandas(cart)` → `sum((item.cantidadViandas || 1) × item.cantidad)`

- [ ] **Step 1: Update the existing tests and add new ones**

Replace `lib/cart.test.js` with:

```js
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run lib/cart.test.js`
Expected: FAIL (`cartLineId`/`countViandas` not exported; item shape mismatch).

- [ ] **Step 3: Rewrite `lib/cart.js`**

```js
export function cartLineId(item) {
  return `${item.productoId}::${(item.guarniciones || []).join("|")}`;
}

export function addItem(cart, product, cantidad = 1, guarniciones = [], precioEfectivo = product.precio) {
  const nuevo = {
    productoId: product.id,
    nombre: product.nombre,
    cantidadViandas: product.cantidadViandas || 1,
    guarniciones,
    precio: precioEfectivo,
    cantidad,
  };
  const lineId = cartLineId(nuevo);
  const existing = cart.find((item) => cartLineId(item) === lineId);
  if (existing) {
    return cart.map((item) =>
      cartLineId(item) === lineId ? { ...item, cantidad: item.cantidad + cantidad } : item
    );
  }
  return [...cart, nuevo];
}

export function removeItem(cart, lineId) {
  return cart.filter((item) => cartLineId(item) !== lineId);
}

export function updateQuantity(cart, lineId, cantidad) {
  if (cantidad <= 0) return removeItem(cart, lineId);
  return cart.map((item) => (cartLineId(item) === lineId ? { ...item, cantidad } : item));
}

export function calculateSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

export function countViandas(cart) {
  return cart.reduce((sum, item) => sum + (item.cantidadViandas || 1) * item.cantidad, 0);
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run lib/cart.test.js`
Expected: PASS (all cart tests).

- [ ] **Step 5: Commit**

```bash
git add lib/cart.js lib/cart.test.js
git commit -m "feat: cart line identity by plate+garnishes, add countViandas"
```

---

## Task 2: `validateMinimoViandas` in `lib/checkout.js`

**Files:**
- Modify: `lib/checkout.js`
- Test: `lib/checkout.test.js`

**Interfaces:**
- Consumes: `countViandas` from `lib/cart.js`.
- Produces: `validateMinimoViandas(cart, minimoViandas)` → `{ valid: boolean, faltan: number }`. `valid` is `true` when `minimoViandas <= 0` or `countViandas(cart) >= minimoViandas`; `faltan = Math.max(0, minimoViandas - countViandas(cart))`.

- [ ] **Step 1: Add failing tests**

Append to `lib/checkout.test.js`:

```js
import { validateMinimoViandas } from "./checkout";

describe("validateMinimoViandas", () => {
  const cart = [{ productoId: "p1", cantidadViandas: 1, cantidad: 3, precio: 1000 }]; // 3 viandas

  it("is valid when there is no minimum", () => {
    expect(validateMinimoViandas(cart, 0)).toEqual({ valid: true, faltan: 0 });
  });

  it("is valid when the count meets the minimum", () => {
    expect(validateMinimoViandas(cart, 3)).toEqual({ valid: true, faltan: 0 });
  });

  it("reports how many are missing when below the minimum", () => {
    expect(validateMinimoViandas(cart, 6)).toEqual({ valid: false, faltan: 3 });
  });

  it("counts packs by their cantidadViandas", () => {
    const conPack = [{ productoId: "pack", cantidadViandas: 4, cantidad: 1, precio: 5000 }];
    expect(validateMinimoViandas(conPack, 4)).toEqual({ valid: true, faltan: 0 });
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run lib/checkout.test.js`
Expected: FAIL (`validateMinimoViandas` not defined).

- [ ] **Step 3: Implement in `lib/checkout.js`**

Add the import at the top (below the existing `EMAIL_REGEX` line is fine, but imports go first):

```js
import { countViandas } from "./cart";
```

Add the function:

```js
export function validateMinimoViandas(cart, minimoViandas) {
  const total = countViandas(cart);
  const faltan = Math.max(0, (minimoViandas || 0) - total);
  return { valid: (minimoViandas || 0) <= 0 || total >= minimoViandas, faltan };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run lib/checkout.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/checkout.js lib/checkout.test.js
git commit -m "feat: add validateMinimoViandas checkout helper"
```

---

## Task 3: Stock aggregation fix in `lib/submitOrder.js`

**Files:**
- Modify: `lib/submitOrder.js`
- Create: `lib/aggregateStock.js`
- Test: `lib/aggregateStock.test.js`

**Interfaces:**
- Produces: `aggregateStockNeeds(cart)` → `Array<{ productoId, cantidadTotal, nombre }>` summing `cantidad` per `productoId` (nombre = first line's nombre for the error message). Consumed by `submitOrder` to read each product once and decrement by the summed quantity.

- [ ] **Step 1: Write the failing test**

Create `lib/aggregateStock.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run lib/aggregateStock.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/aggregateStock.js`**

```js
export function aggregateStockNeeds(cart) {
  const map = new Map();
  for (const item of cart) {
    const prev = map.get(item.productoId);
    if (prev) {
      prev.cantidadTotal += item.cantidad;
    } else {
      map.set(item.productoId, { productoId: item.productoId, cantidadTotal: item.cantidad, nombre: item.nombre });
    }
  }
  return [...map.values()];
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run lib/aggregateStock.test.js`
Expected: PASS.

- [ ] **Step 5: Wire it into `lib/submitOrder.js`**

Replace the transaction body so stock reads/writes go through the aggregated needs. Full file:

```js
import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { calculateSubtotal } from "./cart";
import { calculateTotal, calculateDiscount } from "./checkout";
import { aggregateStockNeeds } from "./aggregateStock";

export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0 }) {
  const pedidoRef = doc(collection(db, "alma_pedidos"));
  const needs = aggregateStockNeeds(cart);

  await runTransaction(db, async (transaction) => {
    const refs = needs.map((n) => doc(db, "alma_productos", n.productoId));
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));

    snapshots.forEach((snap, index) => {
      const need = needs[index];
      const stockActual = snap.exists() ? snap.data().stock : 0;
      if (stockActual < need.cantidadTotal) {
        throw new Error(`STOCK_INSUFICIENTE:${need.nombre}`);
      }
    });

    snapshots.forEach((snap, index) => {
      transaction.update(refs[index], { stock: snap.data().stock - needs[index].cantidadTotal });
    });

    const subtotal = calculateSubtotal(cart);
    const descuentoMonto = calculateDiscount(subtotal, descuentoPorcentaje);
    const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);

    transaction.set(pedidoRef, {
      cliente,
      zonaEnvioId,
      items: cart,
      subtotal,
      descuentoPorcentaje,
      descuentoMonto,
      costoEnvio,
      total,
      metodoPagoElegido: metodoPago,
      estado: "pendiente",
      createdAt: serverTimestamp(),
    });
  });

  return pedidoRef.id;
}
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS (all files).

- [ ] **Step 7: Commit**

```bash
git add lib/aggregateStock.js lib/aggregateStock.test.js lib/submitOrder.js
git commit -m "fix: aggregate stock per product so multi-garnish lines don't oversell"
```

---

## Task 4: `useTiendaConfig` hook

**Files:**
- Create: `lib/useTiendaConfig.js`

**Interfaces:**
- Produces: `useTiendaConfig()` → `{ minimoViandas: number }`. Live `onSnapshot` on doc `alma_config/tienda`; default `{ minimoViandas: 0 }` when the doc is missing or the listener errors.

- [ ] **Step 1: Write `lib/useTiendaConfig.js`**

```js
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const DEFAULT_CONFIG = { minimoViandas: 0 };

export function useTiendaConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const ref = doc(db, "alma_config", "tienda");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        setConfig({ minimoViandas: Number(data.minimoViandas) || 0 });
      },
      () => setConfig(DEFAULT_CONFIG)
    );
    return unsubscribe;
  }, []);

  return config;
}
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `npx vitest run` (no new tests; confirms nothing else broke)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/useTiendaConfig.js
git commit -m "feat: add useTiendaConfig hook for global store config"
```

---

## Task 5: Admin — Configuración page (minimum viandas)

**Files:**
- Create: `components/admin/ConfiguracionManager.jsx`
- Create: `app/admin/configuracion/page.jsx`
- Modify: `components/admin/AdminSidebar.jsx`

**Interfaces:**
- Consumes: `useTiendaConfig` (Task 4), `setDoc` with `{ merge: true }`.
- Produces: an admin route `/admin/configuracion` and a sidebar link.

- [ ] **Step 1: Write `components/admin/ConfiguracionManager.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import shared from "./adminShared.module.css";

export default function ConfiguracionManager() {
  const config = useTiendaConfig();
  const [minimo, setMinimo] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMinimo(String(config.minimoViandas));
  }, [config.minimoViandas]);

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("saving");
    await setDoc(doc(db, "alma_config", "tienda"), { minimoViandas: Number(minimo) || 0 }, { merge: true });
    setStatus("saved");
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Configuración de la tienda</h1>
      <form className={shared.addForm} onSubmit={handleSave}>
        <div className={shared.field}>
          <label htmlFor="minimo-viandas">Mínimo de viandas por pedido</label>
          <input
            id="minimo-viandas"
            type="number"
            min={0}
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <button type="submit" className={shared.addButton}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {status === "saved" && <p style={{ marginTop: "1rem", color: "var(--color-verde-oliva)", fontWeight: 600 }}>Guardado ✓</p>}
      <p style={{ marginTop: "1rem", color: "var(--color-texto)", opacity: 0.7 }}>
        0 = sin mínimo. Se muestra en el catálogo y bloquea el checkout hasta alcanzarlo.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Write `app/admin/configuracion/page.jsx`**

```jsx
"use client";

import ConfiguracionManager from "@/components/admin/ConfiguracionManager";

export default function ConfiguracionPage() {
  return <ConfiguracionManager />;
}
```

- [ ] **Step 3: Add the sidebar link in `components/admin/AdminSidebar.jsx`**

Add a `config` icon to the `ICONS` object (after `metodosPago`):

```jsx
  config: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
```

Add the item to `NAV_ITEMS` (after the métodos-de-pago entry, before pedidos):

```jsx
  { href: "/admin/configuracion", label: "Configuración", icon: ICONS.config },
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully" and `/admin/configuracion` listed among the routes. (Ignore a trailing `EBUSY` on `.next/export` cleanup — benign Dropbox lock.)

- [ ] **Step 5: Commit**

```bash
git add components/admin/ConfiguracionManager.jsx app/admin/configuracion/page.jsx components/admin/AdminSidebar.jsx
git commit -m "feat: add admin Configuración page for minimum viandas"
```

---

## Task 6: Admin — ProductoForm guarniciones + cantidadViandas

**Files:**
- Modify: `components/admin/ProductoForm.jsx`
- Modify: `components/admin/ProductoForm.module.css`

**Interfaces:**
- Consumes: existing `alma_productos` CRUD.
- Produces: products persist `cantidadViandas` (number ≥ 1) and `guarniciones` (`[{ nombre, precioExtra }]`, rows with empty `nombre` dropped).

- [ ] **Step 1: Extend `EMPTY` and add handlers in `components/admin/ProductoForm.jsx`**

In the `EMPTY` object, add after `stock: 0,`:

```jsx
  cantidadViandas: 1,
  guarniciones: [],
```

Add these handlers after `updateFoto`:

```jsx
  const addGuarnicion = () =>
    setDraft((prev) => ({ ...prev, guarniciones: [...(prev.guarniciones || []), { nombre: "", precioExtra: 0 }] }));
  const updateGuarnicion = (index, field, value) =>
    setDraft((prev) => {
      const guarniciones = [...prev.guarniciones];
      guarniciones[index] = { ...guarniciones[index], [field]: value };
      return { ...prev, guarniciones };
    });
  const removeGuarnicion = (index) =>
    setDraft((prev) => ({ ...prev, guarniciones: prev.guarniciones.filter((_, i) => i !== index) }));
```

In `handleSubmit`, change the `payload` to normalize the new fields:

```jsx
    const payload = {
      ...draft,
      precio: Number(draft.precio) || 0,
      stock: Number(draft.stock) || 0,
      cantidadViandas: Math.max(1, Number(draft.cantidadViandas) || 1),
      guarniciones: (draft.guarniciones || [])
        .filter((g) => g.nombre.trim())
        .map((g) => ({ nombre: g.nombre.trim(), precioExtra: Number(g.precioExtra) || 0 })),
      imagenUrls: draft.imagenUrls.filter(Boolean),
    };
```

- [ ] **Step 2: Add the "Cantidad de viandas" field**

Inside the "Datos básicos" section, replace the standalone Stock field block with a two-field row (Stock + Cantidad de viandas):

```jsx
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="producto-stock">Stock</label>
            <input
              id="producto-stock"
              type="number"
              value={draft.stock}
              onChange={(e) => updateField("stock", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="producto-viandas">Cantidad de viandas</label>
            <input
              id="producto-viandas"
              type="number"
              min={1}
              value={draft.cantidadViandas}
              onChange={(e) => updateField("cantidadViandas", e.target.value)}
            />
          </div>
        </div>
```

- [ ] **Step 3: Add the "Guarniciones" section**

Insert a new section after the "Fotos" section and before "Tabla nutricional":

```jsx
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Guarniciones</p>
        <p style={{ marginBottom: "0.8rem", opacity: 0.7, fontSize: "0.9rem" }}>
          Si cargás guarniciones, el cliente elige una por vianda (según la cantidad de viandas). El extra suma al precio.
        </p>
        {(draft.guarniciones || []).map((g, index) => (
          <div key={index} className={styles.guarnicionRow}>
            <input
              type="text"
              placeholder="Nombre (ej. Puré)"
              value={g.nombre}
              onChange={(e) => updateGuarnicion(index, "nombre", e.target.value)}
            />
            <input
              type="number"
              placeholder="Extra $"
              value={g.precioExtra}
              onChange={(e) => updateGuarnicion(index, "precioExtra", e.target.value)}
              style={{ width: 110 }}
            />
            <button type="button" className={styles.removeGuarnicion} onClick={() => removeGuarnicion(index)}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className={styles.addGuarnicion} onClick={addGuarnicion}>
          + Agregar guarnición
        </button>
      </div>
```

- [ ] **Step 4: Add styles to `components/admin/ProductoForm.module.css`**

Append:

```css
.guarnicionRow {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.guarnicionRow input {
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
  font-family: var(--font-body);
}

.guarnicionRow input[type="text"] {
  flex: 1;
}

.removeGuarnicion {
  background: transparent;
  border: 1px solid var(--color-beige);
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius);
  cursor: pointer;
}

.addGuarnicion {
  background: var(--color-beige);
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully" (EBUSY on cleanup is benign).

- [ ] **Step 6: Commit**

```bash
git add components/admin/ProductoForm.jsx components/admin/ProductoForm.module.css
git commit -m "feat: admin ProductoForm supports guarniciones and cantidadViandas"
```

---

## Task 7: Admin — ZonasEnvioManager delivery days/hours

**Files:**
- Modify: `components/admin/ZonasEnvioManager.jsx`

**Interfaces:**
- Produces: zonas persist `diasReparto` (string) and `horarioReparto` (string).

- [ ] **Step 1: Add state and inputs for the two new fields**

Add state next to `nombre`/`costo`:

```jsx
  const [dias, setDias] = useState("");
  const [horario, setHorario] = useState("");
```

Update `handleAdd` to include them and reset:

```jsx
  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, {
      nombre: nombre.trim(),
      costo: Number(costo) || 0,
      activa: true,
      diasReparto: dias.trim(),
      horarioReparto: horario.trim(),
    });
    setNombre("");
    setCosto(0);
    setDias("");
    setHorario("");
  };
```

- [ ] **Step 2: Add table columns**

In `<thead>`, add two headers after "Costo":

```jsx
            <th>Días de reparto</th>
            <th>Horario</th>
```

In each `<tr>`, add after the Costo `<td>`:

```jsx
              <td data-label="Días de reparto">
                <input
                  type="text"
                  defaultValue={zona.diasReparto || ""}
                  onBlur={(e) => handleFieldChange(zona, "diasReparto", e.target.value)}
                  placeholder="Ej. Lunes y Jueves"
                />
              </td>
              <td data-label="Horario">
                <input
                  type="text"
                  defaultValue={zona.horarioReparto || ""}
                  onBlur={(e) => handleFieldChange(zona, "horarioReparto", e.target.value)}
                  placeholder="Ej. 9 a 18 hs"
                />
              </td>
```

- [ ] **Step 3: Add the two fields to the add form**

In the `<form className={styles.addForm}>`, after the Costo field, add:

```jsx
        <div className={styles.field}>
          <label htmlFor="nueva-zona-dias">Días de reparto</label>
          <input id="nueva-zona-dias" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Ej. Lunes y Jueves" />
        </div>
        <div className={styles.field}>
          <label htmlFor="nueva-zona-horario">Horario</label>
          <input id="nueva-zona-horario" value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Ej. 9 a 18 hs" />
        </div>
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 5: Commit**

```bash
git add components/admin/ZonasEnvioManager.jsx
git commit -m "feat: admin zonas de envío support delivery days and hours"
```

---

## Task 8: Reusable delivery-info component

**Files:**
- Create: `components/tienda/RepartoInfo.jsx`
- Create: `components/tienda/RepartoInfo.module.css`

**Interfaces:**
- Produces: `<RepartoInfo zona={zonaObj} />` renders one zone's `diasReparto`/`horarioReparto` (nothing if both empty); `<RepartoInfo zonas={arrayDeZonas} />` renders a list of active zones that have any delivery info (for the PDP where no zone is selected). Pass exactly one of `zona` or `zonas`.

- [ ] **Step 1: Write `components/tienda/RepartoInfo.jsx`**

```jsx
"use client";

import styles from "./RepartoInfo.module.css";

function hasInfo(z) {
  return Boolean((z.diasReparto && z.diasReparto.trim()) || (z.horarioReparto && z.horarioReparto.trim()));
}

function ZonaLinea({ z, mostrarNombre }) {
  const partes = [z.diasReparto, z.horarioReparto].filter((p) => p && p.trim());
  return (
    <p className={styles.linea}>
      {mostrarNombre && <span className={styles.zonaNombre}>{z.nombre}: </span>}
      {partes.join(" · ")}
    </p>
  );
}

export default function RepartoInfo({ zona, zonas }) {
  if (zona) {
    if (!hasInfo(zona)) return null;
    return (
      <div className={styles.box}>
        <p className={styles.titulo}>Reparto</p>
        <ZonaLinea z={zona} mostrarNombre={false} />
      </div>
    );
  }

  const conInfo = (zonas || []).filter((z) => z.activa && hasInfo(z));
  if (conInfo.length === 0) return null;
  return (
    <div className={styles.box}>
      <p className={styles.titulo}>Días y horarios de reparto</p>
      {conInfo.map((z) => (
        <ZonaLinea key={z.id} z={z} mostrarNombre />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `components/tienda/RepartoInfo.module.css`**

```css
.box {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-sm) var(--space-md);
  margin: var(--space-md) 0;
}

.titulo {
  font-weight: 700;
  color: var(--color-verde-principal);
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

.linea {
  font-size: 0.9rem;
  margin: 0.15rem 0;
}

.zonaNombre {
  font-weight: 600;
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add components/tienda/RepartoInfo.jsx components/tienda/RepartoInfo.module.css
git commit -m "feat: add reusable RepartoInfo component"
```

---

## Task 9: PDP — guarnición selectors, live price, reparto info

**Files:**
- Modify: `components/tienda/ProductoDetalle.jsx`
- Modify: `components/tienda/ProductoDetalle.module.css`

**Interfaces:**
- Consumes: `addToCart(producto, cantidad, guarniciones, precioEfectivo)` (CartProvider signature extended in Task 11), `useZonasEnvio`.
- Produces: N garnish `<select>`s (N = `cantidadViandas`) when the plate has guarniciones; live effective price; garnish reset after adding; a `<RepartoInfo zonas={...} />` block.

**Note:** This task edits `ProductoDetalle.jsx` to call the extended `addToCart`. Task 11 updates the `CartProvider` signature. Since both ship together before manual QA, implement Task 11 first if executing strictly in order — but the plan orders them so that Task 11's provider change is small and self-contained. To avoid a broken intermediate build, **do Task 11 before Task 9** when executing. (Reviewers: this cross-reference is intentional.)

- [ ] **Step 1: Rewrite `components/tienda/ProductoDetalle.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProductos } from "@/lib/useProductos";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useCart } from "@/lib/CartProvider";
import GaleriaFotos from "./GaleriaFotos";
import TablaNutricional from "./TablaNutricional";
import RepartoInfo from "./RepartoInfo";
import styles from "./ProductoDetalle.module.css";

export default function ProductoDetalle() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { productos, loading } = useProductos();
  const { zonasEnvio } = useZonasEnvio();
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [guarniciones, setGuarniciones] = useState([]);
  const [agregado, setAgregado] = useState(false);

  if (loading) return <p style={{ padding: "4rem 0", textAlign: "center" }}>Cargando…</p>;

  const producto = productos.find((p) => p.id === id && p.activo);

  if (!producto) {
    return (
      <div className={styles.notFound}>
        <h1>Producto no encontrado</h1>
        <p style={{ margin: "1rem 0" }}>Puede que ya no esté disponible.</p>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const sinStock = producto.stock <= 0;
  const opciones = producto.guarniciones || [];
  const tieneGuarniciones = opciones.length > 0;
  const cantidadViandas = producto.cantidadViandas || 1;
  const slots = tieneGuarniciones ? Array.from({ length: cantidadViandas }) : [];

  const todasElegidas = !tieneGuarniciones || (guarniciones.length === cantidadViandas && guarniciones.every(Boolean));

  const extras = guarniciones.reduce((sum, nombre) => {
    const g = opciones.find((o) => o.nombre === nombre);
    return sum + (g ? Number(g.precioExtra) || 0 : 0);
  }, 0);
  const precioEfectivo = producto.precio + extras;

  const setSlot = (index, nombre) =>
    setGuarniciones((prev) => {
      const next = [...prev];
      next[index] = nombre;
      return next;
    });

  const handleAgregar = () => {
    const elegidas = tieneGuarniciones ? guarniciones.slice(0, cantidadViandas) : [];
    addToCart(producto, Math.min(cantidad, producto.stock), elegidas, precioEfectivo);
    setAgregado(true);
    setGuarniciones([]); // limpiar para poder elegir otra combinación
  };

  return (
    <div className="section">
      <div className="container">
        <div className={styles.grid}>
          <GaleriaFotos imagenUrls={producto.imagenUrls} nombre={producto.nombre} />
          <div>
            <p className="sectionLabel">{producto.tipo === "pack" ? "Pack" : "Individual"}</p>
            <h1>{producto.nombre}</h1>
            <p className={styles.precio}>${precioEfectivo}</p>
            <p className={styles.descripcion}>{producto.descripcion}</p>

            {tieneGuarniciones && !sinStock && (
              <div className={styles.guarniciones}>
                {slots.map((_, index) => (
                  <div key={index} className={styles.guarnicionField}>
                    <label htmlFor={`guarnicion-${index}`}>
                      {cantidadViandas > 1 ? `Guarnición ${index + 1}` : "Guarnición"}
                    </label>
                    <select
                      id={`guarnicion-${index}`}
                      value={guarniciones[index] || ""}
                      onChange={(e) => setSlot(index, e.target.value)}
                    >
                      <option value="">Elegí una guarnición</option>
                      {opciones.map((o) => (
                        <option key={o.nombre} value={o.nombre}>
                          {o.nombre}
                          {o.precioExtra > 0 ? ` (+$${o.precioExtra})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {sinStock ? (
              <p className={styles.sinStock}>Sin stock por el momento.</p>
            ) : (
              <div className={styles.cantidadRow}>
                <label htmlFor="cantidad">Cantidad</label>
                <input
                  id="cantidad"
                  type="number"
                  min={1}
                  max={producto.stock}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Math.min(producto.stock, Number(e.target.value) || 1)))}
                />
              </div>
            )}

            <button
              type="button"
              className={styles.agregar}
              onClick={handleAgregar}
              disabled={sinStock || !todasElegidas}
            >
              Agregar al carrito
            </button>
            {tieneGuarniciones && !todasElegidas && !sinStock && (
              <p className={styles.aviso}>Elegí {cantidadViandas > 1 ? "todas las guarniciones" : "una guarnición"} para continuar.</p>
            )}

            {agregado && <p className={styles.confirmacion}>Agregado al carrito ✓</p>}

            <RepartoInfo zonas={zonasEnvio} />
            <TablaNutricional datos={producto.tablaNutricional} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add styles to `components/tienda/ProductoDetalle.module.css`**

Append:

```css
.guarniciones {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.guarnicionField label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

.guarnicionField select {
  width: 100%;
  max-width: 320px;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
  font-family: var(--font-body);
}

.aviso {
  color: #b3452f;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add components/tienda/ProductoDetalle.jsx components/tienda/ProductoDetalle.module.css
git commit -m "feat: PDP garnish selectors with live price and reparto info"
```

---

## Task 10: CarritoItem — show garnishes, use lineId

**Files:**
- Modify: `components/tienda/CarritoItem.jsx`
- Modify: `components/tienda/CarritoItem.module.css`

**Interfaces:**
- Consumes: `cartLineId` (Task 1), `updateCartQuantity(lineId, cantidad)` / `removeFromCart(lineId)` (CartProvider signature from Task 11).

- [ ] **Step 1: Rewrite `components/tienda/CarritoItem.jsx`**

```jsx
"use client";

import { useCart } from "@/lib/CartProvider";
import { cartLineId } from "@/lib/cart";
import styles from "./CarritoItem.module.css";

export default function CarritoItem({ item }) {
  const { updateCartQuantity, removeFromCart } = useCart();
  const lineId = cartLineId(item);
  const guarniciones = item.guarniciones || [];

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.nombre}>{item.nombre}</span>
        {guarniciones.length > 0 && <span className={styles.guarniciones}>{guarniciones.join(", ")}</span>}
      </div>
      <span>${item.precio}</span>
      <input
        type="number"
        min={1}
        value={item.cantidad}
        onChange={(e) => updateCartQuantity(lineId, Number(e.target.value) || 1)}
        className={styles.cantidad}
      />
      <button type="button" className={styles.quitar} onClick={() => removeFromCart(lineId)}>
        Quitar
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add styles to `components/tienda/CarritoItem.module.css`**

Append (keeps existing `.row`, `.nombre`, `.cantidad`, `.quitar`):

```css
.info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.guarniciones {
  font-size: 0.82rem;
  opacity: 0.7;
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add components/tienda/CarritoItem.jsx components/tienda/CarritoItem.module.css
git commit -m "feat: cart item shows garnishes and operates by lineId"
```

---

## Task 11: CartProvider signature + CarritoView minimum bar & reparto

**Files:**
- Modify: `lib/CartProvider.jsx`
- Modify: `components/tienda/CarritoView.jsx`
- Modify: `components/tienda/CarritoView.module.css`

**Interfaces:**
- Produces:
  - `addToCart(producto, cantidad, guarniciones = [], precioEfectivo = producto.precio)`
  - `removeFromCart(lineId)`, `updateCartQuantity(lineId, cantidad)`
  - `viandaCount` from `countViandas(cart)` exposed on the context.

**Note:** Execute this task **before** Tasks 9 and 10 to keep intermediate builds green (they call the new signatures).

- [ ] **Step 1: Update `lib/CartProvider.jsx`**

Change the import and the `value` object:

```jsx
import { addItem, removeItem, updateQuantity, calculateSubtotal, countViandas } from "./cart";
```

```jsx
  const value = {
    cart,
    addToCart: (producto, cantidad, guarniciones = [], precioEfectivo = producto.precio) =>
      setCart((prev) => addItem(prev, producto, cantidad, guarniciones, precioEfectivo)),
    removeFromCart: (lineId) => setCart((prev) => removeItem(prev, lineId)),
    updateCartQuantity: (lineId, cantidad) => setCart((prev) => updateQuantity(prev, lineId, cantidad)),
    clearCart: () => setCart([]),
    subtotal: calculateSubtotal(cart),
    itemCount: cart.reduce((n, item) => n + item.cantidad, 0),
    viandaCount: countViandas(cart),
  };
```

- [ ] **Step 2: Update `components/tienda/CarritoView.jsx`**

Add imports and consume config; add the progress bar and gating. Full file:

```jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import { calculateTotal, validateMinimoViandas } from "@/lib/checkout";
import CarritoItem from "./CarritoItem";
import RepartoInfo from "./RepartoInfo";
import styles from "./CarritoView.module.css";

export default function CarritoView() {
  const { cart, subtotal, viandaCount } = useCart();
  const { zonasEnvio, loading } = useZonasEnvio();
  const { minimoViandas } = useTiendaConfig();
  const [zonaId, setZonaId] = useState("");

  const zonasActivas = zonasEnvio.filter((z) => z.activa);

  useEffect(() => {
    if (!zonaId && zonasActivas.length > 0) {
      setZonaId(zonasActivas[0].id);
    }
  }, [zonasActivas, zonaId]);

  if (cart.length === 0) {
    return (
      <div className={styles.empty}>
        <h1>Tu carrito está vacío</h1>
        <p style={{ margin: "1rem 0" }}>Todavía no agregaste ninguna vianda.</p>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const zonaSeleccionada = zonasActivas.find((z) => z.id === zonaId);
  const costoEnvio = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const total = calculateTotal(subtotal, costoEnvio);
  const { valid: minimoOk, faltan } = validateMinimoViandas(cart, minimoViandas);
  const progreso = minimoViandas > 0 ? Math.min(100, Math.round((viandaCount / minimoViandas) * 100)) : 100;

  return (
    <div>
      {minimoViandas > 0 && (
        <div className={styles.minimo}>
          <div className={styles.minimoLabel}>
            <span>{viandaCount} de {minimoViandas} viandas</span>
            {!minimoOk && <span className={styles.faltan}>Te faltan {faltan} para el mínimo</span>}
            {minimoOk && <span className={styles.listo}>¡Mínimo alcanzado! ✓</span>}
          </div>
          <div className={styles.barra}>
            <div className={styles.barraFill} style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}

      {cart.map((item) => (
        <CarritoItem key={`${item.productoId}::${(item.guarniciones || []).join("|")}`} item={item} />
      ))}

      <div className={styles.zona}>
        <label htmlFor="zona-envio">Zona de envío</label>
        {loading ? (
          <p>Cargando zonas…</p>
        ) : (
          <select id="zona-envio" value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
            {zonasActivas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre} — ${zona.costo}
              </option>
            ))}
          </select>
        )}
      </div>

      {zonaSeleccionada && <RepartoInfo zona={zonaSeleccionada} />}

      <div className={styles.totales}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>${subtotal}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Envío</span>
          <span>${costoEnvio}</span>
        </div>
        <div className={`${styles.totalRow} ${styles.totalFinal}`}>
          <span>Total</span>
          <span>${total}</span>
        </div>
      </div>

      {minimoOk ? (
        <Link href={`/tienda/checkout?zona=${zonaId}`} className={styles.continuar}>
          Continuar al checkout
        </Link>
      ) : (
        <button type="button" className={styles.continuar} disabled aria-disabled="true">
          Agregá {faltan} vianda{faltan === 1 ? "" : "s"} más
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add styles to `components/tienda/CarritoView.module.css`**

Append:

```css
.minimo {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-md);
}

.minimoLabel {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.faltan {
  color: #b3452f;
}

.listo {
  color: var(--color-verde-oliva);
}

.barra {
  height: 10px;
  background: var(--color-beige);
  border-radius: 999px;
  overflow: hidden;
}

.barraFill {
  height: 100%;
  background: var(--color-verde-principal);
  transition: width 0.3s ease;
}

.continuar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 5: Commit**

```bash
git add lib/CartProvider.jsx components/tienda/CarritoView.jsx components/tienda/CarritoView.module.css
git commit -m "feat: cart minimum-viandas progress bar, gating, and reparto info"
```

---

## Task 12: Checkout — garnishes in resumen, reparto, minimum revalidation

**Files:**
- Modify: `components/tienda/CheckoutForm.jsx`

**Interfaces:**
- Consumes: `useTiendaConfig`, `validateMinimoViandas`, `RepartoInfo`.

- [ ] **Step 1: Add imports**

```jsx
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import { validateCheckoutForm, calculateTotal, calculateDiscount, validateMinimoViandas } from "@/lib/checkout";
import RepartoInfo from "./RepartoInfo";
```

(Replace the existing `validateCheckoutForm, calculateTotal, calculateDiscount` import line with the one above.)

- [ ] **Step 2: Consume config and compute minimum**

After `const { metodosPago } = useMetodosPago();` add:

```jsx
  const { minimoViandas } = useTiendaConfig();
```

After the existing derived values (near `const total = ...`), add:

```jsx
  const { valid: minimoOk, faltan } = validateMinimoViandas(cart, minimoViandas);
```

- [ ] **Step 3: Guard submit on the minimum**

In `handleSubmit`, right after `if (!valid) return;`, add:

```jsx
    if (!minimoOk) {
      setErrorMessage(`El pedido mínimo es de ${minimoViandas} viandas. Te faltan ${faltan}.`);
      setStatus("error");
      return;
    }
```

- [ ] **Step 4: Show garnishes per line in the resumen**

Replace the cart-map block in the resumen:

```jsx
        {cart.map((item) => (
          <div key={`${item.productoId}::${(item.guarniciones || []).join("|")}`} className={styles.resumenRow}>
            <span>
              {item.cantidad}× {item.nombre}
              {(item.guarniciones || []).length > 0 ? ` (${item.guarniciones.join(", ")})` : ""}
            </span>
            <span>${item.precio * item.cantidad}</span>
          </div>
        ))}
```

- [ ] **Step 5: Show reparto info for the selected zone**

Directly after the resumen's total row / before the submit button, add:

```jsx
        {zonaSeleccionada && <RepartoInfo zona={zonaSeleccionada} />}
```

(`zonaSeleccionada` already exists in `CheckoutForm`. Verify the variable name; if it is `zonaSeleccionada`, use it as-is.)

- [ ] **Step 6: Disable the submit button when below the minimum**

Change the submit button's `disabled` prop:

```jsx
        <button type="submit" className={styles.confirmar} disabled={status === "submitting" || !minimoOk}>
          {status === "submitting" ? "Confirmando..." : minimoOk ? "Confirmar pedido" : `Faltan ${faltan} viandas`}
        </button>
```

- [ ] **Step 7: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 8: Commit**

```bash
git add components/tienda/CheckoutForm.jsx
git commit -m "feat: checkout shows garnishes/reparto and enforces the minimum"
```

---

## Task 13: Catálogo — minimum banner

**Files:**
- Modify: `components/tienda/Catalogo.jsx`
- Modify: `components/tienda/Catalogo.module.css`

**Interfaces:**
- Consumes: `useTiendaConfig`.

- [ ] **Step 1: Add the banner in `components/tienda/Catalogo.jsx`**

Add the import and hook:

```jsx
import { useTiendaConfig } from "@/lib/useTiendaConfig";
```

Inside the component, add:

```jsx
  const { minimoViandas } = useTiendaConfig();
```

In the returned JSX, right after the opening `<div>` and before `<CategoriaFiltro ... />`, add:

```jsx
      {minimoViandas > 0 && (
        <p className={styles.minimoBanner}>Pedido mínimo: {minimoViandas} viandas</p>
      )}
```

- [ ] **Step 2: Add the style in `components/tienda/Catalogo.module.css`**

Append:

```css
.minimoBanner {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.6rem var(--space-md);
  border-radius: var(--radius);
  font-weight: 600;
  text-align: center;
  margin-bottom: var(--space-md);
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add components/tienda/Catalogo.jsx components/tienda/Catalogo.module.css
git commit -m "feat: catalog shows the minimum-viandas banner"
```

---

## Task 14: Firestore rules for `alma_config`

**Files:**
- Modify: the local Firestore rules file (find it: `firestore.rules` or under `docs/`; it is local-only, never auto-deployed).

**Interfaces:** none (rules only).

- [ ] **Step 1: Locate the rules file**

Run: `git ls-files | grep -i rules`
Then read it to match the existing style for `alma_*` collections.

- [ ] **Step 2: Add a rule block for `alma_config`**

Public read, admin-only write (mirror how other admin-managed collections like `alma_zonas_envio` are written in that file). Example shape (adapt to the file's existing helper functions):

```
match /alma_config/{docId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

If the file uses a different admin check (e.g. an inline `exists(...)` on an admins collection), copy that exact pattern from the `alma_zonas_envio` block rather than introducing `isAdmin()`.

- [ ] **Step 3: Note the manual-merge caveat in the commit**

Since the project is shared (`pedidos-lett-2`) and rules are never auto-deployed, this file is a source-of-truth only. Do not run any deploy.

- [ ] **Step 4: Commit**

```bash
git add <rules-file>
git commit -m "chore: Firestore rules for alma_config (local only, manual merge)"
```

---

## Task 15: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS. Count = 39 previous + new (cart additions, `validateMinimoViandas` ×4, `aggregateStockNeeds` ×2).

- [ ] **Step 2: Clean production build**

Run: `rm -rf .next out && npm run build`
Expected: succeeds; routes include `/admin/configuracion`. Retry once if it fails with `EBUSY` (benign Dropbox lock).

- [ ] **Step 3: Verify export structure**

Run: `ls out/admin/configuracion/`
Expected: `index.html` present.

- [ ] **Step 4: Manual QA (dev server)**

Run `npm run dev` and walk through:
- Admin → Configuración: set minimum (e.g. 6), save, reload — value persists.
- Admin → Productos: create/edit an individual plate with 2–3 guarniciones (one with an extra like +$500) and `cantidadViandas = 1`; create a pack with `cantidadViandas = 4` and guarniciones.
- Admin → Envíos: set `Días de reparto`/`Horario` on a zone.
- PDP individual: one garnish selector, price updates with the +$500 option, "Agregar" disabled until chosen, selection clears after adding; reparto block lists zones.
- PDP pack: four garnish selectors; must choose all four; price sums the extras.
- Add the same plate twice with different garnishes → two separate lines in the cart.
- Cart: progress bar fills toward the minimum; "Continuar" disabled until reached; each line shows its garnishes; selected zone shows its reparto.
- Checkout: resumen shows garnishes per line; reparto shows; submit blocked below the minimum.
- Full purchase once with a discount method + garnishes; confirm the `alma_pedidos` doc has correct `items` (with `guarniciones`), effective prices, totals, and that stock decremented by the aggregated quantity (add the same plate with two garnishes, buy, confirm stock dropped by the summed count, not once).
- Catalog banner shows the minimum.

Per the user's standing "avancemos" guidance, keep browser QA focused; trust the unit-tested pure logic and don't over-invest if the Chrome tooling is flaky.

- [ ] **Step 5: Commit any QA fixes**

If Step 4 surfaces bugs, fix and commit normally; otherwise no commit.

- [ ] **Step 6: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** guarniciones config (Task 6) + selection/reset (Task 9); `cantidadViandas` drives minimum (Tasks 1–2) and selector count (Task 9); minimum config (Tasks 4–5), display (Tasks 11, 13), enforcement (Tasks 11–12); per-zone reparto config (Task 7) + display on PDP/cart/checkout (Tasks 8–9, 11–12); stock oversell fix (Task 3); rules (Task 14).
- **Placeholder scan:** no TBD/TODO; every code step shows full content. Task 14 intentionally instructs locating the rules file (its path/admin-helper differs per environment) rather than hardcoding a possibly-wrong path.
- **Type consistency:** cart item shape `{ productoId, nombre, cantidadViandas, guarniciones, precio, cantidad }` is identical across `cart.js`, `CartProvider`, `CarritoItem`, `CheckoutForm`, `submitOrder`. `addToCart(producto, cantidad, guarniciones, precioEfectivo)` matches its callers (PDP). `removeFromCart(lineId)`/`updateCartQuantity(lineId, …)` match `CarritoItem`. `useTiendaConfig()` returns `{ minimoViandas }` used consistently. `RepartoInfo` `zona`/`zonas` prop contract matches all three call sites.
- **Ordering caveat:** Task 11 (CartProvider signatures) must run before Tasks 9 and 10 to keep intermediate builds green; noted in those tasks. If executing strictly top-to-bottom, do 1→8, then 11, then 9, 10, 12, 13, 14, 15.
- **Known scope note:** garnish line identity is order-sensitive (`Puré|Ensalada` ≠ `Ensalada|Puré`); accepted minor edge per the spec.
