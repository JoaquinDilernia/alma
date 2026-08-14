# Variantes de gramaje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a product optionally offer multiple weight options (e.g. 250gr, 500gr, 1kg), each with its own absolute price, configurable per-product from the admin. The customer picks a weight on the product detail page before adding to cart; the choice flows through cart, checkout, email, and the admin order detail as a distinct, separately-priced cart line.

**Architecture:** Two new optional fields on `alma_productos` (`gramajeBase`, `variantesGramaje`) feed a new pure module `lib/gramaje.js` (`resolveOpcionesGramaje`, `formatGramos`). `lib/cart.js` gains a `gramos` field on cart lines and includes it in `cartLineId`, so different weights of the same product become separate lines — exactly like garnishes already do. Stock stays a single shared pool per product (no per-variant stock); vianda counting is untouched (each unit = 1 vianda regardless of weight).

**Tech Stack:** Next.js 14 (static export, client components), Firebase Firestore (client SDK), Vitest.

## Global Constraints

- Same as prior features: static export, no separate dev/staging Firebase project, never submit a real checkout order during automated verification.
- No Firestore rules change — `alma_productos` is already covered.
- Both new product fields are optional and additive: a product with neither `gramajeBase` nor `variantesGramaje` set must render and behave identically to before this plan, everywhere (PDP, cart, checkout, email, admin).
- Stock, vianda counting (`countViandas`), and stock aggregation (`aggregateStockNeeds`) key on `productoId` only — do not touch them; the spec explicitly chose shared stock across weight variants.

---

### Task 1: `lib/gramaje.js` — pure resolution and formatting

**Files:**
- Create: `lib/gramaje.js`
- Create: `lib/gramaje.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveOpcionesGramaje(producto) → Array<{gramos: number, precio: number}>` and `formatGramos(gramos) → string`. Both consumed by Task 3 (admin, indirectly via display expectations), Task 4 (PDP), and Task 5 (cart/checkout/email/admin display).

- [ ] **Step 1: Write the failing tests**

Create `lib/gramaje.test.js`:

```js
import { describe, it, expect } from "vitest";
import { resolveOpcionesGramaje, formatGramos } from "./gramaje";

describe("resolveOpcionesGramaje", () => {
  it("returns an empty list when no gramaje is configured", () => {
    expect(resolveOpcionesGramaje({ precio: 3500 })).toEqual([]);
  });

  it("returns an empty list when only gramajeBase is set (no variants)", () => {
    expect(resolveOpcionesGramaje({ precio: 3500, gramajeBase: 250 })).toEqual([]);
  });

  it("returns an empty list when only variantesGramaje is set (no base)", () => {
    expect(
      resolveOpcionesGramaje({ precio: 3500, variantesGramaje: [{ gramos: 500, precio: 4500 }] })
    ).toEqual([]);
  });

  it("returns base + variants when both are configured", () => {
    const producto = {
      precio: 3500,
      gramajeBase: 250,
      variantesGramaje: [
        { gramos: 500, precio: 4500 },
        { gramos: 1000, precio: 8000 },
      ],
    };
    expect(resolveOpcionesGramaje(producto)).toEqual([
      { gramos: 250, precio: 3500 },
      { gramos: 500, precio: 4500 },
      { gramos: 1000, precio: 8000 },
    ]);
  });
});

describe("formatGramos", () => {
  it("formats grams under 1000 as 'Ngr'", () => {
    expect(formatGramos(250)).toBe("250gr");
  });

  it("formats exactly 1000 as '1kg'", () => {
    expect(formatGramos(1000)).toBe("1kg");
  });

  it("formats non-round kilos with one decimal", () => {
    expect(formatGramos(1500)).toBe("1.5kg");
  });

  it("formats a round multiple of 1000 without decimals", () => {
    expect(formatGramos(2000)).toBe("2kg");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/gramaje.test.js`
Expected: FAIL — module `./gramaje` doesn't exist yet.

- [ ] **Step 3: Implement `lib/gramaje.js`**

