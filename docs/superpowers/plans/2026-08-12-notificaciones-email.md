# Notificaciones por email al confirmar pedido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a customer confirms a checkout order, assign it a correlative order number and email a confirmation to the customer (with the store owner CC'd via the EmailJS template config), without blocking or breaking the existing checkout flow if the email fails.

**Architecture:** A new `alma_contadores/pedidos` counter doc is read and incremented inside the existing Firestore transaction in `lib/submitOrder.js`, producing an atomic, race-safe `numeroPedido`. `CheckoutForm.jsx` calls the client-side `@emailjs/browser` SDK (via a new `lib/emailNotifications.js` module) right after the order is confirmed — email failures are caught and logged, never surfaced to the customer or rolled back.

**Tech Stack:** Next.js 14 (static export, client components only — no API routes), Firebase Firestore (client SDK, transactions), `@emailjs/browser`, Vitest.

## Global Constraints

- Site is a **static export** deployed to Hostinger — no server/API routes available. All new logic must run client-side.
- **No separate dev/staging Firebase project** — `npm run dev` reads/writes the same live Firestore used by real customers. Never submit a real checkout order as part of automated/agentic verification; that step is reserved for the human owner (see Task 6).
- `firestore.rules` is a **local source-of-truth file only** — it is never auto-deployed. After committing a rules change, the project owner must manually copy it into the Firebase console (or run `firebase deploy --only firestore:rules` themselves).
- Follow existing code conventions exactly: pure/testable logic in `lib/*.js` with matching `lib/*.test.js` Vitest files; Firestore-dependent code (transactions, `onSnapshot`) is not unit-tested in this codebase, consistent with `lib/submitOrder.js` and `components/admin/PedidosManager.jsx` today.
- Env vars for client-exposed config use the `NEXT_PUBLIC_` prefix (see `.env.example`).

---

### Task 1: Firestore rules for `alma_contadores`

**Files:**
- Modify: `firestore.rules`

**Interfaces:** none (rules only — no code depends on this file directly).

- [ ] **Step 1: Add the rule block**

Open `firestore.rules` and add a new `match` block right after the existing `match /alma_pedidos/{document} { ... }` block (before the final closing braces):

```
    match /alma_contadores/{document} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['ultimoNumero'])
        && request.resource.data.ultimoNumero == 1;
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['ultimoNumero'])
        && request.resource.data.ultimoNumero == resource.data.ultimoNumero + 1;
      allow delete: if false;
    }
```

This mirrors the existing `isValidStockDecrement()` pattern on `alma_productos`: anonymous checkout can create the counter doc only with `ultimoNumero: 1` (the very first order ever) or increment it by exactly 1 — it can never be set to an arbitrary value, skipped, or decremented.

- [ ] **Step 2: Do not deploy**

This file is local-only in this project (confirmed pattern from prior Firestore rules changes). Do not run any `firebase deploy` command. The project owner deploys it manually after reviewing.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "chore: Firestore rules for alma_contadores (local only, manual deploy)"
```

---

### Task 2: Order counter in `lib/submitOrder.js`

**Files:**
- Modify: `lib/submitOrder.js`

**Interfaces:**
- Consumes: nothing new (same `calculateSubtotal`, `calculateTotal`, `calculateDiscount`, `aggregateStockNeeds` it already uses).
- Produces: `submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje })` now returns `Promise<{ pedidoId: string, numeroPedido: number }>` — **this is a breaking change to the return shape** (was `Promise<string>`). Consumed by Task 4.

- [ ] **Step 1: Replace the file contents**

`lib/submitOrder.js` has no existing unit test (it's Firestore-transaction-dependent, same as the rest of this file historically) — write the full replacement directly:

```js
import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { calculateSubtotal } from "./cart";
import { calculateTotal, calculateDiscount } from "./checkout";
import { aggregateStockNeeds } from "./aggregateStock";

