# ALMA — Ecommerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ALMA ecommerce — public catalog, product detail, cart, guest checkout — plus the admin CRUD (productos, categorías, zonas de envío, pedidos) needed to run it, on top of the existing Next.js static-export site and Firebase backend from sub-project 1.

**Architecture:** Same stack as the landing — no backend server. Cart lives in `localStorage` via a React Context. Checkout runs a single atomic Firestore transaction that validates+decrements stock for every cart item and creates the order document together. Product detail uses one static route reading `?id=` from the query string (not a per-product dynamic route) so new/edited products never require a rebuild.

**Tech Stack:** Next.js 14 (App Router, JavaScript), CSS Modules, Firebase JS SDK v10 (Firestore transactions, Storage), Vitest.

## Global Constraints

- Everything from the sub-project 1 plan's Global Constraints still applies (JS only, `alma_` prefix, CSS Modules only, static export, no backend yet, Spanish copy, rules files local-only).
- New Firestore collections: `alma_categorias`, `alma_productos`, `alma_zonas_envio`, `alma_pedidos`.
- Product detail lives at the single static route `/tienda/producto` reading `?id=` — never add a `[id]` dynamic segment for products.
- Stock decrement + order creation happen inside **one** `runTransaction` call — never split into per-item transactions.
- Cart items snapshot `nombre`/`precio` at add-time; checkout does not re-fetch live price, only live stock.

---

## Task 1: Cart pure logic (TDD)

**Files:**
- Create: `lib/cart.js`
- Create: `lib/cart.test.js`

**Interfaces:**
- Produces: `addItem(cart, product, cantidad?)`, `removeItem(cart, productoId)`, `updateQuantity(cart, productoId, cantidad)`, `calculateSubtotal(cart)` — consumed by `lib/CartProvider.jsx` (Task 2).

- [ ] **Step 1: Write the failing tests**

```js
// lib/cart.test.js
import { describe, it, expect } from "vitest";
import { addItem, removeItem, updateQuantity, calculateSubtotal } from "./cart";

const product = { id: "p1", nombre: "Vianda Clásica", precio: 3500 };

describe("cart", () => {
  it("adds a new item with the given quantity", () => {
    const result = addItem([], product, 2);
    expect(result).toEqual([{ productoId: "p1", nombre: "Vianda Clásica", precio: 3500, cantidad: 2 }]);
  });

  it("defaults quantity to 1 when not given", () => {
    const result = addItem([], product);
    expect(result[0].cantidad).toBe(1);
  });

  it("increments quantity when adding an item already in the cart", () => {
    const cart = addItem([], product, 1);
    const result = addItem(cart, product, 2);
    expect(result).toHaveLength(1);
    expect(result[0].cantidad).toBe(3);
  });

  it("removes an item by productoId", () => {
    const cart = addItem([], product, 1);
    expect(removeItem(cart, "p1")).toEqual([]);
  });

  it("updates the quantity of an existing item", () => {
    const cart = addItem([], product, 1);
    const result = updateQuantity(cart, "p1", 5);
    expect(result[0].cantidad).toBe(5);
  });

  it("removes the item when quantity is updated to 0 or less", () => {
    const cart = addItem([], product, 1);
    expect(updateQuantity(cart, "p1", 0)).toEqual([]);
  });

  it("calculates subtotal as the sum of precio * cantidad", () => {
    let cart = addItem([], { id: "p1", nombre: "A", precio: 1000 }, 2);
    cart = addItem(cart, { id: "p2", nombre: "B", precio: 500 }, 3);
    expect(calculateSubtotal(cart)).toBe(1000 * 2 + 500 * 3);
  });

  it("returns 0 for an empty cart", () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/cart.js` does not exist.

- [ ] **Step 3: Write `lib/cart.js`**

```js
export function addItem(cart, product, cantidad = 1) {
  const existing = cart.find((item) => item.productoId === product.id);
  if (existing) {
    return cart.map((item) =>
      item.productoId === product.id ? { ...item, cantidad: item.cantidad + cantidad } : item
    );
  }
  return [...cart, { productoId: product.id, nombre: product.nombre, precio: product.precio, cantidad }];
}

export function removeItem(cart, productoId) {
  return cart.filter((item) => item.productoId !== productoId);
}

export function updateQuantity(cart, productoId, cantidad) {
  if (cantidad <= 0) return removeItem(cart, productoId);
  return cart.map((item) => (item.productoId === productoId ? { ...item, cantidad } : item));
}

export function calculateSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/cart.js lib/cart.test.js
git commit -m "feat: add cart pure logic with unit tests"
```

---

## Task 2: CartProvider (Context + localStorage)

**Files:**
- Create: `lib/CartProvider.jsx`
- Modify: `app/(site)/layout.jsx`

**Interfaces:**
- Consumes: `addItem`, `removeItem`, `updateQuantity`, `calculateSubtotal` from Task 1.
- Produces: `<CartProvider>{children}</CartProvider>`, `useCart()` → `{ cart, addToCart, removeFromCart, updateCartQuantity, clearCart, subtotal, itemCount }`.

- [ ] **Step 1: Write `lib/CartProvider.jsx`**

```jsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { addItem, removeItem, updateQuantity, calculateSubtotal } from "./cart";

const CartContext = createContext(null);
const STORAGE_KEY = "alma_cart";

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setCart(JSON.parse(stored));
    } catch (err) {
      // corrupt/unavailable storage — start with an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const value = {
    cart,
    addToCart: (producto, cantidad) => setCart((prev) => addItem(prev, producto, cantidad)),
    removeFromCart: (productoId) => setCart((prev) => removeItem(prev, productoId)),
    updateCartQuantity: (productoId, cantidad) => setCart((prev) => updateQuantity(prev, productoId, cantidad)),
    clearCart: () => setCart([]),
    subtotal: calculateSubtotal(cart),
    itemCount: cart.reduce((n, item) => n + item.cantidad, 0),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
```

- [ ] **Step 2: Wire `CartProvider` into `app/(site)/layout.jsx`**

Read the current file, then apply:

```jsx
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsappButton from "@/components/site/WhatsappButton";
import { CartProvider } from "@/lib/CartProvider";

export default function SiteLayout({ children }) {
  return (
    <CartProvider>
      <Header />
      {children}
      <Footer />
      <WhatsappButton />
    </CartProvider>
  );
}
```

- [ ] **Step 3: Verify no build errors**

Run: `npm run build`
Expected: succeeds (nothing consumes `useCart()` yet, so this just confirms `CartProvider` compiles and renders without throwing).

- [ ] **Step 4: Commit**

```bash
git add lib/CartProvider.jsx "app/(site)/layout.jsx"
git commit -m "feat: add CartProvider (Context + localStorage) wired into site layout"
```

---

## Task 3: CartIcon in Header

**Files:**
- Create: `components/tienda/CartIcon.jsx`
- Create: `components/tienda/CartIcon.module.css`
- Modify: `components/site/Header.jsx`
- Modify: `components/site/Header.module.css`

**Interfaces:**
- Consumes: `useCart()` from Task 2.
- Produces: `<CartIcon />`, rendered inside `<Header />`.

- [ ] **Step 1: Write `components/tienda/CartIcon.module.css`**

```css
.link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.icon {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
```

- [ ] **Step 2: Write `components/tienda/CartIcon.jsx`**

```jsx
"use client";

import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import styles from "./CartIcon.module.css";

export default function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link href="/tienda/carrito" className={styles.link} aria-label="Ver carrito">
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M7 4h-2l-.94 2H2v2h1.06l3.16 7.59-1.18 2.13c-.51.94.16 2.28 1.25 2.28h11.71v-2h-11.71l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.24-6.97h-15.11l-.94-2h16.05v-2h-17.63zM7 20a2 2 0 1 0 0.001 4.001 2 2 0 0 0 -0.001 -4.001zm10 0a2 2 0 1 0 0.001 4.001 2 2 0 0 0 -0.001 -4.001z" />
      </svg>
      {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
    </Link>
  );
}
```

- [ ] **Step 3: Modify `components/site/Header.jsx`**

