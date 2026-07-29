# Rediseño visual de métodos de pago — Design Spec

**Fecha:** 2026-07-29

## Objetivo

Mejorar la presentación visual de los métodos de pago, tanto en el checkout de la tienda (hoy radio buttons planos) como en el admin (hoy una tabla básica), sin cambiar el modelo de datos ni la lógica de negocio existente.

## Alcance

Puramente visual (JSX + CSS). No se toca `alma_metodos_pago`, `lib/useMetodosPago.js`, `lib/adminCrud.js`, ni el cálculo de descuento (`calculateDiscount` en `lib/checkout.js`). No se agregan imágenes/íconos por método — eso quedó descartado en el brainstorming a favor de un rediseño más simple y rápido.

## Checkout (`components/tienda/CheckoutForm.jsx`)

Los `<label><input type="radio">...</label>` planos pasan a tarjetas seleccionables:
- Cada método es una tarjeta con borde, padding y radio oculto (el `<label>` sigue envolviendo el `<input type="radio">`, así que el click en cualquier parte de la tarjeta selecciona el método — no cambia el comportamiento, solo el estilo).
- Tarjeta activa (método elegido): borde y fondo con el verde de marca, igual patrón de estado activo que ya usan los botones de rango del dashboard de estadísticas (`DashboardStats.module.css` `.rangoBtnActivo`) — clase condicional en React comparando `metodoPagoId === metodo.id`, no `:has()` en CSS.
- El descuento (`metodo.descuentoPorcentaje > 0`) se muestra como una badge tipo píldora verde ("-10%") en la tarjeta, en vez del texto actual entre paréntesis.

## Admin (`components/admin/MetodosPagoManager.jsx`)

La tabla pasa a una lista de tarjetas (mismo patrón visual que ya se usó para `GuarnicionesManager.jsx`, pero sin foto):
- Una tarjeta por método, con: input de nombre, input de descuento (con la misma badge visual junto al campo), checkbox de activo, botón eliminar — todo dentro de una tarjeta con borde y padding, en vez de una fila de tabla.
- Misma lógica de guardado que hoy: `onBlur` para nombre/descuento, `onChange` inmediato para el checkbox de activo (sin cambios de comportamiento, solo de layout).
- El formulario de alta al pie de la lista se mantiene igual (`shared.addForm`), solo se reordena visualmente si hace falta para acompañar el nuevo layout de tarjetas.

## Componentes y archivos

- `components/tienda/CheckoutForm.jsx` (modificado) — JSX de la sección de método de pago.
- `components/tienda/CheckoutForm.module.css` (modificado) — nuevas clases para las tarjetas y la badge de descuento.
- `components/admin/MetodosPagoManager.jsx` (modificado) — de tabla a lista de tarjetas.
- `components/admin/MetodosPagoManager.module.css` (nuevo) — estilos de las tarjetas (mismo espíritu que `GuarnicionesManager.module.css`, sin las clases de imagen).

## Testing

Sin lógica nueva que testear con Vitest (es solo presentación). Verificación manual en el navegador: en el checkout, confirmar que elegir un método resalta su tarjeta y que la badge de descuento se ve bien; en el admin, confirmar que editar nombre/descuento/activo sigue guardando correctamente con el nuevo layout de tarjetas, y que "Eliminar" sigue funcionando.

## Retrocompatibilidad

Ninguna migración de datos necesaria — los documentos existentes de `alma_metodos_pago` no cambian de forma.
