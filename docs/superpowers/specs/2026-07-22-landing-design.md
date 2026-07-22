# ALMA — Landing + Panel de Administración base (Sub-proyecto 1) — Diseño

## Contexto del proyecto

ALMA es un emprendimiento gastronómico (el usuario se está asociando con un amigo) que vende viandas saludables/fit, congeladas para hornear y comer, 100% caseras y sin conservantes. El negocio tiene dos líneas:

1. **B2C** — venta directa a clientes minoristas (packs/viandas individuales). Esta es la línea que se lanza primero, vía ecommerce.
2. **B2B / Empresas** — mismo producto pero para empresas, con horario de corte de pedidos y entrega corporativa. Esta línea está **pendiente de lanzamiento**, pero debe estar presentada en la landing para captar interés anticipado.

El proyecto completo consta de 3 sistemas: **landing**, **ecommerce completo** y **backoffice**. Se decidió decomponer el trabajo en sub-proyectos secuenciales, cada uno con su propio ciclo de brainstorming → spec → plan → implementación. Este documento cubre el primer sub-proyecto: **la landing y una base mínima de backoffice** (autenticación + gestión del contenido editable de la landing), que se detalla más abajo.

Aclaración clave del usuario: la landing **no se lanza sola** — para cuando salga a producción, el ecommerce (B2C) va a existir también. Por lo tanto la landing se diseña ya asumiendo/enlazando al ecommerce como una pieza que va a existir, y apenas se cierre este sub-proyecto se arranca directo con el del ecommerce (sin pausa larga entre ambos).

No hay contenido/copy real todavía (textos, fotos de producto, testimonios) — se usa contenido genérico placeholder, estructurado para ser fácil de reemplazar después.

**Cambio de alcance decidido durante el planning:** el usuario necesita poder editar parte del contenido de la landing (textos clave, testimonios, FAQ, imágenes) sin depender de un redeploy manual a Hostinger. Ese panel de edición **es, en los hechos, el arranque del backoffice real** — el mismo panel donde más adelante se van a gestionar productos, categorías y ventas del ecommerce. Por eso este sub-proyecto pasa a incluir una base de backoffice (autenticación + gestión de contenido de la landing), pensada para poder extenderse después sin rehacerla, sin llegar todavía a gestión de pedidos/productos (eso sigue siendo parte del sub-proyecto de ecommerce).

## Identidad de marca (ya definida, no rediseñar)

- **Paleta:** verde principal `#2E4A2F`, verde oliva secundario `#8B9460`, crema claro (fondo principal) `#F7F4EE`, beige neutro (fondos secundarios) `#E8E1D5`, gris oscuro (texto) `#4B4B4B`, blanco `#FFFFFF`.
- **Uso recomendado de paleta:** 70% base crema/beige, 20% verde principal, 10% verde oliva.
- **Tipografías:** Cormorant Garamond (logo/títulos), Montserrat (texto/web/redes). Alternativas de respaldo si hace falta: Cinzel/Playfair Display/DM Serif Display (display) y Poppins/Lato/Inter (texto).
- **Concepto de marca:** Natural + Gourmet + Saludable + Profesional. Pilares visuales: Alimentación consciente, Cocina artesanal, Conservación premium, Bienestar y practicidad (cada uno con su ícono ya definido en el manual).
- **Logo:** isotipo circular (letra "A" + gorro de cocinero superpuesto + ramita de hojas) + logotipo completo "ALMA — Servicios Gastronómicos" con tagline "Nutrimos momentos, creamos bienestar". Solo existen en JPEG con fondo blanco — **se recrean como SVG fieles al original con fondo transparente** para poder usarse sobre fondos de color.
- Assets fuente de marca: 3 imágenes JPEG en la raíz del proyecto (manual de marca + 2 variantes de logo), ya revisadas.

## Alcance de este sub-proyecto

**Incluye:**
- Landing page completa (8 secciones, ver abajo), con contenido híbrido: lo crítico de SEO estático en build, lo editable dinámico desde Firestore/Storage.
- Formulario de leads B2B guardando en Firestore.
- Botón flotante de WhatsApp.
- SVGs de marca.
- Panel de administración base (`/admin`): login, gestión de usuarios admin, gestión del contenido editable de la landing (textos clave, testimonios, FAQ, imágenes).
- Scaffold técnico base del proyecto (aplica también a los sub-proyectos futuros).

