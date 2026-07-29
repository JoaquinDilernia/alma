# Catálogo Global de Guarniciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text, per-product garnish list with a managed global catalog (`alma_guarniciones`: name, description, photo, single global extra price), migrate existing embedded product garnishes into it, let products pick which catalog garnishes they offer via checkboxes, and replace the storefront's plain `<select>` picker with a chip-per-vianda control that opens a photo-grid picker.

**Architecture:** New Firestore collection `alma_guarniciones` (same single-collection-with-`onSnapshot`-hook + `lib/adminCrud.js` CRUD pattern as `alma_categorias`). `alma_productos.guarniciones` changes from an array of embedded `{nombre, precioExtra}` objects to an array of `alma_guarniciones` doc IDs. Cart items are unaffected — they still store the chosen garnish **name** as a string, a snapshot independent of later catalog edits. A pure migration module (`lib/migrateGuarniciones.js`) dedupes existing embedded garnishes and remaps products to the new IDs; it's invoked once from an admin button.

**Tech Stack:** Next.js 14 (App Router, client components), Firebase v10 modular SDK (Firestore `onSnapshot`/`getDocs`/`addDoc`/`updateDoc`), Vitest, CSS Modules.

## Global Constraints

- `alma_guarniciones` docs: `{ nombre: string, descripcion: string, precioExtra: number, imagenUrl: string, activa: boolean }`. Extra price is single and global — never per-product.
- `alma_productos.guarniciones` becomes an array of `alma_guarniciones` doc IDs (was an array of `{nombre, precioExtra}` objects).
- Cart items (`lib/cart.js`, `CartProvider`, `CarritoItem.jsx`, `CheckoutForm.jsx`) are **not modified** — `item.guarniciones` stays an array of name strings, exactly as today.
- Firestore rules for `alma_guarniciones` follow the existing `alma_categorias` pattern: public read, admin-only write.
- Follow existing conventions exactly: `lib/adminCrud.js` (`createDoc`/`updateDocById`/`deleteDocById`) for CRUD, `onSnapshot` hooks returning `{ data, loading }`, `ImageUploadField` for photo upload, CSS Modules per component.

---

### Task 1: Pure migration logic

**Files:**
- Create: `lib/migrateGuarniciones.js`
- Test: `lib/migrateGuarniciones.test.js`

**Interfaces:**
- Produces: `normalizeNombre(nombre)` → lowercased/trimmed string. `collectGuarnicionesUnicas(productos)` → `Array<{nombre, precioExtra}>`, deduped by normalized name, first `precioExtra` seen wins. `remapProductoGuarniciones(producto, nombreToId)` → `Array<string>` of IDs, where `nombreToId` is a plain object keyed by `normalizeNombre(...)`. Task 3 (the admin migration button) imports and calls all three.

- [ ] **Step 1: Write the failing tests**

Create `lib/migrateGuarniciones.test.js`:

