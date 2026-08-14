# Packs armables (plato principal + guarniciones) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a pack product (any product with `cantidadViandas > 1`) offer a configurable catalog of "platos principales" the customer can mix and match — in addition to the existing guarniciones — using an add/remove counter per option until reaching the pack's total. Opt-in per product: only products with at least one `platosPrincipales` entry get this; everything else behaves exactly as today.

**Architecture:** A new global catalog `alma_platos_principales` (mirrors `alma_guarniciones` exactly: nombre/descripcion/precioExtra/imagenUrl/activa). Products gain a `platosPrincipales` id-array field (mirrors the existing `guarniciones` field). A new generic component `SeleccionMultiple` replaces the slot-based `GuarnicionPicker` specifically for "pack armable" products, used twice (mains, garnishes). Cart line identity, pricing, and every place that lists cart items get a third dimension alongside `gramos` and `guarniciones`.

**Tech Stack:** Next.js 14 (static export, client components), Firebase Firestore (client SDK), Vitest.

## Global Constraints

- No separate dev/staging Firebase project — never submit a real checkout order during automated verification.
- `firestore.rules` changes are committed locally for documentation but **never deployed via CLI** — `pedidos-lett-2` is shared with other apps; hand the exact snippet to the user to paste into the Firebase console themselves (established this session after an incident).
- A product is "pack armable" only when `platosPrincipales` (filtered to active catalog entries) is non-empty. Every other product must render and behave identically to before this plan — verify this explicitly in Task 9.
- Follow existing conventions exactly: new admin list-CRUD screens mirror `GuarnicionesManager.jsx`; new pure logic goes in `lib/` with matching Vitest tests; cart-line fields follow the same optional/default-empty pattern already used for `gramos` and `guarniciones`.

---

### Task 1: Firestore rule for `alma_platos_principales` (local doc only)

**Files:**
- Modify: `firestore.rules`

**Interfaces:** none (rules only).

- [ ] **Step 1: Add the rule block**

Add, after the `alma_guarniciones` block:

```
    match /alma_platos_principales/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
```

- [ ] **Step 2: Commit (local documentation only — do NOT run any `firebase deploy` command)**

```bash
git add firestore.rules
git commit -m "chore: Firestore rule for alma_platos_principales (local only, manual paste in console)"
```

Hand this snippet to the user directly when this task is reached — don't wait until the end of the plan. Until they paste it into the Firebase console and publish, the new collection will reject reads/writes.

---

### Task 2: Pure selection-counter logic

**Files:**
- Create: `lib/seleccionMultiple.js`
- Create: `lib/seleccionMultiple.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `contarSeleccion(lista) → { [nombre]: count }`, `agregarSeleccion(lista, nombre, max) → lista`, `quitarSeleccion(lista, nombre) → lista`. Consumed by Task 6 (`SeleccionMultiple` component).

- [ ] **Step 1: Write the failing tests**

Create `lib/seleccionMultiple.test.js`:

```js
import { describe, it, expect } from "vitest";
import { contarSeleccion, agregarSeleccion, quitarSeleccion } from "./seleccionMultiple";

describe("contarSeleccion", () => {
  it("returns an empty object for an empty list", () => {
    expect(contarSeleccion([])).toEqual({});
  });

  it("counts occurrences per name, including repeats", () => {
    expect(contarSeleccion(["Pollo", "Pollo", "Milanesa"])).toEqual({ Pollo: 2, Milanesa: 1 });
  });
});

describe("agregarSeleccion", () => {
  it("appends the name when below the max", () => {
    expect(agregarSeleccion(["Pollo"], "Milanesa", 5)).toEqual(["Pollo", "Milanesa"]);
  });

  it("does nothing when already at the max", () => {
    expect(agregarSeleccion(["Pollo", "Milanesa"], "Pastel", 2)).toEqual(["Pollo", "Milanesa"]);
  });
});