**No incluye (queda para el sub-proyecto de ecommerce):** catálogo de productos, carrito, checkout, pagos, gestión de pedidos/stock dentro del admin, backend Express/Railway (se crea recién cuando el ecommerce lo requiera de verdad — pagos, stock, webhooks).

## Stack técnico

- **Framework:** Next.js (App Router), con `output: 'export'` para generar build estático (carpeta `out/`) — compatible con el flujo de deploy manual a Hostinger (el usuario sube el build por File Manager/FTP).
- **Estilos:** CSS Modules (sin framework de utilidades) — da control fino sobre la tipografía editorial de la marca.
- **Animación:** GSAP + ScrollTrigger (vía `@gsap/react`) como único motor de animación, en línea con la dirección de motion "dinámico/bold" elegida (pinning de secciones, reveals en cascada, parallax). Se evita sumar una segunda librería de animación.
- **Datos:** Firebase (Firestore + Storage + Auth), todas las colecciones con prefijo `alma_` (ej. `alma_leads_empresas`, `alma_site_content`, `alma_admins`). Se usa el SDK cliente de Firebase directo desde el navegador — sin backend intermedio en esta etapa.
- **Backend:** ninguno en esta etapa. Cuando arranque el ecommerce se evalúa Express desplegado en Railway (pagos, stock, pedidos, webhooks).
- **Deploy:** build estático manual subido a Hostinger.
- **Router interno:** rutas limpias de Next (no hash-routing), compatibles con SEO y con hosting estático.
- **Modelo de renderizado híbrido:** el HTML de cada página se genera estático en build time (bueno para SEO/OG). El contenido marcado como "editable" (ver sección Panel de administración) no se hardcodea: al cargar la página en el navegador, un componente cliente lee ese contenido desde Firestore/Storage y lo muestra, con el placeholder/copy genérico como fallback mientras carga o si el campo todavía no fue editado. Así el admin edita contenido y se refleja en el próximo load de la página, sin rebuild ni resubida a Hostinger. Los campos que son puramente de SEO (meta title/description, og:image) siguen siendo estáticos de build, ya que los crawlers de redes sociales no ejecutan JS.

### Motivo del cambio de stack respecto al "stack de siempre" del usuario

El usuario mencionó inicialmente Vite + React + HashRouter. Se cambió a Next.js con export estático porque:
- HashRouter + CSR puro deja el HTML inicial vacío → mal SEO y mal preview al compartir links por WhatsApp/Instagram (crítico para un negocio de comida que se difunde por esos canales).
- Next con export estático resuelve esto (HTML con meta/OG tags ya generado en build time) sin perder la posibilidad de alojar en Hostinger como sitio estático.
- La única funcionalidad que se resigna son las API routes de servidor (no hay servidor en hosting estático) — no se necesitan en esta etapa porque los formularios escriben directo a Firestore.

## Estructura de secciones

1. **Header / Nav** — fijo; transparente sobre el hero, se vuelve sólido (crema) al hacer scroll. Logo + links (Nosotros, Producto, Empresas, FAQ, Contacto) + link **Tienda** + CTA "Pedir ahora".
2. **Hero** — full-bleed con imagen de fondo (placeholder gráfico de marca hasta que se suba una foto real desde el admin) + overlay verde sutil. Titular en Cormorant Garamond + bajada en Montserrat (editables desde el admin) + tagline de marca fija ("Nutrimos momentos, creamos bienestar"). CTA principal **"Pedir ahora" → ruta interna `/tienda`** (placeholder por ahora, será el ecommerce real en el próximo sub-proyecto) + CTA secundario "Ver cómo funciona" (scroll a sección Producto). Animación: texto entra en cascada (stagger), imagen con parallax leve al hacer scroll.
3. **Nosotros** — filosofía de marca (100% casera, sin conservantes, editable desde el admin) + los 4 pilares visuales del manual (Alimentación consciente / Cocina artesanal / Conservación premium / Bienestar y practicidad) con sus íconos, fijos. Animación: los 4 pilares se arman en scroll (stagger reveal).
4. **Producto / Cómo funciona** — 3-4 pasos ilustrados fijos (elegís tus viandas → las preparamos frescas → las recibís → horno y listo) + grid de categorías de viandas (nombre + imagen, ambos editables desde el admin; ej: Clásicas, Fitness, Veggie, Kids como contenido genérico inicial). Animación: pinning de la sección mientras se recorre el proceso paso a paso.
5. **Empresas (B2B)** — sección visualmente diferenciada (fondo verde oscuro, texto crema) para marcar que es la otra línea de negocio. Explica el servicio (pedidos con horario de corte, entrega en oficina), badge de "línea pendiente de lanzamiento" y formulario de lead: empresa, contacto, email, teléfono, tamaño aprox. de equipo → colección Firestore `alma_leads_empresas`.
6. **Testimonios** — grid/carrusel simple con 3-4 testimonios placeholder genéricos, fácil de reemplazar por reales.
7. **FAQ** — acordeón animado, preguntas genéricas típicas (conservación, tiempos de cocción/horno, zonas de entrega, medios de pago).
8. **Contacto / CTA final** — repite CTA hacia `/tienda`, link a Instagram, mini-form de contacto general opcional, footer con logo, links de navegación y datos de contacto placeholder.

