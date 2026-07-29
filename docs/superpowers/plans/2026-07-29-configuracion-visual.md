# Rediseño Visual de Configuración Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `/admin/configuracion`'s single cramped row of fields into two titled card sections ("Pedido mínimo" and "Envío gratis"), matching the section pattern already used elsewhere — purely visual, same single save.

**Architecture:** JSX/CSS-only change to `ConfiguracionManager.jsx`, mirroring the `.section`/`.sectionTitle` pattern from `ProductoForm.module.css`.

**Tech Stack:** Next.js 14 (client component), CSS Modules.

## Global Constraints

- No changes to `lib/useTiendaConfig.js`, `firestore.rules`, or any storefront consumer of `alma_config/tienda`.
- One `handleSave` / one `setDoc` call, unchanged — no splitting into two forms.

---

### Task 1: Split into two card sections

**Files:**
- Modify: `components/admin/ConfiguracionManager.jsx`
- Create: `components/admin/ConfiguracionManager.module.css`

- [ ] **Step 1: Create the CSS module**

Create `components/admin/ConfiguracionManager.module.css`:

```css
.section {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.sectionTitle {
  font-family: var(--font-display);
  color: var(--color-verde-principal);
  font-size: 1.2rem;
  margin-bottom: var(--space-sm);
}

.toggleRow {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: var(--space-sm);
  font-weight: 600;
}

.hint {
  margin-top: var(--space-sm);
  color: var(--color-texto);
  opacity: 0.7;
  font-size: 0.9rem;
}
```

- [ ] **Step 2: Replace the component body**

Replace the full contents of `components/admin/ConfiguracionManager.jsx`:

```jsx
"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import shared from "./adminShared.module.css";

export default function ConfiguracionManager() {
  const config = useTiendaConfig();
  const [minimo, setMinimo] = useState("");
  const [envioGratisActivo, setEnvioGratisActivo] = useState(false);
  const [envioGratisDesde, setEnvioGratisDesde] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMinimo(String(config.minimoViandas));
    setEnvioGratisActivo(config.envioGratisActivo);
    setEnvioGratisDesde(String(config.envioGratisDesde));
  }, [config.minimoViandas, config.envioGratisActivo, config.envioGratisDesde]);

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

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Configuración de la tienda</h1>
      <form className={shared.addForm} onSubmit={handleSave}>
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
      </form>
      {status === "saved" && <p style={{ marginTop: "1rem", color: "var(--color-verde-oliva)", fontWeight: 600 }}>Guardado ✓</p>}
      <p style={{ marginTop: "1rem", color: "var(--color-texto)", opacity: 0.7 }}>
        0 = sin mínimo. Se muestra en el catálogo y bloquea el checkout hasta alcanzarlo.
      </p>
      <p style={{ marginTop: "0.3rem", color: "var(--color-texto)", opacity: 0.7 }}>
        Envío gratis: con el switch activado, el costo de envío pasa a $0 cuando el pedido alcanza la cantidad de viandas indicada.
      </p>
    </div>
  );
}
```

with:

```jsx
"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import shared from "./adminShared.module.css";
import styles from "./ConfiguracionManager.module.css";

export default function ConfiguracionManager() {
  const config = useTiendaConfig();
  const [minimo, setMinimo] = useState("");
  const [envioGratisActivo, setEnvioGratisActivo] = useState(false);
  const [envioGratisDesde, setEnvioGratisDesde] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMinimo(String(config.minimoViandas));
    setEnvioGratisActivo(config.envioGratisActivo);
    setEnvioGratisDesde(String(config.envioGratisDesde));
  }, [config.minimoViandas, config.envioGratisActivo, config.envioGratisDesde]);

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

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Configuración de la tienda</h1>
      <form onSubmit={handleSave}>
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Pedido mínimo</p>
          <div className={shared.field} style={{ maxWidth: 200 }}>
            <label htmlFor="minimo-viandas">Mínimo de viandas por pedido</label>
            <input
              id="minimo-viandas"
              type="number"
              min={0}
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
            />
          </div>
          <p className={styles.hint}>0 = sin mínimo. Se muestra en el catálogo y bloquea el checkout hasta alcanzarlo.</p>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Envío gratis</p>
          <label htmlFor="envio-gratis-activo" className={styles.toggleRow}>
            <input
              id="envio-gratis-activo"
              type="checkbox"
              checked={envioGratisActivo}
              onChange={(e) => setEnvioGratisActivo(e.target.checked)}
            />
            Activar envío gratis
          </label>
          <div className={shared.field} style={{ maxWidth: 200 }}>
            <label htmlFor="envio-gratis-desde">A partir de (viandas)</label>
            <input
              id="envio-gratis-desde"
              type="number"
              min={0}
              value={envioGratisDesde}
              onChange={(e) => setEnvioGratisDesde(e.target.value)}
              disabled={!envioGratisActivo}
            />
          </div>
          <p className={styles.hint}>
            Con el switch activado, el costo de envío pasa a $0 cuando el pedido alcanza la cantidad de viandas indicada.
          </p>
        </div>

        <button type="submit" className={shared.addButton}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {status === "saved" && <p style={{ marginTop: "1rem", color: "var(--color-verde-oliva)", fontWeight: 600 }}>Guardado ✓</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Expected: PASS (no logic changed).

- [ ] **Step 4: Manual check**

Run `npm run dev`, open `/admin/configuracion/`, and confirm: "Pedido mínimo" and "Envío gratis" render as separate titled cards, the "A partir de" field is still disabled until the checkbox is on, and clicking "Guardar" persists both groups correctly (reload and confirm values stuck, same as before).

- [ ] **Step 5: Commit**

```bash
git add components/admin/ConfiguracionManager.jsx components/admin/ConfiguracionManager.module.css
git commit -m "feat: split admin configuracion into titled card sections"
```
