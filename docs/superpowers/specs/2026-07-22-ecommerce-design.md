# ALMA — Ecommerce (Sub-proyecto 2) — Diseño

## Contexto del proyecto

ALMA vende viandas saludables congeladas, 100% caseras y sin conservantes. El sub-proyecto 1 (landing + base de backoffice) ya está en producción: landing pública con contenido editable desde `/admin`, formulario de leads B2B, y un panel de administración con autenticación (Firebase Auth), roles (`superadmin`/`admin`) y gestión de usuarios. Ver `docs/superpowers/specs/2026-07-22-landing-design.md`.

Este sub-proyecto construye el ecommerce real para clientes minoristas (B2C): catálogo, carrito, checkout y gestión de pedidos, con el mismo nivel de configurabilidad desde el admin que un ecommerce "tipo Tiendanube" (productos, categorías, zonas de envío, todo editable sin tocar código). Reemplaza el placeholder actual de `/tienda` ("Muy pronto").

El botón "Pedir ahora" de la landing, que hoy apunta a `/tienda`, pasa a llevar al catálogo real.

## Alcance de este sub-proyecto

**Incluye:**
- Catálogo público (`/tienda`) con productos individuales y packs, filtrable por categoría.
- Página de detalle de producto (`/tienda/producto?id=XXX`) con galería de fotos, descripción y tabla nutricional.
- Carrito (`/tienda/carrito`) persistido en `localStorage`, con selección de zona de envío y cálculo de totales.
- Checkout como invitado (`/tienda/checkout`): datos del cliente, método de pago preferido (sin cobrar todavía), confirmación de pedido.
- Extensión del admin: CRUD de Productos (con stock numérico e imágenes), Categorías, Zonas de envío, y gestión de Pedidos (listado, detalle, cambio de estado).
- Descuento de stock atómico vía transacción de Firestore al confirmar un pedido.

**No incluye (queda para una iteración futura):**
- Cobro online real (Mercado Pago u otra pasarela) — el pago se coordina manualmente (transferencia o tarjeta) después de confirmado el pedido. Cuando se integre Mercado Pago, ahí sí se vuelve necesario el backend Express/Railway que quedó pendiente desde el sub-proyecto 1 (para manejar el webhook de pago de forma segura).
- Cuentas de cliente / historial de pedidos logueado (checkout es 100% como invitado).
- Agenda de días/horarios de entrega (el pedido queda "recibido", la entrega se coordina después).
- Cupones de descuento, packs con productos vinculados por inventario (cada pack es su propio ítem de catálogo con su propio stock, no descuenta stock de productos individuales).

## Decisiones de arquitectura

### Sin backend todavía

El checkout escribe el pedido directo a Firestore desde el cliente (mismo patrón que el formulario de leads B2B y el editor de contenido del sub-proyecto 1). No hace falta backend porque no hay cobro online real en esta etapa.

### Carrito: `localStorage` + Context de React

Sin cuenta de cliente, el carrito vive en el navegador (persiste entre visitas a la misma compu/navegador) y se sincroniza a un React Context accesible desde cualquier página del sitio (para mostrar el contador de ítems en el header, por ejemplo).

### Stock: una única transacción atómica de Firestore por checkout, sin backend

Al confirmar un pedido se corre **una sola `runTransaction`** que, dentro de la misma transacción: lee el stock actual de cada ítem del carrito, valida que alcance para todos, decrementa el stock de cada uno, y crea el documento en `alma_pedidos` — todo o nada. Si falta stock de un solo ítem, la transacción entera se cancela sin decrementar nada ni crear un pedido parcial (evita el caso "se descontó el stock de 2 productos pero el pedido no se llegó a crear" o viceversa). Las transacciones de Firestore son atómicas y seguras contra condiciones de carrera (dos compras simultáneas del último ítem) sin importar si se llaman desde cliente o servidor — no hace falta backend para esto. Las reglas de seguridad restringen que una escritura pública en `alma_productos` solo pueda decrementar el campo `stock` (nunca aumentarlo ni tocar otros campos), acotando el riesgo de abuso desde un cliente no autenticado.

### Página de producto: ruta única con `?id=` en la URL, no rutas individuales

El sitio es `output: 'export'` (estático) para que el admin edite contenido sin rebuild. Una ruta dinámica por producto (`/tienda/producto/[id]`) requeriría que Next conozca todos los productos en build time — un producto nuevo no tendría página hasta el próximo build+deploy a Hostinger, rompiendo la edición en vivo.

Resuelto con **una sola página estática** `/tienda/producto` que lee el `id` de la query string (`?id=XXX`) y busca ese producto en Firestore client-side. Productos nuevos y ediciones aparecen sin rebuild. Costo aceptado: la URL no lleva el nombre del producto, y el preview de OG al compartir un link de producto puntual por WhatsApp/Instagram es genérico (no específico de ese producto) — igual que ya pasa con `/tienda` en general. El catálogo (`/tienda`) y el checkout (`/tienda/carrito`, `/tienda/checkout`) sí son rutas estáticas fijas, sin este problema.

## Modelo de datos (Firestore)

Todas las colecciones nuevas siguen el prefijo `alma_` ya establecido.

### `alma_categorias`
```js
{ id, nombre, orden, activa: boolean }
```
Categorías reales del catálogo — independientes del array `producto.categorias` que ya existe dentro de `alma_site_content` (ese es contenido decorativo de la landing, con nombre+imagen para las tarjetas de la sección Producto; esta colección nueva es la estructura real que organiza el catálogo de compra). No se unifican en este sub-proyecto para no tocar la landing ya en producción; queda como mejora futura opcional conectar ambas.