Add the import and render `<CartIcon />` between the nav and the "Pedir ahora" CTA:

```jsx
import CartIcon from "@/components/tienda/CartIcon";
```

Change:
```jsx
        <Link href="/tienda" className={styles.cta}>
          Pedir ahora
        </Link>
      </div>
    </header>
```
to:
```jsx
        <div className={styles.actions}>
          <CartIcon />
          <Link href="/tienda" className={styles.cta}>
            Pedir ahora
          </Link>
        </div>
      </div>
    </header>
```

- [ ] **Step 4: Add `.actions` to `components/site/Header.module.css`**

```css
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
```

The `.cta` rule already exists from Task 8 of the landing plan — no change needed there. The transparent-header color rules (`.navLink`, `.wordmark`, `.logo`) already handle the light/dark states; `CartIcon`'s SVG uses `fill: currentColor`, so it inherits whatever color the surrounding header state applies — verify this visually in Step 5.

- [ ] **Step 5: Verify visually**

Run `npm run dev`, open `/`. Confirm the cart icon appears in the header next to "Pedir ahora", with no badge (cart is empty). Confirm it's visible (white) over the dark hero and switches to dark green once the header goes solid on scroll, matching the rest of the header content. Confirm clicking it navigates to `/tienda/carrito` (will 404 until Task 14 — expected for now).

- [ ] **Step 6: Commit**

```bash
git add components/tienda/CartIcon.jsx components/tienda/CartIcon.module.css components/site/Header.jsx components/site/Header.module.css
git commit -m "feat: add CartIcon to Header"
```

---

## Task 4: Checkout pure logic (TDD)

**Files:**
- Create: `lib/checkout.js`
- Create: `lib/checkout.test.js`

**Interfaces:**
- Produces: `calculateTotal(subtotal, costoEnvio)`, `validateCheckoutForm(data)`, `validateStockAvailability(cart, stockMap)` — consumed by `CheckoutForm` (Task 15) and `submitOrder` (Task 5).

- [ ] **Step 1: Write the failing tests**

```js
// lib/checkout.test.js
import { describe, it, expect } from "vitest";
import { calculateTotal, validateCheckoutForm, validateStockAvailability } from "./checkout";

const validData = {
  nombre: "Ana Pérez",
  telefono: "11 4444-5555",
  email: "ana@mail.com",
  direccion: "Av. Siempre Viva 742",
  zonaEnvioId: "z1",
  metodoPago: "transferencia",
};

describe("calculateTotal", () => {
  it("adds subtotal and shipping cost", () => {
    expect(calculateTotal(1000, 300)).toBe(1300);
  });
});

describe("validateCheckoutForm", () => {
  it("accepts fully valid data", () => {
    expect(validateCheckoutForm(validData)).toEqual({ valid: true, errors: {} });
  });

  it("rejects a missing nombre", () => {
    const result = validateCheckoutForm({ ...validData, nombre: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.nombre).toBeDefined();
  });

  it("rejects an invalid email", () => {
    const result = validateCheckoutForm({ ...validData, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("rejects a missing zonaEnvioId", () => {
    const result = validateCheckoutForm({ ...validData, zonaEnvioId: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.zonaEnvioId).toBeDefined();
  });

  it("rejects a missing metodoPago", () => {
    const result = validateCheckoutForm({ ...validData, metodoPago: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.metodoPago).toBeDefined();
  });
});

describe("validateStockAvailability", () => {
  const cart = [
    { productoId: "p1", nombre: "Vianda A", precio: 100, cantidad: 3 },
    { productoId: "p2", nombre: "Vianda B", precio: 200, cantidad: 1 },
  ];

  it("passes when stock covers every item", () => {
    const result = validateStockAvailability(cart, { p1: 5, p2: 2 });
    expect(result).toEqual({ valid: true, errors: {} });
  });

  it("fails when an item exceeds available stock", () => {
    const result = validateStockAvailability(cart, { p1: 2, p2: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors.p1).toMatch(/Vianda A/);
  });

  it("treats a missing stock entry as 0 available", () => {
    const result = validateStockAvailability(cart, { p1: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors.p2).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/checkout.js` does not exist.

- [ ] **Step 3: Write `lib/checkout.js`**

```js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function calculateTotal(subtotal, costoEnvio) {
  return subtotal + costoEnvio;
}

export function validateCheckoutForm(data) {
  const errors = {};

  if (!data.nombre || data.nombre.trim().length < 2) {
    errors.nombre = "Ingresá tu nombre.";
  }
  if (!data.telefono || data.telefono.replace(/\D/g, "").length < 8) {
    errors.telefono = "Ingresá un teléfono válido.";
  }
  if (!data.email || !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = "Ingresá un email válido.";
  }
  if (!data.direccion || data.direccion.trim().length < 5) {
    errors.direccion = "Ingresá tu dirección.";
  }
  if (!data.zonaEnvioId) {
    errors.zonaEnvioId = "Elegí una zona de envío.";
  }
  if (!data.metodoPago) {
    errors.metodoPago = "Elegí un método de pago.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStockAvailability(cart, stockMap) {
  const errors = {};

  for (const item of cart) {
    const disponible = stockMap[item.productoId] ?? 0;
    if (disponible < item.cantidad) {
      errors[item.productoId] = `Quedan solo ${disponible} unidades de ${item.nombre}.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/checkout.js lib/checkout.test.js
git commit -m "feat: add checkout pure logic (totals, form validation, stock validation) with tests"
```

---

## Task 5: submitOrder transaction

**Files:**
- Create: `lib/submitOrder.js`

**Interfaces:**
- Consumes: `calculateSubtotal` (Task 1), `calculateTotal` (Task 4), `db` from `lib/firebase.js`.
- Produces: `submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago })` → `Promise<pedidoId>`, throws `Error("STOCK_INSUFICIENTE:<nombre>")` when an item lacks stock.

- [ ] **Step 1: Write `lib/submitOrder.js`**

```js
import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { calculateSubtotal } from "./cart";
import { calculateTotal } from "./checkout";

