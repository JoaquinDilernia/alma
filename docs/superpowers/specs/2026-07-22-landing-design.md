# ALMA — Landing Page (Sub-proyecto 1) — Diseño

## Contexto del proyecto

ALMA es un emprendimiento gastronómico (el usuario se está asociando con un amigo) que vende viandas saludables/fit, congeladas para hornear y comer, 100% caseras y sin conservantes. El negocio tiene dos líneas:

1. **B2C** — venta directa a clientes minoristas (packs/viandas individuales). Esta es la línea que se lanza primero, vía ecommerce.
2. **B2B / Empresas** — mismo producto pero para empresas, con horario de corte de pedidos y entrega corporativa. Esta línea está **pendiente de lanzamiento**, pero debe estar presentada en la landing para captar interés anticipado.

El proyecto completo consta de 3 sistemas: **landing**, **ecommerce completo** y **backoffice**. Se decidió decomponer el trabajo en sub-proyectos secuenciales, cada uno con su propio ciclo de brainstorming → spec → plan → implementación. Este documento cubre únicamente el primero: **la landing**.

Aclaración clave del usuario: la landing **no se lanza sola** — para cuando salga a producción, el ecommerce (B2C) va a existir también. Por lo tanto la landing se diseña ya asumiendo/enlazando al ecommerce como una pieza que va a existir, y apenas se cierre este sub-proyecto se arranca directo con el del ecommerce (sin pausa larga entre ambos).

No hay contenido/copy real todavía (textos, fotos de producto, testimonios) — se usa contenido genérico placeholder, estructurado para ser fácil de reemplazar después.

## Identidad de marca (ya definida, no rediseñar)

- **Paleta:** verde principal `#2E4A2F`, verde oliva secundario `#8B9460`, crema claro (fondo principal) `#F7F4EE`, beige neutro (fondos secundarios) `#E8E1D5`, gris oscuro (texto) `#4B4B4B`, blanco `#FFFFFF`.
- **Uso recomendado de paleta:** 70% base crema/beige, 20% verde principal, 10% verde oliva.
- **Tipografías:** Cormorant Garamond (logo/títulos), Montserrat (texto/web/redes). Alternativas de respaldo si hace falta: Cinzel/Playfair Display/DM Serif Display (display) y Poppins/Lato/Inter (texto).
- **Concepto de marca:** Natural + Gourmet + Saludable + Profesional. Pilares visuales: Alimentación consciente, Cocina artesanal, Conservación premium, Bienestar y practicidad (cada uno con su ícono ya definido en el manual).
- **Logo:** isotipo circular (letra "A" + gorro de cocinero superpuesto + ramita de hojas) + logotipo completo "ALMA — Servicios Gastronómicos" con tagline "Nutrimos momentos, creamos bienestar". Solo existen en JPEG con fondo blanco — **se recrean como SVG fieles al original con fondo transparente** para poder usarse sobre fondos de color.
- Assets fuente de marca: 3 imágenes JPEG en la raíz del proyecto (manual de marca + 2 variantes de logo), ya revisadas.

## Alcance de este sub-proyecto

**Incluye:** landing page completa (8 secciones, ver abajo), formulario de leads B2B guardando en Firestore, botón flotante de WhatsApp, SVGs de marca, scaffold técnico base del proyecto (aplica también a los sub-proyectos futuros).

**No incluye (queda para brainstormings/planes futuros):** ecommerce real (catálogo, carrito, checkout, pagos), backoffice (gestión de pedidos/stock/usuarios), backend Express/Railway (se crea recién cuando el ecommerce lo requiera de verdad — pagos, stock, webhooks).

## Stack técnico

- **Framework:** Next.js (App Router), con `output: 'export'` para generar build estático (carpeta `out/`) — compatible con el flujo de deploy manual a Hostinger (el usuario sube el build por File Manager/FTP).
- **Estilos:** CSS Modules (sin framework de utilidades) — da control fino sobre la tipografía editorial de la marca.
- **Animación:** GSAP + ScrollTrigger (vía `@gsap/react`) como único motor de animación, en línea con la dirección de motion "dinámico/bold" elegida (pinning de secciones, reveals en cascada, parallax). Se evita sumar una segunda librería de animación.
- **Datos:** Firebase (Firestore), todas las colecciones con prefijo `alma_` (ej. `alma_leads_empresas`). Se usa el SDK cliente de Firebase directo desde el navegador — sin backend intermedio en esta etapa.
- **Backend:** ninguno en esta etapa. Cuando arranque el ecommerce se evalúa Express desplegado en Railway (pagos, stock, pedidos, webhooks).
- **Deploy:** build estático manual subido a Hostinger.
- **Router interno:** rutas limpias de Next (no hash-routing), compatibles con SEO y con hosting estático.

### Motivo del cambio de stack respecto al "stack de siempre" del usuario

