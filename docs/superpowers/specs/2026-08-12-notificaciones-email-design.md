# Notificaciones por email al confirmar pedido — Design Spec

**Fecha:** 2026-08-12

## Objetivo

Al confirmarse un pedido en el checkout, enviar automáticamente un mail de confirmación al cliente (con copia oculta/CC al dueño, configurada del lado de EmailJS) usando EmailJS. De paso, agregar un número de pedido correlativo (`#1`, `#2`, `#3`...) que se muestra tanto en la confirmación del cliente como en el panel admin, reemplazando el ID crudo de Firestore que se usa hoy como pseudo-número.

## Modelo de datos

### Contador de pedidos — colección nueva `alma_contadores`, doc `pedidos`

```js
{
  ultimoNumero: 3, // entero, arranca en 1 con el primer pedido
}
```

El doc no existe hasta que se confirma el primer pedido del sitio — se crea automáticamente en ese momento con `ultimoNumero: 1`.

### `alma_pedidos` — campo nuevo

```js
{
  // ...campos existentes sin cambios (cliente, items, subtotal, total, etc.)
  numeroPedido: 3, // entero; ausente en pedidos creados antes de este cambio
}
```

Pedidos existentes (previos a este cambio) no tienen `numeroPedido` — se tratan como `null`/ausente en toda la UI, sin migración retroactiva.

## Lógica del contador (dentro de la transacción existente)

**`lib/submitOrder.js`** (modificado) — dentro del mismo `runTransaction` que ya descuenta stock, se agrega la lectura/incremento del contador:

```js
const contadorRef = doc(db, "alma_contadores", "pedidos");
// ...dentro del runTransaction, junto a los demás transaction.get():
const contadorSnap = await transaction.get(contadorRef);
const numeroPedido = contadorSnap.exists() ? contadorSnap.data().ultimoNumero + 1 : 1;
// ...
if (contadorSnap.exists()) {
  transaction.update(contadorRef, { ultimoNumero: numeroPedido });
} else {
  transaction.set(contadorRef, { ultimoNumero: numeroPedido });
}
transaction.set(pedidoRef, { ...datosPedido, numeroPedido });
```

Al estar en la misma transacción que ya usa la escritura del pedido, el incremento es atómico: dos checkouts simultáneos no pueden recibir el mismo número (Firestore reintenta la transacción que pierde la carrera).

`submitOrder` pasa a devolver `{ pedidoId, numeroPedido }` en lugar de solo el string `pedidoId` (cambia el contrato de la función — el único consumidor es `CheckoutForm.jsx`, que se actualiza en el mismo cambio).

## Envío de email

### Dependencia nueva

`@emailjs/browser` (client-side, sin backend — el sitio es export estático en Hostinger).

### `lib/emailNotifications.js` (nuevo)

Función pura, testeable con Vitest, que arma los parámetros del template a partir de los datos ya disponibles en `CheckoutForm.jsx` tras confirmar el pedido:

```js
export function buildOrderEmailParams({ cliente, items, subtotal, descuentoMonto, descuentoPorcentaje, costoEnvio, total, metodoPagoElegido, numeroPedido }) { ... }
```

Wrapper de envío (no puro, llama a EmailJS):

```js
export async function sendOrderConfirmationEmail(params) {
  return emailjs.send(SERVICE_ID, TEMPLATE_ID, params, { publicKey: PUBLIC_KEY });
}
```

### Variables del template (para armar el diseño en el dashboard de EmailJS)

| Variable | Contenido |
|---|---|
| `numero_pedido` | `3` |
| `cliente_nombre` | Nombre del cliente |
| `cliente_email` | Email del cliente (destinatario "To") |
| `cliente_telefono` | Teléfono |
| `cliente_direccion` | Dirección de entrega |
| `items_detalle` | Texto con un ítem por línea: cantidad, nombre, guarniciones, subtotal por ítem |
| `subtotal` | Subtotal antes de descuento/envío |
| `descuento_monto` | Monto descontado (0 si no aplica) |
| `descuento_porcentaje` | % de descuento aplicado |
| `costo_envio` | Costo de envío (0 si es gratis) |
| `total` | Total final |
| `metodo_pago` | Nombre del método de pago elegido |

El destinatario "To" del template en EmailJS se configura como `{{cliente_email}}`; el mail del dueño se agrega como CC fijo en la configuración del template (no requiere código ni configuración desde el admin del sitio).