export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago }) {
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
    const total = calculateTotal(subtotal, costoEnvio);

    transaction.set(pedidoRef, {
      cliente,
      zonaEnvioId,
      items: cart,
      subtotal,
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

All `transaction.get()` calls resolve (via `Promise.all`) before any `transaction.update`/`transaction.set` call, respecting Firestore's read-before-write rule within a transaction.

- [ ] **Step 2: Commit**

```bash
git add lib/submitOrder.js
git commit -m "feat: add submitOrder — single atomic transaction for stock decrement + order creation"
```

(Manual end-to-end verification of this function happens in Task 15, once there's a real checkout form and seeded products to test against.)

---

## Task 6: Admin CRUD helper + catalog read hooks

**Files:**
- Create: `lib/adminCrud.js`
- Create: `lib/useProductos.js`
- Create: `lib/useCategorias.js`
- Create: `lib/useZonasEnvio.js`

**Interfaces:**
- Produces: `createDoc(collectionName, data)`, `updateDocById(collectionName, id, data)`, `deleteDocById(collectionName, id)`; `useProductos()` → `{ productos, loading }`; `useCategorias()` → `{ categorias, loading }`; `useZonasEnvio()` → `{ zonasEnvio, loading }`. Each hook returns **all** documents (active and inactive) — consumers filter for `activo`/`activa` where that matters (public pages do, admin managers don't).

- [ ] **Step 1: Write `lib/adminCrud.js`**

```js
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function createDoc(collectionName, data) {
  const ref = await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateDocById(collectionName, id, data) {
  await updateDoc(doc(db, collectionName, id), data);
}

export async function deleteDocById(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}
```

- [ ] **Step 2: Write `lib/useProductos.js`**

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_productos"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setProductos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setProductos([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { productos, loading };
}
```

- [ ] **Step 3: Write `lib/useCategorias.js`**

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_categorias"), orderBy("orden"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCategorias(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setCategorias([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { categorias, loading };
}
```

- [ ] **Step 4: Write `lib/useZonasEnvio.js`**

```js
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useZonasEnvio() {
  const [zonasEnvio, setZonasEnvio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_zonas_envio"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setZonasEnvio(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setZonasEnvio([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { zonasEnvio, loading };
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/adminCrud.js lib/useProductos.js lib/useCategorias.js lib/useZonasEnvio.js
git commit -m "feat: add generic admin CRUD helper and live catalog read hooks"
```

---

## Task 7: Admin Categorías manager

**Files:**
- Create: `components/admin/CategoriasManager.jsx`
- Create: `components/admin/CategoriasManager.module.css`
- Create: `app/admin/categorias/page.jsx`

**Interfaces:**
- Consumes: `useCategorias` (Task 6), `createDoc`/`updateDocById`/`deleteDocById` (Task 6).
- Produces: `<CategoriasManager />`, the `/admin/categorias` route.

- [ ] **Step 1: Write `components/admin/CategoriasManager.module.css`**

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
}

.addForm .field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.addForm input {
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
```

- [ ] **Step 2: Write `components/admin/CategoriasManager.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useCategorias } from "@/lib/useCategorias";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./CategoriasManager.module.css";

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
              <td>
                <input
                  type="text"
                  defaultValue={categoria.nombre}
                  onBlur={(e) => handleFieldChange(categoria, "nombre", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  defaultValue={categoria.orden}
                  onBlur={(e) => handleFieldChange(categoria, "orden", Number(e.target.value))}
                  style={{ width: 70 }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  defaultChecked={categoria.activa}
                  onChange={(e) => handleFieldChange(categoria, "activa", e.target.checked)}
                />
              </td>
              <td className={styles.actions}>
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

Edits save on blur (no separate "guardar" step per row) — matches the low-friction pattern of a small admin table; the checkbox saves immediately on change.

- [ ] **Step 3: Write `app/admin/categorias/page.jsx`**

```jsx
"use client";

import CategoriasManager from "@/components/admin/CategoriasManager";

export default function CategoriasPage() {
  return <CategoriasManager />;
}
```

- [ ] **Step 4: Verify manually**

Run `npm run dev`, log in to `/admin`, go to `/admin/categorias`. Add a category (e.g. "Clásicas", orden 1), confirm it appears in the table. Edit its name inline (blur to save), toggle "Activa" off and on, delete a test row. All should update without a page reload (live `onSnapshot`).

- [ ] **Step 5: Commit**

```bash
git add components/admin/CategoriasManager.jsx components/admin/CategoriasManager.module.css "app/admin/categorias/page.jsx"
git commit -m "feat: add admin Categorías CRUD manager"
```

---

## Task 8: Admin Zonas de envío manager

**Files:**
- Create: `components/admin/ZonasEnvioManager.jsx`
- Create: `app/admin/zonas-envio/page.jsx`

**Interfaces:**
- Consumes: `useZonasEnvio` (Task 6), CRUD helpers (Task 6), reuses `components/admin/CategoriasManager.module.css` styles (same table/form shape — imported directly rather than duplicated).

- [ ] **Step 1: Write `components/admin/ZonasEnvioManager.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./CategoriasManager.module.css";

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
              <td>
                <input
                  type="text"
                  defaultValue={zona.nombre}
                  onBlur={(e) => handleFieldChange(zona, "nombre", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  defaultValue={zona.costo}
                  onBlur={(e) => handleFieldChange(zona, "costo", Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  defaultChecked={zona.activa}
                  onChange={(e) => handleFieldChange(zona, "activa", e.target.checked)}
                />
              </td>
              <td className={styles.actions}>
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

- [ ] **Step 2: Write `app/admin/zonas-envio/page.jsx`**

```jsx
"use client";

import ZonasEnvioManager from "@/components/admin/ZonasEnvioManager";

export default function ZonasEnvioPage() {
  return <ZonasEnvioManager />;
}
```

- [ ] **Step 3: Verify manually**

At `/admin/zonas-envio`, add a zone (e.g. "CABA", costo 1500), confirm it appears, edit and delete it, same as Task 7's verification.

- [ ] **Step 4: Commit**

```bash
git add components/admin/ZonasEnvioManager.jsx "app/admin/zonas-envio/page.jsx"
git commit -m "feat: add admin Zonas de envío CRUD manager"
```

---

## Task 9: Admin Productos manager

**Files:**
- Create: `components/admin/ProductoForm.jsx`
- Create: `components/admin/ProductoForm.module.css`
- Create: `components/admin/ProductosManager.jsx`
- Create: `components/admin/ProductosManager.module.css`
- Create: `app/admin/productos/page.jsx`

**Interfaces:**
- Consumes: `useProductos`, `useCategorias` (Task 6), `createDoc`/`updateDocById`/`deleteDocById` (Task 6), `ImageUploadField` (from sub-project 1, `components/admin/ImageUploadField.jsx`).
- Produces: `<ProductoForm producto? onDone />`, `<ProductosManager />`, `/admin/productos`.

- [ ] **Step 1: Write `components/admin/ProductoForm.module.css`**

```css
.form {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
  font-family: var(--font-body);
}

.field textarea {
  min-height: 80px;
  resize: vertical;
}

.fotos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.nutricion {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.checkboxRow {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.buttons {
  display: flex;
  gap: var(--space-sm);
}

.save {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.7rem 1.4rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
}

.cancel {
  background: transparent;
  border: 1px solid var(--color-beige);
  padding: 0.7rem 1.4rem;
  border-radius: var(--radius);
  cursor: pointer;
}
```

- [ ] **Step 2: Write `components/admin/ProductoForm.jsx`**

```jsx
"use client";

import { useState } from "react";
import { doc, collection, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCategorias } from "@/lib/useCategorias";
import { updateDocById } from "@/lib/adminCrud";
import ImageUploadField from "./ImageUploadField";
import styles from "./ProductoForm.module.css";

const EMPTY = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoriaId: "",
  tipo: "individual",
  stock: 0,
  imagenUrls: ["", "", ""],
  tablaNutricional: { calorias: "", proteinas: "", carbohidratos: "", grasas: "" },
  activo: true,
};

export default function ProductoForm({ producto, onDone }) {
  const { categorias } = useCategorias();
  const [draft, setDraft] = useState(producto ? { ...EMPTY, ...producto } : EMPTY);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(producto);

  const updateField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));
  const updateNutricion = (field, value) =>
    setDraft((prev) => ({ ...prev, tablaNutricional: { ...prev.tablaNutricional, [field]: value } }));
  const updateFoto = (index, url) =>
    setDraft((prev) => {
      const imagenUrls = [...prev.imagenUrls];
      imagenUrls[index] = url;
      return { ...prev, imagenUrls };
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...draft,
      precio: Number(draft.precio) || 0,
      stock: Number(draft.stock) || 0,
      imagenUrls: draft.imagenUrls.filter(Boolean),
    };
    try {
      if (isEditing) {
        await updateDocById("alma_productos", producto.id, payload);
      } else {
        const ref = doc(collection(db, "alma_productos"));
        await setDoc(ref, payload);
      }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
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

      <div className={styles.field} style={{ marginBottom: "1rem", maxWidth: 160 }}>
        <label htmlFor="producto-stock">Stock</label>
        <input
          id="producto-stock"
          type="number"
          value={draft.stock}
          onChange={(e) => updateField("stock", e.target.value)}
        />
      </div>

      <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Fotos</p>
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

      <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Tabla nutricional (por porción)</p>
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

      <div className={styles.checkboxRow}>
        <input
          id="producto-activo"
          type="checkbox"
          checked={draft.activo}
          onChange={(e) => updateField("activo", e.target.checked)}
        />
        <label htmlFor="producto-activo">Activo (visible en la tienda)</label>
      </div>

      <div className={styles.buttons}>
        <button type="submit" className={styles.save} disabled={saving}>
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
        </button>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
```

Note the `storagePath` passed to `ImageUploadField` uses the product's current `nombre` rather than its Firestore ID — the ID doesn't exist yet for a brand-new product until the form is submitted. This means re-uploading a photo after renaming the product writes to a different Storage path (an old unused file is left behind rather than overwritten) — acceptable for this admin tool; Storage cost for a few orphaned images is negligible, and cleaning that up is not worth the complexity for this iteration.

- [ ] **Step 3: Write `components/admin/ProductosManager.module.css`**

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

.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius);
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

.delete {
  background: transparent;
  border: 1px solid #b3452f;
  color: #b3452f;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  cursor: pointer;
}

.addButton {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  border: none;
  padding: 0.7rem 1.4rem;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
  margin-bottom: var(--space-md);
}

.stockBajo {
  color: #b3452f;
  font-weight: 600;
}
```

- [ ] **Step 4: Write `components/admin/ProductosManager.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useProductos } from "@/lib/useProductos";
import { deleteDocById } from "@/lib/adminCrud";
import ProductoForm from "./ProductoForm";
import styles from "./ProductosManager.module.css";

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

      <button type="button" className={styles.addButton} onClick={() => setEditing("new")}>
        + Nuevo producto
      </button>

      <table className={styles.table}>
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
              <td>
                {producto.imagenUrls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={producto.imagenUrls[0]} alt="" className={styles.thumb} />
                )}
              </td>
              <td>{producto.nombre}</td>
              <td>{producto.tipo}</td>
              <td>${producto.precio}</td>
              <td className={producto.stock <= 0 ? styles.stockBajo : undefined}>{producto.stock}</td>
              <td>{producto.activo ? "Sí" : "No"}</td>
              <td className={styles.actions}>
                <button type="button" className={styles.edit} onClick={() => setEditing(producto)}>
                  Editar
                </button>
                <button type="button" className={styles.delete} onClick={() => handleDelete(producto)}>
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

- [ ] **Step 5: Write `app/admin/productos/page.jsx`**

```jsx
"use client";

import ProductosManager from "@/components/admin/ProductosManager";

export default function ProductosPage() {
  return <ProductosManager />;
}
```

- [ ] **Step 6: Verify manually**

At `/admin/productos`: create a product with a name, price, category (needs at least one category from Task 7), stock, one photo, nutrition values. Confirm it appears in the table with the thumbnail. Edit it, confirm changes persist. Click Eliminar twice (confirm step) and confirm it's removed.

- [ ] **Step 7: Commit**

```bash
git add components/admin/ProductoForm.jsx components/admin/ProductoForm.module.css components/admin/ProductosManager.jsx components/admin/ProductosManager.module.css "app/admin/productos/page.jsx"
git commit -m "feat: add admin Productos CRUD manager with images and nutrition table"
```

---

## Task 10: AdminNav links for new sections

**Files:**
- Modify: `components/admin/AdminNav.jsx`

**Interfaces:**
- No new interfaces — wires existing routes into navigation.

- [ ] **Step 1: Add links**

Read the current file, then replace the `<div className={styles.links}>...</div>` block with:

```jsx
      <div className={styles.links}>
        <Link href="/admin">Panel</Link>
        <Link href="/admin/contenido">Contenido</Link>
        <Link href="/admin/productos">Productos</Link>
        <Link href="/admin/categorias">Categorías</Link>
        <Link href="/admin/zonas-envio">Envíos</Link>
        <Link href="/admin/pedidos">Pedidos</Link>
        {role === "superadmin" && <Link href="/admin/usuarios">Usuarios</Link>}
      </div>
```

- [ ] **Step 2: Verify visually**

Confirm all 7 links render in the admin nav bar and each navigates correctly (Pedidos will 404 until Task 13 lands — expected for now).

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminNav.jsx
git commit -m "feat: add Productos/Categorías/Envíos/Pedidos links to admin nav"
```

---

## Task 11: Seed sample catalog data

**Files:**
- None committed — this task runs a one-off local script (same pattern as the superadmin bootstrap in the sub-project 1 plan) and deletes it afterward.

**Interfaces:**
- Populates `alma_categorias`, `alma_productos`, `alma_zonas_envio` with enough realistic sample data that the storefront isn't empty for a demo.

- [ ] **Step 1: Write a temporary `_seed-catalog.mjs` in the project root**

```js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

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

const categorias = [
  { id: "clasicas", nombre: "Clásicas", orden: 1, activa: true },
  { id: "fitness", nombre: "Fitness", orden: 2, activa: true },
  { id: "veggie", nombre: "Veggie", orden: 3, activa: true },
  { id: "kids", nombre: "Kids", orden: 4, activa: true },
];

const productos = [
  {
    id: "vianda-milanesa-pure",
    nombre: "Milanesa de ternera con puré",
    descripcion: "Milanesa casera de ternera con puré de papas cremoso. Del freezer al horno en 20 minutos.",
    precio: 4200,
    categoriaId: "clasicas",
    tipo: "individual",
    stock: 25,
    imagenUrls: [
      "https://images.unsplash.com/photo-1632852576480-c10a8e19496a?w=900&q=80&auto=format&fit=crop",
    ],
    tablaNutricional: { calorias: 520, proteinas: 32, carbohidratos: 48, grasas: 18 },
    activo: true,
  },
  {
    id: "vianda-pollo-grillado",
    nombre: "Pollo grillado con vegetales",
    descripcion: "Pechuga de pollo grillada con mix de vegetales de estación. Alto en proteína, bajo en grasas.",
    precio: 3900,
    categoriaId: "fitness",
    tipo: "individual",
    stock: 30,
    imagenUrls: [
      "https://images.unsplash.com/photo-1668838289210-e7665d947145?w=900&q=80&auto=format&fit=crop",
    ],
    tablaNutricional: { calorias: 380, proteinas: 40, carbohidratos: 18, grasas: 12 },
    activo: true,
  },
  {
    id: "vianda-bowl-veggie",
    nombre: "Bowl veggie de garbanzos y palta",
    descripcion: "Garbanzos, arroz integral, palta y vegetales frescos. 100% plant-based.",
    precio: 3700,
    categoriaId: "veggie",
    tipo: "individual",
    stock: 20,
    imagenUrls: [
      "https://images.unsplash.com/photo-1543353071-c953d88f7033?w=900&q=80&auto=format&fit=crop",
    ],
    tablaNutricional: { calorias: 410, proteinas: 16, carbohidratos: 58, grasas: 14 },
    activo: true,
  },
  {
    id: "vianda-kids-bento",
    nombre: "Bento kids de pollo y arroz",
    descripcion: "Porción pensada para los más chicos: pollo, arroz y vegetales suaves, sabor sin condimentos fuertes.",
    precio: 3200,
    categoriaId: "kids",
    tipo: "individual",
    stock: 18,
    imagenUrls: [
      "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?w=900&q=80&auto=format&fit=crop",
    ],
    tablaNutricional: { calorias: 340, proteinas: 22, carbohidratos: 40, grasas: 9 },
    activo: true,
  },
  {
    id: "pack-semanal-fitness-x5",
    nombre: "Pack semanal Fitness x5",
    descripcion: "5 viandas Fitness para toda la semana, con descuento sobre el precio individual.",
    precio: 17500,
    categoriaId: "fitness",
    tipo: "pack",
    stock: 10,
    imagenUrls: [
      "https://images.unsplash.com/photo-1668838289210-e7665d947145?w=900&q=80&auto=format&fit=crop",
    ],
    tablaNutricional: { calorias: 380, proteinas: 40, carbohidratos: 18, grasas: 12 },
    activo: true,
  },
];

const zonasEnvio = [
  { id: "caba", nombre: "CABA", costo: 1500, activa: true },
  { id: "gba-norte", nombre: "GBA Norte", costo: 2200, activa: true },
  { id: "gba-sur", nombre: "GBA Sur", costo: 2200, activa: true },
];

for (const categoria of categorias) {
  const { id, ...data } = categoria;
  await setDoc(doc(db, "alma_categorias", id), data);
}
for (const producto of productos) {
  const { id, ...data } = producto;
  await setDoc(doc(db, "alma_productos", id), data);
}
for (const zona of zonasEnvio) {
  const { id, ...data } = zona;
  await setDoc(doc(db, "alma_zonas_envio", id), data);
}

console.log(`Seeded ${categorias.length} categorías, ${productos.length} productos, ${zonasEnvio.length} zonas de envío.`);
process.exit(0);
```

- [ ] **Step 2: Run it**

Run: `node --env-file=.env.local _seed-catalog.mjs`
Expected: prints the seeded counts with no errors.

- [ ] **Step 3: Delete the temporary script**

Run: `rm _seed-catalog.mjs`

This script is a one-off data-loading tool, not part of the shipped codebase — same treatment as the superadmin bootstrap script from the sub-project 1 plan.

- [ ] **Step 4: Verify in Firebase Console or via the admin**

Open `/admin/productos`, `/admin/categorias`, `/admin/zonas-envio` and confirm the seeded rows appear.

(No commit for this task — nothing new is added to the repo.)

---

## Task 12: Public Catálogo

**Files:**
- Create: `components/tienda/ProductoCard.jsx`
- Create: `components/tienda/ProductoCard.module.css`
- Create: `components/tienda/CategoriaFiltro.jsx`
- Create: `components/tienda/CategoriaFiltro.module.css`
- Create: `components/tienda/Catalogo.jsx`
- Create: `components/tienda/Catalogo.module.css`
- Modify: `app/(site)/tienda/page.jsx` (replace the "Muy pronto" placeholder)
- Delete: `app/(site)/tienda/Tienda.module.css` (superseded by `Catalogo.module.css`)

**Interfaces:**
- Consumes: `useProductos`, `useCategorias` (Task 6).
- Produces: `<Catalogo />`, rendered at `/tienda`.

- [ ] **Step 1: Write `components/tienda/ProductoCard.module.css`**

```css
.card {
  display: block;
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--color-blanco);
  position: relative;
}

.imageWrap {
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sinStock {
  opacity: 0.55;
}

.badge {
  position: absolute;
  top: var(--space-xs);
  left: var(--space-xs);
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badgeSinStock {
  background: #4b4b4b;
}

.info {
  padding: var(--space-sm);
}

.nombre {
  font-family: var(--font-display);
  font-size: 1.15rem;
  color: var(--color-verde-principal);
  margin-bottom: 0.25rem;
}

.precio {
  font-weight: 700;
}
```

- [ ] **Step 2: Write `components/tienda/ProductoCard.jsx`**

```jsx
import Link from "next/link";
import ImagePlaceholder from "@/components/site/ImagePlaceholder";
import styles from "./ProductoCard.module.css";

export default function ProductoCard({ producto }) {
  const sinStock = producto.stock <= 0;

  return (
    <Link
      href={`/tienda/producto?id=${producto.id}`}
      className={`${styles.card} ${sinStock ? styles.sinStock : ""}`}
    >
      <div className={styles.imageWrap}>
        {producto.imagenUrls?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={producto.imagenUrls[0]} alt={producto.nombre} className={styles.image} />
        ) : (
          <ImagePlaceholder className={styles.image} />
        )}
      </div>
      <span className={`${styles.badge} ${sinStock ? styles.badgeSinStock : ""}`}>
        {producto.tipo === "pack" ? "Pack" : sinStock ? "Sin stock" : "Individual"}
      </span>
      <div className={styles.info}>
        <p className={styles.nombre}>{producto.nombre}</p>
        <p className={styles.precio}>${producto.precio}</p>
      </div>
    </Link>
  );
}
```

Note: the badge shows "Pack" for packs even when in stock (it's the more useful label there), and falls back to "Sin stock" / "Individual" otherwise — a pack that's out of stock still shows "Pack" so its type isn't lost; the dimmed `.sinStock` card styling is what actually communicates unavailability, not the badge text.

- [ ] **Step 3: Write `components/tienda/CategoriaFiltro.module.css`**

```css
.filtro {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  margin-bottom: var(--space-lg);
}

.tab {
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--color-beige);
  background: var(--color-blanco);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.tabActive {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  border-color: var(--color-verde-principal);
}
```

- [ ] **Step 4: Write `components/tienda/CategoriaFiltro.jsx`**

```jsx
import styles from "./CategoriaFiltro.module.css";

export default function CategoriaFiltro({ categorias, activa, onChange }) {
  return (
    <div className={styles.filtro}>
      <button
        type="button"
        className={`${styles.tab} ${activa === null ? styles.tabActive : ""}`}
        onClick={() => onChange(null)}
      >
        Todas
      </button>
      {categorias.map((categoria) => (
        <button
          key={categoria.id}
          type="button"
          className={`${styles.tab} ${activa === categoria.id ? styles.tabActive : ""}`}
          onClick={() => onChange(categoria.id)}
        >
          {categoria.nombre}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write `components/tienda/Catalogo.module.css`**

```css
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

@media (min-width: 760px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.empty {
  text-align: center;
  padding: var(--space-xl) 0;
  color: var(--color-texto);
}
```

- [ ] **Step 6: Write `components/tienda/Catalogo.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useProductos } from "@/lib/useProductos";
import { useCategorias } from "@/lib/useCategorias";
import CategoriaFiltro from "./CategoriaFiltro";
import ProductoCard from "./ProductoCard";
import styles from "./Catalogo.module.css";

export default function Catalogo() {
  const { productos, loading: loadingProductos } = useProductos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  if (loadingProductos || loadingCategorias) {
    return <p>Cargando catálogo…</p>;
  }

  const categoriasActivas = categorias.filter((c) => c.activa);
  const productosActivos = productos.filter((p) => p.activo);
  const productosFiltrados = categoriaActiva
    ? productosActivos.filter((p) => p.categoriaId === categoriaActiva)
    : productosActivos;

  return (
    <div>
      <CategoriaFiltro categorias={categoriasActivas} activa={categoriaActiva} onChange={setCategoriaActiva} />
      {productosFiltrados.length === 0 ? (
        <p className={styles.empty}>No hay productos en esta categoría por ahora.</p>
      ) : (
        <div className={styles.grid}>
          {productosFiltrados.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Replace `app/(site)/tienda/page.jsx`**

```jsx
import Catalogo from "@/components/tienda/Catalogo";

export const metadata = {
  title: "Tienda",
  description: "Elegí tus viandas ALMA: individuales o en packs, listas para el freezer.",
};

export default function TiendaPage() {
  return (
    <div className="section">
      <div className="container">
        <p className="sectionLabel">Tienda</p>
        <h1 style={{ marginBottom: "2rem" }}>Nuestras viandas</h1>
        <Catalogo />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Delete the now-unused placeholder stylesheet**

Run: `rm "app/(site)/tienda/Tienda.module.css"`

- [ ] **Step 9: Verify manually**

Run `npm run build` (confirms no dangling import of the deleted `Tienda.module.css`), then `npm run dev`. Visit `/tienda` — confirm the 5 seeded products render as cards with images, the category tabs filter correctly, and clicking a card navigates to `/tienda/producto?id=...` (will 404 until Task 13 — expected).

- [ ] **Step 10: Commit**

```bash
git add components/tienda/ProductoCard.jsx components/tienda/ProductoCard.module.css components/tienda/CategoriaFiltro.jsx components/tienda/CategoriaFiltro.module.css components/tienda/Catalogo.jsx components/tienda/Catalogo.module.css "app/(site)/tienda/page.jsx"
git rm "app/(site)/tienda/Tienda.module.css"
git commit -m "feat: replace tienda placeholder with real catalog (products, categories, filtering)"
```

---

## Task 13: Producto detail page

**Files:**
- Create: `components/tienda/GaleriaFotos.jsx`
- Create: `components/tienda/GaleriaFotos.module.css`
- Create: `components/tienda/TablaNutricional.jsx`
- Create: `components/tienda/TablaNutricional.module.css`
- Create: `components/tienda/ProductoDetalle.jsx`
- Create: `components/tienda/ProductoDetalle.module.css`
- Create: `app/(site)/tienda/producto/page.jsx`

**Interfaces:**
- Consumes: `useProductos` (Task 6), `useCart` (Task 2).
- Produces: `<GaleriaFotos imagenUrls />`, `<TablaNutricional datos />`, `<ProductoDetalle />` reading `?id=` — rendered at `/tienda/producto`.

- [ ] **Step 1: Write `components/tienda/GaleriaFotos.module.css`**

```css
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.principal {
  aspect-ratio: 4 / 3;
  border-radius: var(--radius);
  overflow: hidden;
}

.principalImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.miniaturas {
  display: flex;
  gap: var(--space-xs);
}

.miniatura {
  width: 64px;
  height: 64px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.miniaturaActiva {
  border-color: var(--color-verde-principal);
}

.miniaturaImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 2: Write `components/tienda/GaleriaFotos.jsx`**

```jsx
"use client";

import { useState } from "react";
import ImagePlaceholder from "@/components/site/ImagePlaceholder";
import styles from "./GaleriaFotos.module.css";

export default function GaleriaFotos({ imagenUrls = [], nombre }) {
  const [activa, setActiva] = useState(0);

  if (imagenUrls.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.principal}>
          <ImagePlaceholder className={styles.principalImg} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.principal}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagenUrls[activa]} alt={nombre} className={styles.principalImg} />
      </div>
      {imagenUrls.length > 1 && (
        <div className={styles.miniaturas}>
          {imagenUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              className={`${styles.miniatura} ${index === activa ? styles.miniaturaActiva : ""}`}
              onClick={() => setActiva(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={styles.miniaturaImg} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `components/tienda/TablaNutricional.module.css`**

```css
.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--space-sm);
}

.table th,
.table td {
  text-align: left;
  padding: 0.5rem 0.8rem;
  border-bottom: 1px solid var(--color-beige);
}

.table th {
  color: var(--color-verde-principal);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 4: Write `components/tienda/TablaNutricional.jsx`**

```jsx
import styles from "./TablaNutricional.module.css";

export default function TablaNutricional({ datos }) {
  if (!datos) return null;

  const filas = [
    { label: "Calorías", valor: datos.calorias, unidad: "kcal" },
    { label: "Proteínas", valor: datos.proteinas, unidad: "g" },
    { label: "Carbohidratos", valor: datos.carbohidratos, unidad: "g" },
    { label: "Grasas", valor: datos.grasas, unidad: "g" },
  ].filter((fila) => fila.valor !== "" && fila.valor != null);

  if (filas.length === 0) return null;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th colSpan={2}>Tabla nutricional (por porción)</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.label}>
            <td>{fila.label}</td>
            <td>
              {fila.valor} {fila.unidad}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Write `components/tienda/ProductoDetalle.module.css`**

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

@media (min-width: 860px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

.precio {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-verde-principal);
  margin: var(--space-sm) 0;
}

.descripcion {
  margin-bottom: var(--space-md);
}

.cantidadRow {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.cantidadRow input {
  width: 70px;
  padding: 0.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.agregar {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.9rem 1.8rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
}

.agregar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sinStock {
  color: #b3452f;
  font-weight: 600;
  margin-bottom: var(--space-md);
}

.confirmacion {
  color: var(--color-verde-oliva);
  font-weight: 600;
  margin-top: var(--space-sm);
}

.notFound {
  text-align: center;
  padding: var(--space-xl) 0;
}
```

- [ ] **Step 6: Write `components/tienda/ProductoDetalle.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProductos } from "@/lib/useProductos";
import { useCart } from "@/lib/CartProvider";
import GaleriaFotos from "./GaleriaFotos";
import TablaNutricional from "./TablaNutricional";
import styles from "./ProductoDetalle.module.css";

export default function ProductoDetalle() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { productos, loading } = useProductos();
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
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

  const handleAgregar = () => {
    addToCart(producto, Math.min(cantidad, producto.stock));
    setAgregado(true);
  };

  return (
    <div className="section">
      <div className="container">
        <div className={styles.grid}>
          <GaleriaFotos imagenUrls={producto.imagenUrls} nombre={producto.nombre} />
          <div>
            <p className="sectionLabel">{producto.tipo === "pack" ? "Pack" : "Individual"}</p>
            <h1>{producto.nombre}</h1>
            <p className={styles.precio}>${producto.precio}</p>
            <p className={styles.descripcion}>{producto.descripcion}</p>

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

            <button type="button" className={styles.agregar} onClick={handleAgregar} disabled={sinStock}>
              Agregar al carrito
            </button>

            {agregado && <p className={styles.confirmacion}>Agregado al carrito ✓</p>}

            <TablaNutricional datos={producto.tablaNutricional} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write `app/(site)/tienda/producto/page.jsx`**

```jsx
import { Suspense } from "react";
import ProductoDetalle from "@/components/tienda/ProductoDetalle";

export const metadata = {
  title: "Producto",
};

export default function ProductoPage() {
  return (
    <Suspense fallback={<p style={{ padding: "4rem 0", textAlign: "center" }}>Cargando…</p>}>
      <ProductoDetalle />
    </Suspense>
  );
}
```

`useSearchParams()` requires a `<Suspense>` boundary in the App Router even for a static export — without it, `next build` fails with a build-time error.

- [ ] **Step 8: Verify manually**

Run `npm run build` (this is the step that actually catches a missing `Suspense` boundary — must succeed). Run `npm run dev`, go to `/tienda`, click a product card, confirm the detail page shows the gallery, price, description, nutrition table, and quantity selector capped at available stock. Add to cart, confirm "Agregado al carrito ✓" appears and the header's `CartIcon` badge count increases. Visit `/tienda/producto?id=doesnotexist` and confirm the "Producto no encontrado" state.

- [ ] **Step 9: Commit**

```bash
git add components/tienda/GaleriaFotos.jsx components/tienda/GaleriaFotos.module.css components/tienda/TablaNutricional.jsx components/tienda/TablaNutricional.module.css components/tienda/ProductoDetalle.jsx components/tienda/ProductoDetalle.module.css "app/(site)/tienda/producto/page.jsx"
git commit -m "feat: add product detail page (gallery, nutrition table, add to cart)"
```

---

## Task 14: Carrito page

**Files:**
- Create: `components/tienda/CarritoItem.jsx`
- Create: `components/tienda/CarritoItem.module.css`
- Create: `components/tienda/CarritoView.jsx`
- Create: `components/tienda/CarritoView.module.css`
- Create: `app/(site)/tienda/carrito/page.jsx`

**Interfaces:**
- Consumes: `useCart` (Task 2), `useZonasEnvio` (Task 6), `calculateTotal` (Task 4).
- Produces: `<CarritoView />`, rendered at `/tienda/carrito`.

- [ ] **Step 1: Write `components/tienda/CarritoItem.module.css`**

```css
.row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-beige);
}

.nombre {
  font-weight: 600;
}

.cantidad {
  width: 60px;
  padding: 0.4rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.quitar {
  background: transparent;
  border: 1px solid #b3452f;
  color: #b3452f;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  cursor: pointer;
}
```

- [ ] **Step 2: Write `components/tienda/CarritoItem.jsx`**

```jsx
"use client";

import { useCart } from "@/lib/CartProvider";
import styles from "./CarritoItem.module.css";

export default function CarritoItem({ item }) {
  const { updateCartQuantity, removeFromCart } = useCart();

  return (
    <div className={styles.row}>
      <span className={styles.nombre}>{item.nombre}</span>
      <span>${item.precio}</span>
      <input
        type="number"
        min={1}
        value={item.cantidad}
        onChange={(e) => updateCartQuantity(item.productoId, Number(e.target.value) || 1)}
        className={styles.cantidad}
      />
      <button type="button" className={styles.quitar} onClick={() => removeFromCart(item.productoId)}>
        Quitar
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/tienda/CarritoView.module.css`**

```css
.empty {
  text-align: center;
  padding: var(--space-xl) 0;
}

.zona {
  margin: var(--space-md) 0;
  max-width: 320px;
}

.zona label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.zona select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.totales {
  max-width: 320px;
  margin-left: auto;
  margin-top: var(--space-md);
}

.totalRow {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
}

.totalFinal {
  font-weight: 700;
  font-size: 1.1rem;
  border-top: 1px solid var(--color-beige);
  padding-top: 0.5rem;
  margin-top: 0.3rem;
}

.continuar {
  display: block;
  text-align: center;
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.9rem;
  border-radius: var(--radius);
  font-weight: 700;
  margin-top: var(--space-md);
}
```

- [ ] **Step 4: Write `components/tienda/CarritoView.jsx`**

```jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { calculateTotal } from "@/lib/checkout";
import CarritoItem from "./CarritoItem";
import styles from "./CarritoView.module.css";

export default function CarritoView() {
  const { cart, subtotal } = useCart();
  const { zonasEnvio, loading } = useZonasEnvio();
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

  return (
    <div>
      {cart.map((item) => (
        <CarritoItem key={item.productoId} item={item} />
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

      <Link href={`/tienda/checkout?zona=${zonaId}`} className={styles.continuar}>
        Continuar al checkout
      </Link>
    </div>
  );
}
```

The chosen `zonaId` is passed to checkout via query string (`?zona=`) — same static-export-friendly pattern as the product detail page, avoiding the need for shared client state beyond the cart itself.

- [ ] **Step 5: Write `app/(site)/tienda/carrito/page.jsx`**

```jsx
import CarritoView from "@/components/tienda/CarritoView";

export const metadata = {
  title: "Carrito",
};

export default function CarritoPage() {
  return (
    <div className="section">
      <div className="container">
        <p className="sectionLabel">Carrito</p>
        <h1 style={{ marginBottom: "2rem" }}>Tu pedido</h1>
        <CarritoView />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify manually**

With at least one item in the cart (from Task 13's verification), visit `/tienda/carrito`. Confirm items list correctly, quantity updates recalculate the subtotal, "Quitar" removes an item, the zona selector changes the envío/total figures, and an empty cart (remove everything) shows the empty state.

- [ ] **Step 7: Commit**

```bash
git add components/tienda/CarritoItem.jsx components/tienda/CarritoItem.module.css components/tienda/CarritoView.jsx components/tienda/CarritoView.module.css "app/(site)/tienda/carrito/page.jsx"
git commit -m "feat: add carrito page with zone selection and totals"
```

---

## Task 15: Checkout page

**Files:**
- Create: `components/tienda/CheckoutForm.jsx`
- Create: `components/tienda/CheckoutForm.module.css`
- Create: `app/(site)/tienda/checkout/page.jsx`

**Interfaces:**
- Consumes: `useCart` (Task 2), `useZonasEnvio` (Task 6), `validateCheckoutForm` (Task 4), `submitOrder` (Task 5).
- Produces: `<CheckoutForm />`, rendered at `/tienda/checkout`.

- [ ] **Step 1: Write `components/tienda/CheckoutForm.module.css`**

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

@media (min-width: 860px) {
  .grid {
    grid-template-columns: 1.3fr 1fr;
  }
}

.field {
  margin-bottom: var(--space-sm);
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.field input,
.field select {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.error {
  color: #b3452f;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.metodoPago {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.resumen {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
  align-self: start;
}

.resumenRow {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
}

.resumenTotal {
  font-weight: 700;
  font-size: 1.1rem;
  border-top: 1px solid var(--color-beige);
  padding-top: 0.5rem;
  margin-top: 0.3rem;
}

.confirmar {
  width: 100%;
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.9rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
  margin-top: var(--space-sm);
}

.confirmar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.formError {
  color: #b3452f;
  margin-top: var(--space-sm);
}

.confirmacion {
  text-align: center;
  padding: var(--space-xl) 0;
}

.numeroPedido {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--color-verde-principal);
  margin: var(--space-sm) 0;
}
```

- [ ] **Step 2: Write `components/tienda/CheckoutForm.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { validateCheckoutForm } from "@/lib/checkout";
import { calculateTotal } from "@/lib/checkout";
import { submitOrder } from "@/lib/submitOrder";
import styles from "./CheckoutForm.module.css";

const INITIAL_CLIENTE = { nombre: "", telefono: "", email: "", direccion: "" };

export default function CheckoutForm() {
  const searchParams = useSearchParams();
  const zonaFromCart = searchParams.get("zona") || "";
  const { cart, subtotal, clearCart } = useCart();
  const { zonasEnvio } = useZonasEnvio();

  const [cliente, setCliente] = useState(INITIAL_CLIENTE);
  const [zonaEnvioId, setZonaEnvioId] = useState(zonaFromCart);
  const [metodoPago, setMetodoPago] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [pedidoId, setPedidoId] = useState(null);

  const zonasActivas = zonasEnvio.filter((z) => z.activa);
  const zonaSeleccionada = zonasActivas.find((z) => z.id === zonaEnvioId);
  const costoEnvio = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const total = calculateTotal(subtotal, costoEnvio);

  const handleChange = (field) => (event) => {
    setCliente((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = { ...cliente, zonaEnvioId, metodoPago };
    const { valid, errors: validationErrors } = validateCheckoutForm(data);
    setErrors(validationErrors);
    if (!valid) return;

    setStatus("submitting");
    setErrorMessage("");
    try {
      const id = await submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago });
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
            <label>
              <input
                type="radio"
                name="metodoPago"
                value="transferencia"
                checked={metodoPago === "transferencia"}
                onChange={(e) => setMetodoPago(e.target.value)}
              />{" "}
              Transferencia
            </label>
            <label>
              <input
                type="radio"
                name="metodoPago"
                value="tarjeta"
                checked={metodoPago === "tarjeta"}
                onChange={(e) => setMetodoPago(e.target.value)}
              />{" "}
              Tarjeta
            </label>
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

- [ ] **Step 3: Write `app/(site)/tienda/checkout/page.jsx`**

```jsx
import { Suspense } from "react";
import CheckoutForm from "@/components/tienda/CheckoutForm";

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="section">
      <div className="container">
        <Suspense fallback={<p style={{ textAlign: "center" }}>Cargando…</p>}>
          <CheckoutForm />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify manually — full end-to-end purchase**

Run `npm run build` (catches missing `Suspense` boundary issues). Run `npm run dev`. With items in the cart:
1. Go to `/tienda/carrito` → "Continuar al checkout".
2. Submit the form empty — confirm all validation errors show.
3. Fill it in with valid data, choose a método de pago, confirm.
4. Confirm the success screen shows a pedido number and the cart is now empty (check `CartIcon` badge disappears).
5. In `/admin/productos`, confirm the stock of the purchased product(s) decreased by the purchased quantity.
6. In Firebase Console (or once Task 16 lands, `/admin/pedidos`), confirm the `alma_pedidos` document exists with the right items/totals/estado `pendiente`.
7. Repeat a purchase requesting more units than available stock (edit a product's stock down to 1 in `/admin/productos` first) — confirm the "Se acabó el stock de..." error shows and no order/stock change happens.

- [ ] **Step 5: Commit**

```bash
git add components/tienda/CheckoutForm.jsx components/tienda/CheckoutForm.module.css "app/(site)/tienda/checkout/page.jsx"
git commit -m "feat: add checkout page — validates, runs the stock transaction, shows confirmation"
```

---

## Task 16: Admin Pedidos manager

**Files:**
- Create: `components/admin/PedidosManager.jsx`
- Create: `components/admin/PedidosManager.module.css`
- Create: `app/admin/pedidos/page.jsx`

**Interfaces:**
- Consumes: `updateDocById` (Task 6), reads `alma_pedidos` directly via `onSnapshot` (not via a shared hook — this is the only place pedidos are listed, so a dedicated hook isn't justified yet).
- Produces: `<PedidosManager />`, `/admin/pedidos`.

- [ ] **Step 1: Write `components/admin/PedidosManager.module.css`**

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
  vertical-align: top;
}

.row {
  cursor: pointer;
}

.row:hover {
  background: var(--color-crema);
}

.detalle {
  background: var(--color-crema);
  padding: var(--space-md);
}

.detalle p {
  margin-bottom: 0.4rem;
}

.estadoSelect {
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--color-beige);
}
```

- [ ] **Step 2: Write `components/admin/PedidosManager.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateDocById } from "@/lib/adminCrud";
import styles from "./PedidosManager.module.css";

const ESTADOS = ["pendiente", "confirmado", "en_preparacion", "entregado", "cancelado"];

export default function PedidosManager() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

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

  const handleEstadoChange = (pedido, estado) => {
    updateDocById("alma_pedidos", pedido.id, { estado });
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Pedidos</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <>
              <tr key={pedido.id} className={styles.row} onClick={() => setExpandedId(expandedId === pedido.id ? null : pedido.id)}>
                <td>{pedido.id.slice(0, 8).toUpperCase()}</td>
                <td>{pedido.cliente?.nombre}</td>
                <td>${pedido.total}</td>
                <td>
                  <span className={styles.badge}>{pedido.estado}</span>
                </td>
              </tr>
              {expandedId === pedido.id && (
                <tr>
                  <td colSpan={4} className={styles.detalle}>
                    <p>
                      <strong>Contacto:</strong> {pedido.cliente?.telefono} — {pedido.cliente?.email}
                    </p>
                    <p>
                      <strong>Dirección:</strong> {pedido.cliente?.direccion}
                    </p>
                    <p>
                      <strong>Método de pago:</strong> {pedido.metodoPagoElegido}
                    </p>
                    <p>
                      <strong>Ítems:</strong>{" "}
                      {pedido.items?.map((item) => `${item.cantidad}× ${item.nombre}`).join(", ")}
                    </p>
                    <p>
                      <strong>Subtotal:</strong> ${pedido.subtotal} — <strong>Envío:</strong> ${pedido.costoEnvio}
                    </p>
                    <label htmlFor={`estado-${pedido.id}`}>
                      <strong>Cambiar estado:</strong>
                    </label>
                    <select
                      id={`estado-${pedido.id}`}
                      className={styles.estadoSelect}
                      value={pedido.estado}
                      onChange={(e) => handleEstadoChange(pedido, e.target.value)}
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Write `app/admin/pedidos/page.jsx`**

```jsx
"use client";

import PedidosManager from "@/components/admin/PedidosManager";

export default function PedidosPage() {
  return <PedidosManager />;
}
```

- [ ] **Step 4: Verify manually**

At `/admin/pedidos`, confirm the order(s) created during Task 15's verification appear, most recent first. Click a row to expand its detail (contacto, dirección, ítems, totales). Change its estado via the dropdown, confirm it persists (collapse and re-expand, or reload).

- [ ] **Step 5: Commit**

```bash
git add components/admin/PedidosManager.jsx components/admin/PedidosManager.module.css "app/admin/pedidos/page.jsx"
git commit -m "feat: add admin Pedidos manager (list, detail, status change)"
```

---

## Task 17: Security rules updates

**Files:**
- Modify: `firestore.rules`
- Modify: `storage.rules`

**Interfaces:**
- No code interfaces — local-only rules files, same caution as sub-project 1 (never auto-deployed, shared Firebase project).

- [ ] **Step 1: Update `firestore.rules`**

Read the current file, then replace its contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/alma_admins/$(request.auth.uid));
    }

    match /alma_site_content/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /alma_admins/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/alma_admins/$(request.auth.uid)).data.role == 'superadmin';
    }

    match /alma_leads_empresas/{document} {
      allow create: if true;
      allow read: if isAdmin();
      allow update, delete: if false;
    }

    match /alma_categorias/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /alma_zonas_envio/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /alma_productos/{document} {
      allow read: if true;
      allow create, delete: if isAdmin();
      allow update: if isAdmin() || isValidStockDecrement();

      function isValidStockDecrement() {
        return request.resource.data.diff(resource.data).affectedKeys().hasOnly(['stock'])
          && request.resource.data.stock < resource.data.stock
          && request.resource.data.stock >= 0;
      }
    }

    match /alma_pedidos/{document} {
      allow create: if true;
      allow read, update: if isAdmin();
      allow delete: if false;
    }
  }
}
```

The `isAdmin()` helper is now shared across rules (previously duplicated inline) — a small cleanup while touching this file. `alma_productos` update is the interesting one: an admin can change anything, but a public unauthenticated client (the checkout transaction) can only ever decrement `stock`, never touch any other field or increase it — enforced at the rules level, not just trusted client-side.

- [ ] **Step 2: Update `storage.rules`**

Read the current file, then replace its contents with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /alma/site/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    match /alma/productos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

- [ ] **Step 3: Update `SETUP.md`** to mention the new collections in the rules-merging reminder

Read the current file, then in the "Reglas de seguridad" section, change the first paragraph's reference from "las reglas actuales que ya están en producción" — no wording change needed, but add one line right after step 3 of that section:

```markdown
Este archivo ya incluye las reglas de `alma_categorias`, `alma_productos`, `alma_zonas_envio` y `alma_pedidos` del ecommerce, además de las del sub-proyecto 1 (`alma_site_content`, `alma_admins`, `alma_leads_empresas`) — son todas locales hasta que se fusionen y publiquen a mano.
```

- [ ] **Step 4: Commit**

```bash
git add firestore.rules storage.rules SETUP.md
git commit -m "docs: extend Firestore/Storage rules for ecommerce collections (local only)"
```

---

## Task 18: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests from sub-project 1 (19) plus this plan's new tests (Task 1: 8, Task 4: 9) = 36 tests green.

- [ ] **Step 2: Run a clean production build**

Run: `rm -rf .next out && npm run build`
Expected: succeeds. If it fails with `EBUSY` (a transient Dropbox file lock seen during sub-project 1's builds too), wait a few seconds and retry.

- [ ] **Step 3: Verify the export structure**

Run: `find out -name "index.html" | sort`
Expected: includes `out/tienda/index.html`, `out/tienda/producto/index.html`, `out/tienda/carrito/index.html`, `out/tienda/checkout/index.html`, `out/admin/productos/index.html`, `out/admin/categorias/index.html`, `out/admin/zonas-envio/index.html`, `out/admin/pedidos/index.html`, alongside everything from sub-project 1.

- [ ] **Step 4: Manual QA pass**

Run `npm run dev` and walk through:
- Full purchase flow again from a clean cart (catálogo → detalle → carrito → checkout → confirmación → stock decremented → pedido visible in `/admin/pedidos`).
- Editing a producto's price/stock/photos from `/admin/productos` reflects on `/tienda` and the product detail page without a rebuild.
- Adding a new categoría from `/admin/categorias` appears as a filter tab on `/tienda` without a rebuild.
- Adding a new zona from `/admin/zonas-envio` appears as a shipping option in `/tienda/carrito` and `/tienda/checkout` without a rebuild.

- [ ] **Step 5: Commit if any fixes were needed during QA**

If Step 4 surfaces bugs, fix them and commit normally; otherwise this task produces no commit.

- [ ] **Step 6: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** catálogo/detalle/carrito/checkout (spec's "Sitio público" section) map to Tasks 12–15; the four new admin sections map to Tasks 7–9 and 16; the data model maps to the collections touched throughout; the single-transaction stock decrement is Task 5; the `?id=` product routing decision is Task 13; error handling (sin stock, ítems inválidos, falla de red, transacción fallida) is covered in Tasks 13 (stock cap on quantity selector) and 15 (checkout error states); security rules are Task 17; testing scope (cart/checkout pure logic unit-tested, rest manual) matches Tasks 1, 4, 18.
- **Placeholder scan:** no TBD/TODO; all steps carry complete code.
- **Type consistency:** cart item shape `{ productoId, nombre, precio, cantidad }` is identical across `lib/cart.js`, `CartProvider`, `CarritoItem`, `submitOrder`, and the `alma_pedidos.items` schema in the spec. Producto shape (`nombre, descripcion, precio, categoriaId, tipo, stock, imagenUrls, tablaNutricional, activo`) is identical across `ProductoForm`, `useProductos`, `ProductoCard`, `ProductoDetalle`, and the seed script.
- **Known simplification flagged inline:** `ProductoForm`'s Storage path uses the product name rather than its ID for new products (Task 9) — acceptable for this iteration, noted in that task rather than silently glossed over.
