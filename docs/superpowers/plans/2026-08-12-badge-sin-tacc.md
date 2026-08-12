# Badge "Sin TACC" en productos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Sin TACC" checkbox to the product admin form, show it as a column in the admin product list, and display a badge on the storefront catalog card and product detail page when it's checked.

**Architecture:** A single new boolean field `sinTacc` on `alma_productos` documents, following the exact pattern already used for the existing `activo` boolean (same form section, same admin list style). No new pure logic, no new Firestore rule (the collection is already covered).

**Tech Stack:** Next.js 14 (static export, client components), Firebase Firestore.

## Global Constraints

- Same as prior features: static export, no separate dev/staging Firebase project, no automated verification that submits a real order or writes real customer-facing data.
- No Firestore rules change needed — `alma_productos` is already covered.
- Follow the exact existing pattern for `activo` (checkbox in `ProductoForm.jsx`, column in `ProductosManager.jsx`) rather than introducing a new pattern.

---

### Task 1: Admin — form checkbox and list column

**Files:**
- Modify: `components/admin/ProductoForm.jsx`
- Modify: `components/admin/ProductosManager.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `alma_productos` docs gain a `sinTacc: boolean` field, written the same way `activo` already is (no dedicated function — it's part of the `draft`/payload spread). Consumed by Task 2 and Task 3.

- [ ] **Step 1: Add the field to the form's default draft**

In `components/admin/ProductoForm.jsx`, change the `EMPTY` object (line 12):

```js
const EMPTY = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoriaId: "",
  tipo: "individual",
  stock: 0,
  cantidadViandas: 1,
  guarniciones: [],
  imagenUrls: ["", "", ""],
  tablaNutricional: { calorias: "", proteinas: "", carbohidratos: "", grasas: "" },
  activo: true,
  sinTacc: false,
};
```

- [ ] **Step 2: Add the checkbox**

Replace the "Estado" section (lines 246-257):

```jsx
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
```

with:

```jsx
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
        <div className={styles.checkboxRow}>
          <input
            id="producto-sin-tacc"
            type="checkbox"
            checked={draft.sinTacc}
            onChange={(e) => updateField("sinTacc", e.target.checked)}
          />
          <label htmlFor="producto-sin-tacc">Sin TACC</label>
        </div>
      </div>
```

No change needed to `handleSubmit` — `draft` (including `sinTacc`) is already spread into the saved `payload`.

- [ ] **Step 3: Add the admin list column**

In `components/admin/ProductosManager.jsx`, add a header cell after "Activo" (line 58):

```jsx
            <th>Activo</th>
            <th>Sin TACC</th>
```

And a matching data cell after the "Activo" cell (line 84):

```jsx
              <td data-label="Activo">{producto.activo ? "Sí" : "No"}</td>
              <td data-label="Sin TACC">{producto.sinTacc ? "Sí" : "No"}</td>
```

- [ ] **Step 4: Run the test suite**

Run: `npx vitest run`
Expected: PASS (no dedicated tests for these files — confirms nothing broke).

- [ ] **Step 5: Commit**

```bash
git add components/admin/ProductoForm.jsx components/admin/ProductosManager.jsx
git commit -m "feat: add Sin TACC checkbox to product admin"
```

---

### Task 2: Catalog card badge

**Files:**
- Modify: `components/tienda/ProductoCard.jsx`
- Modify: `components/tienda/ProductoCard.module.css`

**Interfaces:**
- Consumes: `producto.sinTacc` (written by Task 1).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add the second badge**

In `components/tienda/ProductoCard.jsx`, after the existing badge `<span>` (lines 21-23):

```jsx
      <span className={`${styles.badge} ${sinStock ? styles.badgeSinStock : ""}`}>
        {producto.tipo === "pack" ? "Pack" : sinStock ? "Sin stock" : "Individual"}
      </span>
```

add:

```jsx
      {producto.sinTacc && <span className={styles.badgeTacc}>Sin TACC</span>}
```

- [ ] **Step 2: Add the CSS**

In `components/tienda/ProductoCard.module.css`, after `.badgeSinStock` (line 41):

```css
.badgeTacc {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 3: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/tienda/ProductoCard.jsx components/tienda/ProductoCard.module.css
git commit -m "feat: show Sin TACC badge on catalog card"
```

---

### Task 3: Product detail badge

**Files:**
- Modify: `components/tienda/ProductoDetalle.jsx`
- Modify: `components/tienda/ProductoDetalle.module.css`

**Interfaces:**
- Consumes: `producto.sinTacc` (written by Task 1).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add the badge next to the title**

In `components/tienda/ProductoDetalle.jsx`, replace:

```jsx
            <p className="sectionLabel">{producto.tipo === "pack" ? "Pack" : "Individual"}</p>
            <h1>{producto.nombre}</h1>
```

with:

```jsx
            <p className="sectionLabel">
              {producto.tipo === "pack" ? "Pack" : "Individual"}
              {producto.sinTacc && <span className={styles.badgeTacc}>Sin TACC</span>}
            </p>
            <h1>{producto.nombre}</h1>
```

- [ ] **Step 2: Add the CSS**

In `components/tienda/ProductoDetalle.module.css`, add:

```css
.badgeTacc {
  display: inline-block;
  margin-left: var(--space-xs);
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 3: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/tienda/ProductoDetalle.jsx components/tienda/ProductoDetalle.module.css
git commit -m "feat: show Sin TACC badge on product detail page"
```

---

### Task 4: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, same count as before this feature (no new tests added — this feature has no pure logic to unit test).

- [ ] **Step 2: Clean production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual QA (dev server)**

Run `npm run dev`:
- Admin → Productos → edit a product, check "Sin TACC", save. Confirm the list shows "Sí" in the new column.
- Catalog (`/tienda`): confirm that product's card shows the "Sin TACC" badge top-right, alongside the existing tipo/stock badge top-left (no overlap).
- Product detail (`/tienda/producto?id=...`): confirm the badge shows next to "Individual"/"Pack".
- Uncheck it, save, confirm the badge disappears in both places.

This is read/write only on `alma_productos` (an admin-managed catalog collection, not customer order data) — no special caution needed beyond the general "don't submit a real checkout order" rule, which this doesn't touch.

- [ ] **Step 4: Commit any QA fixes**

If Step 3 surfaces bugs, fix and commit normally; otherwise no commit.

- [ ] **Step 5: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** admin checkbox + list column (Task 1), catalog badge (Task 2), detail badge (Task 3), no-rules-needed constraint honored throughout.
- **Placeholder scan:** no TBD/TODO; every step shows full snippet content.
- **Type consistency:** `producto.sinTacc` field name identical from where it's written (Task 1, `ProductoForm.jsx`) to where it's read (Tasks 2-3).
- **Ordering:** Task 1 should run first since Tasks 2-3 read a field it introduces, though since Firestore has no schema enforcement, running them in any order wouldn't break the build — just wouldn't show real badges until Task 1's field exists on at least one product.
