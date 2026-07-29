# Panel de estadísticas del admin — Design Spec

**Fecha:** 2026-07-29

## Objetivo

Reemplazar la vista actual de `/admin` (un saludo y un link a Contenido) por un panel de estadísticas completo: ingresos, pedidos, ticket promedio, viandas vendidas, ranking de productos, distribución por estado, por método de pago y por zona de envío — todo filtrable por período.

## Filtro de período

Selector con 4 opciones, exclusivo:
- **Hoy**
- **Última semana** (últimos 7 días incluyendo hoy)
- **Últimos 30 días** (default)
- **Personalizado** — muestra dos `<input type="date">` (desde/hasta)

Todas las métricas del panel reaccionan al rango seleccionado, filtrando por `pedido.createdAt`.

## Reglas de negocio

- **Pedidos cancelados** (`estado === "cancelado"`) se excluyen de: ingresos, cantidad de pedidos, ticket promedio, viandas vendidas, ranking de productos, métodos de pago, zonas de envío.
- **Pedidos por estado** es la única métrica que incluye cancelados — su objetivo es mostrar el embudo completo, cancelados incluidos.
- "Producto más vendido" se rankea por **cantidad de unidades vendidas** (suma de `item.cantidad` agrupado por `item.nombre`), no por viandas totales.

## Datos de origen

Todo se calcula client-side a partir de la colección `alma_pedidos` (mismo patrón de lectura que ya usa `PedidosManager.jsx`: `onSnapshot` + `orderBy("createdAt", "desc")`, sin filtros de fecha en la query — el filtrado por rango es en memoria). Campos usados de cada pedido: `createdAt` (Firestore Timestamp), `estado`, `total`, `items` (array con `nombre`, `cantidad`, `cantidadViandas`), `metodoPagoElegido`, `zonaEnvioId`.

## Componentes y responsabilidades

### Lógica pura (testeable con Vitest)

**`lib/dashboardStats.js`** (nuevo)
- `filtrarPorRango(pedidos, { desde, hasta })` → pedidos con `createdAt` dentro de `[desde, hasta]` (inclusive). Recibe `desde`/`hasta` como objetos `Date`.
- `excluirCancelados(pedidos)` → pedidos con `estado !== "cancelado"`.
- `calcularResumen(pedidos)` → `{ ingresos, cantidadPedidos, ticketPromedio, viandasVendidas }` a partir de pedidos ya filtrados (rango + no cancelados). `ticketPromedio = ingresos / cantidadPedidos` (0 si no hay pedidos). `viandasVendidas` suma `item.cantidadViandas * item.cantidad` de todos los items de todos los pedidos.
- `rankearProductos(pedidos)` → `Array<{nombre, cantidad}>` ordenado descendente por `cantidad` (suma de `item.cantidad` agrupado por `item.nombre`).
- `contarPorEstado(pedidos)` → `{ pendiente, confirmado, en_preparacion, entregado, cancelado }` (conteo simple por `estado`, sobre pedidos filtrados solo por rango, **sin** excluir cancelados).
- `contarPorMetodoPago(pedidos)` → `Array<{label, cantidad}>` agrupado por `metodoPagoElegido`, ordenado descendente.
- `contarPorZona(pedidos)` → `Array<{zonaEnvioId, cantidad}>` agrupado por `zonaEnvioId`, ordenado descendente (la resolución de `zonaEnvioId` a nombre de zona se hace en el componente, cruzando con `useZonasEnvio()`).
- `rangoDesdeAtajo(atajo, hoy)` → dado `"hoy" | "semana" | "30dias"` y una fecha de referencia, devuelve `{ desde, hasta }` (ambos `Date`, `desde` a las 00:00:00, `hasta` a las 23:59:59 del día de referencia).

### Hooks (client)