```js
import { describe, it, expect } from "vitest";
import { collectGuarnicionesUnicas, remapProductoGuarniciones, normalizeNombre } from "./migrateGuarniciones";

describe("normalizeNombre", () => {
  it("trims and lowercases", () => {
    expect(normalizeNombre("  Puré DE Batata  ")).toBe("puré de batata");
  });

  it("treats a missing value as an empty string", () => {
    expect(normalizeNombre(undefined)).toBe("");
  });
});

describe("collectGuarnicionesUnicas", () => {
  it("returns an empty array when no products have guarniciones", () => {
    expect(collectGuarnicionesUnicas([{ guarniciones: [] }, {}])).toEqual([]);
  });

  it("collects guarniciones from a single product", () => {
    const productos = [{ guarniciones: [{ nombre: "Puré de batata", precioExtra: 300 }] }];
    expect(collectGuarnicionesUnicas(productos)).toEqual([{ nombre: "Puré de batata", precioExtra: 300 }]);
  });

  it("dedupes by name across products, case-insensitive and trimmed, first price wins", () => {
    const productos = [
      { guarniciones: [{ nombre: "Puré de batata", precioExtra: 300 }] },
      { guarniciones: [{ nombre: " puré DE BATATA ", precioExtra: 999 }] },
    ];
    expect(collectGuarnicionesUnicas(productos)).toEqual([{ nombre: "Puré de batata", precioExtra: 300 }]);
  });

  it("skips entries with an empty name", () => {
    const productos = [{ guarniciones: [{ nombre: "   ", precioExtra: 100 }] }];
    expect(collectGuarnicionesUnicas(productos)).toEqual([]);
  });

  it("treats a missing precioExtra as 0", () => {
    const productos = [{ guarniciones: [{ nombre: "Ensalada" }] }];
    expect(collectGuarnicionesUnicas(productos)).toEqual([{ nombre: "Ensalada", precioExtra: 0 }]);
  });
});

describe("remapProductoGuarniciones", () => {
  const nombreToId = { "puré de batata": "id1", "brócoli salteado": "id2" };

  it("maps embedded guarniciones to their new ids", () => {
    const producto = { guarniciones: [{ nombre: "Puré de batata" }, { nombre: "Brócoli salteado" }] };
    expect(remapProductoGuarniciones(producto, nombreToId)).toEqual(["id1", "id2"]);
  });

  it("ignores names with no match", () => {
    const producto = { guarniciones: [{ nombre: "Puré de batata" }, { nombre: "Inexistente" }] };
    expect(remapProductoGuarniciones(producto, nombreToId)).toEqual(["id1"]);
  });

  it("returns an empty array for a product without guarniciones", () => {
    expect(remapProductoGuarniciones({}, nombreToId)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/migrateGuarniciones.test.js`
Expected: FAIL — cannot find module `./migrateGuarniciones`.

- [ ] **Step 3: Implement the module**

Create `lib/migrateGuarniciones.js`:

```js
export function normalizeNombre(nombre) {
  return (nombre || "").trim().toLowerCase();
}

export function collectGuarnicionesUnicas(productos) {
  const vistos = new Map();
  for (const producto of productos) {
    for (const g of producto.guarniciones || []) {
      const clave = normalizeNombre(g.nombre);
      if (!clave || vistos.has(clave)) continue;
      vistos.set(clave, { nombre: g.nombre.trim(), precioExtra: Number(g.precioExtra) || 0 });
    }
  }
  return Array.from(vistos.values());
}

export function remapProductoGuarniciones(producto, nombreToId) {
  return (producto.guarniciones || [])
    .map((g) => nombreToId[normalizeNombre(g.nombre)])
    .filter(Boolean);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/migrateGuarniciones.test.js`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/migrateGuarniciones.js lib/migrateGuarniciones.test.js
git commit -m "feat: add pure guarniciones migration logic"
```

---

### Task 2: `useGuarniciones` read hook

**Files:**
- Create: `lib/useGuarniciones.js`

**Interfaces:**
- Consumes: `db` from `./firebase` (existing singleton).
- Produces: `useGuarniciones()` → `{ guarniciones: Array<{id, nombre, descripcion, precioExtra, imagenUrl, activa}>, loading: boolean }`. Tasks 3, 4, and 6 all call this.

- [ ] **Step 1: Implement the hook**

Create `lib/useGuarniciones.js`, mirroring `lib/useCategorias.js`:

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useGuarniciones() {
  const [guarniciones, setGuarniciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_guarniciones"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGuarniciones(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setGuarniciones([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { guarniciones, loading };
}
```

- [ ] **Step 2: Verify no regressions**

Run: `npm test`
Expected: PASS (this is a client hook with no existing unit test coverage in this codebase, same as `useCategorias`/`useTiendaConfig` — this step just guards against unrelated breakage).

- [ ] **Step 3: Commit**

```bash
git add lib/useGuarniciones.js
git commit -m "feat: add useGuarniciones read hook"
```

---

### Task 3: Firestore rules + admin "Guarniciones" section

**Files:**
- Modify: `firestore.rules`
- Create: `components/admin/GuarnicionesManager.jsx`
- Create: `components/admin/GuarnicionesManager.module.css`
- Create: `app/admin/guarniciones/page.jsx`
- Modify: `components/admin/AdminSidebar.jsx`

