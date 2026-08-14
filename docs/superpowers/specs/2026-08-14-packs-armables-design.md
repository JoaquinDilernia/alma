# Packs armables (plato principal + guarniciones) — Design Spec

**Fecha:** 2026-08-14

## Objetivo

Permitir que un pack (producto con `cantidadViandas > 1`) deje al cliente elegir tanto el **plato principal** como la **guarnición** de cada vianda del pack, mezclando o repitiendo libremente, hasta completar el total (ej: pack de 5 → 5 platos principales + 5 guarniciones). Se activa por producto: solo si el admin carga una lista de "platos principales disponibles" para ese producto. El resto de los productos (individuales, o packs que no usen esta función) siguen exactamente igual que hoy.

## Modelo de datos

### Colección nueva `alma_platos_principales`

Igual forma que `alma_guarniciones` (mismo patrón, catálogo global reutilizable entre productos):

```js
{
  nombre: "Pollo al horno",
  descripcion: "",
  precioExtra: 0,      // opcional, por si algún plato cuesta más
  imagenUrl: "",
  activa: true,
}
```

### `alma_productos` — campo nuevo

```js
{
  // ...campos existentes sin cambios
  platosPrincipales: ["id1", "id2"], // ids de alma_platos_principales elegibles para este producto
}
```

Un producto es "pack armable" cuando `platosPrincipales` (filtrado a activos) tiene al menos una opción. Si está vacío o ausente, el producto se comporta exactamente igual que hoy — sin selector de plato principal, guarniciones con el picker actual sin cambios.

**Stock:** sin cambios — el único stock que se descuenta sigue siendo el del pack (`producto.stock`), como ya se definió. Los platos principales no tienen stock propio, igual que las guarniciones hoy.

## Mecánica de selección — lista con contador

Reemplaza el picker por-slot (uno a la vez) **solo para productos "pack armable"**, por una lista donde cada opción tiene un `-`/`+` y se va sumando hasta el total (`cantidadViandas`), pudiendo repetir la misma opción o mezclar. Se usa la misma mecánica para plato principal y para guarniciones — dos instancias del mismo componente.

### Lógica pura nueva — `lib/seleccionMultiple.js`

```js
export function contarSeleccion(lista) {
  return lista.reduce((acc, nombre) => {
    acc[nombre] = (acc[nombre] || 0) + 1;
    return acc;
  }, {});
}

export function agregarSeleccion(lista, nombre, max) {
  if (lista.length >= max) return lista;
  return [...lista, nombre];
}

export function quitarSeleccion(lista, nombre) {
  const index = lista.lastIndexOf(nombre);
  if (index === -1) return lista;
  return [...lista.slice(0, index), ...lista.slice(index + 1)];
}
```

- `agregarSeleccion`: no hace nada si ya se llegó al máximo (protege contra pasarse del total).
- `quitarSeleccion`: saca una sola instancia (la última encontrada) del nombre indicado, sin afectar al resto.
- Funciones puras, sin React ni Firestore — testeables igual que el resto de `lib/`.

### Componente nuevo — `components/tienda/SeleccionMultiple.jsx`

Genérico, reutilizado dos veces en la ficha del producto (plato principal y guarniciones). Props: `{ titulo, opciones, seleccionadas, max, onChange }`.

- Muestra `{titulo} ({seleccionadas.length} de {max} elegidos)`.
- Una fila por opción del catálogo: imagen (o placeholder), nombre, `+$extra` si tiene precio adicional, y un contador `- N +`.
- `+` deshabilitado cuando `seleccionadas.length === max` (sin importar cuántas tenga esa opción puntual). `-` deshabilitado cuando esa opción tiene 0 elegidas.
- Mismo estilo visual general que el resto de los pickers de la tienda (tarjetas con borde, colores ya usados).

## Ficha del producto (`components/tienda/ProductoDetalle.jsx`)

- Nuevo estado `platosPrincipales` (array de nombres elegidos, mismo formato que ya usa `guarniciones`).
- `opcionesPlatos = catalogoPlatos.filter(p => p.activa && (producto.platosPrincipales || []).includes(p.id))`.
- `esPackArmable = opcionesPlatos.length > 0`.
- Cuando `esPackArmable`:
  - Se muestran **dos** `<SeleccionMultiple>` (plato principal y guarniciones) en vez del `<GuarnicionPicker>` actual.
  - `guarniciones` (el estado ya existente) pasa a manejarse con `setGuarniciones` directo como `onChange` de su `SeleccionMultiple`, en vez de la función `setSlot` indexada que usa el picker viejo — mismo estado, mutación distinta (push/pop en vez de asignación por índice).
- Cuando NO es pack armable: sin cambios, sigue todo como está hoy (`GuarnicionPicker` con `setSlot`).
- `extras` pasa a sumar tanto el `precioExtra` de las guarniciones elegidas como el de los platos principales elegidos.
- `todasElegidas` se generaliza: `(!tieneGuarniciones || guarniciones.length === cantidadViandas) && (!esPackArmable || platosPrincipales.length === cantidadViandas)`.
- `handleAgregar` pasa `platosPrincipales` a `addToCart` y lo resetea después, igual que ya hace con `guarniciones`.
- Avisos de "completá tu selección": para pack armable, un mensaje independiente por cada dimensión incompleta (plato principal / guarniciones), en vez del mensaje único actual.