```js
export function resolveOpcionesGramaje(producto) {
  const variantes = producto.variantesGramaje || [];
  if (!producto.gramajeBase || variantes.length === 0) return [];
  const base = { gramos: producto.gramajeBase, precio: producto.precio };
  return [base, ...variantes];
}

export function formatGramos(gramos) {
  if (gramos >= 1000) {
    const kg = gramos / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(1)}kg`;
  }
  return `${gramos}gr`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/gramaje.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/gramaje.js lib/gramaje.test.js
git commit -m "feat: add resolveOpcionesGramaje and formatGramos pure functions"
```

---

### Task 2: Cart line identity and storage

**Files:**
- Modify: `lib/cart.js`
- Modify: `lib/cart.test.js`
- Modify: `lib/CartProvider.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `cartLineId(item)` now factors in `item.gramos`. `addItem(cart, product, cantidad, guarniciones, precioEfectivo, gramos = null)` — **new optional 6th parameter**, stores `gramos` on the cart line. `CartProvider`'s `addToCart(producto, cantidad, guarniciones, precioEfectivo, gramos)` forwards it. Consumed by Task 4 (PDP calls `addToCart` with the chosen gramos).

- [ ] **Step 1: Update the failing/changed tests first**

In `lib/cart.test.js`, replace the `"adds a new item..."` test's expectation (it now includes a `gramos` field):

```js
  it("adds a new item with the given quantity and default garnish/vianda fields", () => {
    const result = addItem([], product, 2);
    expect(result).toEqual([
      { productoId: "p1", nombre: "Vianda Clásica", cantidadViandas: 1, guarniciones: [], precio: 3500, cantidad: 2, gramos: null },
    ]);
  });
```

Replace the `"builds a line id..."` test:

```js
  it("builds a line id from productoId, gramos and garnishes", () => {
    expect(cartLineId({ productoId: "p1", gramos: 500, guarniciones: ["Puré", "Ensalada"] })).toBe("p1::500::Puré|Ensalada");
    expect(cartLineId({ productoId: "p1" })).toBe("p1::::");
  });
```

Replace the three tests that hardcode `"p1::Puré"` as a lineId string — use `cartLineId(cart[0])` instead so they don't depend on the exact id format:

```js
  it("removes an item by lineId", () => {
    const cart = addItem([], product, 1, ["Puré"], 3500);
    expect(removeItem(cart, cartLineId(cart[0]))).toEqual([]);
  });

  it("updates the quantity of an existing line", () => {
    const cart = addItem([], product, 1, ["Puré"], 3500);
    expect(updateQuantity(cart, cartLineId(cart[0]), 5)[0].cantidad).toBe(5);
  });

  it("removes the line when quantity is updated to 0 or less", () => {
    const cart = addItem([], product, 1, ["Puré"], 3500);
    expect(updateQuantity(cart, cartLineId(cart[0]), 0)).toEqual([]);
  });
```

Add a new test after `"keeps the same plate with different garnishes as separate lines"`:

```js
  it("keeps the same plate with different gramos as separate lines", () => {
    let cart = addItem([], product, 1, [], 3500, 250);
    cart = addItem(cart, product, 1, [], 4500, 500);
    expect(cart).toHaveLength(2);
  });
```

- [ ] **Step 2: Run tests to verify the changed ones fail**

