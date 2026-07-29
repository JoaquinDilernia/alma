# Mayor visibilidad de Pedidos en el admin — Design Spec

**Fecha:** 2026-07-29

## Objetivo

"Pedidos" es la sección operativamente más importante del admin, pero hoy está casi al final del menú lateral y no hay forma de saber si hay pedidos pendientes sin entrar a esa sección. Se sube de posición en el menú y se agrega un aviso visible (badge + título de pestaña) cuando hay pedidos en estado "pendiente".

## Cambios

### Orden del menú

`Pedidos` pasa de la posición 9 (casi última) a la posición 2, justo después de `Panel`. El resto del orden no cambia.

### Badge de pendientes en el menú

Junto al ítem "Pedidos" del menú lateral se muestra un badge circular rojo con la cantidad de pedidos en estado `"pendiente"`, solo cuando esa cantidad es mayor a 0 (sin badge si es 0, para no generar ruido visual permanente).

### Título de la pestaña del navegador

Cuando hay al menos un pedido pendiente, el título de la pestaña pasa de `"ALMA — Viandas saludables 100% caseras"` a `"(N) ALMA — Viandas saludables 100% caseras"` (N = cantidad de pendientes), para poder notarlo con la pestaña de fondo, sin necesidad de tener el admin en foco. Sin pendientes, el título vuelve al original.

## Fuente de datos

Se reutiliza `usePedidos()` (ya existente, creado para el dashboard de estadísticas) — no hace falta ninguna consulta nueva a Firestore. El conteo de pendientes es un filtro simple (`pedidos.filter(p => p.estado === "pendiente").length`), calculado inline en el componente — es trivial y no amerita una función pura separada (mismo criterio que ya se usa en el codebase para filtros simples como `categorias.filter(c => c.activa)`).

## Componentes y archivos

- `components/admin/AdminSidebar.jsx` (modificado): reordena `NAV_ITEMS`, agrega `usePedidos()`, calcula `pendienteCount`, renderiza el badge junto al ítem "Pedidos", y un `useEffect` que actualiza `document.title` según `pendienteCount`.
- `components/admin/AdminSidebar.module.css` (modificado): nueva clase `.badge` (círculo rojo, texto blanco, alineado a la derecha del ítem de menú).

## Manejo de errores

- Sin pedidos o sin pendientes: no se muestra badge, título de pestaña queda como el original.
- El `useEffect` de título depende solo de `pendienteCount`, así que se actualiza automáticamente en tiempo real vía el `onSnapshot` de `usePedidos()` (por ejemplo, si un pedido pasa de "pendiente" a "confirmado" mientras el admin está abierto en otra pestaña, el número baja solo).

## Testing

Sin lógica nueva que testear con Vitest (el conteo es un filtro trivial, y el resto es efecto/presentación). Verificación manual: con al menos un pedido "pendiente" real, confirmar que el badge aparece en el menú con el número correcto, que el título de la pestaña lo refleja, y que ambos desaparecen/bajan si se cambia el estado del pedido a algo distinto de "pendiente" desde `/admin/pedidos/`.

## Retrocompatibilidad

Ningún cambio de datos. `PedidosManager.jsx` no se toca.