### `alma_productos`
```js
{
  id,
  nombre,
  descripcion,
  precio: number,
  categoriaId,
  tipo: "individual" | "pack",
  stock: number,
  imagenUrls: [string],
  tablaNutricional: { calorias, proteinas, carbohidratos, grasas },
  activo: boolean
}
```
Viandas sueltas y packs conviven en la misma colección, diferenciados por `tipo` (solo para filtrado/presentación — funcionalmente son el mismo tipo de ítem de catálogo).

### `alma_zonas_envio`
```js
{ id, nombre, costo: number, activa: boolean }
```

### `alma_pedidos`
```js
{
  id,
  cliente: { nombre, telefono, email, direccion },
  zonaEnvioId,
  items: [{ productoId, nombre, precio, cantidad }],
  subtotal: number,
  costoEnvio: number,
  total: number,
  metodoPagoElegido: "transferencia" | "tarjeta",
  estado: "pendiente" | "confirmado" | "en_preparacion" | "entregado" | "cancelado",
  createdAt: timestamp
}
```
`nombre` y `precio` en cada ítem quedan "congelados" al momento de la compra (no referencian el producto en vivo) — si después se edita el precio del producto, los pedidos ya hechos no cambian retroactivamente.

## Panel de administración (se extiende)

Nuevas secciones bajo `/admin`, mismo patrón de auth ya construido (protegidas por `AdminGuard`, visibles para `admin` y `superadmin` salvo que se indique lo contrario):

- **`/admin/productos`**: CRUD de productos — nombre, descripción, precio, categoría, tipo, stock, imágenes (subida a Storage, mismo patrón que `ImageUploadField`), tabla nutricional, activo/inactivo.
- **`/admin/categorias`**: CRUD simple — nombre, orden, activa.
- **`/admin/zonas-envio`**: CRUD simple — nombre, costo, activa.
- **`/admin/pedidos`**: listado de pedidos (más recientes primero, filtrable por estado), detalle de un pedido, cambio de estado (`pendiente` → `confirmado` → `en_preparacion` → `entregado`, o `cancelado`).

## Sitio público

1. **`/tienda`** — catálogo. Grid de productos activos con stock > 0 mostrados normalmente; productos sin stock se muestran atenuados con badge "Sin stock" (no se ocultan, para no parecer que el catálogo es más chico de lo que es). Filtro por categoría (tabs o dropdown). Cada card lleva a `/tienda/producto?id=XXX`.
2. **`/tienda/producto?id=XXX`** — detalle: galería de fotos, nombre, descripción, tabla nutricional, precio, selector de cantidad (topeado por stock disponible), botón "Agregar al carrito". Si el `id` no existe o el producto está inactivo, mensaje claro + link de vuelta al catálogo.
3. **`/tienda/carrito`** — lista de ítems (editar cantidad / quitar), selector de zona de envío (el costo se sabe recién acá), subtotal + envío + total, botón "Continuar al checkout". Carrito vacío muestra estado vacío con link al catálogo.
4. **`/tienda/checkout`** — formulario de datos del cliente (nombre, teléfono, email, dirección) + selección de método de pago preferido (transferencia/tarjeta — solo se guarda la preferencia, no se cobra) → al confirmar, corre la transacción de stock + crea el documento en `alma_pedidos` → pantalla de confirmación con número de pedido y próximos pasos ("nos vamos a contactar para coordinar el pago y la entrega").

El header del sitio (`Header.jsx`, ya existente) suma un ícono/contador de carrito visible en todas las páginas públicas.

## Manejo de errores

- **Sin stock suficiente** al agregar al carrito o en el checkout: se bloquea la acción con mensaje claro ("Quedan solo N unidades").
- **Ítems inválidos en el carrito** al llegar al checkout (producto desactivado o borrado desde que se agregó): se filtran automáticamente del carrito con un aviso, sin bloquear el resto de la compra.
- **Falla de red al confirmar el pedido**: mensaje de error con botón de reintentar, sin perder los datos ya cargados en el formulario.
- **Transacción de stock fallida** (alguien más compró el último ítem mientras se completaba el checkout): al ser una única transacción, no se crea ningún pedido parcial ni se decrementa stock de ningún ítem — se muestra un mensaje específico señalando qué ítem quedó sin stock para que el cliente ajuste el carrito y reintente.

## Testing / QA

Mismo criterio que el sub-proyecto 1: foco en la lógica no trivial, no en cobertura exhaustiva de UI.

- **Unit tests (Vitest):** cálculo de totales del carrito (subtotal + envío), validación del formulario de checkout, lógica de la transacción de stock (la función que decide si hay stock suficiente).
- **Manual/QA:** flujo completo agregar al carrito → checkout → pedido creado → aparece en `/admin/pedidos`; caso de stock insuficiente; CRUD de productos/categorías/zonas desde el admin reflejándose en el catálogo público sin rebuild; build de export sin errores; Lighthouse en `/tienda`.

## Próximo paso

Al cerrar este sub-proyecto, la integración de Mercado Pago (pago online real) queda como la mejora natural siguiente — ese sí requiere el backend Express/Railway pendiente. La gestión completa de pedidos/stock desde `/admin` (ya cubierta acá) es lo que completa el backoffice real mencionado en el sub-proyecto 1.
