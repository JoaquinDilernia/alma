# Catálogo global de guarniciones — Design Spec

**Fecha:** 2026-07-29

## Objetivo

Reemplazar el texto libre de guarniciones por producto (hoy tipeado a mano, sin foto, feo en el desplegable de la tienda) por una **lista global de guarniciones** administrable desde una sección propia (nombre, descripción, foto, precio extra), que cada producto selecciona de esa lista. En la tienda, el selector de guarniciones se rediseña como un chip compacto por vianda que abre una grilla de fotos para elegir.

## Modelo de datos

### Colección nueva: `alma_guarniciones`

```js
{
  nombre: "Puré de batata",
  descripcion: "Puré casero de batata asada.",  // corto, opcional, default ""
  precioExtra: 300,                              // número, default 0, único y global
  imagenUrl: "",                                 // opcional; sin foto = placeholder en la UI
  activa: true,                                  // oculta sin borrar, default true
}
```

Reglas de Firestore: mismo patrón que `alma_categorias`/`alma_zonas_envio` — lectura pública, escritura solo admin. Se agrega a `firestore.rules` (regla local, no autodeploy, igual que las demás).

### `alma_productos.guarniciones` — cambio de forma

Antes: array de objetos embebidos `{ nombre, precioExtra }`, tipeados a mano por producto.

Ahora: **array de IDs** de `alma_guarniciones`, representando qué guarniciones de la lista global ofrece ese producto puntual:

```js
{
  // ...campos existentes del producto
  guarniciones: ["guarnicionId1", "guarnicionId3", "guarnicionId5"],
}
```

`tieneGuarniciones = (producto.guarniciones || []).length > 0`, igual que hoy.

### Carrito — sin cambios

`item.guarniciones` en el carrito sigue siendo un array de **nombres** (string), no de IDs — es una foto del pedido en el momento de la compra, independiente de si después se edita o borra la guarnición global. `lib/cart.js`, `lib/CartProvider.jsx`, `CarritoItem.jsx` y `CheckoutForm.jsx` no requieren cambios.

## Migración de datos existentes

Ya hay productos en producción con guarniciones cargadas a mano (ej. "Albondigas con salsa" con 7 opciones). Se migran con una acción manual, una sola vez, ejecutada desde la sesión ya autenticada del admin (no hay backend propio ni credenciales de servicio en este proyecto — todo es client-side con el SDK de Firestore):

- Botón "Migrar guarniciones existentes" en la nueva sección `/admin/guarniciones`, visible solo si `alma_guarniciones` está vacía (para evitar duplicar si se corre dos veces).
- Al ejecutarse: recorre todos los docs de `alma_productos`, junta todas las guarniciones embebidas (`{nombre, precioExtra}`) de todos los productos, las deduplica por `nombre` (case-insensitive, trim) quedándose con el primer `precioExtra` visto para cada nombre, crea un doc en `alma_guarniciones` por cada una (sin imagen, `activa: true`), arma un mapa `nombre → nuevoId`, y actualiza cada producto reemplazando su array de objetos por el array de IDs correspondiente.
- Lógica de agrupamiento/dedupe implementada como función pura testeable (sin Firestore), para poder testearla con Vitest; el componente admin solo la invoca y hace las escrituras.

## Componentes y responsabilidades

### Lógica pura (testeable con Vitest)

**`lib/migrateGuarniciones.js`** (nuevo)
- `collectGuarnicionesUnicas(productos)` → a partir de un array de productos con `guarniciones: [{nombre, precioExtra}]` embebidas, devuelve un array deduplicado `[{nombre, precioExtra}]` (dedupe case-insensitive/trim, primer `precioExtra` visto gana).
- `remapProductoGuarniciones(producto, nombreToId)` → dado un producto con guarniciones embebidas y un mapa `nombre (normalizado) → id`, devuelve el nuevo array de IDs para ese producto (ignora nombres que no matchean, no debería pasar en la migración real pero es defensivo).

**`lib/checkout.js`** — sin cambios; el cálculo de precio efectivo con guarniciones ya vive en `ProductoDetalle.jsx` (ver abajo) y no depende del checkout.

### Hooks (client)

**`lib/useGuarniciones.js`** (nuevo) — mismo patrón que `useCategorias.js`: `onSnapshot(query(collection(db, "alma_guarniciones"), orderBy("nombre")))`, devuelve `{ guarniciones, loading }`.

### Admin

