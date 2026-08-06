# Spec: SEO técnico general

**Fecha:** 2026-08-06
**Estado:** Fase 1 de 2 (ver "Fuera de alcance" para la Fase 2)

## Contexto

El sitio (Next.js, `output: "export"`, desplegado en Firebase Hosting como export
estático, sin servidor) tiene metadata SEO mínima:

- No existe `robots.txt` ni `sitemap.xml`.
- El home (`app/(site)/page.jsx`) tiene title/description/OG básicos, pero sin
  `metadataBase`, por lo que las URLs de OG pueden resolverse como relativas.
- `/tienda` tiene title/description propios pero sin Open Graph.
- `/tienda/carrito` y `/tienda/checkout` no tienen metadata propia y son
  indexables por defecto, pese a ser páginas transaccionales sin valor de
  búsqueda.
- `/admin` ya tiene `robots: { index: false, follow: false }` — no requiere
  cambios.
- No hay datos estructurados (JSON-LD) de ningún tipo.
- `<html lang="es">` no distingue variante regional.

Dominio de producción: `https://alma.techdi.com.ar`.
Zona objetivo para copy: CABA / Buenos Aires.

## Objetivo

Cubrir los fundamentos técnicos de SEO que no dependen de la arquitectura de
rutas actual: rastreo (robots/sitemap), metadata completa por página,
canonical URLs correctas, y datos estructurados básicos del negocio. Todo
compatible con `output: "export"`.

## Diseño

### 1. `metadataBase` y `lang`

En `app/layout.jsx`:
- Agregar `metadataBase: new URL("https://alma.techdi.com.ar")` al objeto
  `metadata` exportado, para que toda URL relativa de OG/canonical en
  cualquier página se resuelva en absoluto automáticamente.
- Cambiar `<html lang="es">` a `<html lang="es-AR">`.

### 2. `app/robots.js`

Route de metadata (`MetadataRoute.Robots`), compatible con export estático:

```js
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }],
    sitemap: "https://alma.techdi.com.ar/sitemap.xml",
  };
}
```

### 3. `app/sitemap.js`

Route de metadata (`MetadataRoute.Sitemap`) con las rutas públicas estáticas
conocidas hoy:

```js
export default function sitemap() {
  return [
    { url: "https://alma.techdi.com.ar/", priority: 1.0 },
    { url: "https://alma.techdi.com.ar/tienda", priority: 0.8 },
  ];
}
```

Nota: las URLs de producto se sumarán en la Fase 2 (ver "Fuera de alcance"),
cuando existan rutas individuales por producto. `/tienda/carrito` y
`/tienda/checkout` quedan fuera del sitemap (ver punto 4).

### 4. Metadata por página

- `app/(site)/page.jsx` (home): completar el `openGraph` existente con `url`,
  `type: "website"` y `locale: "es_AR"`. Agregar bloque `twitter` (`card:
  "summary_large_image"`).
- `app/(site)/tienda/page.jsx`: agregar `openGraph` equivalente (title,
  description, url).
- `app/(site)/tienda/carrito/page.jsx` y
  `app/(site)/tienda/checkout/page.jsx`: agregar
  `export const metadata = { title: "...", robots: { index: false, follow: false } }`,
  mismo patrón que ya usa `app/admin/layout.jsx`.

### 5. JSON-LD

Nuevo componente `components/site/StructuredData.jsx` (server component, sin
`"use client"`) que renderiza un `<script type="application/ld+json">` con:

- **Organization**: `name: "ALMA"`, `url`, `logo` (usar el logo ya en
  `public/logo`), `sameAs: ["https://instagram.com/alma.viandas"]` (mismo
  handle que ya usa `Contacto.jsx`, vía `NEXT_PUBLIC_INSTAGRAM_HANDLE`).
- **FAQPage**: generado a partir de las preguntas/respuestas que ya existen
  como contenido en `components/site/Faq.jsx` — sin inventar contenido nuevo,
  solo estructurando el que ya está.

Se monta una sola vez en `app/(site)/page.jsx` (home), que es donde vive el
componente `Faq`.

### 6. Alt text

Ya verificado: todas las etiquetas `<img>` en `components/site` y
`components/tienda` tienen `alt` puesto. No se requiere cambio, solo se deja
constancia de la revisión.

## Fuera de alcance (Fase 2 — spec separada)

La página de producto (`/tienda/producto?id=X`) comparte una única URL para
todos los productos, sin metadata ni datos estructurados propios — es la
mejora de mayor impacto pendiente, pero implica cambiar de query param a
rutas dinámicas (`/tienda/producto/[slug]`) con `generateStaticParams` desde
Firestore en build time. Como el sitio es export estático sin CI, esto
significa que el SEO de producto (título, descripción, sitemap) sólo se
actualiza en el próximo `next build` + redeploy manual. Se aborda en una
spec y plan separados, ya aprobado el enfoque general con el usuario.

## Testing

- `npm run build` debe completar sin errores con `output: "export"` y generar
  `out/robots.txt` y `out/sitemap.xml`.
- Verificar manualmente que `out/robots.txt` y `out/sitemap.xml` tengan el
  contenido esperado.
- Validar el JSON-LD del home con el
  [Rich Results Test de Google](https://search.google.com/test/rich-results)
  después de deployar (fuera del alcance de este repo, pero se deja como
  paso de verificación post-deploy).
