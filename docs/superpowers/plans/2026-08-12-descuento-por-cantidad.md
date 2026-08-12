# Descuento por cantidad de viandas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin configure tiered quantity discounts (e.g. 10+ viandas = 5%, 50+ viandas = 10%), show them in the cart and checkout, and apply them in a chain with the existing payment-method discount (quantity discount first, then payment-method discount on what's left) — without breaking anything already built for order numbers or email notifications.

**Architecture:** A new Firestore collection `alma_descuentos_cantidad` (one doc per tier, same CRUD-list pattern as `alma_metodos_pago`) feeds a new pure function `resolveDescuentoCantidad(cart, escalones)` in `lib/checkout.js`. `CarritoView.jsx` and `CheckoutForm.jsx` both call it; `CheckoutForm.jsx` and `lib/submitOrder.js` chain it with the existing `calculateDiscount` call for the payment-method discount instead of adding the two percentages together.

**Tech Stack:** Next.js 14 (static export, client components), Firebase Firestore (client SDK), Vitest.

## Global Constraints

- Same constraints as the previous feature: static export (no API routes), no separate dev/staging Firebase project — never submit a real checkout order during automated verification.
- `firestore.rules` is local-only and never auto-deployed automatically by tooling other than the explicit `firebase deploy --only firestore:rules --project pedidos-lett-2` command run in this session — but this time, **after deploying, re-verify read access on every known collection, not just the new one** (lesson from this session's `alma_metodos_pago` incident, where the local rules file was missing a rule for a collection already in production use).
- Follow existing conventions: pure logic in `lib/checkout.js` with matching tests in `lib/checkout.test.js`; admin list-CRUD screens mirror `MetodosPagoManager.jsx` exactly (inline-edit via `onBlur` + `updateDocById`, `createDoc` for new rows, `deleteDocById` for removal).
- `descuentoMonto` and `descuentoPorcentaje` on `alma_pedidos` keep their current meaning (combined total discount amount; payment-method percentage) so the already-shipped email/admin code that reads them keeps working unmodified where possible.

---

### Task 1: Firestore rule for `alma_descuentos_cantidad`

**Files:**
- Modify: `firestore.rules`

**Interfaces:** none (rules only).

- [ ] **Step 1: Add the rule block**

Add, right after the `alma_metodos_pago` block:

```
    match /alma_descuentos_cantidad/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
```

- [ ] **Step 2: Commit (do not deploy yet — deployed together with full verification in Task 10)**

```bash
git add firestore.rules
git commit -m "chore: Firestore rule for alma_descuentos_cantidad"
```

---

### Task 2: Pure tier-resolution function

**Files:**
- Modify: `lib/checkout.js`
- Modify: `lib/checkout.test.js`

**Interfaces:**
- Consumes: `countViandas(cart)` (already imported in `checkout.js` from `./cart`).
- Produces: `resolveDescuentoCantidad(cart, escalones) → { porcentaje, siguienteCantidad, siguientePorcentaje, faltanParaSiguiente }`. Consumed by Task 6 (`CarritoView.jsx`) and Task 7 (`CheckoutForm.jsx`).

- [ ] **Step 1: Write the failing tests**

Append to `lib/checkout.test.js` (add `resolveDescuentoCantidad` to the existing import on line 2):

```js
import { calculateTotal, validateCheckoutForm, validateStockAvailability, calculateDiscount, validateMinimoViandas, resolveEnvioGratis, resolveDescuentoCantidad } from "./checkout";
```

Add at the end of the file:

```js
describe("resolveDescuentoCantidad", () => {
  const cart = [{ productoId: "p1", cantidadViandas: 1, cantidad: 12, precio: 1000 }]; // 12 viandas

  it("returns 0% when there are no escalones", () => {
    expect(resolveDescuentoCantidad(cart, [])).toEqual({
      porcentaje: 0,
      siguienteCantidad: null,
      siguientePorcentaje: null,
      faltanParaSiguiente: 0,
    });
  });

  it("returns 0% and reports the next tier when below the first threshold", () => {
    const escalones = [{ cantidadMinima: 20, porcentaje: 5, activo: true }];
    expect(resolveDescuentoCantidad(cart, escalones)).toEqual({
      porcentaje: 0,
      siguienteCantidad: 20,
      siguientePorcentaje: 5,
      faltanParaSiguiente: 8,
    });
  });

  it("applies the tier when the cart exactly meets it", () => {
    const escalones = [{ cantidadMinima: 12, porcentaje: 5, activo: true }];
    expect(resolveDescuentoCantidad(cart, escalones)).toEqual({
      porcentaje: 5,
      siguienteCantidad: null,
      siguientePorcentaje: null,
      faltanParaSiguiente: 0,
    });
  });

  it("applies the highest tier reached among several, and reports the next one", () => {
    const escalones = [
      { cantidadMinima: 10, porcentaje: 5, activo: true },
      { cantidadMinima: 50, porcentaje: 10, activo: true },
    ];
    expect(resolveDescuentoCantidad(cart, escalones)).toEqual({
      porcentaje: 5,
      siguienteCantidad: 50,
      siguientePorcentaje: 10,
      faltanParaSiguiente: 38,
    });
  });

  it("ignores inactive tiers", () => {
    const escalones = [{ cantidadMinima: 10, porcentaje: 5, activo: false }];
    expect(resolveDescuentoCantidad(cart, escalones)).toEqual({
      porcentaje: 0,
      siguienteCantidad: null,
      siguientePorcentaje: null,
      faltanParaSiguiente: 0,
    });
  });

  it("works regardless of input order", () => {
    const escalones = [
      { cantidadMinima: 50, porcentaje: 10, activo: true },
      { cantidadMinima: 10, porcentaje: 5, activo: true },
    ];
    expect(resolveDescuentoCantidad(cart, escalones).porcentaje).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/checkout.test.js`
Expected: FAIL — `resolveDescuentoCantidad is not a function` (or import error).

- [ ] **Step 3: Implement the function**

Append to `lib/checkout.js`:

```js
export function resolveDescuentoCantidad(cart, escalones) {
  const total = countViandas(cart);
  const activos = (escalones || [])
    .filter((e) => e.activo)
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima);

  const alcanzado = [...activos].reverse().find((e) => e.cantidadMinima <= total);
  const siguiente = activos.find((e) => e.cantidadMinima > total);

  return {
    porcentaje: alcanzado ? alcanzado.porcentaje : 0,
    siguienteCantidad: siguiente ? siguiente.cantidadMinima : null,
    siguientePorcentaje: siguiente ? siguiente.porcentaje : null,
    faltanParaSiguiente: siguiente ? siguiente.cantidadMinima - total : 0,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/checkout.test.js`
Expected: PASS, 6 new tests (27 total in this file).

- [ ] **Step 5: Commit**

```bash
git add lib/checkout.js lib/checkout.test.js
git commit -m "feat: add resolveDescuentoCantidad pure function for tiered discounts"
```

---

### Task 3: `useDescuentosCantidad` hook

**Files:**
- Create: `lib/useDescuentosCantidad.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `useDescuentosCantidad() → { escalones: Array<{id, cantidadMinima, porcentaje, activo}>, loading: boolean }`. Consumed by Task 4 (admin manager reads via `onSnapshot` directly, same as `MetodosPagoManager.jsx` does — this hook is for the storefront), Task 6, Task 7.

- [ ] **Step 1: Write the hook**

Create `lib/useDescuentosCantidad.js`, mirroring `lib/useMetodosPago.js` exactly:

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useDescuentosCantidad() {
  const [escalones, setEscalones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_descuentos_cantidad"), orderBy("cantidadMinima"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEscalones(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setEscalones([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { escalones, loading };
}
```

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: PASS (this file has no dedicated test, same as `useMetodosPago.js` — confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add lib/useDescuentosCantidad.js
git commit -m "feat: add useDescuentosCantidad hook"
```

---

### Task 4: Admin — tier manager screen

**Files:**
- Create: `components/admin/DescuentosCantidadManager.jsx`
- Create: `components/admin/DescuentosCantidadManager.module.css`
- Create: `app/admin/descuentos-cantidad/page.jsx`
- Modify: `components/admin/AdminSidebar.jsx`

**Interfaces:**
- Consumes: nothing from other tasks (reads `alma_descuentos_cantidad` directly via `onSnapshot`, same pattern as `MetodosPagoManager.jsx`).
- Produces: nothing consumed elsewhere — this is an admin entry point, same role as `MetodosPagoManager.jsx`.

- [ ] **Step 1: Create the CSS module**

Create `components/admin/DescuentosCantidadManager.module.css` with the exact same content as `components/admin/MetodosPagoManager.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.card {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-sm) var(--space-md);
  flex-wrap: wrap;
}

.badge {
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
  margin-bottom: 0.6rem;
}

.activaRow {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.6rem;
}
```

- [ ] **Step 2: Create the manager component**

Create `components/admin/DescuentosCantidadManager.jsx`, mirroring `components/admin/MetodosPagoManager.jsx` field-for-field (`nombre`→`cantidadMinima`, `descuentoPorcentaje`→`porcentaje`):

```jsx
"use client";

import { useState } from "react";
import { useDescuentosCantidad } from "@/lib/useDescuentosCantidad";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import shared from "./adminShared.module.css";
import styles from "./DescuentosCantidadManager.module.css";

const COLLECTION = "alma_descuentos_cantidad";

export default function DescuentosCantidadManager() {
  const { escalones, loading } = useDescuentosCantidad();
  const [cantidadMinima, setCantidadMinima] = useState(0);
  const [porcentaje, setPorcentaje] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!cantidadMinima) return;
    await createDoc(COLLECTION, {
      cantidadMinima: Number(cantidadMinima) || 0,
      porcentaje: Number(porcentaje) || 0,
      activo: true,
    });
    setCantidadMinima(0);
    setPorcentaje(0);
  };

  const handleFieldChange = (escalon, field, value) => {
    updateDocById(COLLECTION, escalon.id, { [field]: value });
  };

  const handleDelete = (escalon) => {
    deleteDocById(COLLECTION, escalon.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Descuentos por cantidad</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-texto)" }}>
        Cada escalón se aplica sobre el total de viandas del pedido. Se usa el escalón activo más alto que el
        cliente alcance; el descuento se aplica primero, y el de método de pago se calcula después sobre lo que
        queda.
      </p>

      <div className={styles.list}>
        {escalones.map((escalon) => (
          <div key={escalon.id} className={styles.card}>
            <div className={shared.field} style={{ maxWidth: 160 }}>
              <label htmlFor={`cantidad-${escalon.id}`}>Viandas mínimas</label>
              <input
                id={`cantidad-${escalon.id}`}
                type="number"
                defaultValue={escalon.cantidadMinima}
                onBlur={(e) => handleFieldChange(escalon, "cantidadMinima", Number(e.target.value))}
              />
            </div>
            <div className={shared.field} style={{ maxWidth: 140 }}>
              <label htmlFor={`porcentaje-${escalon.id}`}>Descuento %</label>
              <input
                id={`porcentaje-${escalon.id}`}
                type="number"
                defaultValue={escalon.porcentaje}
                onBlur={(e) => handleFieldChange(escalon, "porcentaje", Number(e.target.value))}
              />
            </div>
            {escalon.porcentaje > 0 && <span className={styles.badge}>-{escalon.porcentaje}%</span>}
            <label className={styles.activaRow}>
              <input
                type="checkbox"
                defaultChecked={escalon.activo}
                onChange={(e) => handleFieldChange(escalon, "activo", e.target.checked)}
              />
              Activo
            </label>
            <button type="button" className={shared.delete} onClick={() => handleDelete(escalon)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nuevo-escalon-cantidad">Viandas mínimas</label>
          <input
            id="nuevo-escalon-cantidad"
            type="number"
            value={cantidadMinima}
            onChange={(e) => setCantidadMinima(e.target.value)}
            style={{ width: 100 }}
          />
        </div>
        <div className={shared.field}>
          <label htmlFor="nuevo-escalon-porcentaje">Descuento %</label>
          <input
            id="nuevo-escalon-porcentaje"
            type="number"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            style={{ width: 80 }}
          />
        </div>
        <button type="submit" className={shared.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create the route page**

Create `app/admin/descuentos-cantidad/page.jsx`:

```jsx
"use client";

import DescuentosCantidadManager from "@/components/admin/DescuentosCantidadManager";

export default function DescuentosCantidadPage() {
  return <DescuentosCantidadManager />;
}
```

- [ ] **Step 4: Add the sidebar entry**

In `components/admin/AdminSidebar.jsx`, add a new icon to the `ICONS` object (right after `metodosPago`, around line 59):

```jsx
  descuentos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
```

Then add a nav entry to `NAV_ITEMS` (line 104-114), right after the `metodos-pago` entry:

```jsx
  { href: "/admin/descuentos-cantidad", label: "Descuentos por cantidad", icon: ICONS.descuentos },
```

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: PASS (no dedicated tests for these files, same as the other admin managers — confirms nothing broke).

- [ ] **Step 6: Commit**

```bash
git add components/admin/DescuentosCantidadManager.jsx components/admin/DescuentosCantidadManager.module.css app/admin/descuentos-cantidad/page.jsx components/admin/AdminSidebar.jsx
git commit -m "feat: add admin screen for quantity-discount tiers"
```

---

### Task 5: Chain the discount calculation in `lib/submitOrder.js`

**Files:**
- Modify: `lib/submitOrder.js`

**Interfaces:**
- Consumes: `calculateSubtotal`, `calculateTotal`, `calculateDiscount` (already imported).
- Produces: `submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0, descuentoCantidadPorcentaje = 0 })` — **new optional parameter** `descuentoCantidadPorcentaje`, default `0` so existing callers (none besides `CheckoutForm.jsx`, updated in Task 7) keep working. Return shape (`{ pedidoId, numeroPedido }`) is unchanged.

- [ ] **Step 1: Update the function signature and discount math**

In `lib/submitOrder.js`, change the signature (currently `export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0 }) {`) to:

```js
export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0, descuentoCantidadPorcentaje = 0 }) {
```

Replace the current discount/total block inside the transaction:

```js
    const subtotal = calculateSubtotal(cart);
    const descuentoMonto = calculateDiscount(subtotal, descuentoPorcentaje);
    const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);
```

with:

```js
    const subtotal = calculateSubtotal(cart);
    const descuentoCantidadMonto = calculateDiscount(subtotal, descuentoCantidadPorcentaje);
    const subtotalPostCantidad = subtotal - descuentoCantidadMonto;
    const descuentoMetodoPagoMonto = calculateDiscount(subtotalPostCantidad, descuentoPorcentaje);
    const descuentoMonto = descuentoCantidadMonto + descuentoMetodoPagoMonto;
    const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);
```

And extend the `transaction.set(pedidoRef, { ... })` call — replace:

```js
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
      numeroPedido,
      createdAt: serverTimestamp(),
    });
```

with:

```js
    transaction.set(pedidoRef, {
      cliente,
      zonaEnvioId,
      items: cart,
      subtotal,
      descuentoCantidadPorcentaje,
      descuentoCantidadMonto,
      descuentoPorcentaje,
      descuentoMetodoPagoMonto,
      descuentoMonto,
      costoEnvio,
      total,
      metodoPagoElegido: metodoPago,
      estado: "pendiente",
      numeroPedido,
      createdAt: serverTimestamp(),
    });
```

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: PASS (no dedicated test for this file, same as before — confirms no import broke).

- [ ] **Step 3: Commit**

```bash
git add lib/submitOrder.js
git commit -m "feat: chain quantity discount with payment-method discount in submitOrder"
```

---

### Task 6: Show the discount in the cart (`CarritoView.jsx`)

**Files:**
- Modify: `components/tienda/CarritoView.jsx`

**Interfaces:**
- Consumes: `useDescuentosCantidad()` (Task 3), `resolveDescuentoCantidad` + `calculateDiscount` (Task 2, already exported from `lib/checkout.js`).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add imports**

Replace the current checkout import line:

```js
import { calculateTotal, validateMinimoViandas, resolveEnvioGratis } from "@/lib/checkout";
```

with:

```js
import { calculateTotal, calculateDiscount, validateMinimoViandas, resolveEnvioGratis, resolveDescuentoCantidad } from "@/lib/checkout";
import { useDescuentosCantidad } from "@/lib/useDescuentosCantidad";
```

- [ ] **Step 2: Compute the discount**

Right after `const { minimoViandas } = config;` (line 17), add:

```js
  const { escalones } = useDescuentosCantidad();
```

Replace the total calculation block:

```js
  const costoEnvio = envioGratisAplica ? 0 : costoEnvioBase;
  const total = calculateTotal(subtotal, costoEnvio);
```

with:

```js
  const costoEnvio = envioGratisAplica ? 0 : costoEnvioBase;
  const { porcentaje: descuentoCantidadPorcentaje, siguientePorcentaje, faltanParaSiguiente } = resolveDescuentoCantidad(cart, escalones);
  const descuentoCantidadMonto = calculateDiscount(subtotal, descuentoCantidadPorcentaje);
  const total = calculateTotal(subtotal - descuentoCantidadMonto, costoEnvio);
```

- [ ] **Step 3: Add the banner**

Right after the envío-gratis banner block (currently lines 63-69, the `{config.envioGratisActivo && ...}` block), add:

```jsx
      {escalones.some((e) => e.activo) && (
        <p className={descuentoCantidadPorcentaje > 0 ? styles.listo : styles.faltan}>
          {descuentoCantidadPorcentaje > 0
            ? `¡Descuento por cantidad: ${descuentoCantidadPorcentaje}%!${
                faltanParaSiguiente > 0 ? ` Te faltan ${faltanParaSiguiente} vianda${faltanParaSiguiente === 1 ? "" : "s"} más para ${siguientePorcentaje}%.` : ""
              }`
            : `Te faltan ${faltanParaSiguiente} vianda${faltanParaSiguiente === 1 ? "" : "s"} para ${siguientePorcentaje}% de descuento`}
        </p>
      )}
```

- [ ] **Step 4: Add the totals row**

In the `.totales` block, replace:

```jsx
      <div className={styles.totales}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>${subtotal}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Envío</span>
          <span>{envioGratisAplica ? "Gratis" : `$${costoEnvio}`}</span>
        </div>
```

with:

```jsx
      <div className={styles.totales}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>${subtotal}</span>
        </div>
        {descuentoCantidadMonto > 0 && (
          <div className={styles.totalRow}>
            <span>Descuento por cantidad ({descuentoCantidadPorcentaje}%)</span>
            <span>-${descuentoCantidadMonto}</span>
          </div>
        )}
        <div className={styles.totalRow}>
          <span>Envío</span>
          <span>{envioGratisAplica ? "Gratis" : `$${costoEnvio}`}</span>
        </div>
```

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: PASS (this component has no dedicated test — confirms no import broke).

- [ ] **Step 6: Commit**

```bash
git add components/tienda/CarritoView.jsx
git commit -m "feat: show quantity discount banner and total in the cart"
```

---

### Task 7: Chain the discount in checkout (`CheckoutForm.jsx`)

**Files:**
- Modify: `components/tienda/CheckoutForm.jsx`

**Interfaces:**
- Consumes: `submitOrder(...)` new `descuentoCantidadPorcentaje` param (Task 5), `resolveDescuentoCantidad`/`useDescuentosCantidad` (Tasks 2-3), `buildOrderEmailParams` new params (Task 8 — this task passes them; Task 8 makes the function accept them).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add imports**

Replace:

```js
import { validateCheckoutForm, calculateTotal, calculateDiscount, validateMinimoViandas, resolveEnvioGratis } from "@/lib/checkout";
```

with:

```js
import { validateCheckoutForm, calculateTotal, calculateDiscount, validateMinimoViandas, resolveEnvioGratis, resolveDescuentoCantidad } from "@/lib/checkout";
import { useDescuentosCantidad } from "@/lib/useDescuentosCantidad";
```

- [ ] **Step 2: Compute the chained discount**

Right after `const config = useTiendaConfig();` (line 24), add:

```js
  const { escalones } = useDescuentosCantidad();
```

Replace the discount/total calculation block:

```js
  const descuentoPorcentaje = metodoSeleccionado ? metodoSeleccionado.descuentoPorcentaje : 0;
  const descuentoMonto = calculateDiscount(subtotal, descuentoPorcentaje);
  const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);
```

with:

```js
  const { porcentaje: descuentoCantidadPorcentaje } = resolveDescuentoCantidad(cart, escalones);
  const descuentoCantidadMonto = calculateDiscount(subtotal, descuentoCantidadPorcentaje);
  const subtotalPostCantidad = subtotal - descuentoCantidadMonto;
  const descuentoPorcentaje = metodoSeleccionado ? metodoSeleccionado.descuentoPorcentaje : 0;
  const descuentoMetodoPagoMonto = calculateDiscount(subtotalPostCantidad, descuentoPorcentaje);
  const descuentoMonto = descuentoCantidadMonto + descuentoMetodoPagoMonto;
  const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);
```

- [ ] **Step 3: Pass the new field to `submitOrder` and the email params**

Replace:

```js
      const { pedidoId: id, numeroPedido: numero } = await submitOrder({
        cart,
        cliente,
        zonaEnvioId,
        costoEnvio,
        metodoPago: metodoSeleccionado.nombre,
        descuentoPorcentaje,
      });
```

with:

```js
      const { pedidoId: id, numeroPedido: numero } = await submitOrder({
        cart,
        cliente,
        zonaEnvioId,
        costoEnvio,
        metodoPago: metodoSeleccionado.nombre,
        descuentoPorcentaje,
        descuentoCantidadPorcentaje,
      });
```

Replace the `buildOrderEmailParams` call:

```js
        const emailParams = buildOrderEmailParams({
          cliente,
          items: cart,
          subtotal,
          descuentoMonto,
          descuentoPorcentaje,
          costoEnvio,
          total,
          metodoPagoElegido: metodoSeleccionado.nombre,
          numeroPedido: numero,
        });
```

with:

```js
        const emailParams = buildOrderEmailParams({
          cliente,
          items: cart,
          subtotal,
          descuentoCantidadPorcentaje,
          descuentoCantidadMonto,
          descuentoMonto,
          descuentoPorcentaje,
          costoEnvio,
          total,
          metodoPagoElegido: metodoSeleccionado.nombre,
          numeroPedido: numero,
        });
```

- [ ] **Step 4: Split the resumen discount row into two**

Replace:

```jsx
        {descuentoMonto > 0 && (
          <div className={styles.resumenRow}>
            <span>Descuento ({metodoSeleccionado.nombre} -{descuentoPorcentaje}%)</span>
            <span>-${descuentoMonto}</span>
          </div>
        )}
```

with:

```jsx
        {descuentoCantidadMonto > 0 && (
          <div className={styles.resumenRow}>
            <span>Descuento por cantidad ({descuentoCantidadPorcentaje}%)</span>
            <span>-${descuentoCantidadMonto}</span>
          </div>
        )}
        {descuentoMetodoPagoMonto > 0 && (
          <div className={styles.resumenRow}>
            <span>Descuento método de pago ({metodoSeleccionado.nombre} -{descuentoPorcentaje}%)</span>
            <span>-${descuentoMetodoPagoMonto}</span>
          </div>
        )}
```

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/tienda/CheckoutForm.jsx
git commit -m "feat: chain quantity and payment-method discounts in checkout"
```

---

### Task 8: Extend the email params with the quantity-discount breakdown

**Files:**
- Modify: `lib/emailNotifications.js`
- Modify: `lib/emailNotifications.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildOrderEmailParams(...)` gains two optional input fields (`descuentoCantidadPorcentaje`, `descuentoCantidadMonto`) and two new output keys (`descuento_cantidad_porcentaje`, `descuento_cantidad_monto`). Existing keys (`descuento_porcentaje`, `descuento_monto`) are unchanged. Consumed by Task 7 (already wired) and the EmailJS template (manual edit, see Step 4).

- [ ] **Step 1: Write the failing test**

Add to `lib/emailNotifications.test.js`, inside the existing `describe("buildOrderEmailParams", ...)` block (after the last `it(...)`):

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: FAIL — `descuento_cantidad_porcentaje` is `undefined`, not `0`/`10`.

- [ ] **Step 3: Update `buildOrderEmailParams`**

In `lib/emailNotifications.js`, replace the function signature:

```js
export function buildOrderEmailParams({
  cliente,
  items,
  subtotal,
  descuentoMonto,
  descuentoPorcentaje,
  costoEnvio,
  total,
  metodoPagoElegido,
  numeroPedido,
}) {
```

with:

```js
export function buildOrderEmailParams({
  cliente,
  items,
  subtotal,
  descuentoCantidadPorcentaje = 0,
  descuentoCantidadMonto = 0,
  descuentoMonto,
  descuentoPorcentaje,
  costoEnvio,
  total,
  metodoPagoElegido,
  numeroPedido,
}) {
```

And in the returned object, add two keys right after `numero_pedido: numeroPedido,`:

```js
    numero_pedido: numeroPedido,
    descuento_cantidad_porcentaje: descuentoCantidadPorcentaje,
    descuento_cantidad_monto: descuentoCantidadMonto,
```

- [ ] **Step 4: Note the EmailJS template edit needed (manual, outside this codebase)**

This isn't a code step — flag it for the human running this plan: the EmailJS template pasted earlier only shows `descuento_porcentaje`/`descuento_monto` (payment-method / combined total). It should get one more line for `descuento_cantidad_porcentaje`/`descuento_cantidad_monto`, shown only when there's a quantity discount. Since EmailJS has no conditional logic (same limitation noted in the previous feature), the simplest option is to always show it (may read "Descuento por cantidad (0%): -$0" on orders without one) — mention this to the user when this task is reached, don't silently decide for them.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/emailNotifications.js lib/emailNotifications.test.js
git commit -m "feat: include quantity-discount breakdown in email params"
```

---

### Task 9: Admin order detail — discount breakdown

**Files:**
- Modify: `components/admin/PedidosManager.jsx`

**Interfaces:**
- Consumes: `pedido.descuentoCantidadPorcentaje`/`descuentoCantidadMonto`/`descuentoMetodoPagoMonto` fields (written by Task 5, read via the existing `onSnapshot`).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Replace the subtotal/descuento line**

Replace:

```jsx
                    <p>
                      <strong>Subtotal:</strong> ${pedido.subtotal}
                      {pedido.descuentoMonto > 0 && (
                        <>
                          {" "}
                          — <strong>Descuento ({pedido.descuentoPorcentaje}%):</strong> -${pedido.descuentoMonto}
                        </>
                      )}{" "}
                      — <strong>Envío:</strong> ${pedido.costoEnvio}
                    </p>
```

with:

```jsx
                    <p>
                      <strong>Subtotal:</strong> ${pedido.subtotal}
                      {pedido.descuentoCantidadMonto > 0 && (
                        <>
                          {" "}
                          — <strong>Descuento por cantidad ({pedido.descuentoCantidadPorcentaje}%):</strong> -$
                          {pedido.descuentoCantidadMonto}
                        </>
                      )}
                      {pedido.descuentoMetodoPagoMonto > 0 && (
                        <>
                          {" "}
                          — <strong>Descuento método de pago ({pedido.descuentoPorcentaje}%):</strong> -$
                          {pedido.descuentoMetodoPagoMonto}
                        </>
                      )}{" "}
                      — <strong>Envío:</strong> ${pedido.costoEnvio}
                    </p>
```

This keeps working for pedidos created before this change: `descuentoCantidadMonto`/`descuentoMetodoPagoMonto` are `undefined` on those docs, `undefined > 0` is `false`, so neither new clause renders — only the old single `descuentoMonto`-based behavior is gone from *display*, but since old orders never had a quantity discount anyway, nothing meaningful is lost (their `descuentoMonto` value stays visible nowhere else on this line, which is an accepted minor regression on historical orders only — see note below).

**Note:** old pedidos (before this change) had a single `descuentoMonto` representing only the payment-method discount, but this new code reads `descuentoMetodoPagoMonto` (a field that doesn't exist on those old docs) instead of the old `descuentoMonto`. This means old orders with a payment-method discount will stop showing that discount line in the admin. To avoid losing that information, use this fallback instead in Step 1's replacement — `pedido.descuentoMetodoPagoMonto ?? pedido.descuentoMonto` in place of `pedido.descuentoMetodoPagoMonto` in both the condition and the displayed value, so old orders fall back to their original single field:

```jsx
                    <p>
                      <strong>Subtotal:</strong> ${pedido.subtotal}
                      {pedido.descuentoCantidadMonto > 0 && (
                        <>
                          {" "}
                          — <strong>Descuento por cantidad ({pedido.descuentoCantidadPorcentaje}%):</strong> -$
                          {pedido.descuentoCantidadMonto}
                        </>
                      )}
                      {(pedido.descuentoMetodoPagoMonto ?? pedido.descuentoMonto) > 0 && (
                        <>
                          {" "}
                          — <strong>Descuento método de pago ({pedido.descuentoPorcentaje}%):</strong> -$
                          {pedido.descuentoMetodoPagoMonto ?? pedido.descuentoMonto}
                        </>
                      )}{" "}
                      — <strong>Envío:</strong> ${pedido.costoEnvio}
                    </p>
```

Use this second version (with the `??` fallback) as the actual change.

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/admin/PedidosManager.jsx
git commit -m "feat: show quantity-discount breakdown in admin order detail"
```

---

### Task 10: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS. Count = previous total (91) + 6 (`resolveDescuentoCantidad`) + 2 (`buildOrderEmailParams` breakdown) = 99.

- [ ] **Step 2: Clean production build**

Run: `npm run build` (skip `rm -rf .next` if it's locked by a running dev server — that's fine, `next build` overwrites it)
Expected: succeeds, routes include `/admin/descuentos-cantidad`.

- [ ] **Step 3: Deploy the Firestore rule and re-verify ALL collections**

```bash
npx firebase deploy --only firestore:rules --project pedidos-lett-2
```

Then write a throwaway script (same approach used earlier this session — a `.mjs` file placed temporarily inside the ALMA project root so Node's module resolution finds the local `firebase` package, deleted immediately after) that calls `getDocs` against **every** known collection: `alma_metodos_pago`, `alma_zonas_envio`, `alma_config`, `alma_contadores`, `alma_categorias`, `alma_guarniciones`, `alma_productos`, `alma_site_content`, `alma_descuentos_cantidad`. Confirm every single one returns `OK read`, not `permission-denied`, before considering this step done — this full-collection check is required specifically because of this session's `alma_metodos_pago` incident, not just a check on the newly-added collection.

- [ ] **Step 4: Manual QA (dev server) — stop short of a real order**

Run `npm run dev` and, without clicking "Confirmar pedido":
- Go to `/admin/descuentos-cantidad`, add two tiers (e.g. 10 viandas → 5%, 50 viandas → 10%), confirm they save and the badge/checkbox update live.
- Add enough viandas to the cart to cross the first tier; confirm the banner in `/tienda/carrito` shows the right percentage and "faltan N para el próximo escalón" message, and the totals block shows the new discount row with the right amount.
- Go to `/tienda/checkout`, pick a payment method that also has a discount; confirm the resumen shows **two separate** discount lines (quantity, then payment method) and that the total matches the chained calculation by hand (subtotal → minus quantity discount → minus payment-method discount on the reduced amount → plus shipping).
- Confirm `/admin/pedidos` still loads without errors for existing orders (which lack the new fields).

- [ ] **Step 5: Ask before any real test order**

Same rule as the previous feature: don't submit a real checkout order automatically. If the user wants to see a real order through with both discounts and check the email breakdown, ask them in the moment rather than doing it unprompted.

- [ ] **Step 6: Commit any QA fixes**

If Step 4 surfaces bugs, fix and commit normally; otherwise no commit.

- [ ] **Step 7: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** tier storage + admin CRUD (Tasks 1, 3, 4); pure resolution function (Task 2); chained calculation in both `submitOrder.js` and `CheckoutForm.jsx` (Tasks 5, 7); cart banner/total (Task 6); email breakdown (Task 8); admin order-detail breakdown with backward-compatible fallback for old orders (Task 9); rules + full-collection re-verification (Tasks 1, 10).
- **Placeholder scan:** no TBD/TODO; every code step shows full snippet content. Task 8 Step 4 explicitly flags a manual, non-code follow-up (the EmailJS template edit) rather than silently deciding the conditional-display question for the user.
- **Type consistency:** `resolveDescuentoCantidad(cart, escalones)` return shape (Task 2) matches exactly how Tasks 6 and 7 destructure it. `submitOrder(...)`'s new `descuentoCantidadPorcentaje` param (Task 5) matches what Task 7 passes. `buildOrderEmailParams(...)`'s new params (Task 8) match what Task 7 passes. Firestore field names (`descuentoCantidadPorcentaje`, `descuentoCantidadMonto`, `descuentoMetodoPagoMonto`) are identical from where `submitOrder.js` writes them (Task 5) to where `PedidosManager.jsx` reads them (Task 9).
- **Ordering:** Task 2 and Task 3 must both complete before Tasks 6 and 7 (interface dependency). Task 5 must complete before Task 7 (submitOrder signature). Task 8 must complete before Task 7's email-params call compiles cleanly against the intended shape (though JS won't error either way — do Task 8 before Task 7 to keep intermediate states consistent). Task 9 is independent of 6-8 except for reading fields Task 5 writes.
- **Known accepted gap:** two tiers with the same `cantidadMinima` have unspecified precedence (documented in the spec as an accepted edge case, no admin-side validation added — consistent with `alma_metodos_pago` having no uniqueness validation either).
