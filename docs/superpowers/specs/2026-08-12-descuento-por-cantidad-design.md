# Descuento por cantidad de viandas — Design Spec

**Fecha:** 2026-08-12

## Objetivo

Agregar un descuento configurable por escalones de cantidad (ej: 10+ viandas = 5%, 50+ viandas = 10%), administrable desde el panel, visible en el carrito y el checkout, que se combina con el descuento por método de pago existente aplicándose en cadena (no se suman los porcentajes).

## Modelo de datos

### Colección nueva `alma_descuentos_cantidad`

Un documento por escalón, mismo patrón que `alma_metodos_pago`:

```js
{
  cantidadMinima: 10,   // viandas necesarias para activar este escalón
  porcentaje: 5,        // % de descuento sobre el subtotal
  activo: true,
}
```

Sin límite de escalones. El escalón aplicable es el de `cantidadMinima` más alta entre los activos cuyo valor sea `<=` al total de viandas del carrito (`countViandas(cart)`, la misma función que ya usan `minimoViandas` y `envioGratisDesde`).

### `alma_pedidos` — campos nuevos/reorganizados

```js
{
  // ...campos existentes sin cambios (cliente, items, zonaEnvioId, costoEnvio, estado, numeroPedido, etc.)
  subtotal: 8000,
  descuentoCantidadPorcentaje: 10,   // nuevo
  descuentoCantidadMonto: 800,       // nuevo
  descuentoPorcentaje: 5,            // existente — % del método de pago (sin cambio de nombre)
  descuentoMetodoPagoMonto: 360,     // nuevo — monto en $ del descuento de método de pago
  descuentoMonto: 1160,              // existente — pasa a ser la SUMA de ambos descuentos
  total: 6840,
}
```

`descuentoMonto` sigue siendo el campo que ya leen el mail y el admin — se mantiene como el descuento total combinado para no romper nada de lo ya construido. Los campos nuevos permiten mostrar el desglose.

## Cálculo en cadena (no se suman los porcentajes)

1. `descuentoCantidadMonto = subtotal × descuentoCantidadPorcentaje / 100` (usando la función pura `calculateDiscount` ya existente en `lib/checkout.js`)
2. `subtotalPostCantidad = subtotal - descuentoCantidadMonto`
3. `descuentoMetodoPagoMonto = subtotalPostCantidad × descuentoPorcentaje / 100` (mismo `calculateDiscount`, aplicado sobre el subtotal ya reducido)
4. `descuentoMonto = descuentoCantidadMonto + descuentoMetodoPagoMonto`
5. `total = (subtotal - descuentoMonto) + costoEnvio`

No hace falta una función nueva para la cadena: se reutiliza `calculateDiscount` dos veces en cada lugar que hoy calcula el total (`CarritoView.jsx`, `CheckoutForm.jsx`, `submitOrder.js`).

## Lógica pura nueva

**`lib/checkout.js`** — nueva función, mismo estilo que `resolveEnvioGratis`:

```js
export function resolveDescuentoCantidad(cart, escalones) {
  const total = countViandas(cart);
  const activos = (escalones || [])
    .filter((e) => e.activo)
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima);

  const alcanzado = [...activos].reverse().find((e) => e.cantidadMinima <= total);
  const siguiente = activos.find((e) => e.cantidadMinima > total);

  return {
    porcentaje: alcanzado ? alcanzado.porcentaje : 0,
    siguienteCantidad: siguiente ? siguiente.cantidadMinima : null,
    siguientePorcentaje: siguiente ? siguiente.porcentaje : null,
    faltanParaSiguiente: siguiente ? siguiente.cantidadMinima - total : 0,
  };
}
```

- `porcentaje`: el descuento por cantidad vigente para el carrito actual (0 si no se alcanzó ningún escalón).
- `siguienteCantidad`/`siguientePorcentaje`/`faltanParaSiguiente`: datos para el cartel de "te faltan N viandas para el próximo escalón" — `null`/`0` cuando ya se alcanzó el escalón más alto o no hay escalones activos.

