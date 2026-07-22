# ALMA — Admin UX overhaul + medios de pago configurables (Sub-proyecto 3) — Diseño

## Contexto del proyecto

Los sub-proyectos 1 (landing + base de backoffice) y 2 (ecommerce) ya están en producción. El admin funciona completo (contenido, productos, categorías, zonas de envío, pedidos, usuarios) pero se armó rápido, sección por sección, sin una pasada de diseño unificada: nav horizontal simple, tablas sueltas sin estilo consistente entre managers, estados de pedido mostrados como texto crudo (`en_preparacion`), nada pensado para mobile. Además, el logo usado hasta ahora es una recreación en SVG hecha a mano (el original no estaba disponible en un formato usable) que "quedó rara"; ahora hay un archivo real (`logo-sin-fondo.png`, solo el isotipo circular, sin el wordmark "ALMA" al lado).

Este sub-proyecto es una pasada de pulido + una feature nueva chica (medios de pago configurables con descuento), no un rediseño de arquitectura — no se tocan los modelos de datos existentes salvo agregar la colección nueva de medios de pago.

## Alcance

**Incluye:**
1. Sidebar de navegación nuevo para el admin (reemplaza el nav horizontal actual), con íconos, sección activa resaltada, responsive (drawer en mobile).
2. Sistema visual consistente entre todos los managers del admin: `StatusBadge` reutilizable, tablas y formularios con el mismo lenguaje visual.
3. Estados de pedido con badge de color + etiqueta en español, cambio de estado libre (sin flujo forzado).
4. Pulido visual de la sección Productos (tabla con miniaturas más grandes, alerta visual de stock bajo/agotado, formulario organizado en secciones) — sin funcionalidad nueva (no se agrega búsqueda/filtro en esta pasada).
5. Medios de pago configurables: nueva colección `alma_metodos_pago`, gestionable desde `/admin/metodos-pago`; el checkout deja de tener "Transferencia/Tarjeta" hardcodeado.
6. Responsive real en admin y tienda, incluyendo menú hamburguesa en el header público (hoy no tiene navegación funcional en mobile).
7. Reemplazo del logo SVG recreado por el archivo real `logo-sin-fondo.png` en todos los usos (Header, Footer, sidebar admin, placeholders).
8. Contenido real: número de WhatsApp (`+54 9 11 3501-1991`) e Instagram (`@almacongelados`) reemplazando los placeholders genéricos.
9. Crédito "Desarrollado por TechDi" (link a techdi.com.ar) en el footer del sitio público y en el pie del sidebar del admin.

**No incluye:**
- Zonas de envío: ya están 100% configurables, sin cambios en esta pasada.
- Búsqueda/filtro en la lista de productos (evaluado y descartado para esta pasada — se puede sumar después si hace falta).
- Flujo guiado de estados de pedido (transiciones forzadas) — el cambio de estado sigue siendo libre.
- Integración de Mercado Pago (sigue pendiente para una iteración futura con backend).

## Medios de pago configurables

### Modelo de datos: `alma_metodos_pago`

```js
{ id, nombre, descuentoPorcentaje: number, activo: boolean }
```

Seed inicial (mismo criterio que el catálogo del sub-proyecto 2 — datos de ejemplo cargados una vez vía script descartable): `Transferencia` (0% por defecto, el usuario le pone descuento cuando quiera) y `Tarjeta` (0%).

### Cálculo del descuento

El descuento se calcula **únicamente sobre el subtotal de productos**, nunca sobre el costo de envío:

```
descuentoMonto = subtotal * (descuentoPorcentaje / 100)
subtotalConDescuento = subtotal - descuentoMonto
total = subtotalConDescuento + costoEnvio
```

### Checkout

`CheckoutForm` deja de tener los dos `<input type="radio">` hardcodeados de "Transferencia"/"Tarjeta". En su lugar, lee los métodos activos desde `alma_metodos_pago` (hook `useMetodosPago`, mismo patrón que `useZonasEnvio`) y los renderiza como radio buttons dinámicos, mostrando el % de descuento junto al nombre si tiene (ej. "Transferencia (-10%)"). Al cambiar de método, el resumen recalcula subtotal con descuento, envío, y total en tiempo real.

### Pedido

`alma_pedidos` suma dos campos nuevos para dejar registro de qué descuento se aplicó (no reconstruible después si el admin cambia el % del método más adelante):

```js
{
  // ...campos existentes...
  descuentoPorcentaje: number,   // el % vigente al momento de la compra
  descuentoMonto: number,        // el monto en pesos ya descontado
}
```

`subtotal` sigue siendo el subtotal *sin* descontar (como hoy); `total` ya refleja el descuento aplicado. `metodoPagoElegido` pasa de ser un string fijo (`"transferencia"`/`"tarjeta"`) al `nombre` del método elegido (ej. `"Transferencia"`), ya que ahora es contenido dinámico del admin, no un enum fijo en código.

### Admin: `/admin/metodos-pago`

CRUD simple (mismo patrón que Categorías/Zonas de envío): nombre, % de descuento, activo/inactivo.

