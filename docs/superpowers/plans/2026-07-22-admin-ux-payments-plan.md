# ALMA — Admin UX overhaul + medios de pago configurables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's horizontal nav with a responsive sidebar, unify the visual language across every admin manager, add colored order-status badges, polish Productos, make payment methods (with per-method discount) fully admin-configurable, add a mobile menu to the public header, and swap in the real logo/WhatsApp/Instagram/TechDi-credit content.

**Architecture:** No new backend, no new architectural pattern — this extends the existing static-export + Firebase-client approach from sub-projects 1–2. One new Firestore collection (`alma_metodos_pago`) follows the exact same live-read-hook + admin-CRUD pattern already used for `alma_zonas_envio`.

**Tech Stack:** Next.js 14 (App Router, JavaScript), CSS Modules, Firebase JS SDK v10, Vitest.

## Global Constraints

- Everything from the sub-project 1 and 2 plans' Global Constraints still applies.
- New Firestore collection: `alma_metodos_pago`.
- Discount is calculated on the products subtotal only, never on shipping cost.
- Mobile breakpoint for the admin sidebar drawer: 960px. Mobile breakpoint for the public header menu: 860px (already the existing breakpoint in `Header.module.css`). Mobile breakpoint for admin table→card layout: 700px.
- The full logotipo SVG (isotipo + "ALMA" wordmark, used on the landing hero/logo lockup contexts) is unchanged — only the standalone isotipo mark is replaced by the real PNG.

---

## Task 1: Replace logo asset

**Files:**
- Create: `public/logo/alma-mark.png` (moved from the project root)
- Modify: `components/site/Logo.jsx`
- Delete: `logo-sin-fondo.png` (root), `public/logo/alma-isotipo.svg` (superseded)

**Interfaces:**
- No interface change — `<Logo variant="isotipo" className={...} />` keeps the same API, only its rendered `src` changes.

- [ ] **Step 1: Move the file**

Run: `mv "logo-sin-fondo.png" "public/logo/alma-mark.png"`

- [ ] **Step 2: Update `components/site/Logo.jsx`**

```jsx
export default function Logo({ variant = "isotipo", className = "" }) {
  const src = variant === "isotipo" ? "/logo/alma-mark.png" : "/logo/alma-logotipo.svg";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="ALMA" className={className} />;
}
```

- [ ] **Step 3: Remove the superseded SVG**

Run: `rm public/logo/alma-isotipo.svg`

- [ ] **Step 4: Verify visually**

Run `npm run dev`, open `/`. Confirm the header logo, footer logo, WhatsApp-adjacent areas, and any `ImagePlaceholder` fallback now show the real mark image instead of the hand-drawn SVG, at both the transparent (hero) and solid header states.

- [ ] **Step 5: Commit**

```bash
git add public/logo/alma-mark.png components/site/Logo.jsx
git rm public/logo/alma-isotipo.svg "logo-sin-fondo.png"
git commit -m "feat: replace recreated SVG isotipo with the real logo mark"
```

---

## Task 2: Real WhatsApp/Instagram content

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`

**Interfaces:** none — same env var names, real values.

- [ ] **Step 1: Update `.env.local`**

Read the file, then change these two lines (keep everything else as-is):

```
NEXT_PUBLIC_WHATSAPP_NUMBER=5491135011991
NEXT_PUBLIC_INSTAGRAM_HANDLE=almacongelados
```

- [ ] **Step 2: Update `.env.example`** to document the real format without shipping real data

```
NEXT_PUBLIC_WHATSAPP_NUMBER=5491100000000
NEXT_PUBLIC_INSTAGRAM_HANDLE=tu_usuario_instagram
```

(No change needed if it already looks like this — verify and leave as a placeholder, since `.env.example` is committed and must not contain the real phone number.)

- [ ] **Step 3: Verify**

Run `npm run build && npm run dev`. Click the WhatsApp floating button — confirm it opens `wa.me/5491135011991` with the pre-filled message. Check the Contacto section and footer — confirm the Instagram link points to `instagram.com/almacongelados`.

- [ ] **Step 4: Commit**

`.env.local` is gitignored, so only `.env.example` (if changed) is committed:

```bash
git add .env.example
git commit -m "chore: document real WhatsApp/Instagram env var format" --allow-empty
```

(`--allow-empty` covers the case where `.env.example` needed no changes — skip the commit entirely if `git status` shows nothing staged.)

---

## Task 3: TechDi credit component + Footer

**Files:**
- Create: `components/site/TechDiCredit.jsx`
- Create: `components/site/TechDiCredit.module.css`
- Modify: `components/site/Footer.jsx`
- Modify: `components/site/Footer.module.css`

**Interfaces:**
- Produces: `<TechDiCredit />` — no props, reused by `Footer.jsx` (this task) and `AdminSidebar.jsx` (Task 12).

- [ ] **Step 1: Write `components/site/TechDiCredit.module.css`**

```css
.credit {
  font-size: 0.75rem;
}

.credit a {
  color: inherit;
  text-decoration: underline;
}
```

- [ ] **Step 2: Write `components/site/TechDiCredit.jsx`**

```jsx
import styles from "./TechDiCredit.module.css";

export default function TechDiCredit() {
  return (
    <p className={styles.credit}>
      Desarrollado por{" "}
      <a href="https://techdi.com.ar" target="_blank" rel="noreferrer">
        TechDi
      </a>
    </p>
  );
}
```

- [ ] **Step 3: Modify `components/site/Footer.jsx`**

```jsx
import Link from "next/link";
import Logo from "./Logo";
import TechDiCredit from "./TechDiCredit";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo variant="isotipo" className={styles.logo} />
          <span className={styles.wordmark}>ALMA</span>
        </div>
        <nav className={styles.links}>
          <a href="#nosotros">Nosotros</a>
          <a href="#producto">Producto</a>
          <a href="#empresas">Empresas</a>
          <a href="#faq">FAQ</a>
          <Link href="/tienda">Tienda</Link>
        </nav>
      </div>
      <div className={`container ${styles.bottom}`}>
        <p>© {new Date().getFullYear()} ALMA — Servicios Gastronómicos. Nutrimos momentos, creamos bienestar.</p>
        <TechDiCredit />
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Add spacing between the two lines in `components/site/Footer.module.css`**

Find the `.bottom` rule and add `display: flex; flex-direction: column; gap: 0.3rem;`:

```css
.bottom {
  margin-top: var(--space-lg);
  padding-top: var(--space-sm);
  border-top: 1px solid rgba(247, 244, 238, 0.15);
  font-size: 0.8rem;
  opacity: 0.7;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
```