## Carrito (`lib/cart.js`, `lib/CartProvider.jsx`)

- `cartLineId` incorpora `platosPrincipales`: `` `${productoId}::${gramos||""}::${(platosPrincipales||[]).join("|")}::${(guarniciones||[]).join("|")}` `` — dos configuraciones de pack distintas (diferente mezcla de platos) quedan como líneas separadas, igual que ya pasa con guarniciones y gramaje.
- `addItem(cart, product, cantidad, guarniciones, precioEfectivo, gramos, platosPrincipales = [])` — nuevo parámetro, guardado en la línea igual que el resto.
- `CartProvider.addToCart` reenvía el parámetro nuevo.

## Visualización en el resto del flujo

En todos los lugares que ya listan guarniciones de una línea, se agregan los platos principales elegidos, mismo formato (lista simple con repeticiones, sin agrupar — igual que ya se hace con guarniciones):

- **`components/tienda/CarritoItem.jsx`**: línea extra reutilizando la clase `.guarniciones` ya existente.
- **`components/tienda/CheckoutForm.jsx`**: se agrega al resumen de cada línea.
- **`lib/emailNotifications.js`**: se agrega a `items_detalle`.
- **`components/admin/PedidosManager.jsx`**: se agrega a la línea de "Ítems" del detalle de pedido.

## Admin

- **Colección nueva + hook**: `lib/usePlatosPrincipales.js`, idéntico a `lib/useGuarniciones.js` (mismo patrón `onSnapshot`, ordenado por nombre).
- **`components/admin/PlatosPrincipalesManager.jsx`** (nuevo): mismo patrón visual/código que `GuarnicionesManager.jsx` (lista con imagen, nombre, descripción, precio extra, activa, eliminar; formulario "+ Agregar" al final) — **sin** el botón de migración (no hay datos viejos que migrar, es una función nueva).
- **`app/admin/platos-principales/page.jsx`** (nuevo): wrapper mínimo, igual que `app/admin/guarniciones/page.jsx`.
- **`components/admin/AdminSidebar.jsx`**: nueva entrada "Platos principales" en el menú, después de "Guarniciones".
- **`components/admin/ProductoForm.jsx`**: nueva sección "Platos principales (para packs armables)", mismo patrón de checkboxes multi-select que la sección "Guarniciones" ya existente, guardando ids en `draft.platosPrincipales`.

## Manejo de errores

- Producto sin `platosPrincipales` configurado (o todos inactivos): `esPackArmable` es `false`, comportamiento idéntico al actual.
- Pedidos/carritos existentes sin este campo: se tratan como lista vacía en todos los puntos de visualización, sin errores.
- Intentar agregar una opción cuando ya se llegó al máximo: `agregarSeleccion` no hace nada (protegido en la función pura, no solo en la UI).

## Testing

- **Unit (Vitest)** en `lib/seleccionMultiple.test.js`: `agregarSeleccion` (agrega normal, no agrega al llegar al máximo), `quitarSeleccion` (saca una instancia, no rompe si el nombre no está en la lista), `contarSeleccion` (agrupa correctamente, incluyendo repetidos).
- **Unit (Vitest)** en `lib/cart.test.js`: actualizar `cartLineId`/`addItem` para el nuevo campo, agregar caso de dos configuraciones de `platosPrincipales` distintas como líneas separadas.
- **Unit (Vitest)** en `lib/emailNotifications.test.js`: nuevo caso con `platosPrincipales` en un ítem.
- **Manual (dev server, sin pedido real)**: cargar 3 platos principales desde el nuevo admin, activar la función en un producto pack (cantidadViandas 5), verificar en la ficha que aparecen los dos selectores con contador, que no se puede pasar del máximo, que el botón "Agregar al carrito" queda deshabilitado hasta completar ambos, y que la mezcla elegida se ve reflejada en el carrito y el checkout.

## Retrocompatibilidad

- Todo aditivo y opt-in por producto — ningún producto ni pedido existente cambia de comportamiento a menos que el admin cargue `platosPrincipales` para ese producto puntual.

## Reglas de Firestore

Nueva colección `alma_platos_principales`, mismo patrón que `alma_guarniciones` (lectura pública, escritura solo admin):

```
match /alma_platos_principales/{document} {
  allow read: if true;
  allow write: if isAdmin();
}
```

Se agrega al archivo local `firestore.rules` como documentación, pero **no se despliega por CLI** — se le pasa el fragmento al usuario para pegarlo directo en la consola de Firebase (regla del proyecto desde el incidente de `alma_metodos_pago`/reglas compartidas de esta sesión: `pedidos-lett-2` tiene otras apps conectadas).