Run: `npx vitest run lib/cart.test.js`
Expected: FAIL on the tests just changed/added (current `cartLineId`/`addItem` don't know about `gramos` yet).

- [ ] **Step 3: Update `lib/cart.js`**

Replace `cartLineId`:

```js
export function cartLineId(item) {
  return `${item.productoId}::${item.gramos || ""}::${(item.guarniciones || []).join("|")}`;
}
```

Replace `addItem`:

```js
export function addItem(cart, product, cantidad = 1, guarniciones = [], precioEfectivo = product.precio, gramos = null) {
  const nuevo = {
    productoId: product.id,
    nombre: product.nombre,
    cantidadViandas: product.cantidadViandas || 1,
    guarniciones,
    precio: precioEfectivo,
    cantidad,
    gramos,
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
```

`removeItem`, `updateQuantity`, `calculateSubtotal`, `countViandas` stay unchanged — they already operate generically via `cartLineId`/`precio`/`cantidad`/`cantidadViandas`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/cart.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Update `CartProvider.jsx`**

Replace `addToCart` in the context value:

```js
    addToCart: (producto, cantidad, guarniciones = [], precioEfectivo = producto.precio, gramos = null) =>
      setCart((prev) => addItem(prev, producto, cantidad, guarniciones, precioEfectivo, gramos)),
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (confirms nothing else broke).

- [ ] **Step 7: Commit**

```bash
git add lib/cart.js lib/cart.test.js lib/CartProvider.jsx
git commit -m "feat: include gramaje in cart line identity"
```

---

### Task 3: Admin — gramaje base and variant editor

**Files:**
- Modify: `components/admin/ProductoForm.jsx`
- Modify: `components/admin/ProductoForm.module.css`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `alma_productos` docs gain `gramajeBase: number` and `variantesGramaje: Array<{gramos, precio}>`. Consumed by Task 1's functions (via Task 4/5's usage of `resolveOpcionesGramaje`).

- [ ] **Step 1: Import the shared admin styles**

Add to the imports:

```js
import shared from "./adminShared.module.css";
```

- [ ] **Step 2: Extend `EMPTY` and add the row-editing handlers**

Change `EMPTY` (add after `sinTacc: false,`):

```js
  activo: true,
  sinTacc: false,
  gramajeBase: "",
  variantesGramaje: [],
};
```

Add these handlers next to `toggleGuarnicion`:

```js
  const updateVariante = (index, field, value) =>
    setDraft((prev) => {
      const variantesGramaje = [...(prev.variantesGramaje || [])];
      variantesGramaje[index] = { ...variantesGramaje[index], [field]: value };
      return { ...prev, variantesGramaje };
    });

  const removeVariante = (index) =>
    setDraft((prev) => ({
      ...prev,
      variantesGramaje: (prev.variantesGramaje || []).filter((_, i) => i !== index),
    }));

  const addVariante = () =>
    setDraft((prev) => ({
      ...prev,
      variantesGramaje: [...(prev.variantesGramaje || []), { gramos: 0, precio: 0 }],
    }));
```

- [ ] **Step 3: Coerce the new fields in `handleSubmit`**

Replace the `payload` object:

```js
    const payload = {
      ...draft,
      precio: Number(draft.precio) || 0,
      stock: Number(draft.stock) || 0,
      cantidadViandas: Math.max(1, Number(draft.cantidadViandas) || 1),
      guarniciones: draft.guarniciones || [],
      imagenUrls: draft.imagenUrls.filter(Boolean),
      gramajeBase: Number(draft.gramajeBase) || 0,
      variantesGramaje: (draft.variantesGramaje || []).map((v) => ({
        gramos: Number(v.gramos) || 0,
        precio: Number(v.precio) || 0,
      })),
    };