describe("quitarSeleccion", () => {
  it("removes one instance of the name", () => {
    expect(quitarSeleccion(["Pollo", "Pollo", "Milanesa"], "Pollo")).toEqual(["Pollo", "Milanesa"]);
  });

  it("does nothing when the name isn't present", () => {
    expect(quitarSeleccion(["Pollo"], "Milanesa")).toEqual(["Pollo"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/seleccionMultiple.test.js`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement `lib/seleccionMultiple.js`**

```js
export function contarSeleccion(lista) {
  return lista.reduce((acc, nombre) => {
    acc[nombre] = (acc[nombre] || 0) + 1;
    return acc;
  }, {});
}

export function agregarSeleccion(lista, nombre, max) {
  if (lista.length >= max) return lista;
  return [...lista, nombre];
}

export function quitarSeleccion(lista, nombre) {
  const index = lista.lastIndexOf(nombre);
  if (index === -1) return lista;
  return [...lista.slice(0, index), ...lista.slice(index + 1)];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/seleccionMultiple.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/seleccionMultiple.js lib/seleccionMultiple.test.js
git commit -m "feat: add pure add/remove/count helpers for multi-selection with a cap"
```

---

### Task 3: Cart line identity for platos principales

**Files:**
- Modify: `lib/cart.js`
- Modify: `lib/cart.test.js`
- Modify: `lib/CartProvider.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `cartLineId(item)` now factors in `item.platosPrincipales`. `addItem(cart, product, cantidad, guarniciones, precioEfectivo, gramos, platosPrincipales = [])` — **new optional 7th parameter**. `CartProvider.addToCart(..., platosPrincipales)` forwards it. Consumed by Task 7 (`ProductoDetalle.jsx`'s `handleAgregar`).

- [ ] **Step 1: Update the tests first**

In `lib/cart.test.js`, replace the `"adds a new item..."` expectation:

```js
  it("adds a new item with the given quantity and default garnish/vianda fields", () => {
    const result = addItem([], product, 2);
    expect(result).toEqual([
      { productoId: "p1", nombre: "Vianda Clásica", cantidadViandas: 1, guarniciones: [], precio: 3500, cantidad: 2, gramos: null, platosPrincipales: [] },
    ]);
  });
```

Replace the `"builds a line id..."` test:

```js
  it("builds a line id from productoId, gramos, platos principales and garnishes", () => {
    expect(
      cartLineId({ productoId: "p1", gramos: 500, platosPrincipales: ["Pollo"], guarniciones: ["Puré", "Ensalada"] })
    ).toBe("p1::500::Pollo::Puré|Ensalada");
    expect(cartLineId({ productoId: "p1" })).toBe("p1::::::");
  });
```

Add a new test after `"keeps the same plate with different gramos as separate lines"`:

```js
  it("keeps the same plate with different platos principales combos as separate lines", () => {
    let cart = addItem([], product, 1, [], 3500, null, ["Pollo"]);
    cart = addItem(cart, product, 1, [], 3500, null, ["Milanesa"]);
    expect(cart).toHaveLength(2);
  });
```

(The three tests that already call `cartLineId(cart[0])` instead of a hardcoded string — `"removes an item by lineId"`, `"updates the quantity..."`, `"removes the line..."` — need no changes; that's exactly why they were written that way during the gramaje work.)

- [ ] **Step 2: Run tests to verify the changed/new ones fail**

Run: `npx vitest run lib/cart.test.js`
Expected: FAIL on the tests just changed/added.

- [ ] **Step 3: Update `lib/cart.js`**

Replace `cartLineId`:

```js
export function cartLineId(item) {
  return `${item.productoId}::${item.gramos || ""}::${(item.platosPrincipales || []).join("|")}::${(item.guarniciones || []).join("|")}`;
}
```

Replace `addItem`:

```js
export function addItem(cart, product, cantidad = 1, guarniciones = [], precioEfectivo = product.precio, gramos = null, platosPrincipales = []) {
  const nuevo = {
    productoId: product.id,
    nombre: product.nombre,
    cantidadViandas: product.cantidadViandas || 1,
    guarniciones,
    precio: precioEfectivo,
    cantidad,
    gramos,
    platosPrincipales,
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/cart.test.js`
Expected: PASS, 14 tests.

- [ ] **Step 5: Update `CartProvider.jsx`**

Replace `addToCart`:

```js
    addToCart: (producto, cantidad, guarniciones = [], precioEfectivo = producto.precio, gramos = null, platosPrincipales = []) =>
      setCart((prev) => addItem(prev, producto, cantidad, guarniciones, precioEfectivo, gramos, platosPrincipales)),
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/cart.js lib/cart.test.js lib/CartProvider.jsx
git commit -m "feat: include platos principales in cart line identity"
```

---

### Task 4: Admin — platos principales catalog

**Files:**
- Create: `lib/usePlatosPrincipales.js`
- Create: `components/admin/PlatosPrincipalesManager.jsx`
- Create: `components/admin/PlatosPrincipalesManager.module.css`
- Create: `app/admin/platos-principales/page.jsx`
- Modify: `components/admin/AdminSidebar.jsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `usePlatosPrincipales() → { platosPrincipales: Array<{id, nombre, descripcion, precioExtra, imagenUrl, activa}>, loading }`. Consumed by Task 5 (`ProductoForm.jsx`) and Task 7 (`ProductoDetalle.jsx`).

- [ ] **Step 1: Create the hook**

Create `lib/usePlatosPrincipales.js`, mirroring `lib/useGuarniciones.js` exactly:

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function usePlatosPrincipales() {
  const [platosPrincipales, setPlatosPrincipales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_platos_principales"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPlatosPrincipales(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setPlatosPrincipales([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { platosPrincipales, loading };
}
```

- [ ] **Step 2: Create the CSS module**

Create `components/admin/PlatosPrincipalesManager.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.card {
  display: flex;
  gap: var(--space-md);
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-sm) var(--space-md);
  flex-wrap: wrap;
}

.cardFields {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
  flex-wrap: wrap;
  flex: 1;
}

.activaRow {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  font-weight: 600;
}
```

- [ ] **Step 3: Create the manager component**

Create `components/admin/PlatosPrincipalesManager.jsx`, mirroring `components/admin/GuarnicionesManager.jsx` **without** the migration button/logic (no legacy data to migrate — this catalog is brand new):

```jsx
"use client";

import { useState } from "react";
import { usePlatosPrincipales } from "@/lib/usePlatosPrincipales";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import ImageUploadField from "./ImageUploadField";
import shared from "./adminShared.module.css";
import styles from "./PlatosPrincipalesManager.module.css";

const COLLECTION = "alma_platos_principales";

export default function PlatosPrincipalesManager() {
  const { platosPrincipales, loading } = usePlatosPrincipales();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioExtra, setPrecioExtra] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precioExtra: Number(precioExtra) || 0,
      imagenUrl: "",
      activa: true,
    });
    setNombre("");
    setDescripcion("");
    setPrecioExtra(0);
  };

  const handleFieldChange = (plato, field, value) => {
    updateDocById(COLLECTION, plato.id, { [field]: value });
  };

  const handleDelete = (plato) => {
    deleteDocById(COLLECTION, plato.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Platos principales</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-texto)" }}>
        Catálogo de platos que se pueden ofrecer dentro de un pack armable. Asignalos a un producto desde su
        formulario de edición.
      </p>

      <div className={styles.list}>
        {platosPrincipales.map((plato) => (
          <div key={plato.id} className={styles.card}>
            <ImageUploadField
              label="Foto"
              currentUrl={plato.imagenUrl}
              storagePath={`platos-principales/${plato.id}.jpg`}
              onUploaded={(url) => handleFieldChange(plato, "imagenUrl", url)}
            />
            <div className={styles.cardFields}>
              <div className={shared.field}>
                <label htmlFor={`nombre-${plato.id}`}>Nombre</label>
                <input
                  id={`nombre-${plato.id}`}
                  type="text"
                  defaultValue={plato.nombre}
                  onBlur={(e) => handleFieldChange(plato, "nombre", e.target.value)}
                />
              </div>
              <div className={shared.field}>
                <label htmlFor={`descripcion-${plato.id}`}>Descripción</label>
                <input
                  id={`descripcion-${plato.id}`}
                  type="text"
                  defaultValue={plato.descripcion}
                  onBlur={(e) => handleFieldChange(plato, "descripcion", e.target.value)}
                />
              </div>
              <div className={shared.field} style={{ maxWidth: 140 }}>
                <label htmlFor={`precio-${plato.id}`}>Precio extra</label>
                <input
                  id={`precio-${plato.id}`}
                  type="number"
                  min={0}
                  defaultValue={plato.precioExtra}
                  onBlur={(e) => handleFieldChange(plato, "precioExtra", Number(e.target.value) || 0)}
                />
              </div>
              <label className={styles.activaRow}>
                <input
                  type="checkbox"
                  checked={plato.activa}
                  onChange={(e) => handleFieldChange(plato, "activa", e.target.checked)}
                />
                Activo
              </label>
              <button type="button" className={shared.delete} onClick={() => handleDelete(plato)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nuevo-plato-nombre">Nuevo plato</label>
          <input id="nuevo-plato-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={shared.field}>
          <label htmlFor="nuevo-plato-descripcion">Descripción</label>
          <input
            id="nuevo-plato-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div className={shared.field} style={{ maxWidth: 120 }}>
          <label htmlFor="nuevo-plato-precio">Precio extra</label>
          <input
            id="nuevo-plato-precio"
            type="number"
            min={0}
            value={precioExtra}
            onChange={(e) => setPrecioExtra(e.target.value)}
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

- [ ] **Step 4: Create the route page**

Create `app/admin/platos-principales/page.jsx`:

```jsx
"use client";

import PlatosPrincipalesManager from "@/components/admin/PlatosPrincipalesManager";

export default function PlatosPrincipalesPage() {
  return <PlatosPrincipalesManager />;
}
```

- [ ] **Step 5: Add the sidebar entry**

In `components/admin/AdminSidebar.jsx`, add a new icon to `ICONS` (right after `guarniciones`):

```jsx
  platosPrincipales: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
```

Add a nav entry to `NAV_ITEMS`, right after the `guarniciones` entry:

```jsx
  { href: "/admin/platos-principales", label: "Platos principales", icon: ICONS.platosPrincipales },
```

- [ ] **Step 6: Run the test suite**

Run: `npx vitest run`
Expected: PASS (no dedicated tests for these files, same as the other admin catalog managers).

- [ ] **Step 7: Commit**

```bash
git add lib/usePlatosPrincipales.js components/admin/PlatosPrincipalesManager.jsx components/admin/PlatosPrincipalesManager.module.css app/admin/platos-principales/page.jsx components/admin/AdminSidebar.jsx
git commit -m "feat: add admin catalog for platos principales"
```

---

### Task 5: Admin — link platos principales to a product

**Files:**
- Modify: `components/admin/ProductoForm.jsx`

**Interfaces:**
- Consumes: `usePlatosPrincipales()` (Task 4).
- Produces: `alma_productos` docs gain `platosPrincipales: string[]` (ids). Consumed by Task 7 (`ProductoDetalle.jsx`).

- [ ] **Step 1: Import the hook**

Add:

```js
import { usePlatosPrincipales } from "@/lib/usePlatosPrincipales";
```

- [ ] **Step 2: Read the catalog and extend `EMPTY`**

Add next to the existing `guarnicionesDisponibles` line:

```js
  const { platosPrincipales: platosDisponibles } = usePlatosPrincipales();
```

Add to `EMPTY` (after `variantesGramaje: [],`):

```js
  platosPrincipales: [],
```

- [ ] **Step 3: Add the toggle handler**

Add next to `toggleGuarnicion`:

```js
  const togglePlatoPrincipal = (id) =>
    setDraft((prev) => {
      const seleccionados = prev.platosPrincipales || [];
      const platosPrincipales = seleccionados.includes(id)
        ? seleccionados.filter((p) => p !== id)
        : [...seleccionados, id];
      return { ...prev, platosPrincipales };
    });
```

- [ ] **Step 4: Include it in the save payload**

In `handleSubmit`'s `payload`, add:

```js
      platosPrincipales: draft.platosPrincipales || [],
```

- [ ] **Step 5: Add the JSX section**

Insert right after the "Guarniciones" section (`</div>` closing it) and before the "Gramaje" section:

```jsx
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Platos principales (para packs armables)</p>
        <p style={{ marginBottom: "0.8rem", opacity: 0.7, fontSize: "0.9rem" }}>
          Si cargás al menos un plato acá, este producto pasa a ser un "pack armable": el cliente va a poder
          elegir el plato principal de cada vianda además de la guarnición, en vez de tener uno fijo.
        </p>
        {platosDisponibles.filter((p) => p.activa).length === 0 ? (
          <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>
            Todavía no hay platos principales cargados. Creálos en la sección "Platos principales" del menú.
          </p>
        ) : (
          <div className={styles.guarnicionesCheckboxes}>
            {platosDisponibles
              .filter((p) => p.activa)
              .map((p) => (
                <label key={p.id} className={styles.guarnicionCheckbox}>
                  <input
                    type="checkbox"
                    checked={(draft.platosPrincipales || []).includes(p.id)}
                    onChange={() => togglePlatoPrincipal(p.id)}
                  />
                  {p.imagenUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagenUrl} alt="" className={styles.guarnicionThumb} />
                  )}
                  <span>
                    {p.nombre}
                    {p.precioExtra > 0 ? ` (+$${p.precioExtra})` : ""}
                  </span>
                </label>
              ))}
          </div>
        )}
      </div>
```

(Reuses the existing `.guarnicionesCheckboxes`/`.guarnicionCheckbox`/`.guarnicionThumb` CSS classes — no new CSS needed.)

- [ ] **Step 6: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/admin/ProductoForm.jsx
git commit -m "feat: link platos principales to a product in the admin form"
```

---

### Task 6: Storefront — the add/remove picker component

**Files:**
- Create: `components/tienda/SeleccionMultiple.jsx`
- Create: `components/tienda/SeleccionMultiple.module.css`

**Interfaces:**
- Consumes: `contarSeleccion`, `agregarSeleccion`, `quitarSeleccion` (Task 2).
- Produces: `<SeleccionMultiple titulo={string} opciones={Array<{id,nombre,imagenUrl,precioExtra}>} seleccionadas={string[]} max={number} onChange={(string[]) => void} />`. Consumed by Task 7 (`ProductoDetalle.jsx`).

- [ ] **Step 1: Create the CSS module**

Create `components/tienda/SeleccionMultiple.module.css`:

```css
.contenedor {
  margin-bottom: var(--space-md);
}

.titulo {
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.lista {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.fila {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: 0.5rem 0.8rem;
}

.thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.thumbPlaceholder {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-beige);
  flex-shrink: 0;
}

.nombre {
  flex: 1;
  font-size: 0.95rem;
}

.extra {
  opacity: 0.7;
  font-size: 0.85rem;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stepper button {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--color-beige);
  background: var(--color-blanco);
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}

.stepper button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cantidad {
  min-width: 1.2rem;
  text-align: center;
  font-weight: 600;
}
```

- [ ] **Step 2: Create the component**

Create `components/tienda/SeleccionMultiple.jsx`:

```jsx
"use client";

import { contarSeleccion, agregarSeleccion, quitarSeleccion } from "@/lib/seleccionMultiple";
import styles from "./SeleccionMultiple.module.css";

export default function SeleccionMultiple({ titulo, opciones, seleccionadas, max, onChange }) {
  const conteos = contarSeleccion(seleccionadas);
  const total = seleccionadas.length;

  return (
    <div className={styles.contenedor}>
      <p className={styles.titulo}>
        {titulo} ({total} de {max} elegidos)
      </p>
      <div className={styles.lista}>
        {opciones.map((opcion) => {
          const cantidad = conteos[opcion.nombre] || 0;
          return (
            <div key={opcion.id} className={styles.fila}>
              {opcion.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opcion.imagenUrl} alt="" className={styles.thumb} />
              ) : (
                <span className={styles.thumbPlaceholder} />
              )}
              <span className={styles.nombre}>
                {opcion.nombre}
                {opcion.precioExtra > 0 && <span className={styles.extra}> +${opcion.precioExtra}</span>}
              </span>
              <div className={styles.stepper}>
                <button
                  type="button"
                  onClick={() => onChange(quitarSeleccion(seleccionadas, opcion.nombre))}
                  disabled={cantidad === 0}
                  aria-label={`Quitar ${opcion.nombre}`}
                >
                  −
                </button>
                <span className={styles.cantidad}>{cantidad}</span>
                <button
                  type="button"
                  onClick={() => onChange(agregarSeleccion(seleccionadas, opcion.nombre, max))}
                  disabled={total >= max}
                  aria-label={`Agregar ${opcion.nombre}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/tienda/SeleccionMultiple.jsx components/tienda/SeleccionMultiple.module.css
git commit -m "feat: add SeleccionMultiple add/remove-with-cap picker component"
```

---

### Task 7: Product detail page integration

**Files:**
- Modify: `components/tienda/ProductoDetalle.jsx`

**Interfaces:**
- Consumes: `usePlatosPrincipales()` (Task 4), `SeleccionMultiple` (Task 6), `addToCart(..., platosPrincipales)` (Task 3).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add imports**

Add:

```js
import { usePlatosPrincipales } from "@/lib/usePlatosPrincipales";
import SeleccionMultiple from "./SeleccionMultiple";
```

- [ ] **Step 2: Read the catalog and add state**

Add next to the `catalogoGuarniciones` line:

```js
  const { platosPrincipales: catalogoPlatos } = usePlatosPrincipales();
```

Add next to the other `useState` calls (before the `if (loading)` early return):

```js
  const [platosPrincipales, setPlatosPrincipales] = useState([]);
```

- [ ] **Step 3: Resolve pack-armable state**

Right after `const cantidadViandas = producto.cantidadViandas || 1;`, add:

```js
  const idsPlatosPrincipales = producto.platosPrincipales || [];
  const opcionesPlatos = catalogoPlatos.filter((p) => p.activa && idsPlatosPrincipales.includes(p.id));
  const esPackArmable = opcionesPlatos.length > 0;
```

- [ ] **Step 4: Generalize the "all selected" validation**

Replace:

```js
  const todasElegidas = !tieneGuarniciones || (guarniciones.length === cantidadViandas && guarniciones.every(Boolean));
```

with:

```js
  const todasElegidas =
    (!tieneGuarniciones || (guarniciones.length === cantidadViandas && guarniciones.every(Boolean))) &&
    (!esPackArmable || platosPrincipales.length === cantidadViandas);
```

- [ ] **Step 5: Sum extras from both dimensions**

Replace:

```js
  const extras = guarniciones.reduce((sum, nombre) => {
    const g = opciones.find((o) => o.nombre === nombre);
    return sum + (g ? Number(g.precioExtra) || 0 : 0);
  }, 0);
```

with:

```js
  const extrasGuarniciones = guarniciones.reduce((sum, nombre) => {
    const g = opciones.find((o) => o.nombre === nombre);
    return sum + (g ? Number(g.precioExtra) || 0 : 0);
  }, 0);
  const extrasPlatos = platosPrincipales.reduce((sum, nombre) => {
    const p = opcionesPlatos.find((o) => o.nombre === nombre);
    return sum + (p ? Number(p.precioExtra) || 0 : 0);
  }, 0);
  const extras = extrasGuarniciones + extrasPlatos;
```

- [ ] **Step 6: Pass platos principales into the cart line**

Replace `handleAgregar`:

```js
  const handleAgregar = () => {
    const elegidas = tieneGuarniciones ? guarniciones.slice(0, cantidadViandas) : [];
    const platosElegidos = esPackArmable ? platosPrincipales.slice(0, cantidadViandas) : [];
    addToCart(producto, Math.min(cantidad, producto.stock), elegidas, precioEfectivo, gramajeActivo?.gramos ?? null, platosElegidos);
    setAgregado(true);
    setGuarniciones([]);
    setPlatosPrincipales([]);
  };
```

- [ ] **Step 7: Swap the picker for pack-armable products**

Replace:

```jsx
            {tieneGuarniciones && !sinStock && (
              <GuarnicionPicker slots={cantidadViandas} opciones={opciones} value={guarniciones} onChange={setSlot} />
            )}
```

with:

```jsx
            {esPackArmable && !sinStock && (
              <SeleccionMultiple
                titulo="Plato principal"
                opciones={opcionesPlatos}
                seleccionadas={platosPrincipales}
                max={cantidadViandas}
                onChange={setPlatosPrincipales}
              />
            )}

            {esPackArmable && tieneGuarniciones && !sinStock && (
              <SeleccionMultiple
                titulo="Guarniciones"
                opciones={opciones}
                seleccionadas={guarniciones}
                max={cantidadViandas}
                onChange={setGuarniciones}
              />
            )}

            {!esPackArmable && tieneGuarniciones && !sinStock && (
              <GuarnicionPicker slots={cantidadViandas} opciones={opciones} value={guarniciones} onChange={setSlot} />
            )}
```

- [ ] **Step 8: Split the "completá tu selección" hint per dimension for pack-armable products**

Replace:

```jsx
            {tieneGuarniciones && !todasElegidas && !sinStock && (
              <p className={styles.aviso}>Elegí {cantidadViandas > 1 ? "todas las guarniciones" : "una guarnición"} para continuar.</p>
            )}
```

with:

```jsx
            {esPackArmable ? (
              <>
                {platosPrincipales.length !== cantidadViandas && !sinStock && (
                  <p className={styles.aviso}>
                    Elegí {cantidadViandas} plato{cantidadViandas > 1 ? "s" : ""} principal{cantidadViandas > 1 ? "es" : ""} para continuar.
                  </p>
                )}
                {tieneGuarniciones && guarniciones.length !== cantidadViandas && !sinStock && (
                  <p className={styles.aviso}>
                    Elegí {cantidadViandas} guarnición{cantidadViandas > 1 ? "es" : ""} para continuar.
                  </p>
                )}
              </>
            ) : (
              tieneGuarniciones &&
              !todasElegidas &&
              !sinStock && (
                <p className={styles.aviso}>Elegí {cantidadViandas > 1 ? "todas las guarniciones" : "una guarnición"} para continuar.</p>
              )
            )}
```

- [ ] **Step 9: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add components/tienda/ProductoDetalle.jsx
git commit -m "feat: let pack-armable products pick platos principales on the detail page"
```

---

### Task 8: Show platos principales everywhere a cart line is listed

**Files:**
- Modify: `components/tienda/CarritoItem.jsx`
- Modify: `components/tienda/CheckoutForm.jsx`
- Modify: `lib/emailNotifications.js`
- Modify: `lib/emailNotifications.test.js`
- Modify: `components/admin/PedidosManager.jsx`

**Interfaces:**
- Consumes: `item.platosPrincipales` (Task 3).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: `CarritoItem.jsx`**

Replace:

```jsx
        {item.gramos && <span className={styles.guarniciones}>{formatGramos(item.gramos)}</span>}
        {guarniciones.length > 0 && <span className={styles.guarniciones}>{guarniciones.join(", ")}</span>}
```

with:

```jsx
        {item.gramos && <span className={styles.guarniciones}>{formatGramos(item.gramos)}</span>}
        {(item.platosPrincipales || []).length > 0 && (
          <span className={styles.guarniciones}>{item.platosPrincipales.join(", ")}</span>
        )}
        {guarniciones.length > 0 && <span className={styles.guarniciones}>{guarniciones.join(", ")}</span>}
```

- [ ] **Step 2: `CheckoutForm.jsx`**

Replace the resumen line:

```jsx
        {cart.map((item) => (
          <div key={cartLineId(item)} className={styles.resumenRow}>
            <span>
              {item.cantidad}× {item.nombre}
              {item.gramos ? ` (${formatGramos(item.gramos)})` : ""}
              {(item.guarniciones || []).length > 0 ? ` — ${item.guarniciones.join(", ")}` : ""}
            </span>
            <span>${item.precio * item.cantidad}</span>
          </div>
        ))}
```

with:

```jsx
        {cart.map((item) => (
          <div key={cartLineId(item)} className={styles.resumenRow}>
            <span>
              {item.cantidad}× {item.nombre}
              {item.gramos ? ` (${formatGramos(item.gramos)})` : ""}
              {(item.platosPrincipales || []).length > 0 ? ` — ${item.platosPrincipales.join(", ")}` : ""}
              {(item.guarniciones || []).length > 0 ? ` — ${item.guarniciones.join(", ")}` : ""}
            </span>
            <span>${item.precio * item.cantidad}</span>
          </div>
        ))}
```

- [ ] **Step 3: `lib/emailNotifications.js` — write the failing test first**

Add to `lib/emailNotifications.test.js`, inside `describe("buildOrderEmailParams", ...)`:

```js
  it("includes platos principales in the item line when present", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [{ productoId: "p1", nombre: "Pack 5", precio: 8000, cantidad: 1, platosPrincipales: ["Pollo", "Milanesa"], guarniciones: [] }],
    });
    expect(params.items_detalle).toBe("1x Pack 5 [Pollo, Milanesa] — $8000");
  });
```

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: FAIL — current output has no platos principales.

- [ ] **Step 4: Update `buildOrderEmailParams`**

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

with:

```js
  const itemsDetalle = items
    .map((item) => {
      const gramos = item.gramos ? ` ${formatGramos(item.gramos)}` : "";
      const platos = (item.platosPrincipales || []).length ? ` [${item.platosPrincipales.join(", ")}]` : "";
      const guarniciones = (item.guarniciones || []).length ? ` (${item.guarniciones.join(", ")})` : "";
      return `${item.cantidad}x ${item.nombre}${gramos}${platos}${guarniciones} — $${item.precio * item.cantidad}`;
    })
    .join("\n");
```

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: `PedidosManager.jsx`**

Replace:

```jsx
                    <p>
                      <strong>Ítems:</strong>{" "}
                      {pedido.items
                        ?.map((item) => `${item.cantidad}× ${item.nombre}${item.gramos ? ` (${formatGramos(item.gramos)})` : ""}`)
                        .join(", ")}
                    </p>
```

with:

```jsx
                    <p>
                      <strong>Ítems:</strong>{" "}
                      {pedido.items
                        ?.map((item) => {
                          const gramos = item.gramos ? ` (${formatGramos(item.gramos)})` : "";
                          const platos = (item.platosPrincipales || []).length ? ` [${item.platosPrincipales.join(", ")}]` : "";
                          return `${item.cantidad}× ${item.nombre}${gramos}${platos}`;
                        })
                        .join(", ")}
                    </p>
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS. Count = previous total (110) + 6 (`lib/seleccionMultiple.test.js`) + 1 (`lib/cart.test.js` new test) + 1 (`lib/emailNotifications.test.js` new test) = 118.

- [ ] **Step 7: Commit**

```bash
git add components/tienda/CarritoItem.jsx components/tienda/CheckoutForm.jsx lib/emailNotifications.js lib/emailNotifications.test.js components/admin/PedidosManager.jsx
git commit -m "feat: show platos principales in cart, checkout, email and admin order detail"
```

---

### Task 9: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, 118 tests (see Task 8 Step 6 for the breakdown).

- [ ] **Step 2: Clean production build**

Run: `npm run build`
Expected: succeeds, routes include `/admin/platos-principales`.

- [ ] **Step 3: Confirm the user has pasted the rule in the console**

Do NOT run `firebase deploy` for any reason. Confirm with the user that they've pasted the `alma_platos_principales` block (from Task 1) into the Firebase console and published it.

- [ ] **Step 4: Manual QA (dev server) — stop short of a real order**

Run `npm run dev`:
- Admin → Platos principales: add 2-3 dishes.
- Admin → Productos: edit a pack product (`cantidadViandas` ≥ 2), assign those platos principales, save.
- Product detail page for that product: confirm two `SeleccionMultiple` lists appear (plato principal, guarniciones), `+` disables once the total hits the max, `-` disables at 0, and "Agregar al carrito" stays disabled until both are fully chosen.
- Add it to the cart with a specific mix (e.g. 2x Pollo + 3x Milanesa as mains). Confirm the cart line shows that mix.
- Add the SAME product again with a DIFFERENT mix. Confirm it appears as a **separate** cart line, not merged with the first.
- Go to `/tienda/checkout`: confirm the resumen shows the chosen platos principales per line (don't click "Confirmar pedido").
- Edit a product with NO `platosPrincipales` assigned: confirm its detail page still shows the old slot-based `GuarnicionPicker` exactly as before, with no plato-principal section at all.

- [ ] **Step 5: Commit any QA fixes**

If Step 4 surfaces bugs, fix and commit normally; otherwise no commit.

- [ ] **Step 6: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** new catalog + admin CRUD (Task 4), product linkage (Task 5), pure counter logic (Task 2), cart line identity (Task 3), the add/remove picker UI (Task 6), PDP integration with backward-compatible branching (Task 7), display everywhere (Task 8), rules handed to the user rather than deployed (Task 1, Task 9).
- **Placeholder scan:** no TBD/TODO; every step shows full snippet content.
- **Type consistency:** `SeleccionMultiple`'s props (Task 6) match exactly how Task 7 calls it twice. `addItem(..., platosPrincipales)` (Task 3) matches what Task 7's `handleAgregar` passes. `item.platosPrincipales` field name is identical from where it's written (Task 3, cart line) through every display site (Task 8).
- **Ordering:** Task 2 before Task 6 (component uses the pure functions). Task 4 before Task 5 and Task 7 (both consume `usePlatosPrincipales`). Task 3 before Task 7 (uses the updated `addToCart` signature). Task 6 before Task 7 (uses the component). Task 8 is independent of Task 6/7's UI but depends on Task 3's field existing.
- **Known accepted gap:** `platosPrincipales` and `guarniciones` selections are independent lists — nothing stops mixing an odd combination the kitchen might find confusing (e.g. choosing Milanesa 5 times with Ensalada 5 times is fine, but there's no pairing/compatibility rule between a given plato principal and a given guarnición). Not requested; matches the spec's scope exactly.