**Interfaces:**
- Consumes: `useGuarniciones()` (Task 2); `collectGuarnicionesUnicas`, `remapProductoGuarniciones`, `normalizeNombre` (Task 1); `createDoc`, `updateDocById`, `deleteDocById` from `@/lib/adminCrud`; `ImageUploadField` from `./ImageUploadField`.
- Produces: the `/admin/guarniciones` route and nav entry. No other task depends on this task's internals — `alma_guarniciones` docs it creates are read generically via `useGuarniciones()` by Tasks 4 and 6.

- [ ] **Step 1: Add the Firestore rule**

In `firestore.rules`, add a new `match` block right after the `alma_categorias` block (after line 30):

```
    match /alma_categorias/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /alma_guarniciones/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
```

- [ ] **Step 2: Create the CSS module**

Create `components/admin/GuarnicionesManager.module.css`:

```css
.migracion {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

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

Create `components/admin/GuarnicionesManager.jsx`:

```jsx
"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useGuarniciones } from "@/lib/useGuarniciones";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import { collectGuarnicionesUnicas, remapProductoGuarniciones, normalizeNombre } from "@/lib/migrateGuarniciones";
import ImageUploadField from "./ImageUploadField";
import shared from "./adminShared.module.css";
import styles from "./GuarnicionesManager.module.css";

const COLLECTION = "alma_guarniciones";

