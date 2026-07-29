# Envío Gratis a Partir de X Viandas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin configure a "free shipping from X viandas" threshold, and reflect it in the storefront (catalog banner, cart/checkout messaging) and in the actual shipping cost charged.

**Architecture:** Two new fields (`envioGratisActivo`, `envioGratisDesde`) on the existing single-document config `alma_config/tienda`, read through the existing `useTiendaConfig()` hook. A new pure function `resolveEnvioGratis(cart, config)` in `lib/checkout.js` (same pattern as `validateMinimoViandas`) decides eligibility; both `CarritoView.jsx` and `CheckoutForm.jsx` call it to zero out `costoEnvio` before it flows into `calculateTotal` and `submitOrder`.

**Tech Stack:** Next.js 14 (App Router, client components), Firebase v10 modular SDK (Firestore `onSnapshot`/`setDoc`), Vitest for unit tests, CSS Modules.

## Global Constraints

- Config lives in the existing doc `alma_config/tienda` (no new Firestore collection, no rules changes).
- Threshold is a single fixed number applied to the order's total vianda count (`countViandas(cart)`), not per zone/address.
- When the threshold is met, `costoEnvio` must become `0` end-to-end (cart total, checkout total, and the persisted order in `alma_pedidos`).
- Follow existing patterns exactly: single-doc config uses direct `setDoc(doc(db,"alma_config","tienda"), {...}, {merge:true})` (no `lib/adminCrud.js`); pure business logic goes in `lib/checkout.js` with matching Vitest tests in `lib/checkout.test.js`.

---

### Task 1: `resolveEnvioGratis` pure function

**Files:**
- Modify: `lib/checkout.js`
- Test: `lib/checkout.test.js`

**Interfaces:**
- Consumes: `countViandas(cart)` (already imported in `lib/checkout.js` from `./cart`).
- Produces: `resolveEnvioGratis(cart, config)` → `{ aplica: boolean, faltan: number, desde: number }`, where `config` is the object shape `{ envioGratisActivo: boolean, envioGratisDesde: number }` (same shape `useTiendaConfig()` will return after Task 2). Later tasks (3, 5, 6) call this as `resolveEnvioGratis(cart, config)` where `config` is the full object returned by `useTiendaConfig()`.

- [ ] **Step 1: Write the failing tests**

Add to `lib/checkout.test.js`, after the `validateMinimoViandas` import — update the import line first:

```js
import { calculateTotal, validateCheckoutForm, validateStockAvailability, calculateDiscount, validateMinimoViandas, resolveEnvioGratis } from "./checkout";
```

Then append this new `describe` block at the end of the file:

```js
describe("resolveEnvioGratis", () => {
  const cart = [{ productoId: "p1", cantidadViandas: 1, cantidad: 3, precio: 1000 }]; // 3 viandas

  it("does not apply when the promo is inactive", () => {
    expect(resolveEnvioGratis(cart, { envioGratisActivo: false, envioGratisDesde: 2 })).toEqual({
      aplica: false,
      faltan: 0,
      desde: 2,
    });
  });

  it("does not apply when active but the cart is below the threshold", () => {
    expect(resolveEnvioGratis(cart, { envioGratisActivo: true, envioGratisDesde: 6 })).toEqual({
      aplica: false,
      faltan: 3,
      desde: 6,
    });
  });

  it("applies when the cart exactly meets the threshold", () => {
    expect(resolveEnvioGratis(cart, { envioGratisActivo: true, envioGratisDesde: 3 })).toEqual({
      aplica: true,
      faltan: 0,
      desde: 3,
    });
  });

  it("applies when the cart exceeds the threshold", () => {
    expect(resolveEnvioGratis(cart, { envioGratisActivo: true, envioGratisDesde: 2 })).toEqual({
      aplica: true,
      faltan: 0,
      desde: 2,
    });
  });

  it("does not apply when active but the threshold is 0", () => {
    expect(resolveEnvioGratis(cart, { envioGratisActivo: true, envioGratisDesde: 0 })).toEqual({
      aplica: false,
      faltan: 0,
      desde: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/checkout.test.js`
Expected: FAIL — `resolveEnvioGratis is not a function` (or import error).

- [ ] **Step 3: Implement `resolveEnvioGratis`**

In `lib/checkout.js`, add this function after `validateMinimoViandas` (which ends at line 42):

```js
export function resolveEnvioGratis(cart, config) {
  const total = countViandas(cart);
  const activo = !!config?.envioGratisActivo;
  const desde = Number(config?.envioGratisDesde) || 0;
  const aplica = activo && desde > 0 && total >= desde;
  const faltan = activo && desde > 0 ? Math.max(0, desde - total) : 0;
  return { aplica, faltan, desde };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/checkout.test.js`
Expected: PASS — all `resolveEnvioGratis` tests plus the existing ones green.