## Hook de lectura

**`lib/useDescuentosCantidad.js`** (nuevo) — idéntico a `lib/useMetodosPago.js`: `onSnapshot` sobre `alma_descuentos_cantidad`, ordenado por `cantidadMinima`, devuelve `{ escalones, loading }`.

## Admin

**`components/admin/DescuentosCantidadManager.jsx`** (nuevo) — mismo patrón visual y de código que `MetodosPagoManager.jsx`: lista de escalones con `cantidadMinima` y `porcentaje` editables inline (`onBlur` → `updateDocById`), checkbox "Activo", botón eliminar, formulario "+ Agregar" al final. Usa `alma_descuentos_cantidad` como `COLLECTION` en vez de `alma_metodos_pago`.

**`app/admin/descuentos-cantidad/page.jsx`** (nuevo) — wrapper mínimo, igual que `app/admin/metodos-pago/page.jsx`.

**`components/admin/AdminSidebar.jsx`** (modificado) — nuevo ícono `descuentos` (etiqueta/porcentaje) y entrada `{ href: "/admin/descuentos-cantidad", label: "Descuentos por cantidad", icon: ICONS.descuentos }` en `NAV_ITEMS`, ubicada después de "Métodos de pago".

## Tienda — Carrito (`components/tienda/CarritoView.jsx`)

- Usa `useDescuentosCantidad()` y `resolveDescuentoCantidad(cart, escalones)`.
- Cartel dinámico (mismo lugar/estilo que el de envío gratis, líneas 63-69 actuales):
  - Si `porcentaje > 0`: "¡Descuento por cantidad: {porcentaje}%!" +, si `faltanParaSiguiente > 0`, "Te faltan {faltanParaSiguiente} viandas más para {siguientePorcentaje}%".
  - Si `porcentaje === 0` y hay un `siguienteCantidad`: "Te faltan {faltanParaSiguiente} viandas para {siguientePorcentaje}% de descuento".
  - Si no hay ningún escalón activo, no se muestra nada.
- Nueva fila "Descuento por cantidad" en el bloque de totales (solo si `descuentoCantidadMonto > 0`), antes de la fila de envío.
- `total` pasa a calcularse como `subtotal - descuentoCantidadMonto + costoEnvio` (el descuento de método de pago todavía no aplica acá porque no se eligió método de pago en este paso).

## Tienda — Checkout (`components/tienda/CheckoutForm.jsx`)

- Mismo `useDescuentosCantidad()` + `resolveDescuentoCantidad`.
- Calcula la cadena completa (cantidad → método de pago) como se describe arriba.
- Resumen: la fila única actual de "Descuento (X%)" se separa en dos filas independientes, cada una solo si su monto es `> 0`:
  - "Descuento por cantidad ({descuentoCantidadPorcentaje}%)" → `-$descuentoCantidadMonto`
  - "Descuento método de pago ({descuentoPorcentaje}%)" → `-$descuentoMetodoPagoMonto`
- `submitOrder` recibe un parámetro nuevo `descuentoCantidadPorcentaje` (además del `descuentoPorcentaje` existente, que sigue siendo el de método de pago).
- La pantalla de confirmación no cambia (ya muestra `numeroPedido`, no el desglose de descuentos).

## `lib/submitOrder.js`

- Firma nueva: `submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0, descuentoCantidadPorcentaje = 0 })`.
- Dentro de la transacción, reemplaza el cálculo actual de `descuentoMonto`/`total` por la cadena de 5 pasos de la sección "Cálculo en cadena".
- Persiste los campos nuevos (`descuentoCantidadPorcentaje`, `descuentoCantidadMonto`, `descuentoMetodoPagoMonto`) junto a los existentes (`subtotal`, `descuentoPorcentaje`, `descuentoMonto`, `total`, `numeroPedido`, etc. — sin tocar la lógica del contador de pedidos ya implementada).

