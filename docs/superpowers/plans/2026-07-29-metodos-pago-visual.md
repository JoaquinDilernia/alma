# Rediseño Visual de Métodos de Pago Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain radio-button list in checkout and the plain table in admin with selectable cards and a discount badge, for the "método de pago" feature — purely visual, no data or logic changes.

**Architecture:** JSX/CSS-only changes to two existing components. The checkout card's "selected" state is driven by the existing `metodoPagoId === metodo.id` comparison already in `CheckoutForm.jsx` (same conditional-class pattern already used for `DashboardStats.module.css`'s `.rangoBtnActivo`), not CSS `:has()`.

**Tech Stack:** Next.js 14 (client components), CSS Modules.

## Global Constraints

- No changes to `alma_metodos_pago` documents, `lib/useMetodosPago.js`, `lib/adminCrud.js`, or `lib/checkout.js` (`calculateDiscount`).
- No image/icon field is added to métodos de pago — this was explicitly descoped during brainstorming in favor of a faster, simpler visual pass.
- Preserve exact existing save behavior: `onBlur` commits for text/number fields, immediate `onChange` commit for the "activo" checkbox (uncontrolled `defaultChecked`, matching `CategoriasManager.jsx`'s pattern) — only the layout/markup changes.

---

### Task 1: Checkout — selectable payment method cards

**Files:**
- Modify: `components/tienda/CheckoutForm.jsx`
- Modify: `components/tienda/CheckoutForm.module.css`

- [ ] **Step 1: Replace the payment method markup**

In `components/tienda/CheckoutForm.jsx`, replace the "Método de pago preferido" block:

```jsx
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
```

with:

```jsx
        <div className={styles.field}>
          <label>Método de pago preferido</label>
          <div className={styles.metodoPago}>
            {metodosActivos.map((metodo) => (
              <label
                key={metodo.id}
                className={`${styles.metodoCard} ${metodoPagoId === metodo.id ? styles.metodoCardActivo : ""}`}
              >
                <input
                  type="radio"
                  name="metodoPago"
                  value={metodo.id}
                  checked={metodoPagoId === metodo.id}
                  onChange={(e) => setMetodoPagoId(e.target.value)}
                  className={styles.metodoRadio}
                />
                <span className={styles.metodoNombre}>{metodo.nombre}</span>
                {metodo.descuentoPorcentaje > 0 && (
                  <span className={styles.metodoDescuento}>-{metodo.descuentoPorcentaje}%</span>
                )}
              </label>
            ))}
          </div>
          {errors.metodoPago && <p className={styles.error}>{errors.metodoPago}</p>}
        </div>
```

- [ ] **Step 2: Update the CSS**

In `components/tienda/CheckoutForm.module.css`, replace the `.metodoPago` rule:

```css
.metodoPago {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}
```

with:

```css
.metodoPago {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.metodoCard {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 2px solid var(--color-beige);
  border-radius: var(--radius);
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  background: var(--color-blanco);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.metodoCardActivo {
  border-color: var(--color-verde-principal);
  background: rgba(74, 124, 89, 0.08);
}

.metodoRadio {
  width: auto;
  flex-shrink: 0;
}

.metodoNombre {
  font-weight: 600;
  flex: 1;
}

.metodoDescuento {
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}
```

(`.metodoRadio { width: auto; }` is required because the pre-existing `.field input { width: 100%; }` rule in this same file would otherwise stretch the radio input to fill the card.)

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Expected: PASS (no logic changed).

- [ ] **Step 4: Manual check**

Run `npm run dev`, add a product to the cart, go to `/tienda/checkout/`, and confirm: payment methods render as cards, clicking anywhere on a card selects it (radio behavior unchanged), the selected card gets the green border/background, and methods with a discount show the "-N%" badge.

- [ ] **Step 5: Commit**

```bash
git add components/tienda/CheckoutForm.jsx components/tienda/CheckoutForm.module.css
git commit -m "feat: redesign payment method selection as cards in checkout"
```

---

### Task 2: Admin — payment methods as cards instead of a table

**Files:**
- Modify: `components/admin/MetodosPagoManager.jsx`
- Create: `components/admin/MetodosPagoManager.module.css`

- [ ] **Step 1: Create the CSS module**

Create `components/admin/MetodosPagoManager.module.css`:

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

- [ ] **Step 2: Replace the component body**

Replace the full contents of `components/admin/MetodosPagoManager.jsx`:

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

with:

```jsx
"use client";

import { useState } from "react";
import { useMetodosPago } from "@/lib/useMetodosPago";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import shared from "./adminShared.module.css";
import styles from "./MetodosPagoManager.module.css";

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

      <div className={styles.list}>
        {metodosPago.map((metodo) => (
          <div key={metodo.id} className={styles.card}>
            <div className={shared.field}>
              <label htmlFor={`nombre-${metodo.id}`}>Nombre</label>
              <input
                id={`nombre-${metodo.id}`}
                type="text"
                defaultValue={metodo.nombre}
                onBlur={(e) => handleFieldChange(metodo, "nombre", e.target.value)}
              />
            </div>
            <div className={shared.field} style={{ maxWidth: 140 }}>
              <label htmlFor={`descuento-${metodo.id}`}>Descuento %</label>
              <input
                id={`descuento-${metodo.id}`}
                type="number"
                defaultValue={metodo.descuentoPorcentaje}
                onBlur={(e) => handleFieldChange(metodo, "descuentoPorcentaje", Number(e.target.value))}
              />
            </div>
            {metodo.descuentoPorcentaje > 0 && <span className={styles.badge}>-{metodo.descuentoPorcentaje}%</span>}
            <label className={styles.activaRow}>
              <input
                type="checkbox"
                defaultChecked={metodo.activo}
                onChange={(e) => handleFieldChange(metodo, "activo", e.target.checked)}
              />
              Activo
            </label>
            <button type="button" className={shared.delete} onClick={() => handleDelete(metodo)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nuevo-metodo-nombre">Nuevo método</label>
          <input id="nuevo-metodo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={shared.field}>
          <label htmlFor="nuevo-metodo-descuento">Descuento %</label>
          <input
            id="nuevo-metodo-descuento"
            type="number"
            value={descuentoPorcentaje}
            onChange={(e) => setDescuentoPorcentaje(e.target.value)}
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

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Expected: PASS (no logic changed).

- [ ] **Step 4: Manual check**

Run `npm run dev`, log into `/admin/metodos-pago/`, and confirm: each method shows as its own card, editing nombre/descuento (blur) and toggling activo still saves (check Firestore or reload to confirm persistence), the discount badge shows next to methods with `descuentoPorcentaje > 0`, "Eliminar" still removes a card, and the "+ Agregar" form at the bottom still creates a new method.

- [ ] **Step 5: Commit**

```bash
git add components/admin/MetodosPagoManager.jsx components/admin/MetodosPagoManager.module.css
git commit -m "feat: redesign admin payment methods as cards"
```