**`lib/usePedidos.js`** (nuevo) — mismo patrón que `useProductos.js`: `onSnapshot(query(collection(db, "alma_pedidos"), orderBy("createdAt", "desc")))`, devuelve `{ pedidos, loading }`.

### Admin

**`components/admin/BarList.jsx`** (nuevo) — subcomponente presentacional reusado 3 veces (estado, métodos de pago, zonas): recibe `items: Array<{label, value, color?}>` ya ordenados, renderiza una fila por item con etiqueta + barra horizontal (ancho proporcional al máximo del set) + valor numérico. `color` opcional por fila (usado para "por estado", que reutiliza los colores de `StatusBadge.module.css`); sin `color` usa el verde de marca (`var(--color-verde-principal)`) para todas las filas, ya que ahí cada fila se identifica por su etiqueta.

**`components/admin/DashboardStats.jsx`** (nuevo)
- Estado local: atajo de rango elegido (`"hoy" | "semana" | "30dias" | "personalizado"`) + fechas personalizadas si corresponde.
- Lee `usePedidos()` y `useZonasEnvio()`.
- Calcula el rango efectivo (vía `rangoDesdeAtajo` o las fechas personalizadas), filtra con `filtrarPorRango`, deriva `pedidosFacturables = excluirCancelados(pedidosEnRango)`.
- Renderiza: selector de rango, 4 tarjetas KPI (`calcularResumen(pedidosFacturables)`), lista de productos más vendidos (`rankearProductos(pedidosFacturables)`, top 10), y tres `BarList`: por estado (`contarPorEstado(pedidosEnRango)`, con los colores de `StatusBadge`), por método de pago (`contarPorMetodoPago(pedidosFacturables)`), por zona (`contarPorZona(pedidosFacturables)`, resolviendo `zonaEnvioId` → `nombre` con `useZonasEnvio()`, con fallback "Zona eliminada" si no se encuentra).

**`components/admin/DashboardStats.module.css`** (nuevo) — grid de 4 tarjetas KPI, estilos del selector de rango, estilos compartidos con `BarList`.

**`app/admin/page.jsx`** (modificado) — mantiene el saludo (`Hola, {email}`) y reemplaza el link a Contenido por `<DashboardStats />` debajo.

## Manejo de errores

- Sin pedidos en el rango: tarjetas muestran 0 / $0, listas muestran un mensaje "Sin datos en este período" en vez de listas vacías.
- `ticketPromedio` con `cantidadPedidos === 0` da `0`, no `NaN`/`Infinity`.
- Rango personalizado con "desde" posterior a "hasta": se trata como rango vacío (mismo mensaje "Sin datos").
- Pedido con `zonaEnvioId` que ya no existe en `alma_zonas_envio` (zona borrada): se agrupa igual por `zonaEnvioId`, mostrando "Zona eliminada" como etiqueta.

## Testing

- Unit (Vitest, TDD) en `lib/dashboardStats.test.js`: cada función pura por separado — filtrado de rango (bordes inclusive), exclusión de cancelados, cálculo de resumen (incluyendo caso sin pedidos), ranking de productos (empates, agregación de mismo nombre en distintos pedidos), conteo por estado (incluye cancelados), conteo por método de pago y por zona, y los 4 atajos de `rangoDesdeAtajo`.
- Manual/browser: con pedidos reales (o creados a mano en Firestore para la prueba), cambiar entre los 4 atajos de rango y confirmar que las tarjetas/listas cambian; probar rango personalizado; confirmar que un pedido cancelado aparece en "por estado" pero no afecta ingresos ni ranking de productos.

## Retrocompatibilidad

No se modifica el modelo de datos de `alma_pedidos` ni `lib/submitOrder.js`. `PedidosManager.jsx` no se toca — sigue funcionando igual, con su propia lectura de pedidos independiente de `usePedidos.js`.

## Reglas de Firestore

Ninguna — `alma_pedidos` ya permite lectura a `isAdmin()`, que es lo único que este panel necesita.