**WhatsApp:** botón flotante secundario (esquina inferior, visible en toda la landing) + presencia en el footer, para consultas/soporte — no es la vía principal de compra, que es `/tienda`.

### Qué contenido de cada sección es editable desde el admin

- **Hero:** título, bajada, imagen de fondo.
- **Nosotros:** texto de filosofía de marca.
- **Producto / Cómo funciona:** texto descriptivo, imágenes de las categorías (nombre + foto por categoría).
- **Empresas:** texto descriptivo del servicio B2B.
- **Testimonios:** lista completa (CRUD: agregar/editar/eliminar cada testimonio — autor, texto, opcionalmente foto).
- **FAQ:** lista completa (CRUD: agregar/editar/eliminar pregunta+respuesta).
- **Fijo en código (no editable desde el admin en esta etapa):** nav, textos legales/footer, tagline de marca, textos de los pasos "Cómo funciona" (son de marca, no cambian seguido), copy del formulario B2B.

## Panel de administración (base del backoffice)

Vive en el mismo proyecto Next.js, bajo `/admin/*`, exportado estáticamente igual que el resto del sitio — no necesita servidor porque autenticación y datos se resuelven client-side contra Firebase (Auth + Firestore + Storage), protegidos por las reglas de seguridad. Rutas no indexables (`robots: noindex` + excluidas del sitemap).

### Autenticación y usuarios

- **Firebase Auth** con email/contraseña (sin login social por ahora).
- Colección `alma_admins` en Firestore: un documento por usuario admin, con `{ uid, email, role, createdAt }`, donde `role` es `"superadmin"` o `"admin"`. El `uid` del documento coincide con el `uid` de Firebase Auth.
- **Bootstrap del primer superadmin:** se crea a mano una vez desde la consola de Firebase Auth (email/contraseña) + un documento manual en `alma_admins` con `role: "superadmin"`. Es un paso único de setup, documentado en el plan de implementación.
- **Crear nuevos admins:** solo un `superadmin` ve la pantalla `/admin/usuarios`. Ahí puede crear un nuevo usuario (email + contraseña temporal) y su documento en `alma_admins` con `role: "admin"`. Como no hay backend, la creación usa una **segunda instancia temporal de la app de Firebase** (patrón estándar para crear usuarios desde el cliente sin cerrar la sesión del superadmin actual) — se crea el usuario en esa instancia secundaria y se descarta, sin afectar la sesión activa.
- Un `admin` (no superadmin) puede editar contenido pero no ve `/admin/usuarios` ni puede crear/borrar otros usuarios.
- Todas las rutas bajo `/admin` (excepto `/admin/login`) redirigen a `/admin/login` si no hay sesión activa o si el `uid` no tiene documento en `alma_admins`.

### Gestión de contenido (`/admin/contenido`)

Pantalla con las secciones editables listadas arriba: campos de texto simples para hero/nosotros/producto/empresas, y dos sub-secciones con CRUD (testimonios, FAQ). Las imágenes se suben a Firebase Storage bajo `alma/site/` (ej. `alma/site/hero.jpg`, `alma/site/categorias/clasicas.jpg`) y el documento en Firestore guarda la URL de descarga. Se valida tipo de archivo (jpg/png/webp) y tamaño máximo (5MB) antes de subir.

### Datos: colección `alma_site_content`

Un único documento (`alma_site_content/landing`) con esta forma:

```js
{
  hero: { titulo: string, bajada: string, imagenUrl: string },
  nosotros: { texto: string },
  producto: { texto: string, categorias: [{ nombre: string, imagenUrl: string }] },
  empresas: { texto: string },
  testimonios: [{ id: string, autor: string, texto: string, fotoUrl: string | null }],
  faq: [{ id: string, pregunta: string, respuesta: string }]
}
```