- [ ] **Step 5: Verify visually**

Confirm the footer now shows the copyright line and, right below it, "Desarrollado por TechDi" with a working link to techdi.com.ar in a new tab.

- [ ] **Step 6: Commit**

```bash
git add components/site/TechDiCredit.jsx components/site/TechDiCredit.module.css components/site/Footer.jsx components/site/Footer.module.css
git commit -m "feat: add TechDi credit component, wire into public Footer"
```

---

## Task 4: calculateDiscount pure logic (TDD)

**Files:**
- Modify: `lib/checkout.js`
- Modify: `lib/checkout.test.js`

**Interfaces:**
- Produces: `calculateDiscount(subtotal, descuentoPorcentaje)` — consumed by `submitOrder` (Task 5) and `CheckoutForm` (Task 13).

- [ ] **Step 1: Add the failing tests**

Read `lib/checkout.test.js`, then add this new `describe` block after the existing `calculateTotal` block:

```js
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
```

And update the import line at the top of the file:

```js
import { calculateTotal, validateCheckoutForm, validateStockAvailability, calculateDiscount } from "./checkout";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `calculateDiscount` is not exported from `lib/checkout.js`.

- [ ] **Step 3: Add `calculateDiscount` to `lib/checkout.js`**

Add this function (anywhere after `calculateTotal`):

```js
export function calculateDiscount(subtotal, descuentoPorcentaje) {
  return subtotal * ((descuentoPorcentaje || 0) / 100);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green (39 total: 36 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add lib/checkout.js lib/checkout.test.js
git commit -m "feat: add calculateDiscount pure logic with tests"
```

---

## Task 5: useMetodosPago hook + submitOrder discount fields

**Files:**
- Create: `lib/useMetodosPago.js`
- Modify: `lib/submitOrder.js`

**Interfaces:**
- Produces: `useMetodosPago()` → `{ metodosPago, loading }` (same shape as `useZonasEnvio`).
- Modifies: `submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje })` — now computes and stores `descuentoMonto`/`descuentoPorcentaje`, and `total` reflects the discount.

- [ ] **Step 1: Write `lib/useMetodosPago.js`**

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useMetodosPago() {
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_metodos_pago"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMetodosPago(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setMetodosPago([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { metodosPago, loading };
}
```

- [ ] **Step 2: Modify `lib/submitOrder.js`**

```js
import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { calculateSubtotal } from "./cart";
import { calculateTotal, calculateDiscount } from "./checkout";

export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0 }) {
  const pedidoRef = doc(collection(db, "alma_pedidos"));

  await runTransaction(db, async (transaction) => {
    const productRefs = cart.map((item) => doc(db, "alma_productos", item.productoId));
    const snapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

    snapshots.forEach((snap, index) => {
      const item = cart[index];
      const stockActual = snap.exists() ? snap.data().stock : 0;
      if (stockActual < item.cantidad) {
        throw new Error(`STOCK_INSUFICIENTE:${item.nombre}`);
      }
    });

    snapshots.forEach((snap, index) => {
      const item = cart[index];
      transaction.update(productRefs[index], { stock: snap.data().stock - item.cantidad });
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

- [ ] **Step 3: Verify no build errors**

Run: `npm run build`
Expected: succeeds (nothing calls `useMetodosPago` yet, and `submitOrder`'s new parameter has a default, so existing callers from sub-project 2 still compile — they'll be updated in Task 13).

- [ ] **Step 4: Commit**

```bash
git add lib/useMetodosPago.js lib/submitOrder.js
git commit -m "feat: add useMetodosPago hook, extend submitOrder with discount calculation"
```

---

## Task 6: Shared admin stylesheet

**Files:**
- Create: `components/admin/adminShared.module.css`

**Interfaces:**
- Produces shared CSS Module classes (`table`, `actions`, `edit`, `save`, `delete`, `addForm`, `addButton`, plus a `<700px` table→card responsive block) consumed by Tasks 7, 8, 9, 11.

- [ ] **Step 1: Write `components/admin/adminShared.module.css`**

```css
.table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--space-md);
}

.table th,
.table td {
  text-align: left;
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--color-beige);
}

.table input[type="text"],
.table input[type="number"] {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.actions {
  display: flex;
  gap: var(--space-xs);
}

.edit {
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  border: none;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  cursor: pointer;
}

.save {
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  border: none;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  cursor: pointer;
}

.delete {
  background: transparent;
  border: 1px solid #b3452f;
  color: #b3452f;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  cursor: pointer;
}

.addForm {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
  flex-wrap: wrap;
}

.addForm .field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.addForm input,
.addForm select {
  padding: 0.5rem 0.7rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.addButton {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 700px) {
  .table thead {
    display: none;
  }

  .table,
  .table tbody,
  .table tr,
  .table td {
    display: block;
    width: 100%;
  }

  .table tr {
    margin-bottom: var(--space-sm);
    border: 1px solid var(--color-beige);
    border-radius: var(--radius);
    padding: var(--space-xs) var(--space-sm);
  }

  .table td {
    border-bottom: none;
    padding: 0.4rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-sm);
  }

  .table td[data-label]::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--color-verde-principal);
    flex-shrink: 0;
  }

  .table input[type="text"],
  .table input[type="number"] {
    width: auto;
    max-width: 140px;
    text-align: right;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/adminShared.module.css
git commit -m "feat: add shared admin stylesheet with responsive table-to-card layout"
```

---

## Task 7: Refactor CategoriasManager to shared stylesheet

**Files:**
- Modify: `components/admin/CategoriasManager.jsx`
- Delete: `components/admin/CategoriasManager.module.css`

**Interfaces:** none — same component API, visual/CSS source changes only.

- [ ] **Step 1: Rewrite `components/admin/CategoriasManager.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useCategorias } from "@/lib/useCategorias";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./adminShared.module.css";

const COLLECTION = "alma_categorias";