- [ ] **Step 5: Commit**

```bash
git add lib/checkout.js lib/checkout.test.js
git commit -m "feat: add resolveEnvioGratis threshold logic"
```

---

### Task 2: Extend `useTiendaConfig` with free-shipping fields

**Files:**
- Modify: `lib/useTiendaConfig.js`

**Interfaces:**
- Consumes: nothing new (same `db`, `doc`, `onSnapshot` already imported).
- Produces: `useTiendaConfig()` now returns `{ minimoViandas: number, envioGratisActivo: boolean, envioGratisDesde: number }`. Tasks 3, 4, 5, 6 rely on `envioGratisActivo` and `envioGratisDesde` being present on this object with these exact names.

- [ ] **Step 1: Update the default config and snapshot mapping**

In `lib/useTiendaConfig.js`, replace line 7:

```js
const DEFAULT_CONFIG = { minimoViandas: 0 };
```

with:

```js
const DEFAULT_CONFIG = { minimoViandas: 0, envioGratisActivo: false, envioGratisDesde: 0 };
```

Replace line 18:

```js
        setConfig({ minimoViandas: Number(data.minimoViandas) || 0 });
```

with:

```js
        setConfig({
          minimoViandas: Number(data.minimoViandas) || 0,
          envioGratisActivo: !!data.envioGratisActivo,
          envioGratisDesde: Number(data.envioGratisDesde) || 0,
        });
```

- [ ] **Step 2: Verify no test regressions**