**`components/admin/GuarnicionesManager.jsx`** (nuevo) + **`app/admin/guarniciones/page.jsx`** (nuevo)
- Tabla con columnas: foto (miniatura + `ImageUploadField` para subir/reemplazar), nombre (inline edit `onBlur`), descripción (inline edit `onBlur`), precio extra (inline edit `onBlur`), activa (checkbox), eliminar — mismo patrón que `CategoriasManager.jsx`/`ZonasEnvioManager.jsx` con `lib/adminCrud.js` (`createDoc`, `updateDocById`, `deleteDocById`).
- Formulario de alta al pie: nombre + descripción + precio extra (la foto se sube después, editando la fila ya creada).
- Botón "Migrar guarniciones existentes de productos" (solo visible si `guarniciones.length === 0`), que ejecuta la migración descrita arriba usando `collectGuarnicionesUnicas`/`remapProductoGuarniciones`.

**`components/admin/AdminSidebar.jsx`** (modificado) — nuevo ítem de nav "Guarniciones" (ícono nuevo estilo bowl/plato) entre "Categorías" y "Envíos".

**`components/admin/ProductoForm.jsx`** (modificado) — la sección "Guarniciones" deja de ser texto libre; pasa a listar checkboxes de `useGuarniciones()` (solo las `activa: true`, con miniatura + nombre + precio extra al lado), marcando cuáles aplica ese producto. `draft.guarniciones` pasa a guardar el array de IDs marcados.

### Tienda

**`components/tienda/GuarnicionPicker.jsx`** (nuevo) — reemplaza los `<select>` de `ProductoDetalle.jsx`. Por cada slot (uno por `cantidadViandas`):
- Chip compacto: si hay selección, miniatura + nombre + "Cambiar"; si no, botón punteado "+ Elegir guarnición".
- Al tocar el chip se abre un overlay (modal centrado en desktop, hoja desde abajo en mobile) con una grilla de tarjetas (foto + nombre + `+$precioExtra` si corresponde) de las guarniciones del producto (resueltas desde `useGuarniciones()` filtrando por los IDs que tiene el producto, y por `activa: true`).
- Tocar una tarjeta selecciona esa guarnición para el slot **y cierra el overlay automáticamente** (sin botón de confirmar).
- Sin foto cargada en una guarnición: se muestra un placeholder (ícono genérico), no se rompe el layout.

**`components/tienda/ProductoDetalle.jsx`** (modificado)
- `opciones` pasa de `producto.guarniciones` (embebido) a resolver los IDs del producto contra `useGuarniciones()`.
- Reemplaza el bloque de `<select>` por `<GuarnicionPicker slots={cantidadViandas} opciones={opciones} value={guarniciones} onChange={setSlot} />`.
- El resto de la lógica (precio efectivo, `todasElegidas`, `handleAgregar`, reset al agregar) no cambia — sigue operando sobre nombres de guarnición elegidos, igual que hoy.

## Manejo de errores

- Guarnición sin imagen: placeholder, no bloquea selección.
- Producto con IDs de guarniciones que ya no existen en `alma_guarniciones` (borrada después): se filtran silenciosamente al resolver `opciones` (no aparecen como opción; si el producto queda sin ninguna opción válida, `tieneGuarniciones` pasa a `false` y el selector no se muestra).
- Migración corrida dos veces: el botón se oculta si `alma_guarniciones` ya tiene documentos, evitando duplicados accidentales.
- Nombres de guarnición duplicados entre productos al migrar: dedupe case-insensitive/trim en `collectGuarnicionesUnicas`.

## Testing

- Unit (Vitest, TDD): `collectGuarnicionesUnicas` (dedupe por nombre, primer precio gana, trim/case-insensitive) y `remapProductoGuarniciones` (mapea nombres a IDs, ignora nombres sin match) en `lib/migrateGuarniciones.test.js`.
- Manual/browser: correr la migración sobre datos reales de dev, verificar que "Albondigas con salsa" sigue mostrando sus 7 guarniciones (ahora vía ID); cargar una foto a una guarnición migrada; abrir el PDP y confirmar que el chip + modal funcionan, que la selección se refleja en el carrito con el nombre correcto y que el precio extra se suma igual que antes; crear una guarnición nueva desde el admin, asignarla a un producto vía checkbox, y verificar que aparece en el picker.

## Retrocompatibilidad

- Ningún cambio en la forma del item de carrito ni en pedidos ya persistidos en `alma_pedidos` — siguen con nombres de guarnición como texto, se siguen mostrando igual.
- Productos sin guarniciones (`guarniciones: []` o campo ausente) siguen funcionando sin selector, sin cambios.

## Reglas de Firestore

Colección nueva `alma_guarniciones`: lectura pública, escritura solo admin — mismo patrón que `alma_categorias`. Se agrega a `firestore.rules` (regla local, no se autodespliega).
