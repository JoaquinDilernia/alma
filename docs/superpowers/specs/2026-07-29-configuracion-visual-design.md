# Rediseño visual de Configuración — Design Spec

**Fecha:** 2026-07-29

## Objetivo

Reordenar visualmente `/admin/configuracion` (hoy todos los campos amontonados en una sola fila de `adminShared.addForm`) en dos secciones con tarjeta y título propio: "Pedido mínimo" y "Envío gratis" — mismo estilo de tarjeta ya usado en `GuarnicionesManager`/`MetodosPagoManager`. Puramente visual: mismos campos, mismo `handleSave` único sobre `alma_config/tienda`, sin cambios de comportamiento.

## Alcance

Solo `components/admin/ConfiguracionManager.jsx` (+ nuevo `ConfiguracionManager.module.css`). No se toca `lib/useTiendaConfig.js`, `firestore.rules`, ni ningún consumidor de la config en la tienda (`Catalogo.jsx`, `CarritoView.jsx`, `CheckoutForm.jsx`).

## Diseño

Dos secciones, cada una en su propia tarjeta con borde y título (mismo patrón `.section`/`.sectionTitle` que ya usa `ProductoForm.module.css`):

- **Pedido mínimo**: campo "Mínimo de viandas por pedido" + su texto de ayuda actual.
- **Envío gratis**: checkbox "Activar envío gratis" + campo "A partir de (viandas)" (deshabilitado si el checkbox está apagado, igual que hoy) + su texto de ayuda actual.

Un solo botón "Guardar" al final, que sigue enviando ambos grupos de campos en el mismo `setDoc(..., {merge:true})` que ya existe — no hay dos formularios ni dos guardados separados.

## Testing

Sin lógica nueva. Verificación manual: confirmar que guardar desde el nuevo layout persiste igual que antes (mínimo y envío gratis), y que el catálogo/carrito/checkout siguen reflejando los valores guardados sin cambios.

## Retrocompatibilidad

Ninguna migración — mismo documento `alma_config/tienda`, misma forma de datos.
