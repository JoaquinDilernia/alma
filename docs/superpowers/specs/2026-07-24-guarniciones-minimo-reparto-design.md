# Guarniciones, mínimo de viandas y horarios de reparto — Design Spec

**Fecha:** 2026-07-24
**Sub-proyecto:** 4 (enriquecimiento de producto y checkout)

## Objetivo

Agregar cuatro capacidades al ecommerce ALMA, todas configurables desde el admin y reflejadas en la tienda:

1. **Guarniciones por plato** — cada plato puede ofrecer guarniciones seleccionables; el cliente elige al comprar y la selección se limpia tras agregar al carrito.
2. **Cantidad de viandas por producto** — cada producto representa N viandas (individual = 1, pack = N). Unifica dos usos: cuenta para el mínimo y define cuántas guarniciones se eligen.
3. **Mínimo de viandas para comprar** — configurable globalmente, mostrado en la tienda (barra de progreso en el carrito, cartel en el catálogo) y validado en el checkout.
4. **Días y horarios de reparto por zona** — configurables por zona de envío, mostrados en PDP, carrito y checkout.

## Idea central: packs y guarniciones unificados

Cada producto tiene un campo `cantidadViandas` (número, individual = 1, pack = N). Ese número hace dos cosas:

- **Mínimo:** una individual suma `1 × cantidad`; un pack de 4 suma `4 × cantidad`.
- **Guarniciones:** si el producto tiene guarniciones configuradas, se eligen `cantidadViandas` guarniciones (una por vianda), que pueden repetirse o ser distintas. Una individual pide 1 selector; un pack de 4 pide 4 selectores. El mismo código sirve para ambos casos.

## Modelo de datos

### Producto (`alma_productos`) — campos nuevos

```js
{
  // ...campos existentes (nombre, descripcion, precio, categoriaId, tipo, stock, imagenUrls, tablaNutricional, activo)
  cantidadViandas: 1,                          // número; individual = 1, pack = N
  guarniciones: [                              // array; vacío = sin guarniciones
    { nombre: "Puré", precioExtra: 0 },
    { nombre: "Papas al horno", precioExtra: 500 },
  ],
}
```

`cantidadViandas` default `1`. `guarniciones` default `[]`. Productos existentes sin estos campos se tratan como `cantidadViandas = 1` y `guarniciones = []` (retrocompatibles).

### Zona de envío (`alma_zonas_envio`) — campos nuevos

```js
{
  // ...campos existentes (nombre, costo, activa)
  diasReparto: "Lunes y Jueves",   // string libre
  horarioReparto: "9 a 18 hs",     // string libre
}
```

Ambos default `""`. Si están vacíos, no se muestra bloque de reparto para esa zona.

### Config global de tienda (`alma_config/tienda`) — documento nuevo

```js
{
  minimoViandas: 0,   // número; 0 = sin mínimo
}
```

Se lee con un hook `useTiendaConfig()` (patrón `onSnapshot` de doc único, idéntico a `useSiteContent`), con default `{ minimoViandas: 0 }` cuando el doc no existe o falla.

## Item de carrito — forma nueva

```js
{
  productoId: "abc",
  nombre: "Milanesa de ternera",
  cantidadViandas: 1,              // copiado del producto al agregar
  guarniciones: ["Puré"],         // array de nombres elegidos; [] si el plato no tiene
  precio: 4200,                    // precio unitario EFECTIVO = precio base + suma de extras elegidos
  cantidad: 2,
}
```

- `precio` guarda el precio unitario ya con los extras sumados, para que `calculateSubtotal` no cambie.
- **Identidad de línea:** `lineId = productoId + "::" + guarniciones.join("|")`. Dos combinaciones de guarniciones distintas del mismo plato son dos líneas separadas. Mismo plato + mismas guarniciones (en el mismo orden) se apila sumando cantidad.

## Componentes y responsabilidades

### Lógica pura (testeable con Vitest, TDD)

**`lib/cart.js`** (modificado)
- `cartLineId(item)` → `${item.productoId}::${(item.guarniciones || []).join("|")}`.
- `addItem(cart, product, cantidad, guarniciones, precioEfectivo)` — apila por `cartLineId`; guarda `cantidadViandas`, `guarniciones`, `precio` efectivo.
- `removeItem(cart, lineId)` y `updateQuantity(cart, lineId, cantidad)` — operan por `lineId` en lugar de `productoId`.
- `calculateSubtotal(cart)` — sin cambios (usa `precio × cantidad`).
- `countViandas(cart)` → `sum(item.cantidadViandas × item.cantidad)`.

**`lib/checkout.js`** (modificado)
- `validateMinimoViandas(cart, minimoViandas)` → `{ valid, faltan }`, donde `faltan = max(0, minimoViandas - countViandas(cart))`. `valid` es `true` cuando `minimoViandas <= 0` o `countViandas >= minimoViandas`.

**`lib/submitOrder.js`** (modificado)
- **Fix de stock:** agregar la cantidad total por `productoId` antes de descontar, para que el mismo plato repartido en varias líneas (distintas guarniciones) no se venda de más. Leer cada `productoId` único una sola vez, validar contra la suma, y escribir un único `update` por producto.
- Guarda `items` (con `guarniciones` incluidas) igual que hoy.