```

- [ ] **Step 4: Add the "Gramaje" section to the JSX**

Insert a new section right after the "Guarniciones" section (`</div>` that closes it) and before the "Tabla nutricional" section:

```jsx
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Gramaje (opcional)</p>
        <p style={{ marginBottom: "0.8rem", opacity: 0.7, fontSize: "0.9rem" }}>
          Si cargás variantes de peso, el precio de arriba se toma como el gramaje base indicado acá. El cliente
          va a poder elegir entre estas opciones en la ficha del producto.
        </p>
        <div className={styles.field} style={{ maxWidth: 200, marginBottom: "0.8rem" }}>
          <label htmlFor="producto-gramaje-base">Gramaje base (gramos)</label>
          <input
            id="producto-gramaje-base"
            type="number"
            min={0}
            value={draft.gramajeBase}
            onChange={(e) => updateField("gramajeBase", e.target.value)}
          />
        </div>
        {(draft.variantesGramaje || []).map((variante, index) => (
          <div key={index} className={styles.varianteRow}>
            <div className={styles.field} style={{ maxWidth: 140 }}>
              <label htmlFor={`variante-gramos-${index}`}>Gramos</label>
              <input
                id={`variante-gramos-${index}`}
                type="number"
                min={0}
                value={variante.gramos}
                onChange={(e) => updateVariante(index, "gramos", e.target.value)}
              />
            </div>
            <div className={styles.field} style={{ maxWidth: 140 }}>
              <label htmlFor={`variante-precio-${index}`}>Precio</label>
              <input
                id={`variante-precio-${index}`}
                type="number"
                min={0}
                value={variante.precio}
                onChange={(e) => updateVariante(index, "precio", e.target.value)}
              />
            </div>
            <button type="button" className={shared.delete} onClick={() => removeVariante(index)}>
              Eliminar
            </button>
          </div>
        ))}
        <button type="button" className={shared.addButton} onClick={addVariante}>
          + Agregar variante de gramaje
        </button>
      </div>
```

- [ ] **Step 5: Add the `.varianteRow` CSS**

In `components/admin/ProductoForm.module.css`, add after `.guarnicionThumb`:

```css
.varianteRow {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  flex-wrap: wrap;
}
```

- [ ] **Step 6: Run the test suite**

Run: `npx vitest run`
Expected: PASS (no dedicated test for this file — confirms nothing broke).

- [ ] **Step 7: Commit**

```bash
git add components/admin/ProductoForm.jsx components/admin/ProductoForm.module.css
git commit -m "feat: add gramaje base and weight-variant editor to product admin"
```

---

### Task 4: Product detail — weight selector and pricing

**Files:**
- Modify: `components/tienda/ProductoDetalle.jsx`
- Modify: `components/tienda/ProductoDetalle.module.css`

**Interfaces:**
- Consumes: `resolveOpcionesGramaje`, `formatGramos` (Task 1); `addToCart(..., gramos)` (Task 2).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Import the new module**

Add:

```js
import { resolveOpcionesGramaje, formatGramos } from "@/lib/gramaje";
```

- [ ] **Step 2: Add the selection state**

Next to the existing `useState` calls (before the `if (loading)` early return, so hooks always run):

```js
  const [gramajeSeleccionado, setGramajeSeleccionado] = useState(null);
```

- [ ] **Step 3: Resolve the options and the active choice**

Right after `const cantidadViandas = producto.cantidadViandas || 1;`, add:

```js
  const opcionesGramaje = resolveOpcionesGramaje(producto);
  const gramajeActivo = gramajeSeleccionado || opcionesGramaje[0] || null;
```

- [ ] **Step 4: Make gramaje drive the effective price**

Replace:

```js
  const precioEfectivo = producto.precio + extras;
```

with:

```js
  const precioEfectivo = (gramajeActivo ? gramajeActivo.precio : producto.precio) + extras;
```

- [ ] **Step 5: Pass the chosen gramos when adding to cart**

Replace:

```js
    addToCart(producto, Math.min(cantidad, producto.stock), elegidas, precioEfectivo);
```

with:

```js
    addToCart(producto, Math.min(cantidad, producto.stock), elegidas, precioEfectivo, gramajeActivo?.gramos ?? null);
