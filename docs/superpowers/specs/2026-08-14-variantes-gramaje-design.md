# Variantes de gramaje — Design Spec

**Fecha:** 2026-08-14

## Objetivo

Permitir que un producto ofrezca distintas opciones de peso (ej: 250gr, 500gr, 1kg), cada una con su propio precio, configurables desde el admin. El cliente elige el gramaje en la ficha del producto antes de agregar al carrito. Alcance acotado según lo definido:

- **Stock compartido**: todas las variantes de un mismo producto restan del mismo `stock` — no hay stock separado por gramaje.
- **Conteo de viandas sin cambios**: cada unidad agregada al carrito cuenta como 1 vianda para mínimo/descuento por cantidad, sin importar el gramaje elegido.
- **Formato numérico**: el peso se carga como número de gramos; el sitio formatea la visualización ("250gr", "1kg") automáticamente.

## Modelo de datos

### `alma_productos` — campos nuevos, ambos opcionales

```js
{
  // ...campos existentes sin cambios (precio, stock, cantidadViandas, etc.)
  gramajeBase: 250,              // gramos que representa el precio/stock ya cargados; opcional
  variantesGramaje: [
    { gramos: 500, precio: 4500 }, // precio ABSOLUTO de esa opción, no un extra sumado
    { gramos: 1000, precio: 8000 },
  ],
}
```

El selector de gramaje solo aparece en la tienda cuando **ambos** están presentes: `gramajeBase > 0` y `variantesGramaje.length > 0`. Si un producto no carga ninguno de los dos, se comporta exactamente igual que hoy — sin selector, sin cambios visuales, `producto.precio`/`producto.stock` siguen siendo la única fuente de precio.

## Lógica pura nueva — `lib/gramaje.js` (archivo nuevo)

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

- `resolveOpcionesGramaje`: arma la lista completa de opciones seleccionables (base + variantes) o `[]` si el producto no tiene gramaje configurado. Función pura, sin dependencias de React ni Firestore.
- `formatGramos`: formatea un número de gramos a texto ("250gr", "1kg", "1.5kg"). Se usa en la ficha del producto, el carrito, el checkout, el mail y el admin — un solo lugar que define el formato.

## Admin (`components/admin/ProductoForm.jsx`)

- `EMPTY` (línea 12) agrega `gramajeBase: ""` y `variantesGramaje: []`.
- Nueva sección "Gramaje (opcional)", después de la sección "Guarniciones" y antes de "Tabla nutricional":
  - Un campo numérico "Gramaje base (gramos)" → `updateField("gramajeBase", ...)`. Con una nota: "Si cargás variantes de peso, este número indica a qué gramaje corresponde el precio de arriba."
  - Lista de filas `{gramos, precio}` editables en estado local (mismo patrón ya usado para los escalones de descuento por cantidad en `ConfiguracionManager.jsx`: array en estado, `updateVariante(index, field, value)`, `removeVariante(index)`, `addVariante()`), con botón "+ Agregar variante de gramaje". Cada fila usa `shared.delete` (de `adminShared.module.css`, ya importado en otros managers) para el botón de eliminar — se agrega ese import a este archivo.
- `handleSubmit` (línea 51): el payload ya spreadea `draft` completo, así que `gramajeBase`/`variantesGramaje` se guardan solos; se agrega la coerción numérica igual que el resto de los campos:

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

## Tienda — Ficha del producto (`components/tienda/ProductoDetalle.jsx`)

- `const opcionesGramaje = resolveOpcionesGramaje(producto);` (calculado después de que `producto` exista, ya que depende de él).
- Nuevo estado `const [gramajeSeleccionado, setGramajeSeleccionado] = useState(null);` declarado junto a los demás `useState` existentes (antes de cualquier `return` temprano, para no romper las reglas de hooks).
- `const gramajeActivo = gramajeSeleccionado || opcionesGramaje[0] || null;` — evita necesitar un `useEffect` para fijar el default; simplemente cae al primero de la lista si todavía no se tocó el selector.
- `precioEfectivo` pasa de `producto.precio + extras` a `(gramajeActivo ? gramajeActivo.precio : producto.precio) + extras` — el gramaje **reemplaza** el precio base, las guarniciones lo siguen sumando encima como ya hacían.
- Cuando `opcionesGramaje.length > 1`, se muestra un selector tipo tarjetas (mismo estilo visual que las tarjetas de método de pago en `CheckoutForm.jsx` — `.metodoCard`/`.metodoCardActivo`, se replica en `ProductoDetalle.module.css`), ubicado antes del selector de guarniciones. Cada tarjeta muestra `formatGramos(opcion.gramos)` y `$${opcion.precio}`; clic en una la marca activa vía `setGramajeSeleccionado(opcion)`.
- `handleAgregar` pasa el gramaje elegido a `addToCart`: `addToCart(producto, cantidad, elegidas, precioEfectivo, gramajeActivo?.gramos ?? null)`.