Run: `npm test`
Expected: PASS — no existing test imports `useTiendaConfig` directly (it's a client hook, exercised manually in later tasks/browser check), so this step just guards against unrelated breakage.

- [ ] **Step 3: Commit**

```bash
git add lib/useTiendaConfig.js
git commit -m "feat: expose envioGratisActivo/envioGratisDesde from useTiendaConfig"
```

---

### Task 3: Admin — free shipping fields in `ConfiguracionManager`

**Files:**
- Modify: `components/admin/ConfiguracionManager.jsx`

**Interfaces:**
- Consumes: `useTiendaConfig()` → `{ minimoViandas, envioGratisActivo, envioGratisDesde }` (Task 2). Firestore `doc`, `setDoc` from `firebase/firestore`, `db` from `@/lib/firebase` (already imported).
- Produces: writes `envioGratisActivo` (boolean) and `envioGratisDesde` (number) into `alma_config/tienda` alongside `minimoViandas`. No other task consumes this component directly — it's the admin entry point.

- [ ] **Step 1: Add local state and seed it from config**

In `components/admin/ConfiguracionManager.jsx`, replace line 11:

```js
  const [minimo, setMinimo] = useState("");
```

with:

```js
  const [minimo, setMinimo] = useState("");
  const [envioGratisActivo, setEnvioGratisActivo] = useState(false);
  const [envioGratisDesde, setEnvioGratisDesde] = useState("");
```

Replace the `useEffect` at lines 14-16:

```js
  useEffect(() => {
    setMinimo(String(config.minimoViandas));
  }, [config.minimoViandas]);
```

with:

```js
  useEffect(() => {
    setMinimo(String(config.minimoViandas));
    setEnvioGratisActivo(config.envioGratisActivo);
    setEnvioGratisDesde(String(config.envioGratisDesde));
  }, [config.minimoViandas, config.envioGratisActivo, config.envioGratisDesde]);
```

- [ ] **Step 2: Save the new fields**

Replace `handleSave` at lines 18-23:

```js
  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("saving");
    await setDoc(doc(db, "alma_config", "tienda"), { minimoViandas: Number(minimo) || 0 }, { merge: true });
    setStatus("saved");
  };
```

with:

```js
  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("saving");
    await setDoc(
      doc(db, "alma_config", "tienda"),
      {
        minimoViandas: Number(minimo) || 0,
        envioGratisActivo: !!envioGratisActivo,
        envioGratisDesde: Number(envioGratisDesde) || 0,
      },
      { merge: true }
    );
    setStatus("saved");
  };
```

- [ ] **Step 3: Add the form fields**

Replace the closing of the `minimo-viandas` field block and the submit button (lines 29-42):

```js
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
```

with:

```js
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
        <div className={shared.field} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label htmlFor="envio-gratis-activo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              id="envio-gratis-activo"
              type="checkbox"
              checked={envioGratisActivo}
              onChange={(e) => setEnvioGratisActivo(e.target.checked)}
            />
            Activar envío gratis
          </label>
        </div>
        <div className={shared.field}>
          <label htmlFor="envio-gratis-desde">A partir de (viandas)</label>
          <input
            id="envio-gratis-desde"
            type="number"
            min={0}
            value={envioGratisDesde}
            onChange={(e) => setEnvioGratisDesde(e.target.value)}
            disabled={!envioGratisActivo}
            style={{ width: 120 }}
          />
        </div>
        <button type="submit" className={shared.addButton}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
```

- [ ] **Step 4: Update the help text**

Replace line 45-47:

```js
      <p style={{ marginTop: "1rem", color: "var(--color-texto)", opacity: 0.7 }}>
        0 = sin mínimo. Se muestra en el catálogo y bloquea el checkout hasta alcanzarlo.
      </p>
```

with:

```js
      <p style={{ marginTop: "1rem", color: "var(--color-texto)", opacity: 0.7 }}>
        0 = sin mínimo. Se muestra en el catálogo y bloquea el checkout hasta alcanzarlo.
      </p>
      <p style={{ marginTop: "0.3rem", color: "var(--color-texto)", opacity: 0.7 }}>
        Envío gratis: con el switch activado, el costo de envío pasa a $0 cuando el pedido alcanza la cantidad de viandas indicada.
      </p>
```

- [ ] **Step 5: Verify it builds and existing tests still pass**

Run: `npm test`
Expected: PASS (no unit tests target this component; this guards against unrelated breakage).

- [ ] **Step 6: Commit**

```bash
git add components/admin/ConfiguracionManager.jsx
git commit -m "feat: admin controls for free-shipping threshold"
```

---

### Task 4: Catalog banner

**Files:**
- Modify: `components/tienda/Catalogo.jsx`
- Modify: `components/tienda/Catalogo.module.css`

**Interfaces:**
- Consumes: `useTiendaConfig()` → `{ envioGratisActivo, envioGratisDesde }` (Task 2), already imported in this file.

- [ ] **Step 1: Destructure the new config fields**

In `components/tienda/Catalogo.jsx`, replace line 14:

```js
  const { minimoViandas } = useTiendaConfig();
```

with:

```js
  const { minimoViandas, envioGratisActivo, envioGratisDesde } = useTiendaConfig();
```

- [ ] **Step 2: Add the banner**

Replace lines 29-31:

```js
      {minimoViandas > 0 && (
        <p className={styles.minimoBanner}>Pedido mínimo: {minimoViandas} viandas</p>
      )}
```

with:

```js
      {minimoViandas > 0 && (
        <p className={styles.minimoBanner}>Pedido mínimo: {minimoViandas} viandas</p>
      )}
      {envioGratisActivo && envioGratisDesde > 0 && (
        <p className={styles.envioGratisBanner}>Envío gratis a partir de {envioGratisDesde} viandas</p>
      )}
```

- [ ] **Step 3: Add the banner style**

In `components/tienda/Catalogo.module.css`, append after `.minimoBanner` (after line 27):

```css

.envioGratisBanner {
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  padding: 0.6rem var(--space-md);
  border-radius: var(--radius);
  font-weight: 600;
  text-align: center;
  margin-bottom: var(--space-md);
}
```

- [ ] **Step 4: Manual check**

Run the dev server (`npm run dev`), open `/tienda`, set `envioGratisActivo: true` and `envioGratisDesde: 6` on `alma_config/tienda` in the Firestore console (or via the admin form from Task 3 once deployed), reload, and confirm the banner appears below the mínimo banner (or alone if no mínimo is set).

- [ ] **Step 5: Commit**

```bash
git add components/tienda/Catalogo.jsx components/tienda/Catalogo.module.css
git commit -m "feat: show free-shipping banner in catalog"
```

---

### Task 5: Cart — dynamic message and free shipping cost

**Files:**
- Modify: `components/tienda/CarritoView.jsx`
- Modify: `components/tienda/CarritoView.module.css`

**Interfaces:**
- Consumes: `resolveEnvioGratis(cart, config)` from `@/lib/checkout` (Task 1); `useTiendaConfig()` → `{ minimoViandas, envioGratisActivo, envioGratisDesde }` (Task 2).

- [ ] **Step 1: Import `resolveEnvioGratis` and read full config**

Replace line 8:

```js
import { calculateTotal, validateMinimoViandas } from "@/lib/checkout";
```

with:

```js
import { calculateTotal, validateMinimoViandas, resolveEnvioGratis } from "@/lib/checkout";
```

Replace line 16:

```js
  const { minimoViandas } = useTiendaConfig();
```

with:

```js
  const config = useTiendaConfig();
  const { minimoViandas } = config;
```

- [ ] **Step 2: Compute free shipping and zero out `costoEnvio`**

Replace lines 39-43:

```js
  const zonaSeleccionada = zonasActivas.find((z) => z.id === zonaId);
  const costoEnvio = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const total = calculateTotal(subtotal, costoEnvio);
  const { valid: minimoOk, faltan } = validateMinimoViandas(cart, minimoViandas);
  const progreso = minimoViandas > 0 ? Math.min(100, Math.round((viandaCount / minimoViandas) * 100)) : 100;
```

with:

```js
  const zonaSeleccionada = zonasActivas.find((z) => z.id === zonaId);
  const costoEnvioBase = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const { aplica: envioGratisAplica, faltan: envioGratisFaltan } = resolveEnvioGratis(cart, config);
  const costoEnvio = envioGratisAplica ? 0 : costoEnvioBase;
  const total = calculateTotal(subtotal, costoEnvio);
  const { valid: minimoOk, faltan } = validateMinimoViandas(cart, minimoViandas);
  const progreso = minimoViandas > 0 ? Math.min(100, Math.round((viandaCount / minimoViandas) * 100)) : 100;
```

- [ ] **Step 3: Add the free-shipping message**

Replace lines 47-58 (the `minimoViandas > 0 && (...)` block) by adding a sibling block right after it — keep the existing block unchanged and insert after its closing `)}`:

```js
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

      {config.envioGratisActivo && config.envioGratisDesde > 0 && (
        <p className={envioGratisAplica ? styles.listo : styles.faltan}>
          {envioGratisAplica
            ? "¡Envío gratis! 🎉"
            : `Te faltan ${envioGratisFaltan} vianda${envioGratisFaltan === 1 ? "" : "s"} para envío gratis`}
        </p>
      )}
```

- [ ] **Step 4: Show "Gratis" in the totals**

Replace lines 86-89:

```js
        <div className={styles.totalRow}>
          <span>Envío</span>
          <span>${costoEnvio}</span>
        </div>
```

with:

```js
        <div className={styles.totalRow}>
          <span>Envío</span>
          <span>{envioGratisAplica ? "Gratis" : `$${costoEnvio}`}</span>
        </div>
```

- [ ] **Step 5: Manual check**

Run `npm run dev`, add products to the cart until reaching the configured `envioGratisDesde`, and confirm: the message switches from "Te faltan N viandas para envío gratis" to "¡Envío gratis! 🎉", the "Envío" row shows "Gratis", and the total drops by the zone's shipping cost.

- [ ] **Step 6: Commit**

```bash
git add components/tienda/CarritoView.jsx components/tienda/CarritoView.module.css
git commit -m "feat: apply free shipping and messaging in cart"
```

---

### Task 6: Checkout — same free-shipping cost logic

**Files:**
- Modify: `components/tienda/CheckoutForm.jsx`

**Interfaces:**
- Consumes: `resolveEnvioGratis(cart, config)` from `@/lib/checkout` (Task 1); `useTiendaConfig()` full object (Task 2). Produces the `costoEnvio` value passed to `submitOrder` (unchanged signature — `lib/submitOrder.js` is not modified).

- [ ] **Step 1: Import `resolveEnvioGratis` and read full config**

Replace line 10:

```js
import { validateCheckoutForm, calculateTotal, calculateDiscount, validateMinimoViandas } from "@/lib/checkout";
```

with:

```js
import { validateCheckoutForm, calculateTotal, calculateDiscount, validateMinimoViandas, resolveEnvioGratis } from "@/lib/checkout";
```

Replace line 23:

```js
  const { minimoViandas } = useTiendaConfig();
```

with:

```js
  const config = useTiendaConfig();
  const { minimoViandas } = config;
```

- [ ] **Step 2: Zero out `costoEnvio` when free shipping applies**

Replace lines 37-38:

```js
  const costoEnvio = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const descuentoPorcentaje = metodoSeleccionado ? metodoSeleccionado.descuentoPorcentaje : 0;
```

with:

```js
  const costoEnvioBase = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const { aplica: envioGratisAplica } = resolveEnvioGratis(cart, config);
  const costoEnvio = envioGratisAplica ? 0 : costoEnvioBase;
  const descuentoPorcentaje = metodoSeleccionado ? metodoSeleccionado.descuentoPorcentaje : 0;
```

- [ ] **Step 3: Show "Gratis" in the summary**

Replace lines 182-185:

```js
        <div className={styles.resumenRow}>
          <span>Envío</span>
          <span>${costoEnvio}</span>
        </div>
```

with:

```js
        <div className={styles.resumenRow}>
          <span>Envío</span>
          <span>{envioGratisAplica ? "Gratis" : `$${costoEnvio}`}</span>
        </div>
```

- [ ] **Step 4: Manual check**

Run `npm run dev`, go to `/tienda`, add enough viandas to meet the threshold, click through to checkout, and confirm: the "Envío" row shows "Gratis", the total matches the cart's total, and submitting the order persists `costoEnvio: 0` on the created `alma_pedidos` document (check via Firestore console).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green (this is the final integration point; nothing else changed).

- [ ] **Step 6: Commit**

```bash
git add components/tienda/CheckoutForm.jsx
git commit -m "feat: apply free shipping to checkout total and summary"
```