export default function CategoriasManager() {
  const { categorias, loading } = useCategorias();
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, { nombre: nombre.trim(), orden: Number(orden) || 0, activa: true });
    setNombre("");
    setOrden(0);
  };

  const handleFieldChange = (categoria, field, value) => {
    updateDocById(COLLECTION, categoria.id, { [field]: value });
  };

  const handleDelete = (categoria) => {
    deleteDocById(COLLECTION, categoria.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Categorías</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Orden</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((categoria) => (
            <tr key={categoria.id}>
              <td data-label="Nombre">
                <input
                  type="text"
                  defaultValue={categoria.nombre}
                  onBlur={(e) => handleFieldChange(categoria, "nombre", e.target.value)}
                />
              </td>
              <td data-label="Orden">
                <input
                  type="number"
                  defaultValue={categoria.orden}
                  onBlur={(e) => handleFieldChange(categoria, "orden", Number(e.target.value))}
                  style={{ width: 70 }}
                />
              </td>
              <td data-label="Activa">
                <input
                  type="checkbox"
                  defaultChecked={categoria.activa}
                  onChange={(e) => handleFieldChange(categoria, "activa", e.target.checked)}
                />
              </td>
              <td data-label="" className={styles.actions}>
                <button type="button" className={styles.delete} onClick={() => handleDelete(categoria)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label htmlFor="nueva-categoria-nombre">Nueva categoría</label>
          <input id="nueva-categoria-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nueva-categoria-orden">Orden</label>
          <input
            id="nueva-categoria-orden"
            type="number"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            style={{ width: 70 }}
          />
        </div>
        <button type="submit" className={styles.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old stylesheet**

Run: `rm components/admin/CategoriasManager.module.css`

- [ ] **Step 3: Verify**

Run `npm run build` (catches the dangling import if the delete/rewrite got out of sync). Log in to `/admin/categorias`, confirm it looks the same as before at desktop width, and resize the browser below 700px — confirm the table becomes a stack of bordered cards with bold labels ("Nombre", "Orden", "Activa") next to each value.

- [ ] **Step 4: Commit**

```bash
git add components/admin/CategoriasManager.jsx
git rm components/admin/CategoriasManager.module.css
git commit -m "refactor: move CategoriasManager onto the shared admin stylesheet"
```

---

## Task 8: Refactor ZonasEnvioManager to shared stylesheet

**Files:**
- Modify: `components/admin/ZonasEnvioManager.jsx`

**Interfaces:** none.

- [ ] **Step 1: Rewrite `components/admin/ZonasEnvioManager.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./adminShared.module.css";

const COLLECTION = "alma_zonas_envio";

export default function ZonasEnvioManager() {
  const { zonasEnvio, loading } = useZonasEnvio();
  const [nombre, setNombre] = useState("");
  const [costo, setCosto] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, { nombre: nombre.trim(), costo: Number(costo) || 0, activa: true });
    setNombre("");
    setCosto(0);
  };

  const handleFieldChange = (zona, field, value) => {
    updateDocById(COLLECTION, zona.id, { [field]: value });
  };

  const handleDelete = (zona) => {
    deleteDocById(COLLECTION, zona.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Zonas de envío</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Costo</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {zonasEnvio.map((zona) => (
            <tr key={zona.id}>
              <td data-label="Nombre">
                <input
                  type="text"
                  defaultValue={zona.nombre}
                  onBlur={(e) => handleFieldChange(zona, "nombre", e.target.value)}
                />
              </td>
              <td data-label="Costo">
                <input
                  type="number"
                  defaultValue={zona.costo}
                  onBlur={(e) => handleFieldChange(zona, "costo", Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </td>
              <td data-label="Activa">
                <input
                  type="checkbox"
                  defaultChecked={zona.activa}
                  onChange={(e) => handleFieldChange(zona, "activa", e.target.checked)}
                />
              </td>
              <td data-label="" className={styles.actions}>
                <button type="button" className={styles.delete} onClick={() => handleDelete(zona)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label htmlFor="nueva-zona-nombre">Nueva zona</label>
          <input id="nueva-zona-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nueva-zona-costo">Costo</label>
          <input
            id="nueva-zona-costo"
            type="number"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            style={{ width: 100 }}
          />
        </div>
        <button type="submit" className={styles.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
```

(This file already imported `CategoriasManager.module.css` directly — this step just repoints that same set of classes to `adminShared.module.css` and adds `data-label` attributes.)

- [ ] **Step 2: Verify**

Run `npm run build`. At `/admin/zonas-envio`, confirm it still looks right and collapses to cards below 700px, same as Categorías.

- [ ] **Step 3: Commit**

```bash
git add components/admin/ZonasEnvioManager.jsx
git commit -m "refactor: move ZonasEnvioManager onto the shared admin stylesheet"
```

---

## Task 9: Admin Métodos de pago manager

**Files:**
- Create: `components/admin/MetodosPagoManager.jsx`
- Create: `app/admin/metodos-pago/page.jsx`

**Interfaces:**
- Consumes: `useMetodosPago` (Task 5), `adminShared.module.css` (Task 6), `createDoc`/`updateDocById`/`deleteDocById`.
- Produces: `<MetodosPagoManager />`, `/admin/metodos-pago`.

- [ ] **Step 1: Write `components/admin/MetodosPagoManager.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useMetodosPago } from "@/lib/useMetodosPago";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./adminShared.module.css";

const COLLECTION = "alma_metodos_pago";

export default function MetodosPagoManager() {
  const { metodosPago, loading } = useMetodosPago();
  const [nombre, setNombre] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, {
      nombre: nombre.trim(),
      descuentoPorcentaje: Number(descuentoPorcentaje) || 0,
      activo: true,
    });
    setNombre("");
    setDescuentoPorcentaje(0);
  };

  const handleFieldChange = (metodo, field, value) => {
    updateDocById(COLLECTION, metodo.id, { [field]: value });
  };

  const handleDelete = (metodo) => {
    deleteDocById(COLLECTION, metodo.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Métodos de pago</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-texto)" }}>
        El % de descuento se aplica sobre el subtotal de productos en el checkout (no sobre el envío).
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descuento</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {metodosPago.map((metodo) => (
            <tr key={metodo.id}>
              <td data-label="Nombre">
                <input
                  type="text"
                  defaultValue={metodo.nombre}
                  onBlur={(e) => handleFieldChange(metodo, "nombre", e.target.value)}
                />
              </td>
              <td data-label="Descuento">
                <input
                  type="number"
                  defaultValue={metodo.descuentoPorcentaje}
                  onBlur={(e) => handleFieldChange(metodo, "descuentoPorcentaje", Number(e.target.value))}
                  style={{ width: 80 }}
                />
                %
              </td>
              <td data-label="Activo">
                <input
                  type="checkbox"
                  defaultChecked={metodo.activo}
                  onChange={(e) => handleFieldChange(metodo, "activo", e.target.checked)}
                />
              </td>
              <td data-label="" className={styles.actions}>
                <button type="button" className={styles.delete} onClick={() => handleDelete(metodo)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label htmlFor="nuevo-metodo-nombre">Nuevo método</label>
          <input id="nuevo-metodo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nuevo-metodo-descuento">Descuento %</label>
          <input
            id="nuevo-metodo-descuento"
            type="number"
            value={descuentoPorcentaje}
            onChange={(e) => setDescuentoPorcentaje(e.target.value)}
            style={{ width: 80 }}
          />
        </div>
        <button type="submit" className={styles.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write `app/admin/metodos-pago/page.jsx`**

```jsx
"use client";

import MetodosPagoManager from "@/components/admin/MetodosPagoManager";

export default function MetodosPagoPage() {
  return <MetodosPagoManager />;
}
```

- [ ] **Step 3: Verify manually**

At `/admin/metodos-pago`, add "Transferencia" with 10% and "Tarjeta" with 0%. Confirm both appear, edit the discount inline, toggle activo, delete a test row.

- [ ] **Step 4: Commit**

```bash
git add components/admin/MetodosPagoManager.jsx "app/admin/metodos-pago/page.jsx"
git commit -m "feat: add admin Métodos de pago CRUD manager"
```

---

## Task 10: StatusBadge + wire into PedidosManager

**Files:**
- Create: `components/admin/StatusBadge.jsx`
- Create: `components/admin/StatusBadge.module.css`
- Modify: `components/admin/PedidosManager.jsx`

**Interfaces:**
- Produces: `<StatusBadge estado="pendiente" />`, `ESTADO_LABELS` (named export) — consumed by `PedidosManager.jsx`.

- [ ] **Step 1: Write `components/admin/StatusBadge.module.css`**

```css
.badge {
  display: inline-block;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.pendiente {
  background: #f5e6b8;
  color: #8a6d1d;
}

.confirmado {
  background: #cfe0f5;
  color: #1d4d8a;
}

.en_preparacion {
  background: #e2d3f5;
  color: #5b2d8a;
}

.entregado {
  background: #c9ead6;
  color: #1d6b3f;
}

.cancelado {
  background: #f5cfcf;
  color: #8a2d2d;
}
```

- [ ] **Step 2: Write `components/admin/StatusBadge.jsx`**

```jsx
import styles from "./StatusBadge.module.css";

export const ESTADO_LABELS = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default function StatusBadge({ estado }) {
  return (
    <span className={`${styles.badge} ${styles[estado] || ""}`}>{ESTADO_LABELS[estado] || estado}</span>
  );
}
```

- [ ] **Step 3: Modify `components/admin/PedidosManager.jsx`**

Add the import:

```jsx
import StatusBadge, { ESTADO_LABELS } from "./StatusBadge";
```

Replace the badge in the table row:

```jsx
                <td>
                  <StatusBadge estado={pedido.estado} />
                </td>
```

Replace the `<select>` options to show the Spanish labels while keeping the raw value:

```jsx
                    <select
                      id={`estado-${pedido.id}`}
                      className={styles.estadoSelect}
                      value={pedido.estado}
                      onChange={(e) => handleEstadoChange(pedido, e.target.value)}
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {ESTADO_LABELS[estado]}
                        </option>
                      ))}
                    </select>
```

- [ ] **Step 4: Verify visually**

At `/admin/pedidos`, confirm the existing test order shows a colored "Pendiente" badge instead of plain text, and the status dropdown now shows "En preparación" etc. instead of the raw `en_preparacion` value.

- [ ] **Step 5: Commit**

```bash
git add components/admin/StatusBadge.jsx components/admin/StatusBadge.module.css components/admin/PedidosManager.jsx
git commit -m "feat: add colored StatusBadge with Spanish labels for order status"
```

---

## Task 11: Productos visual polish

**Files:**
- Modify: `components/admin/ProductosManager.jsx`
- Modify: `components/admin/ProductosManager.module.css`
- Modify: `components/admin/ProductoForm.jsx`
- Modify: `components/admin/ProductoForm.module.css`

**Interfaces:** none — same component APIs.

- [ ] **Step 1: Update `components/admin/ProductosManager.module.css`**

Replace the file contents with (adds a larger thumb size and stock badge variants, keeps the file focused on what's genuinely Productos-specific — `.table`/`.actions`/`.edit`/`.delete`/`.addButton` now come from the shared stylesheet instead):

```css
.thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius);
}

.stockCell {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.stockBadge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.stockBadgeBajo {
  background: #f5e6b8;
  color: #8a6d1d;
}

.stockBadgeSinStock {
  background: #f5cfcf;
  color: #8a2d2d;
}
```

- [ ] **Step 2: Rewrite `components/admin/ProductosManager.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useProductos } from "@/lib/useProductos";
import { deleteDocById } from "@/lib/adminCrud";
import ProductoForm from "./ProductoForm";
import shared from "./adminShared.module.css";
import styles from "./ProductosManager.module.css";

const STOCK_BAJO_UMBRAL = 5;

export default function ProductosManager() {
  const { productos, loading } = useProductos();
  const [editing, setEditing] = useState(null); // null | "new" | producto
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (producto) => {
    if (confirmDeleteId !== producto.id) {
      setConfirmDeleteId(producto.id);
      return;
    }
    await deleteDocById("alma_productos", producto.id);
    setConfirmDeleteId(null);
  };

  if (loading) return <p>Cargando…</p>;

  if (editing) {
    return (
      <div>
        <h1 style={{ marginBottom: "1.5rem" }}>{editing === "new" ? "Nuevo producto" : "Editar producto"}</h1>
        <ProductoForm producto={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Productos</h1>

      <button type="button" className={shared.addButton} style={{ marginBottom: "1.5rem" }} onClick={() => setEditing("new")}>
        + Nuevo producto
      </button>

      <table className={shared.table}>
        <thead>
          <tr>
            <th></th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => (
            <tr key={producto.id}>
              <td data-label="">
                {producto.imagenUrls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={producto.imagenUrls[0]} alt="" className={styles.thumb} />
                )}
              </td>
              <td data-label="Nombre">{producto.nombre}</td>
              <td data-label="Tipo">{producto.tipo}</td>
              <td data-label="Precio">${producto.precio}</td>
              <td data-label="Stock">
                <div className={styles.stockCell}>
                  <span>{producto.stock}</span>
                  {producto.stock <= 0 ? (
                    <span className={`${styles.stockBadge} ${styles.stockBadgeSinStock}`}>Sin stock</span>
                  ) : producto.stock <= STOCK_BAJO_UMBRAL ? (
                    <span className={`${styles.stockBadge} ${styles.stockBadgeBajo}`}>Stock bajo</span>
                  ) : null}
                </div>
              </td>
              <td data-label="Activo">{producto.activo ? "Sí" : "No"}</td>
              <td data-label="" className={shared.actions}>
                <button type="button" className={shared.edit} onClick={() => setEditing(producto)}>
                  Editar
                </button>
                <button type="button" className={shared.delete} onClick={() => handleDelete(producto)}>
                  {confirmDeleteId === producto.id ? "¿Confirmar?" : "Eliminar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Update `components/admin/ProductoForm.module.css`**

Add section styling (append to the existing file):

```css
.section {
  border-top: 1px solid var(--color-beige);
  padding-top: var(--space-md);
  margin-top: var(--space-md);
}

.section:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.sectionTitle {
  font-family: var(--font-display);
  color: var(--color-verde-principal);
  font-size: 1.2rem;
  margin-bottom: var(--space-sm);
}
```

- [ ] **Step 4: Wrap `components/admin/ProductoForm.jsx`'s existing groups in labeled sections**

Read the file, then restructure the JSX inside the `<form>` (keep every field/handler exactly as-is — only the wrapping `<div>`/`<p>` structure changes) into four `.section` blocks:

```jsx
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Datos básicos</p>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="producto-nombre">Nombre</label>
            <input
              id="producto-nombre"
              value={draft.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="producto-precio">Precio</label>
            <input
              id="producto-precio"
              type="number"
              value={draft.precio}
              onChange={(e) => updateField("precio", e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.field} style={{ marginBottom: "1rem" }}>
          <label htmlFor="producto-descripcion">Descripción</label>
          <textarea
            id="producto-descripcion"
            value={draft.descripcion}
            onChange={(e) => updateField("descripcion", e.target.value)}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="producto-categoria">Categoría</label>
            <select
              id="producto-categoria"
              value={draft.categoriaId}
              onChange={(e) => updateField("categoriaId", e.target.value)}
              required
            >
              <option value="">Seleccioná una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="producto-tipo">Tipo</label>
            <select id="producto-tipo" value={draft.tipo} onChange={(e) => updateField("tipo", e.target.value)}>
              <option value="individual">Individual</option>
              <option value="pack">Pack</option>
            </select>
          </div>
        </div>

        <div className={styles.field} style={{ maxWidth: 160 }}>
          <label htmlFor="producto-stock">Stock</label>
          <input
            id="producto-stock"
            type="number"
            value={draft.stock}
            onChange={(e) => updateField("stock", e.target.value)}
          />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Fotos</p>
        <div className={styles.fotos}>
          {[0, 1, 2].map((index) => (
            <ImageUploadField
              key={index}
              label={`Foto ${index + 1}`}
              currentUrl={draft.imagenUrls[index]}
              storagePath={`productos/${draft.nombre || "nuevo"}-${index}.jpg`}
              onUploaded={(url) => updateFoto(index, url)}
            />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Tabla nutricional (por porción)</p>
        <div className={styles.nutricion}>
          <div className={styles.field}>
            <label htmlFor="nutricion-calorias">Calorías</label>
            <input
              id="nutricion-calorias"
              value={draft.tablaNutricional.calorias}
              onChange={(e) => updateNutricion("calorias", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nutricion-proteinas">Proteínas (g)</label>
            <input
              id="nutricion-proteinas"
              value={draft.tablaNutricional.proteinas}
              onChange={(e) => updateNutricion("proteinas", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nutricion-carbohidratos">Carbohidratos (g)</label>
            <input
              id="nutricion-carbohidratos"
              value={draft.tablaNutricional.carbohidratos}
              onChange={(e) => updateNutricion("carbohidratos", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nutricion-grasas">Grasas (g)</label>
            <input
              id="nutricion-grasas"
              value={draft.tablaNutricional.grasas}
              onChange={(e) => updateNutricion("grasas", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Estado</p>
        <div className={styles.checkboxRow}>
          <input
            id="producto-activo"
            type="checkbox"
            checked={draft.activo}
            onChange={(e) => updateField("activo", e.target.checked)}
          />
          <label htmlFor="producto-activo">Activo (visible en la tienda)</label>
        </div>
      </div>

      <div className={styles.buttons}>
        <button type="submit" className={styles.save} disabled={saving}>
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
        </button>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancelar
        </button>
      </div>
```

This replaces everything between the opening `<form className={styles.form} onSubmit={handleSubmit}>` tag and its closing `</form>` tag — the `updateField`/`updateNutricion`/`updateFoto`/`handleSubmit` functions above it and the `import`/component-signature lines are unchanged.

- [ ] **Step 5: Verify**

Run `npm run build`. At `/admin/productos`, confirm the table shows larger thumbnails and a "Stock bajo"/"Sin stock" badge next to any product at or under 5 units / at 0. Open "Editar" on a product and confirm the form now shows four clearly separated sections with headers. Resize below 700px and confirm the products table also collapses to cards.

- [ ] **Step 6: Commit**

```bash
git add components/admin/ProductosManager.jsx components/admin/ProductosManager.module.css components/admin/ProductoForm.jsx components/admin/ProductoForm.module.css
git commit -m "feat: polish Productos table (stock badges, bigger thumbs) and form (sections)"
```

---

## Task 12: AdminSidebar (desktop + mobile drawer)

**Files:**
- Create: `components/admin/AdminSidebar.jsx`
- Create: `components/admin/AdminSidebar.module.css`
- Delete: `components/admin/AdminNav.jsx`, `components/admin/AdminNav.module.css`
- Modify: `components/admin/AdminGuard.jsx`
- Modify: `components/admin/AdminGuard.module.css`

**Interfaces:**
- Consumes: `Logo` (site), `TechDiCredit` (Task 3), `useAdminAuth`'s shape (via props passed from `AdminGuard`).
- Produces: `<AdminSidebar role={adminDoc.role} userEmail={user.email} />`, replacing `<AdminNav role={...} />`.

- [ ] **Step 1: Write `components/admin/AdminSidebar.module.css`**

```css
.mobileBar {
  display: none;
  align-items: center;
  justify-content: space-between;
  background: var(--color-verde-principal);
  color: var(--color-crema);
  padding: var(--space-sm) var(--space-md);
}

.menuButton {
  background: transparent;
  border: none;
  color: var(--color-crema);
  cursor: pointer;
  display: flex;
}

.mobileBrand {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
}

.overlay {
  display: none;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--color-verde-principal);
  color: var(--color-crema);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: sticky;
  top: 0;
}

.closeButton {
  display: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
}

.brandLogo {
  width: 36px;
  height: 36px;
}

.brandName {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0 var(--space-sm);
}

.link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0.7rem 0.8rem;
  border-radius: var(--radius);
  color: var(--color-crema);
  font-weight: 500;
  font-size: 0.92rem;
}

.link:hover {
  background: rgba(247, 244, 238, 0.08);
}

.linkActive {
  background: rgba(247, 244, 238, 0.16);
  color: var(--color-blanco);
  font-weight: 700;
}

.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
}

.footer {
  padding: var(--space-md);
  border-top: 1px solid rgba(247, 244, 238, 0.15);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.userEmail {
  opacity: 0.8;
  word-break: break-all;
}

.logoutButton {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: transparent;
  border: 1px solid rgba(247, 244, 238, 0.4);
  color: var(--color-crema);
  padding: 0.5rem 0.8rem;
  border-radius: var(--radius);
  cursor: pointer;
  width: 100%;
}

.logoutButton:hover {
  background: rgba(247, 244, 238, 0.1);
}

@media (max-width: 959px) {
  .mobileBar {
    display: flex;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    z-index: 100;
  }

  .sidebarOpen {
    transform: translateX(0);
  }

  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 99;
  }

  .closeButton {
    display: flex;
    background: transparent;
    border: none;
    color: var(--color-crema);
    cursor: pointer;
    margin-left: auto;
    padding: var(--space-md) var(--space-md) 0;
  }
}
```

- [ ] **Step 2: Write `components/admin/AdminSidebar.jsx`**

```jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "@/components/site/Logo";
import TechDiCredit from "@/components/site/TechDiCredit";
import styles from "./AdminSidebar.module.css";

const ICONS = {
  panel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  contenido: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  productos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 7l9-4 9 4" />
    </svg>
  ),
  categorias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  ),
  envios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="14" height="11" rx="1" />
      <path d="M15 9h4l3 4v4h-7z" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
    </svg>
  ),
  metodosPago: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  pedidos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  ),
  usuarios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M23 20c0-2.8-2-5-5-5.5" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { href: "/admin", label: "Panel", icon: ICONS.panel },
  { href: "/admin/contenido", label: "Contenido", icon: ICONS.contenido },
  { href: "/admin/productos", label: "Productos", icon: ICONS.productos },
  { href: "/admin/categorias", label: "Categorías", icon: ICONS.categorias },
  { href: "/admin/zonas-envio", label: "Envíos", icon: ICONS.envios },
  { href: "/admin/metodos-pago", label: "Métodos de pago", icon: ICONS.metodosPago },
  { href: "/admin/pedidos", label: "Pedidos", icon: ICONS.pedidos },
];

const USUARIOS_ITEM = { href: "/admin/usuarios", label: "Usuarios", icon: ICONS.usuarios };

export default function AdminSidebar({ role, userEmail }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = role === "superadmin" ? [...NAV_ITEMS, USUARIOS_ITEM] : NAV_ITEMS;

  const isActive = (href) =>
    href === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href);

  return (
    <>
      <div className={styles.mobileBar}>
        <button type="button" className={styles.menuButton} onClick={() => setOpen(true)} aria-label="Abrir menú">
          {ICONS.menu}
        </button>
        <span className={styles.mobileBrand}>ALMA Admin</span>
        <span style={{ width: 24 }} />
      </div>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <button type="button" className={styles.closeButton} onClick={() => setOpen(false)} aria-label="Cerrar menú">
          {ICONS.close}
        </button>
        <div className={styles.brand}>
          <Logo variant="isotipo" className={styles.brandLogo} />
          <span className={styles.brandName}>ALMA</span>
        </div>
        <nav className={styles.nav}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${isActive(item.href) ? styles.linkActive : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.footer}>
          {userEmail && <p className={styles.userEmail}>{userEmail}</p>}
          <button type="button" className={styles.logoutButton} onClick={() => signOut(auth)}>
            {ICONS.logout}
            Cerrar sesión
          </button>
          <TechDiCredit />
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Delete the old nav**

Run: `rm components/admin/AdminNav.jsx components/admin/AdminNav.module.css`

- [ ] **Step 4: Modify `components/admin/AdminGuard.module.css`**

Replace the `.shell`/`.main` rules:

```css
.loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-verde-principal);
}

.shell {
  min-height: 100vh;
  background: var(--color-crema);
  display: flex;
  flex-direction: column;
}

@media (min-width: 960px) {
  .shell {
    flex-direction: row;
  }
}

.main {
  flex: 1;
  min-width: 0;
  padding: var(--space-lg) var(--space-md);
}
```

- [ ] **Step 5: Modify `components/admin/AdminGuard.jsx`**

Read the file, then apply:

```jsx
import AdminSidebar from "./AdminSidebar";
```

(replaces the `import AdminNav from "./AdminNav";` line), and:

```jsx
  return (
    <div className={styles.shell}>
      <AdminSidebar role={adminDoc.role} userEmail={user.email} />
      <main className={styles.main}>{children}</main>
    </div>
  );
```

(replaces the final `return` block, which previously rendered `<AdminNav role={adminDoc.role} />`).

- [ ] **Step 6: Verify**

Run `npm run build`. Log in to `/admin` at desktop width — confirm a fixed left sidebar with icons, the active route highlighted, user email and "Cerrar sesión" at the bottom, and "Desarrollado por TechDi" below that. Resize below 960px — confirm the sidebar disappears and a top bar with a hamburger button appears instead; click it, confirm the sidebar slides in as a drawer with a dark overlay behind it, and clicking a link or the overlay closes it.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminSidebar.jsx components/admin/AdminSidebar.module.css components/admin/AdminGuard.jsx components/admin/AdminGuard.module.css
git rm components/admin/AdminNav.jsx components/admin/AdminNav.module.css
git commit -m "feat: replace horizontal admin nav with a responsive sidebar (icons, mobile drawer, TechDi credit)"
```

---

## Task 13: CheckoutForm dynamic métodos de pago + live discount

**Files:**
- Modify: `components/tienda/CheckoutForm.jsx`

**Interfaces:**
- Consumes: `useMetodosPago` (Task 5), `calculateDiscount` (Task 4).

- [ ] **Step 1: Rewrite `components/tienda/CheckoutForm.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useMetodosPago } from "@/lib/useMetodosPago";
import { validateCheckoutForm, calculateTotal, calculateDiscount } from "@/lib/checkout";
import { submitOrder } from "@/lib/submitOrder";
import styles from "./CheckoutForm.module.css";

const INITIAL_CLIENTE = { nombre: "", telefono: "", email: "", direccion: "" };

export default function CheckoutForm() {
  const searchParams = useSearchParams();
  const zonaFromCart = searchParams.get("zona") || "";
  const { cart, subtotal, clearCart } = useCart();
  const { zonasEnvio } = useZonasEnvio();
  const { metodosPago } = useMetodosPago();

  const [cliente, setCliente] = useState(INITIAL_CLIENTE);
  const [zonaEnvioId, setZonaEnvioId] = useState(zonaFromCart);
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [pedidoId, setPedidoId] = useState(null);

  const zonasActivas = zonasEnvio.filter((z) => z.activa);
  const metodosActivos = metodosPago.filter((m) => m.activo);
  const zonaSeleccionada = zonasActivas.find((z) => z.id === zonaEnvioId);
  const metodoSeleccionado = metodosActivos.find((m) => m.id === metodoPagoId);
  const costoEnvio = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const descuentoPorcentaje = metodoSeleccionado ? metodoSeleccionado.descuentoPorcentaje : 0;
  const descuentoMonto = calculateDiscount(subtotal, descuentoPorcentaje);
  const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);

  const handleChange = (field) => (event) => {
    setCliente((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = { ...cliente, zonaEnvioId, metodoPago: metodoPagoId };
    const { valid, errors: validationErrors } = validateCheckoutForm(data);
    setErrors(validationErrors);
    if (!valid) return;

    setStatus("submitting");
    setErrorMessage("");
    try {
      const id = await submitOrder({
        cart,
        cliente,
        zonaEnvioId,
        costoEnvio,
        metodoPago: metodoSeleccionado.nombre,
        descuentoPorcentaje,
      });
      setPedidoId(id);
      setStatus("success");
      clearCart();
    } catch (err) {
      const message = String(err?.message || "");
      if (message.startsWith("STOCK_INSUFICIENTE:")) {
        setErrorMessage(`Se acabó el stock de "${message.split(":")[1]}". Volvé al carrito para ajustar la cantidad.`);
      } else {
        setErrorMessage("No pudimos confirmar tu pedido. Revisá tu conexión e intentá de nuevo.");
      }
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className={styles.confirmacion}>
        <p className="sectionLabel">Pedido confirmado</p>
        <p className={styles.numeroPedido}>#{pedidoId.slice(0, 8).toUpperCase()}</p>
        <p>Recibimos tu pedido. Te vamos a contactar para coordinar el pago y la entrega.</p>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline", display: "inline-block", marginTop: "1rem" }}>
          Volver a la tienda
        </Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className={styles.confirmacion}>
        <h1>Tu carrito está vacío</h1>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.grid} onSubmit={handleSubmit}>
      <div>
        <div className={styles.field}>
          <label htmlFor="nombre">Nombre y apellido</label>
          <input id="nombre" value={cliente.nombre} onChange={handleChange("nombre")} />
          {errors.nombre && <p className={styles.error}>{errors.nombre}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" value={cliente.telefono} onChange={handleChange("telefono")} />
          {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={cliente.email} onChange={handleChange("email")} />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="direccion">Dirección de entrega</label>
          <input id="direccion" value={cliente.direccion} onChange={handleChange("direccion")} />
          {errors.direccion && <p className={styles.error}>{errors.direccion}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="zona">Zona de envío</label>
          <select id="zona" value={zonaEnvioId} onChange={(e) => setZonaEnvioId(e.target.value)}>
            <option value="">Seleccioná una zona</option>
            {zonasActivas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre} — ${zona.costo}
              </option>
            ))}
          </select>
          {errors.zonaEnvioId && <p className={styles.error}>{errors.zonaEnvioId}</p>}
        </div>
        <div className={styles.field}>
          <label>Método de pago preferido</label>
          <div className={styles.metodoPago}>
            {metodosActivos.map((metodo) => (
              <label key={metodo.id}>
                <input
                  type="radio"
                  name="metodoPago"
                  value={metodo.id}
                  checked={metodoPagoId === metodo.id}
                  onChange={(e) => setMetodoPagoId(e.target.value)}
                />{" "}
                {metodo.nombre}
                {metodo.descuentoPorcentaje > 0 ? ` (-${metodo.descuentoPorcentaje}%)` : ""}
              </label>
            ))}
          </div>
          {errors.metodoPago && <p className={styles.error}>{errors.metodoPago}</p>}
        </div>
      </div>

      <div className={styles.resumen}>
        <h2 style={{ marginBottom: "1rem" }}>Resumen</h2>
        {cart.map((item) => (
          <div key={item.productoId} className={styles.resumenRow}>
            <span>
              {item.cantidad}× {item.nombre}
            </span>
            <span>${item.precio * item.cantidad}</span>
          </div>
        ))}
        {descuentoMonto > 0 && (
          <div className={styles.resumenRow}>
            <span>Descuento ({metodoSeleccionado.nombre} -{descuentoPorcentaje}%)</span>
            <span>-${descuentoMonto}</span>
          </div>
        )}
        <div className={styles.resumenRow}>
          <span>Envío</span>
          <span>${costoEnvio}</span>
        </div>
        <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
          <span>Total</span>
          <span>${total}</span>
        </div>
        <button type="submit" className={styles.confirmar} disabled={status === "submitting"}>
          {status === "submitting" ? "Confirmando..." : "Confirmar pedido"}
        </button>
        {status === "error" && <p className={styles.formError}>{errorMessage}</p>}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify manually — full end-to-end purchase with a discount**

In `/admin/metodos-pago`, make sure "Transferencia" has a 10% discount (set in Task 9's verification). Add a product to the cart, go through checkout, choose "Transferencia (-10%)" — confirm the resumen shows a "Descuento" line and the total drops accordingly. Submit and confirm the order succeeds; check `/admin/pedidos` and confirm the order detail reflects the discounted total (extend the detail's `<p>` list to also show `descuentoPorcentaje`/`descuentoMonto` if not already visible — if `PedidosManager`'s detail view doesn't show it, that's fine for this task, the data is captured correctly in Firestore regardless of what the detail view surfaces).

- [ ] **Step 3: Commit**

```bash
git add components/tienda/CheckoutForm.jsx
git commit -m "feat: make checkout payment methods dynamic with live discount calculation"
```

---

## Task 14: Public Header mobile hamburger menu

**Files:**
- Modify: `components/site/Header.jsx`
- Modify: `components/site/Header.module.css`

**Interfaces:** none — `<Header />` keeps the same (no-props) API.

- [ ] **Step 1: Rewrite `components/site/Header.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import CartIcon from "@/components/tienda/CartIcon";
import styles from "./Header.module.css";

const NAV_LINKS = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#producto", label: "Producto" },
  { href: "#empresas", label: "Empresas" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

export default function Header() {
  const pathname = usePathname();
  const hasDarkHero = pathname === "/";
  const [scrolled, setScrolled] = useState(!hasDarkHero);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hasDarkHero) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasDarkHero]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const showSolid = scrolled || mobileOpen;

  return (
    <header className={`${styles.header} ${showSolid ? styles.solid : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Logo variant="isotipo" className={styles.logo} />
          <span className={styles.wordmark}>ALMA</span>
        </Link>
        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
          <Link href="/tienda" className={styles.navLink}>
            Tienda
          </Link>
        </nav>
        <div className={styles.actions}>
          <CartIcon />
          <Link href="/tienda" className={styles.cta}>
            Pedir ahora
          </Link>
          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileOpen ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className={styles.mobilePanel}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link href="/tienda" onClick={() => setMobileOpen(false)}>
            Tienda
          </Link>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Add mobile menu styles to `components/site/Header.module.css`**

Append:

```css
.hamburger {
  display: flex;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: 0.4rem;
}

@media (min-width: 860px) {
  .hamburger {
    display: none;
  }
}

.mobilePanel {
  display: flex;
  flex-direction: column;
  background: var(--color-crema);
  padding: var(--space-sm) var(--space-md) var(--space-md);
  gap: var(--space-xs);
  box-shadow: 0 4px 12px rgba(46, 74, 47, 0.1);
}

.mobilePanel a {
  padding: 0.6rem 0;
  color: var(--color-texto);
  font-weight: 600;
  border-bottom: 1px solid var(--color-beige);
}

@media (min-width: 860px) {
  .mobilePanel {
    display: none;
  }
}
```

- [ ] **Step 3: Verify visually**

Resize the browser below 860px on the home page. Confirm the nav links disappear (as before) but a hamburger icon now appears in `.actions`, correctly colored for both the transparent-over-hero and solid states. Click it — confirm a panel drops down below the header with all 6 links, each closing the panel and navigating/scrolling on click. Confirm the header forces its solid background while the panel is open (so the hamburger's X icon stays legible even before scrolling).

- [ ] **Step 4: Commit**

```bash
git add components/site/Header.jsx components/site/Header.module.css
git commit -m "feat: add mobile hamburger menu to the public Header"
```

---

## Task 15: Seed métodos de pago sample data

**Files:** none committed — one-off script, same pattern as prior seed scripts.

- [ ] **Step 1: Write a temporary `_seed-metodos-pago.mjs` in the project root**

```js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const metodosPago = [
  { id: "transferencia", nombre: "Transferencia", descuentoPorcentaje: 10, activo: true },
  { id: "tarjeta", nombre: "Tarjeta", descuentoPorcentaje: 0, activo: true },
];

for (const metodo of metodosPago) {
  const { id, ...data } = metodo;
  await setDoc(doc(db, "alma_metodos_pago", id), data);
}

console.log(`Seeded ${metodosPago.length} métodos de pago.`);
process.exit(0);
```

Note: if Task 9's manual verification already created "Transferencia"/"Tarjeta" documents with different auto-generated IDs, this script creates a second pair with fixed IDs (`transferencia`/`tarjeta`) — clean up the duplicates from `/admin/metodos-pago` afterward (delete whichever pair wasn't created by this script) so the checkout doesn't show four options.

- [ ] **Step 2: Run it**

Run: `node --env-file=.env.local _seed-metodos-pago.mjs`
Expected: prints the seeded count with no errors.

- [ ] **Step 3: Delete the temporary script**

Run: `rm _seed-metodos-pago.mjs`

- [ ] **Step 4: Verify in `/admin/metodos-pago`**

Confirm exactly two active métodos de pago exist (Transferencia -10%, Tarjeta 0%) — delete any leftover duplicates from earlier manual testing.

(No commit for this task — nothing new is added to the repo.)

---

## Task 16: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — 39 tests (36 from before + 3 new `calculateDiscount` tests).

- [ ] **Step 2: Run a clean production build**

Run: `rm -rf .next out && npm run build`
Expected: succeeds. Retry after a few seconds if it fails with `EBUSY` (the recurring transient Dropbox file lock seen throughout this project).

- [ ] **Step 3: Verify the export structure**

Run: `find out -name "index.html" | sort`
Expected: includes everything from sub-projects 1–2 plus `out/admin/metodos-pago/index.html`.

- [ ] **Step 4: Manual QA pass**

Run `npm run dev` and walk through:
- Admin sidebar at desktop and mobile widths, every nav link, active-route highlighting, logout, TechDi link.
- Every admin manager's mobile card layout (Categorías, Zonas de envío, Métodos de pago, Productos) below 700px width.
- Pedidos list shows colored status badges with Spanish labels; changing status still works.
- Productos table shows stock badges correctly for a 0-stock and a low-stock (≤5) item.
- Full purchase flow once more end-to-end with a discount-bearing payment method selected, confirming the discount shows in the resumen and the final total/Firestore document are correct.
- Public header hamburger menu on a narrow viewport, on both the home page (dark hero) and `/tienda` (light header).
- Logo renders as the real mark (not the old SVG) everywhere it appears.
- WhatsApp button and Instagram links use the real number/handle.
- TechDi credit appears in both the public footer and the admin sidebar footer, links working.

- [ ] **Step 5: Commit if any fixes were needed during QA**

If Step 4 surfaces bugs, fix them and commit normally; otherwise this task produces no commit.

- [ ] **Step 6: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** sidebar (Task 12), visual consistency via shared stylesheet (Tasks 6–9, 11), order status badges (Task 10), Productos polish (Task 11), configurable métodos de pago with discount (Tasks 4, 5, 9, 13), responsive pass (baked into Tasks 6, 12, 14 rather than a separate retrofit task — each component ships its own mobile CSS as it's built), real logo/content (Tasks 1, 2), TechDi credit (Task 3, reused in Task 12).
- **Placeholder scan:** no TBD/TODO; all steps carry complete code, including full-file rewrites where a diff would be more error-prone than showing the resulting file.
- **Type consistency:** `descuentoPorcentaje`/`descuentoMonto` field names match exactly across `submitOrder.js`, `CheckoutForm.jsx`, and the spec's `alma_pedidos` schema addition. `alma_metodos_pago` document shape (`nombre`, `descuentoPorcentaje`, `activo`) is identical across `useMetodosPago.js`, `MetodosPagoManager.jsx`, `CheckoutForm.jsx`, and the seed script.
- **Known scope note:** Task 13's verification step explicitly says it's fine if `PedidosManager`'s detail view doesn't yet surface the discount fields — the spec only requires the data to be captured correctly, not a UI display of it in the order detail. If the user wants that surfaced too, it's a small follow-up to `PedidosManager.jsx`'s detail `<p>` list, not a gap in this plan's stated scope.