## Carrito (`lib/cart.js`, `lib/CartProvider.jsx`)

- `cartLineId` pasa de `` `${item.productoId}::${(item.guarniciones||[]).join("|")}` `` a `` `${item.productoId}::${item.gramos || ""}::${(item.guarniciones||[]).join("|")}` `` — dos gramajes distintos del mismo producto quedan como líneas separadas en el carrito, cada una con su cantidad y precio.
- `addItem(cart, product, cantidad, guarniciones, precioEfectivo, gramos = null)` guarda `gramos` en el objeto de línea (`nuevo`), igual que ya guarda `cantidadViandas`, `precio`, etc.
- `CartProvider.jsx`: `addToCart` agrega el parámetro `gramos` y lo reenvía a `addItem`.
- `countViandas`/`calculateSubtotal`/`aggregateStockNeeds`: **sin cambios** — siguen sumando por `productoId` y por `cantidad`, consistente con la decisión de stock compartido y conteo de viandas sin escalar.

## Visualización del gramaje en el resto del flujo

En todos los lugares que ya listan una línea de carrito con sus guarniciones, se agrega el gramaje cuando `item.gramos` está presente (usando `formatGramos`):

- **`components/tienda/CarritoItem.jsx`**: un `<span>` más, reutilizando la clase `.guarniciones` ya existente (mismo estilo visual, texto chico atenuado) para mostrar `formatGramos(item.gramos)`.
- **`components/tienda/CheckoutForm.jsx`**: la línea del resumen (`{item.cantidad}× {item.nombre}...`) agrega `formatGramos(item.gramos)` entre paréntesis antes de las guarniciones. La `key` de cada fila (hoy construida a mano, no vía `cartLineId`) también incorpora `item.gramos` para mantener unicidad.
- **`lib/emailNotifications.js`**: `buildOrderEmailParams`'s `items_detalle` agrega el gramaje formateado a cada línea, ej: `"2x Vianda pollo 500gr — $9000"`.
- **`components/admin/PedidosManager.jsx`**: la línea de "Ítems" del detalle de pedido agrega el gramaje entre paréntesis, ej: `"2× Vianda pollo (500gr)"`.

Todos estos usan el mismo `formatGramos` de `lib/gramaje.js` — un solo lugar define el formato de "250gr" vs "1kg".

## Manejo de errores

- Producto sin `gramajeBase`/`variantesGramaje`: `resolveOpcionesGramaje` devuelve `[]`, no aparece selector, todo funciona como hoy.
- Línea de carrito sin `gramos` (agregada antes de este cambio, o de un producto sin gramaje): se trata como `null`/ausente en todos los puntos de visualización — no se muestra nada extra, sin errores.
- `gramajeBase` cargado pero `variantesGramaje` vacío (o viceversa): no aparece selector (se exige ambos, según la sección de Modelo de datos) — evita un selector con una sola opción sin sentido.
- Cambiar el gramaje en la ficha no afecta la selección de guarniciones ya hecha (son independientes); si el cliente cambia de opción después de elegir guarniciones, estas se mantienen.

## Testing

- **Unit (Vitest)** en `lib/gramaje.test.js`: `resolveOpcionesGramaje` — sin gramaje configurado, solo `gramajeBase` sin variantes, solo variantes sin `gramajeBase`, caso completo con base + 2 variantes (orden y contenido de la lista resultante). `formatGramos` — menor a 1000 ("250gr"), exactamente 1000 ("1kg"), no múltiplo de 1000 ("1.5kg").
- **Unit (Vitest)** en `lib/cart.test.js`: `cartLineId` con y sin `gramos`, dos líneas del mismo producto con distinto gramaje generan ids distintos.
- **Manual (dev server, sin pedido real)**: cargar un producto con gramaje base + 2 variantes desde el admin, verificar que el selector aparece en la ficha, que el precio cambia al elegir cada opción, que agregar dos gramajes distintos del mismo producto genera dos líneas separadas en el carrito con sus propios importes, y que el checkout muestra el gramaje en el resumen.

## Retrocompatibilidad

- Campos nuevos, ambos opcionales — productos y pedidos existentes no se ven afectados.
- `addItem`/`addToCart` reciben `gramos` como parámetro opcional con default `null` — cualquier llamada existente sin ese argumento sigue funcionando igual.

## Reglas de Firestore

Ninguna — los campos nuevos van en `alma_productos`, ya cubierto por la regla existente.