### Variables de entorno nuevas (`.env.example` y `.env.local`)

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```

### `components/tienda/CheckoutForm.jsx` (modificado)

Tras `submitOrder` exitoso (pedido ya guardado, `numeroPedido` ya asignado):

```js
const { pedidoId, numeroPedido } = await submitOrder({ ... });
setPedidoId(pedidoId);
setNumeroPedido(numeroPedido);
setStatus("success");
clearCart();
try {
  const params = buildOrderEmailParams({ cliente, items: cart, subtotal, descuentoMonto, descuentoPorcentaje, costoEnvio, total, metodoPagoElegido: metodoSeleccionado.nombre, numeroPedido });
  await sendOrderConfirmationEmail(params);
} catch (err) {
  console.error("No se pudo enviar el mail de confirmación:", err);
}
```

El envío de mail va **después** de marcar `status: "success"` y limpiar el carrito — el pedido ya está confirmado para el cliente independientemente de si el mail sale o no. Si `sendOrderConfirmationEmail` falla, el error solo se loguea en consola; no hay UI de error ni reintento.

La pantalla de confirmación (línea 92 actual: `#{pedidoId.slice(0, 8).toUpperCase()}`) pasa a mostrar `#{numeroPedido}`.

## Admin (`components/admin/PedidosManager.jsx`)

- Columna `#` de la tabla: muestra `#{pedido.numeroPedido}` si existe, o `—` para pedidos viejos sin número (en vez del `pedido.id.slice(0, 8).toUpperCase()` actual).
- Campo de búsqueda arriba de la tabla: input de texto que filtra el array `pedidos` (ya cargado en memoria vía `onSnapshot`, sin paginación) por coincidencia parcial (substring) de `numeroPedido` convertido a string — permite tipear "2" y ver el pedido #2 y el #23, por ejemplo. Filtro 100% client-side, mismo patrón que el resto del componente (no requiere query adicional a Firestore).

## Manejo de errores

- **Fallo de EmailJS** (sin conexión, cuota mensual agotada, error del servicio): el pedido ya está confirmado y guardado antes de intentar el mail — no se revierte nada. Se loguea el error en consola, sin mensaje visible al cliente.
- **Contador inexistente** (primer pedido del sitio): se crea automáticamente con `ultimoNumero: 1` dentro de la misma transacción — no requiere seed manual.
- **Pedidos viejos sin `numeroPedido`**: se muestran con `—` en el admin; no se numeran retroactivamente.

## Testing

- **Unit (Vitest)** en `lib/emailNotifications.test.js`: `buildOrderEmailParams` — con descuento, sin descuento, con envío gratis (costo 0), con guarniciones en los ítems, sin guarniciones.
- **Manual — contador y numeración:** correr `npm run dev`, hacer un pedido de prueba visualmente hasta el paso previo a "Confirmar pedido" y confirmar ahí (ver nota de abajo), verificar en el admin que `numeroPedido` aparece y se incrementa en pedidos sucesivos.
- **Manual — email:** dado que no hay ambiente de prueba separado (proyecto Firebase compartido con producción — ver nota de abajo), se recomienda probar el template de EmailJS de forma aislada primero: un botón o snippet temporal que llame a `sendOrderConfirmationEmail` con datos de prueba hardcodeados, **sin pasar por el checkout real**, para no generar un pedido falso en `alma_pedidos`. Recién cuando el template esté validado así, hacer como mucho una confirmación real de pedido para el test end-to-end completo, avisando que quedará un pedido real en la base (se puede marcar "cancelado" después desde el admin).

## Retrocompatibilidad

- Pedidos existentes sin `numeroPedido`: se muestran con `—`, no rompen el admin ni ningún cálculo existente.
- `submitOrder` cambia su valor de retorno (de `string` a `{ pedidoId, numeroPedido }`) — único consumidor es `CheckoutForm.jsx`, actualizado en el mismo cambio.

## Reglas de Firestore

Nueva colección `alma_contadores` — necesita su propio bloque de reglas porque el incremento ocurre dentro de la transacción pública de checkout (`alma_pedidos` ya permite `create: if true` para clientes anónimos; el contador necesita el mismo nivel de acceso, pero acotado para que solo se pueda crear en 1 o incrementar de a uno):

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

Como con los cambios de reglas anteriores en este proyecto, esto queda en el archivo local `firestore.rules` — **hay que desplegarlo manualmente** (`firebase deploy --only firestore:rules` o pegarlo en la consola de Firebase) para que el contador funcione en producción; hasta que no se despliegue, la transacción de checkout va a fallar al intentar crear/actualizar el contador.