```

- [ ] **Step 6: Render the selector**

Replace:

```jsx
            <p className={styles.descripcion}>{producto.descripcion}</p>

            {tieneGuarniciones && !sinStock && (
```

with:

```jsx
            <p className={styles.descripcion}>{producto.descripcion}</p>

            {opcionesGramaje.length > 1 && (
              <div className={styles.gramajeSelector}>
                {opcionesGramaje.map((opcion) => (
                  <button
                    type="button"
                    key={opcion.gramos}
                    className={`${styles.gramajeCard} ${gramajeActivo?.gramos === opcion.gramos ? styles.gramajeCardActivo : ""}`}
                    onClick={() => setGramajeSeleccionado(opcion)}
                  >
                    <span className={styles.gramajeLabel}>{formatGramos(opcion.gramos)}</span>
                    <span className={styles.gramajePrecio}>${opcion.precio}</span>
                  </button>
                ))}
              </div>
            )}

            {tieneGuarniciones && !sinStock && (
```

- [ ] **Step 7: Add the CSS**

In `components/tienda/ProductoDetalle.module.css`, add:

```css
.gramajeSelector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.gramajeCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  border: 2px solid var(--color-beige);
  border-radius: var(--radius);
  padding: 0.6rem 1rem;
  background: var(--color-blanco);
  cursor: pointer;
  font-family: var(--font-body);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.gramajeCardActivo {
  border-color: var(--color-verde-principal);
  background: rgba(74, 124, 89, 0.08);
}

.gramajeLabel {
  font-weight: 700;
}

.gramajePrecio {
  font-size: 0.85rem;
  opacity: 0.8;
}
```

- [ ] **Step 8: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/tienda/ProductoDetalle.jsx components/tienda/ProductoDetalle.module.css
git commit -m "feat: add weight-variant selector to product detail page"
```

---

### Task 5: Show gramaje everywhere a cart line is listed

**Files:**
- Modify: `components/tienda/CarritoItem.jsx`
- Modify: `components/tienda/CheckoutForm.jsx`
- Modify: `lib/emailNotifications.js`
- Modify: `lib/emailNotifications.test.js`
- Modify: `components/admin/PedidosManager.jsx`

**Interfaces:**
- Consumes: `item.gramos` (Task 2), `formatGramos` (Task 1).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: `CarritoItem.jsx`**

Add the import:

```js
import { formatGramos } from "@/lib/gramaje";
```

Replace:

```jsx
        <span className={styles.nombre}>{item.nombre}</span>
        {guarniciones.length > 0 && <span className={styles.guarniciones}>{guarniciones.join(", ")}</span>}
```

with:

```jsx
        <span className={styles.nombre}>{item.nombre}</span>
        {item.gramos && <span className={styles.guarniciones}>{formatGramos(item.gramos)}</span>}
        {guarniciones.length > 0 && <span className={styles.guarniciones}>{guarniciones.join(", ")}</span>}
```

(Reuses the existing `.guarniciones` CSS class — same small muted-text treatment, no new CSS needed.)

- [ ] **Step 2: `CheckoutForm.jsx`**

Add to the imports:

```js
import { formatGramos } from "@/lib/gramaje";
```

Replace the resumen line:

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

with:

```jsx
        {cart.map((item) => (
          <div key={`${item.productoId}::${item.gramos || ""}::${(item.guarniciones || []).join("|")}`} className={styles.resumenRow}>
            <span>
              {item.cantidad}× {item.nombre}
              {item.gramos ? ` (${formatGramos(item.gramos)})` : ""}
              {(item.guarniciones || []).length > 0 ? ` — ${item.guarniciones.join(", ")}` : ""}
            </span>
            <span>${item.precio * item.cantidad}</span>
          </div>
        ))}
```

- [ ] **Step 3: `lib/emailNotifications.js` — write the failing test first**

Add to `lib/emailNotifications.test.js`, inside `describe("buildOrderEmailParams", ...)`:

```js
  it("includes the gramaje in the item line when present", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [{ productoId: "p1", nombre: "Vianda pollo", precio: 4500, cantidad: 1, gramos: 500, guarniciones: [] }],
    });
    expect(params.items_detalle).toBe("1x Vianda pollo 500gr — $4500");
  });
```

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: FAIL — current output has no gramaje.

- [ ] **Step 4: Update `buildOrderEmailParams`**

Add the import:

```js
import { formatGramos } from "./gramaje";
```

Replace the `itemsDetalle` computation:

```js
  const itemsDetalle = items
    .map((item) => {
      const gramos = item.gramos ? ` ${formatGramos(item.gramos)}` : "";
      const guarniciones = (item.guarniciones || []).length ? ` (${item.guarniciones.join(", ")})` : "";
      return `${item.cantidad}x ${item.nombre}${gramos}${guarniciones} — $${item.precio * item.cantidad}`;
    })
    .join("\n");
```

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: `PedidosManager.jsx`**

Add the import:

```js
import { formatGramos } from "@/lib/gramaje";
```

Replace:

```jsx
                    <p>
                      <strong>Ítems:</strong>{" "}
                      {pedido.items?.map((item) => `${item.cantidad}× ${item.nombre}`).join(", ")}
                    </p>
```

with:

```jsx
                    <p>
                      <strong>Ítems:</strong>{" "}
                      {pedido.items
                        ?.map((item) => `${item.cantidad}× ${item.nombre}${item.gramos ? ` (${formatGramos(item.gramos)})` : ""}`)
                        .join(", ")}
                    </p>
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS. Count = previous total (100) + 8 (`lib/gramaje.test.js`) + 1 (`lib/cart.test.js` new test) + 1 (`lib/emailNotifications.test.js` new test) = 110.

- [ ] **Step 7: Commit**

```bash
git add components/tienda/CarritoItem.jsx components/tienda/CheckoutForm.jsx lib/emailNotifications.js lib/emailNotifications.test.js components/admin/PedidosManager.jsx
git commit -m "feat: show gramaje in cart, checkout, email and admin order detail"
```

---

### Task 6: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, 110 tests (see Task 5 Step 6 for the breakdown).

- [ ] **Step 2: Clean production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual QA (dev server) — stop short of a real order**

Run `npm run dev`:
- Admin → Productos → edit a product, set "Gramaje base" (e.g. 250) and add two variants (e.g. 500gr/$4500, 1000gr/$8000), save.
- Product detail page for that product: confirm the weight selector appears with all three options, and the displayed price updates when switching between them.
- Add two different weights of the same product to the cart. Confirm they show as **two separate lines** in `/tienda/carrito`, each with its own gramaje label, quantity, and price.
- Go to `/tienda/checkout`: confirm the resumen shows each line with its gramaje, and the total matches (don't click "Confirmar pedido").
- Edit a product that has NO gramaje configured: confirm its detail page shows no selector and behaves exactly as before.

This is admin/catalog data only (`alma_productos`), not customer order data — no special caution beyond the general "don't submit a real checkout order" rule.

- [ ] **Step 4: Commit any QA fixes**

If Step 3 surfaces bugs, fix and commit normally; otherwise no commit.

- [ ] **Step 5: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** data model + pure resolution (Task 1); cart line identity (Task 2); admin editor (Task 3); PDP selector + pricing (Task 4); display in cart/checkout/email/admin (Task 5); backward-compatibility (`opcionesGramaje.length` guards, `gramos: null` defaults) woven through every task rather than isolated in one place, matching how the spec described it as additive everywhere.
- **Placeholder scan:** no TBD/TODO; every step shows full snippet content.
- **Type consistency:** `resolveOpcionesGramaje(producto)` return shape (Task 1) matches how Task 4 destructures/maps it. `addItem(..., gramos)` (Task 2) matches how Task 4's `addToCart` call passes it. `item.gramos` field name is identical from where it's written (Task 2, cart line) through every read site (Tasks 4-5).
- **Ordering:** Task 1 must precede Tasks 4-5 (they import from it). Task 2 must precede Task 4 (PDP calls the updated `addToCart`). Task 3 is independent of 1-2-4 except for the field names it writes, which Task 1's `resolveOpcionesGramaje` reads — no strict ordering requirement between Task 3 and the others, but doing it before Task 4 makes manual testing possible sooner.
- **Known accepted gap:** if `gramajeBase` is set without any `variantesGramaje` (or vice versa), the selector simply doesn't appear (documented in the spec) — no admin-side validation/warning added, consistent with this codebase's existing tolerance for that class of half-filled optional config (e.g. `envioGratisActivo` without a threshold).