### Hooks (client)

**`lib/useTiendaConfig.js`** (nuevo) — doc `alma_config/tienda`, default `{ minimoViandas: 0 }`.

### Admin

**`components/admin/ProductoForm.jsx`** (modificado)
- Campo "Cantidad de viandas" (número, default 1) en "Datos básicos".
- Sección nueva "Guarniciones": filas repetibles con `Nombre` + `Extra $` + botón borrar, y botón "Agregar guarnición". Al guardar se descartan filas sin nombre y se coerciona `precioExtra` a número.

**`components/admin/ZonasEnvioManager.jsx`** (modificado)
- Dos columnas nuevas: "Días de reparto" y "Horario", editables inline (mismo patrón `onBlur`). El formulario de alta suma ambos campos (opcionales).

**`components/admin/ConfiguracionManager.jsx`** + **`app/admin/configuracion/page.jsx`** (nuevos)
- Un campo "Mínimo de viandas por pedido" (número) que lee/escribe `alma_config/tienda` con `setDoc(..., { merge: true })`.
- Link nuevo en `AdminSidebar` (ícono config), visible para admin y superadmin.

### Tienda

**`components/tienda/ProductoDetalle.jsx`** (modificado)
- Si `producto.guarniciones.length > 0`: renderiza `cantidadViandas` selectores (uno por vianda, etiquetados "Guarnición 1", "Guarnición 2", …), cada uno un `<select>` con las opciones (mostrando "+$500" cuando `precioExtra > 0`).
- El botón "Agregar al carrito" queda deshabilitado hasta que **todas** las guarniciones estén elegidas.
- El precio mostrado se actualiza en vivo: `precio base + suma de extras elegidos` (× cantidad).
- Al agregar: llama `addToCart` con las guarniciones y el precio efectivo, y **resetea** la selección de guarniciones a vacío.
- Si no tiene guarniciones: comportamiento actual intacto.
- Bloque informativo nuevo de reparto: lista las zonas activas con `diasReparto`/`horarioReparto` cargados.

**`components/tienda/CarritoView.jsx`** (modificado)
- Barra de progreso del mínimo arriba: "X de Y viandas" con relleno proporcional; texto de faltante si no se cumple.
- Botón "Continuar al checkout" deshabilitado mientras `!validateMinimoViandas(...).valid`.
- Muestra `diasReparto`/`horarioReparto` de la zona seleccionada.

**`components/tienda/CarritoItem.jsx`** (modificado)
- Muestra las guarniciones bajo el nombre del plato.
- Usa `cartLineId(item)` para `updateCartQuantity`/`removeFromCart`.

**`components/tienda/CheckoutForm.jsx`** (modificado)
- Resumen: cada línea muestra sus guarniciones.
- Muestra `diasReparto`/`horarioReparto` de la zona seleccionada.
- Revalida `validateMinimoViandas` antes de enviar; si no se cumple, muestra error y no envía.

**`components/tienda/Catalogo.jsx`** (modificado)
- Si `minimoViandas > 0`, cartel arriba del catálogo: "Pedido mínimo: X viandas".

## Manejo de errores

- **Mínimo no cumplido:** botones de avanzar deshabilitados + texto claro de cuántas faltan. El checkout revalida por las dudas (defensa en profundidad).
- **Guarniciones incompletas:** botón "Agregar" deshabilitado hasta completar todas.
- **Stock:** la transacción sigue siendo la única fuente de verdad; con el fix de agregación evita sobreventa cuando un plato aparece en varias líneas.
- **Config/zona sin datos:** defaults seguros (`minimoViandas = 0` no bloquea; reparto vacío no se muestra).

## Testing

- Unit (Vitest, TDD): `cartLineId`, `addItem`/`removeItem`/`updateQuantity` por lineId, apilado por guarniciones, `countViandas`, `validateMinimoViandas`, y el fix de agregación de stock de `submitOrder` (con mock de transacción como en los tests existentes si los hay, o test de la función de agregación pura extraída).
- Manual/browser: flujo completo — cargar guarniciones y cantidadViandas en admin, configurar mínimo y reparto por zona, agregar mismo plato con dos guarniciones distintas (dos líneas), barra de progreso, bloqueo por mínimo, y compra end-to-end verificando el pedido en Firestore (guarniciones, precios con extra, stock descontado correctamente).

## Retrocompatibilidad

- Productos y zonas existentes sin los campos nuevos usan defaults (`cantidadViandas = 1`, `guarniciones = []`, reparto vacío, `minimoViandas = 0`), así nada se rompe antes de configurar.
- Items de carrito viejos en localStorage sin `guarniciones`/`cantidadViandas` se tratan con defaults al leer (guarniciones `[]`, cantidadViandas `1`); el `lineId` de un item viejo resuelve a `productoId::`.

## Reglas de Firestore

Colección nueva `alma_config` (doc `tienda`): lectura pública, escritura solo admin. Se agrega a las reglas locales (archivo local, no se despliega automáticamente — proyecto compartido `pedidos-lett-2`). Los campos nuevos en `alma_productos` y `alma_zonas_envio` no requieren cambios de reglas.