export default function GuarnicionesManager() {
  const { guarniciones, loading } = useGuarniciones();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioExtra, setPrecioExtra] = useState(0);
  const [migrando, setMigrando] = useState(false);
  const [migracionMsg, setMigracionMsg] = useState("");

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

  const handleFieldChange = (guarnicion, field, value) => {
    updateDocById(COLLECTION, guarnicion.id, { [field]: value });
  };

  const handleDelete = (guarnicion) => {
    deleteDocById(COLLECTION, guarnicion.id);
  };

  const handleMigrar = async () => {
    setMigrando(true);
    setMigracionMsg("");
    try {
      const snapshot = await getDocs(collection(db, "alma_productos"));
      const productos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const unicas = collectGuarnicionesUnicas(productos);

      const nombreToId = {};
      for (const g of unicas) {
        const id = await createDoc(COLLECTION, {
          nombre: g.nombre,
          descripcion: "",
          precioExtra: g.precioExtra,
          imagenUrl: "",
          activa: true,
        });
        nombreToId[normalizeNombre(g.nombre)] = id;
      }

      for (const producto of productos) {
        if (!(producto.guarniciones || []).length) continue;
        const nuevoArray = remapProductoGuarniciones(producto, nombreToId);
        await updateDocById("alma_productos", producto.id, { guarniciones: nuevoArray });
      }

      setMigracionMsg(`Migración completa: ${unicas.length} guarniciones creadas.`);
    } catch (err) {
      setMigracionMsg("Ocurrió un error durante la migración. Revisá la consola.");
    } finally {
      setMigrando(false);
    }
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Guarniciones</h1>

      {guarniciones.length === 0 && (
        <div className={styles.migracion}>
          <p style={{ marginBottom: "0.6rem" }}>
            Todavía no hay guarniciones cargadas. Si ya tenés productos con guarniciones a mano, migralas a esta lista.
          </p>
          <button type="button" className={shared.addButton} onClick={handleMigrar} disabled={migrando}>
            {migrando ? "Migrando..." : "Migrar guarniciones existentes de productos"}
          </button>
          {migracionMsg && <p style={{ marginTop: "0.6rem" }}>{migracionMsg}</p>}
        </div>
      )}

      <div className={styles.list}>
        {guarniciones.map((guarnicion) => (
          <div key={guarnicion.id} className={styles.card}>
            <ImageUploadField
              label="Foto"
              currentUrl={guarnicion.imagenUrl}
              storagePath={`guarniciones/${guarnicion.id}.jpg`}
              onUploaded={(url) => handleFieldChange(guarnicion, "imagenUrl", url)}
            />
            <div className={styles.cardFields}>
              <div className={shared.field}>
                <label htmlFor={`nombre-${guarnicion.id}`}>Nombre</label>
                <input
                  id={`nombre-${guarnicion.id}`}
                  type="text"
                  defaultValue={guarnicion.nombre}
                  onBlur={(e) => handleFieldChange(guarnicion, "nombre", e.target.value)}
                />
              </div>
              <div className={shared.field}>
                <label htmlFor={`descripcion-${guarnicion.id}`}>Descripción</label>
                <input
                  id={`descripcion-${guarnicion.id}`}
                  type="text"
                  defaultValue={guarnicion.descripcion}
                  onBlur={(e) => handleFieldChange(guarnicion, "descripcion", e.target.value)}
                />
              </div>
              <div className={shared.field} style={{ maxWidth: 140 }}>
                <label htmlFor={`precio-${guarnicion.id}`}>Precio extra</label>
                <input
                  id={`precio-${guarnicion.id}`}
                  type="number"
                  min={0}
                  defaultValue={guarnicion.precioExtra}
                  onBlur={(e) => handleFieldChange(guarnicion, "precioExtra", Number(e.target.value) || 0)}
                />
              </div>
              <label className={styles.activaRow}>
                <input
                  type="checkbox"
                  checked={guarnicion.activa}
                  onChange={(e) => handleFieldChange(guarnicion, "activa", e.target.checked)}
                />
                Activa
              </label>
              <button type="button" className={shared.delete} onClick={() => handleDelete(guarnicion)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nueva-guarnicion-nombre">Nueva guarnición</label>
          <input id="nueva-guarnicion-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={shared.field}>
          <label htmlFor="nueva-guarnicion-descripcion">Descripción</label>
          <input
            id="nueva-guarnicion-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div className={shared.field} style={{ maxWidth: 120 }}>
          <label htmlFor="nueva-guarnicion-precio">Precio extra</label>
          <input
            id="nueva-guarnicion-precio"
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

Create `app/admin/guarniciones/page.jsx`:

```jsx
"use client";

import GuarnicionesManager from "@/components/admin/GuarnicionesManager";

export default function GuarnicionesPage() {
  return <GuarnicionesManager />;
}
```

- [ ] **Step 5: Add the sidebar nav entry**

In `components/admin/AdminSidebar.jsx`, add a new icon to the `ICONS` object, right after `categorias` (after line 36):

```js
  categorias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  ),
  guarniciones: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11h18" />
      <path d="M4 11a8 8 0 0 0 16 0" />
      <path d="M12 11V4" />
      <path d="M9 4h6" />
    </svg>
  ),
```

Then update `NAV_ITEMS` (line 98-99) to insert the new entry between "Categorías" and "Envíos":

```js
  { href: "/admin/categorias", label: "Categorías", icon: ICONS.categorias },
  { href: "/admin/guarniciones", label: "Guarniciones", icon: ICONS.guarniciones },
  { href: "/admin/zonas-envio", label: "Envíos", icon: ICONS.envios },
```

- [ ] **Step 6: Verify no regressions**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Manual check**

Run `npm run dev`, log into `/admin/login/`, open `/admin/guarniciones/`, confirm the "Migrar guarniciones existentes de productos" button appears (list is empty), click it, and confirm: new cards appear with the names/prices previously embedded in products (e.g. "Albondigas con salsa"'s 7 garnishes), the button disappears once the list is non-empty, and uploading a photo on one card shows its preview.

- [ ] **Step 8: Commit**

```bash
git add firestore.rules components/admin/GuarnicionesManager.jsx components/admin/GuarnicionesManager.module.css app/admin/guarniciones/page.jsx components/admin/AdminSidebar.jsx
git commit -m "feat: add admin Guarniciones catalog with migration"
```

---

### Task 4: `ProductoForm` — select catalog garnishes via checkboxes

**Files:**
- Modify: `components/admin/ProductoForm.jsx`
- Modify: `components/admin/ProductoForm.module.css`

**Interfaces:**
- Consumes: `useGuarniciones()` (Task 2).
- Produces: `draft.guarniciones` is now an array of `alma_guarniciones` doc IDs (was an array of `{nombre, precioExtra}` objects), persisted as-is by `handleSubmit`.

- [ ] **Step 1: Import the hook**

In `components/admin/ProductoForm.jsx`, add after line 6 (`import { updateDocById } from "@/lib/adminCrud";`):

```js
import { useGuarniciones } from "@/lib/useGuarniciones";
```

- [ ] **Step 2: Read the catalog and add a toggle helper**

Replace line 26 (`const { categorias } = useCategorias();`) with:

```js
  const { categorias } = useCategorias();
  const { guarniciones: guarnicionesDisponibles } = useGuarniciones();
```

Replace the `removeGuarnicion` function (lines 48-49):

```js
  const removeGuarnicion = (index) =>
    setDraft((prev) => ({ ...prev, guarniciones: prev.guarniciones.filter((_, i) => i !== index) }));
```

with:

```js
  const toggleGuarnicion = (id) =>
    setDraft((prev) => {
      const seleccionadas = prev.guarniciones || [];
      const guarniciones = seleccionadas.includes(id)
        ? seleccionadas.filter((g) => g !== id)
        : [...seleccionadas, id];
      return { ...prev, guarniciones };
    });
```

Delete the now-unused `addGuarnicion` and `updateGuarnicion` functions (lines 40-47):

```js
  const addGuarnicion = () =>
    setDraft((prev) => ({ ...prev, guarniciones: [...(prev.guarniciones || []), { nombre: "", precioExtra: 0 }] }));
  const updateGuarnicion = (index, field, value) =>
    setDraft((prev) => {
      const guarniciones = [...prev.guarniciones];
      guarniciones[index] = { ...guarniciones[index], [field]: value };
      return { ...prev, guarniciones };
    });
```

- [ ] **Step 3: Simplify the submit payload**

Replace the `guarniciones` line inside `payload` (line 59-61):

```js
      guarniciones: (draft.guarniciones || [])
        .filter((g) => g.nombre.trim())
        .map((g) => ({ nombre: g.nombre.trim(), precioExtra: Number(g.precioExtra) || 0 })),
```

with:

```js
      guarniciones: draft.guarniciones || [],
```

- [ ] **Step 4: Replace the Guarniciones section markup**

Replace the entire "Guarniciones" section (lines 176-204):

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

with:

```jsx
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Guarniciones</p>
        <p style={{ marginBottom: "0.8rem", opacity: 0.7, fontSize: "0.9rem" }}>
          Elegí qué guarniciones de la lista global ofrece este producto. El cliente elige una por vianda (según la cantidad de viandas).
        </p>
        {guarnicionesDisponibles.filter((g) => g.activa).length === 0 ? (
          <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>
            Todavía no hay guarniciones cargadas. Creálas en la sección "Guarniciones" del menú.
          </p>
        ) : (
          <div className={styles.guarnicionesCheckboxes}>
            {guarnicionesDisponibles
              .filter((g) => g.activa)
              .map((g) => (
                <label key={g.id} className={styles.guarnicionCheckbox}>
                  <input
                    type="checkbox"
                    checked={(draft.guarniciones || []).includes(g.id)}
                    onChange={() => toggleGuarnicion(g.id)}
                  />
                  {g.imagenUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.imagenUrl} alt="" className={styles.guarnicionThumb} />
                  )}
                  <span>
                    {g.nombre}
                    {g.precioExtra > 0 ? ` (+$${g.precioExtra})` : ""}
                  </span>
                </label>
              ))}
          </div>
        )}
      </div>
```

- [ ] **Step 5: Update the CSS module**

In `components/admin/ProductoForm.module.css`, replace the `.guarnicionRow`, `.guarnicionRow input`, `.guarnicionRow input[type="text"]`, `.removeGuarnicion`, and `.addGuarnicion` rules (lines 101-134):

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

with:

```css
.guarnicionesCheckboxes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.guarnicionCheckbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: 0.4rem 0.7rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.guarnicionThumb {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
}
```

- [ ] **Step 6: Verify no regressions**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Manual check**

Run `npm run dev`, open `/admin/productos/`, edit a product (e.g. "Albondigas con salsa" after Task 3's migration), confirm the Guarniciones section shows checkboxes (with thumbnails for the ones you've photographed) instead of text rows, that its existing garnishes are pre-checked, and that saving persists correctly.

- [ ] **Step 8: Commit**

```bash
git add components/admin/ProductoForm.jsx components/admin/ProductoForm.module.css
git commit -m "feat: select product guarniciones from global catalog"
```

---

### Task 5: `GuarnicionPicker` storefront component

**Files:**
- Create: `components/tienda/GuarnicionPicker.jsx`
- Create: `components/tienda/GuarnicionPicker.module.css`

**Interfaces:**
- Produces: `<GuarnicionPicker slots={number} opciones={Array<{id, nombre, precioExtra, imagenUrl}>} value={Array<string|undefined>} onChange={(index, nombre) => void} />`. `value[index]` is the currently chosen garnish **name** for that slot (or `undefined`). Task 6 renders this in place of the old `<select>` block, passing the same `guarniciones` state array and `setSlot` function it already has.

- [ ] **Step 1: Create the CSS module**

Create `components/tienda/GuarnicionPicker.module.css`:

```css
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.slot {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.slotLabel {
  font-weight: 600;
  font-size: 0.9rem;
}

.chip {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  background: var(--color-blanco);
  padding: 0.5rem 0.8rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  cursor: pointer;
  max-width: 320px;
  width: 100%;
  text-align: left;
}

.chipImg {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.chipPlaceholder {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-beige);
  flex-shrink: 0;
}

.cambiar {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.6;
}

.chipVacio {
  opacity: 0.6;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

@media (min-width: 640px) {
  .overlay {
    align-items: center;
  }
}

.sheet {
  background: var(--color-blanco);
  border-radius: var(--radius) var(--radius) 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--space-md);
}

@media (min-width: 640px) {
  .sheet {
    border-radius: var(--radius);
  }
}

.sheetHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.cerrar {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.4rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border: 2px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  padding: 0.5rem;
  cursor: pointer;
  font-family: var(--font-body);
  text-align: center;
}

.card:hover {
  border-color: var(--color-verde-principal);
  background: rgba(74, 124, 89, 0.08);
}

.cardImg {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius);
}

.cardPlaceholder {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius);
  background: var(--color-beige);
  display: block;
}

.cardNombre {
  font-size: 0.85rem;
  font-weight: 600;
}

.cardExtra {
  font-size: 0.75rem;
  opacity: 0.7;
}
```

- [ ] **Step 2: Create the component**

Create `components/tienda/GuarnicionPicker.jsx`:

```jsx
"use client";

import { useState } from "react";
import styles from "./GuarnicionPicker.module.css";

export default function GuarnicionPicker({ slots, opciones, value, onChange }) {
  const [slotAbierto, setSlotAbierto] = useState(null);

  const elegir = (index, opcion) => {
    onChange(index, opcion.nombre);
    setSlotAbierto(null);
  };

  return (
    <div className={styles.picker}>
      {Array.from({ length: slots }).map((_, index) => {
        const nombreElegido = value[index];
        const opcionElegida = opciones.find((o) => o.nombre === nombreElegido);
        return (
          <div key={index} className={styles.slot}>
            <span className={styles.slotLabel}>{slots > 1 ? `Guarnición ${index + 1}` : "Guarnición"}</span>
            <button type="button" className={styles.chip} onClick={() => setSlotAbierto(index)}>
              {opcionElegida ? (
                <>
                  {opcionElegida.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opcionElegida.imagenUrl} alt="" className={styles.chipImg} />
                  ) : (
                    <span className={styles.chipPlaceholder} />
                  )}
                  <span>{opcionElegida.nombre}</span>
                  <span className={styles.cambiar}>Cambiar</span>
                </>
              ) : (
                <span className={styles.chipVacio}>+ Elegí una guarnición</span>
              )}
            </button>
          </div>
        );
      })}

      {slotAbierto !== null && (
        <div className={styles.overlay} onClick={() => setSlotAbierto(null)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <span>Elegí una guarnición</span>
              <button type="button" className={styles.cerrar} onClick={() => setSlotAbierto(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.grid}>
              {opciones.map((opcion) => (
                <button type="button" key={opcion.id} className={styles.card} onClick={() => elegir(slotAbierto, opcion)}>
                  {opcion.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opcion.imagenUrl} alt="" className={styles.cardImg} />
                  ) : (
                    <span className={styles.cardPlaceholder} />
                  )}
                  <span className={styles.cardNombre}>{opcion.nombre}</span>
                  {opcion.precioExtra > 0 && <span className={styles.cardExtra}>+${opcion.precioExtra}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Expected: PASS (this component isn't wired into any page yet — Task 6 does that).

- [ ] **Step 4: Commit**

```bash
git add components/tienda/GuarnicionPicker.jsx components/tienda/GuarnicionPicker.module.css
git commit -m "feat: add GuarnicionPicker chip + photo-grid component"
```

---

### Task 6: Wire `GuarnicionPicker` into `ProductoDetalle`

**Files:**
- Modify: `components/tienda/ProductoDetalle.jsx`
- Modify: `components/tienda/ProductoDetalle.module.css`

**Interfaces:**
- Consumes: `useGuarniciones()` (Task 2); `<GuarnicionPicker>` (Task 5).

- [ ] **Step 1: Import the hook and component**

In `components/tienda/ProductoDetalle.jsx`, replace the imports (lines 1-12):

```js
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
```

with:

```js
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProductos } from "@/lib/useProductos";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useGuarniciones } from "@/lib/useGuarniciones";
import { useCart } from "@/lib/CartProvider";
import GaleriaFotos from "./GaleriaFotos";
import TablaNutricional from "./TablaNutricional";
import RepartoInfo from "./RepartoInfo";
import GuarnicionPicker from "./GuarnicionPicker";
import styles from "./ProductoDetalle.module.css";
```

- [ ] **Step 2: Call the hook before any early return**

Replace lines 14-22:

```js
export default function ProductoDetalle() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { productos, loading } = useProductos();
  const { zonasEnvio } = useZonasEnvio();
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [guarniciones, setGuarniciones] = useState([]);
  const [agregado, setAgregado] = useState(false);
```

with:

```js
export default function ProductoDetalle() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { productos, loading } = useProductos();
  const { zonasEnvio } = useZonasEnvio();
  const { guarniciones: catalogoGuarniciones } = useGuarniciones();
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [guarniciones, setGuarniciones] = useState([]);
  const [agregado, setAgregado] = useState(false);
```

(`useGuarniciones()` must run unconditionally alongside the other hooks, before the `if (loading) return` / `if (!producto) return` guards below it — same rule the existing hooks already follow.)

- [ ] **Step 3: Resolve options from the catalog**

Replace lines 40-46:

```js
  const sinStock = producto.stock <= 0;
  const opciones = producto.guarniciones || [];
  const tieneGuarniciones = opciones.length > 0;
  const cantidadViandas = producto.cantidadViandas || 1;
  const slots = tieneGuarniciones ? Array.from({ length: cantidadViandas }) : [];

  const todasElegidas = !tieneGuarniciones || (guarniciones.length === cantidadViandas && guarniciones.every(Boolean));
```

with:

```js
  const sinStock = producto.stock <= 0;
  const idsGuarniciones = producto.guarniciones || [];
  const opciones = catalogoGuarniciones.filter((g) => g.activa && idsGuarniciones.includes(g.id));
  const tieneGuarniciones = opciones.length > 0;
  const cantidadViandas = producto.cantidadViandas || 1;

  const todasElegidas = !tieneGuarniciones || (guarniciones.length === cantidadViandas && guarniciones.every(Boolean));
```

- [ ] **Step 4: Replace the picker markup**

Replace lines 79-102:

```jsx
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
```

with:

```jsx
            {tieneGuarniciones && !sinStock && (
              <GuarnicionPicker slots={cantidadViandas} opciones={opciones} value={guarniciones} onChange={setSlot} />
            )}
```

- [ ] **Step 5: Remove the now-unused CSS**

In `components/tienda/ProductoDetalle.module.css`, delete the `.guarniciones`, `.guarnicionField label`, and `.guarnicionField select` rules (lines 70-91):

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
```

Keep `.aviso` (still used below this block).

- [ ] **Step 6: Verify no regressions**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Manual check**

Run `npm run dev`, open a product with guarniciones in the tienda (e.g. "Albondigas con salsa" after Task 3's migration), confirm: one chip per vianda slot, tapping it opens the photo-grid overlay, tapping a photo selects it and closes the overlay, the chip then shows the chosen photo+name, the price updates live with the extra, "Agregar al carrito" stays disabled until all slots are chosen, and the added cart line still shows the garnish name correctly in `/tienda/carrito/` and checkout.

- [ ] **Step 8: Commit**

```bash
git add components/tienda/ProductoDetalle.jsx components/tienda/ProductoDetalle.module.css
git commit -m "feat: use GuarnicionPicker in product detail page"
```
