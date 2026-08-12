# Badge "Sin TACC" en productos — Design Spec

**Fecha:** 2026-08-12

## Objetivo

Agregar un checkbox "Sin TACC" en el formulario de producto del admin, y mostrarlo como un badge en el catálogo y en el detalle del producto cuando está marcado. Alcance acotado a este único campo (no un sistema genérico de etiquetas).

## Modelo de datos

### `alma_productos` — campo nuevo

```js
{
  // ...campos existentes sin cambios
  sinTacc: false, // boolean, default false
}
```

Mismo patrón que el campo `activo` ya existente. No requiere cambios en `firestore.rules` (el documento ya tiene su regla, lectura pública / escritura admin).

## Admin

**`components/admin/ProductoForm.jsx`** (modificado)
- `EMPTY` (línea 23) agrega `sinTacc: false`.
- En la sección "Estado" (líneas 246-257), un segundo checkbox al lado de "Activo": `producto-sin-tacc` → `updateField("sinTacc", e.target.checked)`, label "Sin TACC".
- `handleSubmit` no necesita cambios — `draft` ya se guarda completo vía spread.

**`components/admin/ProductosManager.jsx`** (modificado)
- Nueva columna "Sin TACC" en la tabla (después de la columna "Activo", línea 58/84), mismo patrón: `{producto.sinTacc ? "Sí" : "No"}`.

## Tienda

**`components/tienda/ProductoCard.jsx`** (modificado)
- Ya existe un badge arriba a la izquierda (`styles.badge`, línea 21-23) con "Pack"/"Individual"/"Sin stock". Se agrega un segundo `<span>` condicional cuando `producto.sinTacc`, con clase nueva `styles.badgeTacc`, posicionado arriba a la derecha (`right` en vez de `left`), texto "Sin TACC".
- **`ProductoCard.module.css`**: nueva clase `.badgeTacc` — mismo estilo base que `.badge` (pill, uppercase, mismo padding/font-size) pero `right: var(--space-xs)` en vez de `left`, y `background: var(--color-verde-oliva)` para diferenciarlo visualmente del badge de tipo/stock.

**`components/tienda/ProductoDetalle.jsx`** (modificado)
- Después de `<p className="sectionLabel">{producto.tipo === "pack" ? "Pack" : "Individual"}</p>` (línea 77) y antes del `<h1>` (línea 78), se agrega el mismo badge cuando `producto.sinTacc`, reutilizando una variante de la clase de `ProductoCard` (badge no posicionado absoluto acá, sino inline junto al label de tipo — se define una clase propia `styles.badgeTacc` en `ProductoDetalle.module.css` con el mismo look visual pero `display: inline-block` en vez de `position: absolute`).

## Manejo de errores

- Productos existentes sin el campo `sinTacc`: se tratan como `false`/ausente (no se muestra el badge), sin necesidad de migración — mismo criterio que otros booleanos nuevos agregados a `alma_productos` en el pasado.

## Testing

- Sin lógica pura nueva (es un campo booleano simple sin cálculo asociado) — no aplica Vitest.
- Manual (dev server): marcar "Sin TACC" en un producto desde el admin, verificar que aparece el badge en la tarjeta del catálogo y en el detalle; desmarcarlo y verificar que desaparece. Verificar que la tabla del admin muestra la columna correctamente para productos con y sin el campo.

## Retrocompatibilidad

- Campo nuevo, opcional, sin migración. No afecta pedidos, carrito, ni ningún cálculo existente.

## Reglas de Firestore

Ninguna — el campo va en `alma_productos`, ya cubierto por la regla existente.
