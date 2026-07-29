# Mayor Visibilidad de Pedidos en el Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move "Pedidos" to the 2nd position in the admin sidebar nav, and show a red badge (sidebar) + browser tab title prefix when there are pending ("pendiente") orders.

**Architecture:** Reuses the existing `usePedidos()` hook (built for the stats dashboard) inside `AdminSidebar.jsx` — no new Firestore query. The pending count is a trivial inline filter; a `useEffect` mirrors it into `document.title`.

**Tech Stack:** Next.js 14 (client component), Firebase v10 (`onSnapshot`, via the existing hook), CSS Modules.

## Global Constraints

- No new Firestore queries — `usePedidos()` (from `lib/usePedidos.js`) is reused as-is.
- Badge only renders when `pendienteCount > 0` — no badge (not "0") when there are none.
- Tab title reverts to the exact original (`"ALMA — Viandas saludables 100% caseras"`) when there are no pending orders.
- No changes to `PedidosManager.jsx` or any Firestore document shape.

---

### Task 1: Reorder nav, add pending badge and tab title

**Files:**
- Modify: `components/admin/AdminSidebar.jsx`
- Modify: `components/admin/AdminSidebar.module.css`

- [ ] **Step 1: Import `usePedidos` and `useEffect`**

In `components/admin/AdminSidebar.jsx`, replace line 3:

```js
import { useState } from "react";
```

with:

```js
import { useEffect, useState } from "react";
```

Add after line 7 (`import { auth } from "@/lib/firebase";`):

```js
import { usePedidos } from "@/lib/usePedidos";
```

- [ ] **Step 2: Reorder `NAV_ITEMS`**

Replace the `NAV_ITEMS` array (lines 103-113):

```js
const NAV_ITEMS = [
  { href: "/admin", label: "Panel", icon: ICONS.panel },
  { href: "/admin/contenido", label: "Contenido", icon: ICONS.contenido },
  { href: "/admin/productos", label: "Productos", icon: ICONS.productos },
  { href: "/admin/categorias", label: "Categorías", icon: ICONS.categorias },
  { href: "/admin/guarniciones", label: "Guarniciones", icon: ICONS.guarniciones },
  { href: "/admin/zonas-envio", label: "Envíos", icon: ICONS.envios },
  { href: "/admin/metodos-pago", label: "Métodos de pago", icon: ICONS.metodosPago },
  { href: "/admin/configuracion", label: "Configuración", icon: ICONS.config },
  { href: "/admin/pedidos", label: "Pedidos", icon: ICONS.pedidos },
];
```

with:

```js
const NAV_ITEMS = [
  { href: "/admin", label: "Panel", icon: ICONS.panel },
  { href: "/admin/pedidos", label: "Pedidos", icon: ICONS.pedidos },
  { href: "/admin/contenido", label: "Contenido", icon: ICONS.contenido },
  { href: "/admin/productos", label: "Productos", icon: ICONS.productos },
  { href: "/admin/categorias", label: "Categorías", icon: ICONS.categorias },
  { href: "/admin/guarniciones", label: "Guarniciones", icon: ICONS.guarniciones },
  { href: "/admin/zonas-envio", label: "Envíos", icon: ICONS.envios },
  { href: "/admin/metodos-pago", label: "Métodos de pago", icon: ICONS.metodosPago },
  { href: "/admin/configuracion", label: "Configuración", icon: ICONS.config },
];
```

- [ ] **Step 3: Compute the pending count and mirror it into the tab title**

Replace the start of the component (previously lines 117-121):

```js
export default function AdminSidebar({ role, userEmail }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = role === "superadmin" ? [...NAV_ITEMS, USUARIOS_ITEM] : NAV_ITEMS;
```

with:

```js
export default function AdminSidebar({ role, userEmail }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { pedidos } = usePedidos();
  const pendienteCount = pedidos.filter((p) => p.estado === "pendiente").length;

  useEffect(() => {
    document.title =
      pendienteCount > 0
        ? `(${pendienteCount}) ALMA — Viandas saludables 100% caseras`
        : "ALMA — Viandas saludables 100% caseras";
  }, [pendienteCount]);

  const items = role === "superadmin" ? [...NAV_ITEMS, USUARIOS_ITEM] : NAV_ITEMS;
```

- [ ] **Step 4: Render the badge next to "Pedidos"**

Replace the nav rendering block:

```jsx
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
```

with:

```jsx
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
              {item.href === "/admin/pedidos" && pendienteCount > 0 && (
                <span className={styles.badge}>{pendienteCount}</span>
              )}
            </Link>
          ))}
        </nav>
```

- [ ] **Step 5: Add the badge style**

In `components/admin/AdminSidebar.module.css`, append after the `.icon` rule (after line 96):

```css

.badge {
  margin-left: auto;
  background: #c0392b;
  color: var(--color-blanco);
  font-size: 0.7rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.35rem;
}
```

- [ ] **Step 6: Verify no regressions**

Run: `npm test`
Expected: PASS (no logic under test changed).

- [ ] **Step 7: Manual check**

Run `npm run dev`, log into the admin, and confirm: "Pedidos" is now the 2nd item in the sidebar; if there's at least one order with `estado: "pendiente"` in `alma_pedidos`, a red badge with the count shows next to "Pedidos" and the browser tab title is prefixed with `(N)`; changing that order's status away from "pendiente" in `/admin/pedidos/` makes the badge disappear (or its count drop) and the tab title revert, without a page reload (live via `onSnapshot`).

- [ ] **Step 8: Commit**

```bash
git add components/admin/AdminSidebar.jsx components/admin/AdminSidebar.module.css
git commit -m "feat: move Pedidos up in admin nav and show a pending-orders badge"
```