## Sidebar de admin

Reemplaza `AdminNav` (nav horizontal actual). Estructura:
- Logo (isotipo real) + "ALMA" arriba.
- Links con ícono + label: Panel, Contenido, Productos, Categorías, Envíos, Métodos de pago, Pedidos, y Usuarios (solo superadmin) — mismo set de rutas que ya existen, más `/admin/metodos-pago`.
- Resaltado visual de la sección activa (según la ruta actual).
- Pie del sidebar: email del usuario logueado, botón "Cerrar sesión", línea de crédito TechDi.
- **Desktop (≥960px):** sidebar fijo a la izquierda, contenido a la derecha.
- **Mobile/tablet (<960px):** sidebar oculto por defecto; un botón hamburguesa en una barra superior lo despliega como drawer (overlay) sobre el contenido.

## Sistema visual consistente

- **`StatusBadge`** (nuevo componente, `components/admin/StatusBadge.jsx`): recibe un estado de pedido y devuelve un badge con color + label en español:
  - `pendiente` → amarillo/ámbar, "Pendiente"
  - `confirmado` → azul, "Confirmado"
  - `en_preparacion` → violeta, "En preparación"
  - `entregado` → verde, "Entregado"
  - `cancelado` → rojo, "Cancelado"
- Tablas de todos los managers (Categorías, Zonas de envío, Métodos de pago, Productos, Pedidos) comparten el mismo look (bordes, tipografía, spacing, hover de fila) — se consolida en un único stylesheet compartido en vez de reglas repetidas por componente.
- Botones del admin (guardar, eliminar, agregar, editar, cancelar) usan una paleta de variantes consistente (primario verde, secundario borde, destructivo rojo) en todos los managers.

## Productos (pulido visual)

- Tabla: miniatura más grande (actualmente 48px, pasa a un tamaño que se vea bien tipo catálogo), fila con badge de alerta cuando `stock === 0` ("Sin stock") o `stock` bajo un umbral chico (ej. `stock <= 5`, "Stock bajo") — puramente visual, no cambia la lógica de negocio.
- Formulario: se reorganiza visualmente en secciones claras (Datos básicos / Fotos / Tabla nutricional / Estado), sin cambiar campos ni agregar funcionalidad.

## Responsive

- **Admin:** sidebar → drawer en mobile (ver arriba). Tablas de managers pasan a un layout de tarjetas apiladas en mobile (en vez de scroll horizontal de tabla) para Categorías/Zonas/Métodos de pago/Productos; Pedidos mantiene tabla con scroll horizontal suave en mobile dado que tiene más columnas y el detalle expandido ya es full-width.
- **Sitio público:** el header suma un menú hamburguesa en mobile (`<860px`, mismo breakpoint que ya usa `Header.jsx` para ocultar el nav) que despliega los links de navegación (Nosotros, Producto, Empresas, FAQ, Contacto, Tienda) en un panel simple superpuesto. El carrito, checkout y catálogo (sub-proyecto 2) ya son responsive por su grid con breakpoints — se revisan visualmente en esta pasada, sin cambios estructurales esperados.

## Assets y contenido reales

- `logo-sin-fondo.png` (ya en la raíz del proyecto) se mueve a `public/logo/alma-mark.png` y reemplaza todos los usos del isotipo SVG recreado (`Logo.jsx` variant `"isotipo"`, `ImagePlaceholder.jsx`). El logotipo completo (SVG con el wordmark "ALMA" debajo) se mantiene como está — el archivo nuevo es solo el círculo, no un reemplazo del lockup completo.
- `.env.local`: `NEXT_PUBLIC_WHATSAPP_NUMBER=5491135011991`, `NEXT_PUBLIC_INSTAGRAM_HANDLE=almacongelados` (reemplazan los valores placeholder). `.env.example` se actualiza para reflejar el formato esperado, sin datos reales.

## Crédito TechDi

Línea chica, discreta, con link a `https://techdi.com.ar` (`target="_blank"`, `rel="noreferrer"`):
- Footer del sitio público (`Footer.jsx`): debajo de la línea de copyright existente.
- Pie del sidebar del admin: debajo del botón "Cerrar sesión".

## Testing / QA

Sin lógica de negocio nueva no trivial más allá del cálculo de descuento, que se cubre con un unit test (`calculateDiscount(subtotal, descuentoPorcentaje)` en `lib/checkout.js`, mismo archivo que ya tiene `calculateTotal`). El resto es verificación visual/manual: sidebar en desktop y mobile, badges de estado, checkout con descuento aplicándose en tiempo real, responsive en las páginas clave (catálogo, producto, carrito, checkout, cada manager de admin), y confirmación de que el logo/WhatsApp/Instagram reales aparecen en todo el sitio.

## Próximo paso

Con esto, el admin queda con un nivel de pulido y configurabilidad ("tipo Tiendanube") acorde a lo pedido desde el inicio del ecommerce. La integración de Mercado Pago sigue siendo la mejora natural siguiente cuando el negocio la necesite.