export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0 }) {
  const pedidoRef = doc(collection(db, "alma_pedidos"));
  const contadorRef = doc(db, "alma_contadores", "pedidos");
  const needs = aggregateStockNeeds(cart);
  let numeroPedido;

  await runTransaction(db, async (transaction) => {
    const refs = needs.map((n) => doc(db, "alma_productos", n.productoId));
    const [snapshots, contadorSnap] = await Promise.all([
      Promise.all(refs.map((ref) => transaction.get(ref))),
      transaction.get(contadorRef),
    ]);

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

    numeroPedido = contadorSnap.exists() ? contadorSnap.data().ultimoNumero + 1 : 1;
    if (contadorSnap.exists()) {
      transaction.update(contadorRef, { ultimoNumero: numeroPedido });
    } else {
      transaction.set(contadorRef, { ultimoNumero: numeroPedido });
    }

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
      numeroPedido,
      createdAt: serverTimestamp(),
    });
  });

  return { pedidoId: pedidoRef.id, numeroPedido };
}
```

All `transaction.get()` calls (stock snapshots + counter snapshot) run before any `transaction.set()`/`transaction.update()` calls — required by Firestore transaction rules (reads must precede writes).

- [ ] **Step 2: Sanity-check with the existing test suite**

Run: `npx vitest run`
Expected: PASS, same count as before this change (this file has no dedicated test, so the count shouldn't change) — confirms the edit didn't break an import elsewhere.

- [ ] **Step 3: Commit**

```bash
git add lib/submitOrder.js
git commit -m "feat: assign a correlative numeroPedido inside the order transaction"
```

---

### Task 3: Email notification module

**Files:**
- Create: `lib/emailNotifications.js`
- Test: `lib/emailNotifications.test.js`
- Modify: `.env.example`
- Modify: `package.json` (via `npm install`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `buildOrderEmailParams({ cliente, items, subtotal, descuentoMonto, descuentoPorcentaje, costoEnvio, total, metodoPagoElegido, numeroPedido }) → object` (pure) and `sendOrderConfirmationEmail(params) → Promise` (side-effecting). Both consumed by Task 4.

- [ ] **Step 1: Install the EmailJS SDK**

Run: `npm install @emailjs/browser`
Expected: adds `@emailjs/browser` to `package.json` dependencies.

- [ ] **Step 2: Write the failing test**

Create `lib/emailNotifications.test.js`:

```js
import { describe, it, expect } from "vitest";
import { buildOrderEmailParams } from "./emailNotifications";

const baseArgs = {
  cliente: { nombre: "Ana Pérez", email: "ana@test.com", telefono: "1122334455", direccion: "Calle Falsa 123" },
  items: [{ productoId: "p1", nombre: "Vianda pollo", precio: 2000, cantidad: 2, guarniciones: [] }],
  subtotal: 4000,
  descuentoMonto: 0,
  descuentoPorcentaje: 0,
  costoEnvio: 500,
  total: 4500,
  metodoPagoElegido: "Efectivo",
  numeroPedido: 1,
};