El usuario mencionó inicialmente Vite + React + HashRouter. Se cambió a Next.js con export estático porque:
- HashRouter + CSR puro deja el HTML inicial vacío → mal SEO y mal preview al compartir links por WhatsApp/Instagram (crítico para un negocio de comida que se difunde por esos canales).
- Next con export estático resuelve esto (HTML con meta/OG tags ya generado en build time) sin perder la posibilidad de alojar en Hostinger como sitio estático.
- La única funcionalidad que se resigna son las API routes de servidor (no hay servidor en hosting estático) — no se necesitan en esta etapa porque los formularios escriben directo a Firestore.

## Estructura de secciones

1. **Header / Nav** — fijo; transparente sobre el hero, se vuelve sólido (crema) al hacer scroll. Logo + links (Nosotros, Producto, Empresas, FAQ, Contacto) + link **Tienda** + CTA "Pedir ahora".
2. **Hero** — full-bleed con imagen de vianda (foto stock temporal) + overlay verde sutil. Titular en Cormorant Garamond + bajada en Montserrat + tagline de marca ("Nutrimos momentos, creamos bienestar"). CTA principal **"Pedir ahora" → ruta interna `/tienda`** (placeholder por ahora, será el ecommerce real en el próximo sub-proyecto) + CTA secundario "Ver cómo funciona" (scroll a sección Producto). Animación: texto entra en cascada (stagger), imagen con parallax leve al hacer scroll.
3. **Nosotros** — filosofía de marca (100% casera, sin conservantes) + los 4 pilares visuales del manual (Alimentación consciente / Cocina artesanal / Conservación premium / Bienestar y practicidad) con sus íconos. Animación: los 4 pilares se arman en scroll (stagger reveal).
4. **Producto / Cómo funciona** — 3-4 pasos ilustrados (elegís tus viandas → las preparamos frescas → las recibís → horno y listo) + grid de categorías de viandas placeholder (ej: Clásicas, Fitness, Veggie, Kids — genérico y editable) con fotos stock. Animación: pinning de la sección mientras se recorre el proceso paso a paso.
5. **Empresas (B2B)** — sección visualmente diferenciada (fondo verde oscuro, texto crema) para marcar que es la otra línea de negocio. Explica el servicio (pedidos con horario de corte, entrega en oficina), badge de "línea pendiente de lanzamiento" y formulario de lead: empresa, contacto, email, teléfono, tamaño aprox. de equipo → colección Firestore `alma_leads_empresas`.
6. **Testimonios** — grid/carrusel simple con 3-4 testimonios placeholder genéricos, fácil de reemplazar por reales.
7. **FAQ** — acordeón animado, preguntas genéricas típicas (conservación, tiempos de cocción/horno, zonas de entrega, medios de pago).
8. **Contacto / CTA final** — repite CTA hacia `/tienda`, link a Instagram, mini-form de contacto general opcional, footer con logo, links de navegación y datos de contacto placeholder.

**WhatsApp:** botón flotante secundario (esquina inferior, visible en toda la landing) + presencia en el footer, para consultas/soporte — no es la vía principal de compra, que es `/tienda`.

## SEO / Open Graph

Cada ruta exporta metadata estática (title, description, og:image) usando la API de metadata de Next, generada en build time — así los links compartidos por WhatsApp/Instagram muestran preview correcto (imagen, título, descripción), y el contenido es indexable por buscadores sin depender de JS del lado del cliente.

## Manejo de errores

- Formulario B2B: validación de campos requeridos en cliente antes de escribir a Firestore; mensaje de error inline si falla la escritura (ej. sin conexión) con opción de reintentar; mensaje de éxito claro al confirmar el lead.
- Reglas de seguridad de Firestore: la colección `alma_leads_empresas` permite únicamente `create` desde clientes no autenticados (no `read`/`update`/`delete` públicos), para evitar exposición de leads de otras empresas.
- Ruta `/tienda`: página placeholder simple ("Muy pronto") mientras no exista el ecommerce real, sin romper la navegación del sitio.

## Testing / QA

Al ser una landing sin lógica de negocio compleja, el foco de calidad es:
- Build de export sin errores.
- Lighthouse (performance, SEO, accesibilidad) en verde.
- Revisión visual manual en mobile y desktop.
- Prueba manual del formulario B2B (guarda correctamente en Firestore, valida campos, muestra estados de éxito/error).

No se contempla suite de unit tests dado que no hay lógica de negocio compleja en este sub-proyecto (la validación de formulario es la única lógica no trivial).

## Imágenes de producto

No existen fotos reales de ALMA todavía. Se usa fotografía stock de calidad (estilo comida saludable/meal prep, coherente con la paleta verde/crema) como placeholder para hero y sección de producto, organizada en un único punto de configuración de contenido para poder reemplazarlas fácilmente por fotos reales más adelante.

## Próximo paso

Al cerrar este sub-proyecto, el siguiente ciclo de brainstorming/plan es directamente el **ecommerce** (catálogo, carrito, checkout, pagos) — sin pausa larga entre ambos, ya que la landing depende de que el ecommerce exista para su lanzamiento real.