## Mail de confirmación (`lib/emailNotifications.js`)

`buildOrderEmailParams` recibe los campos nuevos (`descuentoCantidadPorcentaje`, `descuentoCantidadMonto`) además de los que ya recibe, y agrega dos variables de template: `descuento_cantidad_porcentaje`, `descuento_cantidad_monto`. Las variables existentes `descuento_porcentaje`/`descuento_monto` se mantienen con su significado actual (método de pago / total combinado respectivamente) para no romper el template ya cargado en EmailJS. El template en EmailJS necesita una línea nueva para mostrar el descuento por cantidad cuando corresponda (se entrega el snippet al ejecutar).

## Admin — detalle de pedido (`components/admin/PedidosManager.jsx`)

El bloque expandido de detalle (líneas ~80-88 actuales, que hoy muestra una sola línea de descuento) pasa a mostrar el desglose: subtotal, descuento por cantidad (si `> 0`), descuento por método de pago (si `> 0`), envío, total — mismo estilo de texto que ya usa ese bloque.

## Manejo de errores

- Sin escalones activos (colección vacía o todos `activo: false`): `resolveDescuentoCantidad` devuelve `porcentaje: 0`, comportamiento idéntico al actual (sin descuento por cantidad).
- Escalones configurados fuera de orden (ej. se carga primero el de 50 y después el de 10): no importa, la función los ordena internamente por `cantidadMinima` antes de evaluar.
- Dos escalones con la misma `cantidadMinima`: no hay validación que lo impida (tampoco la hay en métodos de pago); en ese caso se aplica el que quede último en el orden estable de `Array.prototype.sort`. Caso borde aceptado, no bloqueante.
- Pedidos existentes sin los campos nuevos: se tratan como `0`/ausentes en el admin, sin romper la vista de detalle ni los mails.

## Testing

- **Unit (Vitest)** en `lib/checkout.test.js`: `resolveDescuentoCantidad` — sin escalones, con un escalón no alcanzado, con un escalón alcanzado exacto, con el escalón más alto de varios alcanzado, con escalones inactivos ignorados, con escalones desordenados en el array de entrada.
- **Manual (dev server, sin pedido real):** cargar 2-3 escalones desde el admin, agregar viandas al carrito y verificar que el cartel y la fila de descuento aparecen/cambian en los umbrales correctos, sin llegar a confirmar el pedido (mismo criterio que en la feature de notificaciones — no hay ambiente de prueba separado).
- **Cálculo en cadena:** verificar con un ejemplo a mano (ej. subtotal $10000, 10% por cantidad → $9000, 5% método de pago sobre $9000 → $8550 final) que coincide con lo que muestra el resumen del checkout.

## Retrocompatibilidad

- Pedidos existentes sin `descuentoCantidadPorcentaje`/`descuentoCantidadMonto`/`descuentoMetodoPagoMonto`: se muestran como si no hubiera habido descuento por cantidad; `descuentoMonto` de esos pedidos viejos sigue representando solo el descuento por método de pago (comportamiento idéntico al de antes de este cambio, no se migra nada).
- `submitOrder` mantiene `descuentoPorcentaje` como parámetro con el mismo significado (método de pago); el parámetro nuevo es opcional con default `0`.

## Reglas de Firestore

Nueva colección `alma_descuentos_cantidad`, mismo patrón que `alma_metodos_pago` (lectura pública, escritura solo admin):

```
match /alma_descuentos_cantidad/{document} {
  allow read: if true;
  allow write: if isAdmin();
}
```

Se agrega al archivo local `firestore.rules` y se despliega con `firebase deploy --only firestore:rules --project pedidos-lett-2`. Dado el incidente de esta sesión con `alma_metodos_pago` (regla ausente en el archivo local pese a estar en uso), antes de dar el deploy por terminado se vuelve a correr una verificación de lectura sobre **todas** las colecciones conocidas (no solo la nueva), no solo la agregada en este cambio.