describe("buildOrderEmailParams", () => {
  it("maps basic order fields to template variable names", () => {
    const params = buildOrderEmailParams(baseArgs);
    expect(params.numero_pedido).toBe(1);
    expect(params.cliente_nombre).toBe("Ana Pérez");
    expect(params.cliente_email).toBe("ana@test.com");
    expect(params.cliente_telefono).toBe("1122334455");
    expect(params.cliente_direccion).toBe("Calle Falsa 123");
    expect(params.total).toBe(4500);
    expect(params.metodo_pago).toBe("Efectivo");
  });

  it("formats a single item without guarniciones", () => {
    const params = buildOrderEmailParams(baseArgs);
    expect(params.items_detalle).toBe("2x Vianda pollo — $4000");
  });

  it("formats an item with guarniciones", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [{ productoId: "p1", nombre: "Vianda pollo", precio: 2000, cantidad: 1, guarniciones: ["Puré", "Ensalada"] }],
    });
    expect(params.items_detalle).toBe("1x Vianda pollo (Puré, Ensalada) — $2000");
  });

  it("joins multiple items with newlines", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      items: [
        { productoId: "p1", nombre: "Vianda pollo", precio: 2000, cantidad: 1, guarniciones: [] },
        { productoId: "p2", nombre: "Vianda veggie", precio: 1800, cantidad: 2, guarniciones: ["Arroz"] },
      ],
    });
    expect(params.items_detalle).toBe("1x Vianda pollo — $2000\n2x Vianda veggie (Arroz) — $3600");
  });

  it("passes discount and free-shipping values through as-is", () => {
    const params = buildOrderEmailParams({
      ...baseArgs,
      descuentoMonto: 400,
      descuentoPorcentaje: 10,
      costoEnvio: 0,
    });
    expect(params.descuento_monto).toBe(400);
    expect(params.descuento_porcentaje).toBe(10);
    expect(params.costo_envio).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: FAIL with something like "Failed to resolve import ./emailNotifications" (file doesn't exist yet).

- [ ] **Step 4: Write `lib/emailNotifications.js`**

```js
import emailjs from "@emailjs/browser";

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
  const itemsDetalle = items
    .map((item) => {
      const guarniciones = (item.guarniciones || []).length ? ` (${item.guarniciones.join(", ")})` : "";
      return `${item.cantidad}x ${item.nombre}${guarniciones} — $${item.precio * item.cantidad}`;
    })
    .join("\n");

  return {
    numero_pedido: numeroPedido,
    cliente_nombre: cliente.nombre,
    cliente_email: cliente.email,
    cliente_telefono: cliente.telefono,
    cliente_direccion: cliente.direccion,
    items_detalle: itemsDetalle,
    subtotal,
    descuento_monto: descuentoMonto,
    descuento_porcentaje: descuentoPorcentaje,
    costo_envio: costoEnvio,
    total,
    metodo_pago: metodoPagoElegido,
  };
}

export async function sendOrderConfirmationEmail(params) {
  return emailjs.send(
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
    params,
    { publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY }
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/emailNotifications.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 6: Add the EmailJS env vars to `.env.example`**

Append to `.env.example`:

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```

- [ ] **Step 7: Add the same three vars to your local `.env.local`**

Fill in the real values from your EmailJS dashboard (Service ID, Template ID, Public Key) in the untracked `.env.local` file — needed for Task 6's manual verification.

- [ ] **Step 8: Commit**

```bash
git add lib/emailNotifications.js lib/emailNotifications.test.js .env.example package.json package-lock.json
git commit -m "feat: add EmailJS order-confirmation email module"
```

---

### Task 4: Wire order number + email into `CheckoutForm.jsx`

**Files:**
- Modify: `components/tienda/CheckoutForm.jsx`

**Interfaces:**
- Consumes: `submitOrder(...) → Promise<{ pedidoId, numeroPedido }>` (Task 2), `buildOrderEmailParams(...)` / `sendOrderConfirmationEmail(...)` (Task 3).
- Produces: nothing consumed by other tasks — this is the top of the call chain for checkout.

- [ ] **Step 1: Add the import**

In `components/tienda/CheckoutForm.jsx`, add to the imports at the top:

```js
import { buildOrderEmailParams, sendOrderConfirmationEmail } from "@/lib/emailNotifications";
```

- [ ] **Step 2: Add `numeroPedido` state**

Next to the existing `const [pedidoId, setPedidoId] = useState(null);` (line 32), add:

```js
const [numeroPedido, setNumeroPedido] = useState(null);
```

- [ ] **Step 3: Update `handleSubmit` to consume the new return shape and trigger the email**

Replace the current success branch of the `try` block (lines 65–76):

```js
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
      });
      setPedidoId(id);
      setNumeroPedido(numero);
      setStatus("success");
      clearCart();

      try {
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
        await sendOrderConfirmationEmail(emailParams);
      } catch (emailErr) {
        console.error("No se pudo enviar el mail de confirmación:", emailErr);
      }
```

The email `try/catch` is nested *inside* the outer `try`, after the order is already confirmed (`setStatus("success")` already ran) — an email failure falls into this inner `catch`, not the outer one, so it can never flip the UI into the error state or affect the already-confirmed order.

- [ ] **Step 4: Show the real order number in the confirmation screen**

Replace line 92:

```jsx
        <p className={styles.numeroPedido}>#{pedidoId.slice(0, 8).toUpperCase()}</p>
```

with:

```jsx
        <p className={styles.numeroPedido}>#{numeroPedido}</p>
```

- [ ] **Step 5: Run the existing test suite**

Run: `npx vitest run`
Expected: PASS (this component has no dedicated test file; this confirms no import elsewhere broke).

- [ ] **Step 6: Commit**

```bash
git add components/tienda/CheckoutForm.jsx
git commit -m "feat: show order number and send confirmation email on checkout"
```

---

### Task 5: Admin — order number column and search

**Files:**
- Modify: `components/admin/PedidosManager.jsx`

**Interfaces:**
- Consumes: `pedido.numeroPedido` field (written by Task 2, read via the existing `onSnapshot` in this file — no code-level interface, just a Firestore field).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add the shared styles import and search state**

At the top of `components/admin/PedidosManager.jsx`, add:

```js
import shared from "./adminShared.module.css";
```

Inside the component, next to `const [expandedId, setExpandedId] = useState(null);` (line 15), add:

```js
const [busqueda, setBusqueda] = useState("");
```

- [ ] **Step 2: Compute the filtered list**

Right after the `handleEstadoChange` function (after line 35), add:

```js
const pedidosFiltrados = busqueda.trim()
  ? pedidos.filter((pedido) => String(pedido.numeroPedido ?? "").includes(busqueda.trim()))
  : pedidos;
```

- [ ] **Step 3: Render the search input**

Right after the `<h1>` (line 41), add:

```jsx
      <div className={shared.field} style={{ marginBottom: "1rem", maxWidth: "240px" }}>
        <label htmlFor="busquedaPedido">Buscar por número de pedido</label>
        <input
          id="busquedaPedido"
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Ej: 12"
        />
      </div>
```

- [ ] **Step 4: Map over the filtered list and show the real order number**

Change line 53 from `{pedidos.map((pedido) => (` to `{pedidosFiltrados.map((pedido) => (`.

Change line 56 from:

```jsx
                <td>{pedido.id.slice(0, 8).toUpperCase()}</td>
```

to:

```jsx
                <td>{pedido.numeroPedido ? `#${pedido.numeroPedido}` : "—"}</td>
```

- [ ] **Step 5: Run the existing test suite**

Run: `npx vitest run`
Expected: PASS (this file has no dedicated test either; confirms no import broke).

- [ ] **Step 6: Commit**

```bash
git add components/admin/PedidosManager.jsx
git commit -m "feat: show order number and add search in admin pedidos list"
```

---

### Task 6: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS. Count = previous total + 5 new (`buildOrderEmailParams` tests from Task 3).

- [ ] **Step 2: Clean production build**

Run: `rm -rf .next out && npm run build`
Expected: succeeds, no errors about missing `@emailjs/browser` or unresolved imports.

- [ ] **Step 3: Manual QA (dev server) — stop short of a real order**

Run `npm run dev` and, without clicking the final "Confirmar pedido" button:
- Confirm `/tienda/checkout` still renders the form, cart summary and totals correctly (no console errors from the `CheckoutForm.jsx` changes).
- Confirm `/admin/pedidos` loads, shows the new "Buscar por número de pedido" input, and that existing (pre-change) pedidos show `—` in the `#` column instead of erroring.
- Type a partial number into the search box and confirm the list filters (it will show 0 matches, since no pedido has a `numeroPedido` yet — that's expected).

- [ ] **Step 4: Ask before the one unavoidable live test**

Everything above can be verified without writing to the shared production database. The *only* way to prove the counter/email flow end-to-end (a real `numeroPedido: 1`, a real email landing in an inbox) is to actually submit one real order — which creates a real document in `alma_pedidos` and a real customer-facing email send. Per this project's standing rule, do not do this automatically: stop here and ask the project owner whether they want to:
  a) place one real test order themselves now (they can mark it "cancelado" afterward in the admin), or
  b) skip it and trust the code review + unit tests, verifying informally the next time a real customer orders.

Do not proceed with an actual submission without an explicit go-ahead in the moment.

- [ ] **Step 5: Commit any QA fixes**

If Step 3 surfaces bugs, fix and commit normally; otherwise no commit.

- [ ] **Step 6: Push**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** counter doc + transaction (Task 2), rules for the counter (Task 1), email module + template variables (Task 3), checkout wiring for both number display and email send (Task 4), admin column + search (Task 5), non-blocking error handling (built into Task 4's nested try/catch), manual-test caveats given the shared Firebase env (Task 6).
- **Placeholder scan:** no TBD/TODO; every code step shows full file or full diff content.
- **Type consistency:** `submitOrder(...)` return shape (`{ pedidoId, numeroPedido }`, Task 2) matches exactly how it's destructured in Task 4. `buildOrderEmailParams(...)` parameter names (Task 3) match exactly what Task 4 passes in. `pedido.numeroPedido` field name is identical from where it's written (Task 2, Firestore doc) to where it's read (Task 5, admin list).
- **Ordering:** Task 2 and Task 3 must both complete before Task 4 (interface dependency). Task 1 has no code dependency but logically precedes Task 6's live-test discussion. Task 5 is independent of Tasks 2–4 except for reading the same `numeroPedido` field, so it could run in parallel, but is sequenced last among the code tasks for simplicity.