Si el documento no existe todavía o un campo viene vacío, la landing usa el contenido genérico placeholder como fallback — nunca muestra un hueco vacío.

### Reglas de seguridad (Firestore)

- `alma_site_content/*`: lectura pública (`read: true`), escritura solo si `request.auth.uid` tiene documento en `alma_admins`.
- `alma_admins/*`: lectura solo del propio documento (`request.auth.uid == resource.id`) o de cualquier admin autenticado (para poblar `/admin/usuarios`); escritura solo si quien escribe es `superadmin`.
- `alma_leads_empresas/*`: como ya estaba definido — `create` público, sin `read`/`update`/`delete` públicos (los admins sí pueden leer, para hacer seguimiento comercial).

**Nota importante para la implementación:** el proyecto de Firebase (`pedidos-lett-2`) es compartido con otra app existente (LETT). Las reglas de Firestore son un único documento por proyecto — al escribir `firestore.rules` hay que **fusionar** con las reglas existentes, no sobrescribirlas. El deploy de reglas a este proyecto compartido se hace manualmente y debe confirmarse antes de aplicar.

## SEO / Open Graph

Cada ruta exporta metadata estática (title, description, og:image) usando la API de metadata de Next, generada en build time — así los links compartidos por WhatsApp/Instagram muestran preview correcto (imagen, título, descripción), y el contenido es indexable por buscadores sin depender de JS del lado del cliente.

## Manejo de errores

- Formulario B2B: validación de campos requeridos en cliente antes de escribir a Firestore; mensaje de error inline si falla la escritura (ej. sin conexión) con opción de reintentar; mensaje de éxito claro al confirmar el lead.
- Reglas de seguridad de Firestore: la colección `alma_leads_empresas` permite únicamente `create` desde clientes no autenticados (no `read`/`update`/`delete` públicos), para evitar exposición de leads de otras empresas.
- Ruta `/tienda`: página placeholder simple ("Muy pronto") mientras no exista el ecommerce real, sin romper la navegación del sitio.
- Login de admin: mensaje de error claro en credenciales inválidas; si el `uid` autenticado no tiene documento en `alma_admins`, se cierra la sesión y se muestra "No tenés acceso al panel".
- Carga de contenido dinámico (`alma_site_content`) en la landing: si falla la lectura de Firestore (sin conexión, etc.), se usa silenciosamente el contenido genérico placeholder — la landing nunca debe romperse ni mostrar un error visible a un visitante público por esto.
- Subida de imágenes en el admin: validación de tipo (jpg/png/webp) y tamaño (máx. 5MB) antes de subir a Storage, con mensaje de error si no cumple.

## Testing / QA

Al ser una landing sin lógica de negocio compleja, el foco de calidad es:
- Build de export sin errores.
- Lighthouse (performance, SEO, accesibilidad) en verde.
- Revisión visual manual en mobile y desktop.
- Prueba manual del formulario B2B (guarda correctamente en Firestore, valida campos, muestra estados de éxito/error).
- Prueba manual del panel de admin: login, edición de cada campo de contenido, CRUD de testimonios/FAQ, subida de imagen, y verificación de que el cambio aparece en la landing pública sin rebuild.

Se agregan unit tests (Vitest) para la lógica no trivial: validación del formulario de leads B2B y validación de subida de imágenes en el admin. No se contempla suite de unit tests para el resto (componentes visuales, integración con Firebase) dado el alcance de este sub-proyecto.

## Imágenes de producto

No existen fotos reales de ALMA todavía. Se cargan fotos stock de calidad (estilo comida saludable/meal prep, coherente con la paleta verde/crema) como imagen inicial del hero y de cada categoría de producto, subidas directamente a Firebase Storage durante la implementación. El mecanismo real para reemplazarlas es `/admin/contenido` (sube a Storage y actualiza `alma_site_content`) — el usuario las va a ir reemplazando por fotografía propia cuando la tenga, sin necesitar ningún cambio de código ni redeploy. Como red de seguridad, si en algún momento un campo de imagen queda vacío (documento no creado todavía, fetch fallido, etc.), se muestra un placeholder gráfico de marca (gradiente con la paleta verde-crema y el isotipo) en vez de un hueco roto.

## Próximo paso

Al cerrar este sub-proyecto, el siguiente ciclo de brainstorming/plan es directamente el **ecommerce** (catálogo, carrito, checkout, pagos) — sin pausa larga entre ambos, ya que la landing depende de que el ecommerce exista para su lanzamiento real.
