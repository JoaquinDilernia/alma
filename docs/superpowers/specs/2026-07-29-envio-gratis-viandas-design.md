# Envío gratis a partir de X viandas — Design Spec

**Fecha:** 2026-07-29

## Objetivo

Agregar una promo configurable desde el admin: envío gratis cuando el pedido alcanza una cantidad mínima de viandas. Reflejarla en la tienda (catálogo, carrito y checkout) y en el costo de envío efectivamente cobrado/persistido.

## Modelo de datos

### Config global de tienda (`alma_config/tienda`) — campos nuevos

```js
{
  minimoViandas: 0,           // existente
  envioGratisActivo: false,   // nuevo — switch on/off, independiente del valor numérico
  envioGratisDesde: 0,        // nuevo — número; cantidad de viandas del pedido a partir de la cual el envío es gratis
}
```

Defaults: `envioGratisActivo = false`, `envioGratisDesde = 0`. Si el doc no trae estos campos (docs viejos), se tratan como desactivado — retrocompatible, no rompe pedidos existentes.

La promo aplica sobre el **total de viandas del pedido** (`countViandas(cart)`, el mismo contador que ya usa `minimoViandas`), sin distinción por zona ni por dirección de reparto — umbral único y fijo.

## Lógica pura

**`lib/checkout.js`** — nueva función, mismo estilo que `validateMinimoViandas`:

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

- `aplica`: si es `true`, el costo de envío se fuerza a `0`.
- `faltan`: cuántas viandas faltan para alcanzar el umbral (0 si ya se alcanzó o si la promo está desactivada).
- Función pura, sin dependencias de React ni Firestore — testeable igual que `validateMinimoViandas`.

## Hook de lectura

**`lib/useTiendaConfig.js`** (modificado) — `DEFAULT_CONFIG` pasa a `{ minimoViandas: 0, envioGratisActivo: false, envioGratisDesde: 0 }`; el mapeo del snapshot agrega ambos campos con las mismas coerciones (`!!` para el bool, `Number(...) || 0` para el número).

## Admin

**`components/admin/ConfiguracionManager.jsx`** (modificado)
- Nuevo bloque "Envío gratis": checkbox "Activar envío gratis" + input numérico "A partir de (viandas)", deshabilitado visualmente cuando el checkbox está apagado (no bloqueante, solo UX).
- `handleSave` extiende el mismo `setDoc(doc(db,"alma_config","tienda"), {...}, {merge:true})` para incluir `envioGratisActivo` (bool) y `envioGratisDesde: Number(...) || 0`.
- No se toca `app/admin/configuracion/page.jsx` ni `AdminSidebar.jsx` — la sección "Configuración" ya existe.

## Tienda

**`components/tienda/Catalogo.jsx`** (modificado)
- Si `envioGratisActivo && envioGratisDesde > 0`: cartel estático junto al de mínimo de viandas, ej. "Envío gratis a partir de X viandas" (mismo patrón que `minimoBanner`, sin depender del carrito).

**`components/tienda/CarritoView.jsx`** (modificado)
- Usa `resolveEnvioGratis(cart, config)` con el `viandaCount`/`cart` ya disponibles vía `useCart()`.
- Mensaje dinámico: "Te faltan N viandas para envío gratis" mientras `!aplica`, o "¡Envío gratis! 🎉" cuando `aplica` — mismo lugar/estilo que el mensaje de progreso de `minimoViandas` (no requiere una segunda barra de progreso separada, un texto simple alcanza).
- `costoEnvio` pasa de `zonaSeleccionada ? zonaSeleccionada.costo : 0` a `aplica ? 0 : (zonaSeleccionada ? zonaSeleccionada.costo : 0)`, y ese valor ajustado es el que entra a `calculateTotal`.
- Cuando `aplica`, la línea de envío en el resumen muestra "Gratis" en lugar del monto.

**`components/tienda/CheckoutForm.jsx`** (modificado)
- Mismo cálculo de `costoEnvio` ajustado que en `CarritoView.jsx` (usa `resolveEnvioGratis(cart, config)`), para que el total mostrado y el total enviado a `submitOrder` sean consistentes con el carrito.
- Línea de envío en el resumen muestra "Gratis" cuando `aplica`.
- El `costoEnvio` ya ajustado (0 si aplica) es lo que se pasa a `lib/submitOrder.js`, que lo persiste sin cambios (no requiere modificaciones en `submitOrder.js`).

## Manejo de errores

- Promo desactivada o `envioGratisDesde <= 0`: `resolveEnvioGratis` devuelve `aplica: false, faltan: 0` — comportamiento actual sin cambios.
- Config sin cargar aún (primer render antes del `onSnapshot`): defaults seguros, no rompe el cálculo de `costoEnvio`.
- No hay interacción con `minimoViandas`: son dos validaciones independientes que pueden coexistir (ej. mínimo 3 viandas para comprar, envío gratis desde 6).

## Testing

- Unit (Vitest, TDD) en `lib/checkout.test.js`: `resolveEnvioGratis` — desactivado, activado sin alcanzar el umbral, activado alcanzando el umbral exacto, activado superándolo, `envioGratisDesde` en 0 con `activo: true`.
- Manual/browser: activar la promo en admin con un umbral, ver el cartel en catálogo, agregar viandas al carrito y ver el mensaje dinámico y el costo de envío pasar a $0 al alcanzar el umbral, confirmar que el checkout refleja lo mismo y que el pedido persistido en `alma_pedidos` tiene `costoEnvio: 0`.

## Retrocompatibilidad

- Config existente sin `envioGratisActivo`/`envioGratisDesde` se trata como promo desactivada (defaults `false`/`0`), sin afectar el costo de envío actual de ningún pedido.

## Reglas de Firestore

Ninguna. Los campos nuevos van en el doc `alma_config/tienda`, ya cubierto por la regla existente (lectura pública, escritura solo admin).
