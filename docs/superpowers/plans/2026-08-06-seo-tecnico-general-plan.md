# SEO técnico general — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cubrir los fundamentos técnicos de SEO del sitio ALMA (robots.txt, sitemap.xml, metadata completa por página, canonical URLs correctas, datos estructurados JSON-LD) sin tocar la arquitectura de rutas de producto.

**Architecture:** Next.js 14 App Router con `output: "export"` (export estático, sin servidor, deployado a Firebase Hosting). Se usan las *metadata routes* nativas de Next (`app/robots.js`, `app/sitemap.js`), que se compilan a archivos estáticos en el build. Los datos estructurados (JSON-LD) se agregan vía un componente cliente nuevo porque el contenido de FAQ ya se maneja 100% client-side (Firestore + `useSiteContent`), consistente con el resto del sitio.

**Tech Stack:** Next.js 14.2.5, React 18.3, Firebase (Firestore), Vitest.

## Global Constraints

- Dominio de producción: `https://alma.techdi.com.ar` (usar exactamente este valor, sin slash final, en todas las URLs absolutas).
- El sitio usa `output: "export"` — no se puede usar nada que dependa de un servidor Node en runtime (sin ISR, sin route handlers dinámicos). `app/robots.js` y `app/sitemap.js` son compatibles porque se resuelven en build time.
- Zona objetivo de copy: CABA / Buenos Aires.
- No modificar `/admin` (ya tiene `robots: { index: false, follow: false }` correctamente en `app/admin/layout.jsx`).
- No modificar `app/(site)/tienda/checkout/page.jsx` (ya tiene `robots: { index: false, follow: false }` correctamente).
- Handle de Instagram: `process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "alma.viandas"` (mismo patrón que `components/site/Contacto.jsx:5`).
- Tests nuevos van en Vitest (`npm run test`), siguiendo el patrón existente en `lib/*.test.js` (ver `lib/siteContent.test.js`): sólo se testea lógica pura (funciones que devuelven datos), no componentes React — el proyecto no tiene jsdom/React Testing Library configurado, y no se debe agregar esa infraestructura para este trabajo.
- Cambios de metadata/componentes React se verifican con `npm run build` (debe completar sin error) + inspección manual de los archivos generados en `out/`, no con tests automatizados.

---

### Task 1: `metadataBase` y `lang="es-AR"` en el layout raíz

**Files:**
- Modify: `app/layout.jsx:18-25`

**Interfaces:**
- Produces: `metadata.metadataBase` (usado implícitamente por Next para resolver URLs relativas de OG/canonical en todas las páginas hijas — Tasks 4, 5, 6).

- [ ] **Step 1: Modificar `app/layout.jsx`**

Reemplazar el bloque `metadata` y el `<html>` tag:

```jsx
export const metadata = {
  metadataBase: new URL("https://alma.techdi.com.ar"),
  title: {
    default: "ALMA — Viandas saludables 100% caseras",
    template: "%s | ALMA",
  },
  description:
    "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verificar que el proyecto sigue compilando**

Run: `npm run build`
Expected: build termina sin errores (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add app/layout.jsx
git commit -m "feat(seo): add metadataBase and es-AR lang to root layout"
```

---

### Task 2: `app/robots.js`

**Files:**
- Create: `app/robots.js`
- Test: `app/robots.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: función default `robots()` que devuelve `{ rules, sitemap }` (formato `MetadataRoute.Robots` de Next). No es consumida por otros tasks, pero debe existir antes de Task 3 para que el build genere `out/robots.txt` referenciando el sitemap.

- [ ] **Step 1: Escribir el test que falla**

Crear `app/robots.test.js`:

```js
import { describe, it, expect } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("allows all crawlers on public routes", () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/admin" });
  });

  it("points to the production sitemap", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://alma.techdi.com.ar/sitemap.xml");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run app/robots.test.js`
Expected: FAIL — `Cannot find module './robots'` (el archivo `app/robots.js` todavía no existe).

- [ ] **Step 3: Implementación mínima**

Crear `app/robots.js`:

```js
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: "https://alma.techdi.com.ar/sitemap.xml",
  };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run app/robots.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Verificar que el build genera el archivo estático**

Run: `npm run build`
Expected: build sin errores. Verificar que `out/robots.txt` existe y contiene `Disallow: /admin` y `Sitemap: https://alma.techdi.com.ar/sitemap.xml`.

- [ ] **Step 6: Commit**

```bash
git add app/robots.js app/robots.test.js
git commit -m "feat(seo): add robots.txt route"
```

---

### Task 3: `app/sitemap.js`

**Files:**
- Create: `app/sitemap.js`
- Test: `app/sitemap.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: función default `sitemap()` que devuelve un array `MetadataRoute.Sitemap`. Las URLs de producto se agregarán a este array en la Fase 2 (spec separada) — no es responsabilidad de este task.

- [ ] **Step 1: Escribir el test que falla**

Crear `app/sitemap.test.js`:

```js
import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("includes the home page with the highest priority", () => {
    const result = sitemap();
    const home = result.find((entry) => entry.url === "https://alma.techdi.com.ar/");
    expect(home).toBeTruthy();
    expect(home.priority).toBe(1.0);
  });

  it("includes the tienda page", () => {
    const result = sitemap();
    const tienda = result.find((entry) => entry.url === "https://alma.techdi.com.ar/tienda");
    expect(tienda).toBeTruthy();
    expect(tienda.priority).toBe(0.8);
  });

  it("does not include carrito or checkout", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);
    expect(urls).not.toContain("https://alma.techdi.com.ar/tienda/carrito");
    expect(urls).not.toContain("https://alma.techdi.com.ar/tienda/checkout");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run app/sitemap.test.js`
Expected: FAIL — `Cannot find module './sitemap'`.

- [ ] **Step 3: Implementación mínima**

Crear `app/sitemap.js`:

```js
export default function sitemap() {
  return [
    {
      url: "https://alma.techdi.com.ar/",
      priority: 1.0,
    },
    {
      url: "https://alma.techdi.com.ar/tienda",
      priority: 0.8,
    },
  ];
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run app/sitemap.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Verificar que el build genera el archivo estático**

Run: `npm run build`
Expected: build sin errores. Verificar que `out/sitemap.xml` existe y contiene ambas URLs.

- [ ] **Step 6: Commit**

```bash
git add app/sitemap.js app/sitemap.test.js
git commit -m "feat(seo): add sitemap.xml route"
```

---

### Task 4: Open Graph completo en el home

**Files:**
- Modify: `app/(site)/page.jsx:9-20`

**Interfaces:**
- Consumes: `metadataBase` de Task 1 (para que `openGraph.images` con URL relativa, si se usara, se resuelva bien — en este caso la imagen ya es absoluta, pero `openGraph.url` depende de `metadataBase` para no repetir el dominio).

- [ ] **Step 1: Modificar el bloque `metadata` de `app/(site)/page.jsx`**

```jsx
export const metadata = {
  description:
    "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ALMA — Viandas saludables 100% caseras",
    description:
      "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
    url: "/",
    type: "website",
    locale: "es_AR",
    images: [
      "https://images.unsplash.com/photo-1569420077790-afb136b3bb8c?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ALMA — Viandas saludables 100% caseras",
    description:
      "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
    images: [
      "https://images.unsplash.com/photo-1569420077790-afb136b3bb8c?w=1200&q=80&auto=format&fit=crop",
    ],
  },
};
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 3: Verificar manualmente las etiquetas generadas**

Abrir `out/index.html` y confirmar que contiene `<link rel="canonical" href="https://alma.techdi.com.ar/">`, `<meta property="og:url" content="https://alma.techdi.com.ar/">` y las etiquetas `twitter:*`.

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/page.jsx"
git commit -m "feat(seo): complete Open Graph and Twitter card metadata on home page"
```

---

### Task 5: Metadata de `/tienda` (OG + canonical)

**Files:**
- Modify: `app/(site)/tienda/page.jsx:3-6`

**Interfaces:**
- Consumes: `metadataBase` de Task 1.

- [ ] **Step 1: Modificar el bloque `metadata` de `app/(site)/tienda/page.jsx`**

```jsx
export const metadata = {
  title: "Tienda",
  description: "Elegí tus viandas ALMA: individuales o en packs, listas para el freezer.",
  alternates: {
    canonical: "/tienda",
  },
  openGraph: {
    title: "Tienda | ALMA",
    description: "Elegí tus viandas ALMA: individuales o en packs, listas para el freezer.",
    url: "/tienda",
    type: "website",
    locale: "es_AR",
  },
};
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 3: Verificar manualmente**

Abrir `out/tienda/index.html` y confirmar `<link rel="canonical" href="https://alma.techdi.com.ar/tienda">` y `<meta property="og:url" content="https://alma.techdi.com.ar/tienda">`.

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/tienda/page.jsx"
git commit -m "feat(seo): add canonical and Open Graph metadata to tienda page"
```

---

### Task 6: `noindex` en `/tienda/carrito`

**Files:**
- Modify: `app/(site)/tienda/carrito/page.jsx:3-5`

**Interfaces:**
- Consumes: nada nuevo (mismo patrón que `app/admin/layout.jsx` y `app/(site)/tienda/checkout/page.jsx`).

- [ ] **Step 1: Modificar el bloque `metadata` de `app/(site)/tienda/carrito/page.jsx`**

```jsx
export const metadata = {
  title: "Carrito",
  robots: { index: false, follow: false },
};
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 3: Verificar manualmente**

Abrir `out/tienda/carrito/index.html` y confirmar `<meta name="robots" content="noindex, nofollow">`.

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/tienda/carrito/page.jsx"
git commit -m "feat(seo): noindex the carrito page"
```

---

### Task 7: Componente `StructuredData` (JSON-LD Organization + FAQPage)

**Files:**
- Create: `components/site/StructuredData.jsx`
- Modify: `app/(site)/page.jsx` (montar el componente)

**Interfaces:**
- Consumes: `useSiteContent()` de `lib/useSiteContent.js` (ya existente, devuelve `{ faq: [{ id, pregunta, respuesta }], ... }`, con `defaultSiteContent` como valor inicial antes de que resuelva Firestore — ver `lib/siteContent.js:66-85`).
- Consumes: `process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE` (mismo patrón que `components/site/Contacto.jsx:5`).
- Produces: componente `StructuredData` sin props, se monta una sola vez en el home.

- [ ] **Step 1: Crear `components/site/StructuredData.jsx`**

```jsx
"use client";

import { useSiteContent } from "@/lib/useSiteContent";

const SITE_URL = "https://alma.techdi.com.ar";

export default function StructuredData() {
  const content = useSiteContent();
  const instagramHandle = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "alma.viandas";

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ALMA",
    url: SITE_URL,
    logo: `${SITE_URL}/logo/alma-mark.png`,
    sameAs: [`https://instagram.com/${instagramHandle}`],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.pregunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.respuesta,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
```

- [ ] **Step 2: Montar el componente en el home**

Modificar `app/(site)/page.jsx`: agregar el import y renderizarlo dentro del fragment, antes de `<Hero />` (no afecta el layout visual porque no renderiza nada visible).

```jsx
import StructuredData from "@/components/site/StructuredData";
import Hero from "@/components/site/Hero";
// ...resto de imports sin cambios

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <Hero />
      {/* resto sin cambios */}
    </>
  );
}
```

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 4: Verificar manualmente en el navegador**

Run: `npm run dev`, abrir `http://localhost:3000/` y con las devtools (Elements o "Ver código fuente") confirmar que hay dos `<script type="application/ld+json">` en el `<head>`/`<body>`, uno con `"@type": "Organization"` y otro con `"@type": "FAQPage"` con 4 preguntas. Pegar el contenido de cada uno en el [Rich Results Test de Google](https://search.google.com/test/rich-results) y confirmar que no marca errores.

- [ ] **Step 5: Commit**

```bash
git add components/site/StructuredData.jsx "app/(site)/page.jsx"
git commit -m "feat(seo): add Organization and FAQPage structured data to home"
```

---

## Post-implementation checklist

- [ ] `npm run test` pasa completo (todos los `*.test.js`, incluyendo los nuevos).
- [ ] `npm run build` termina sin errores.
- [ ] Se probó `/`, `/tienda` y `/tienda/carrito` en el navegador (`npm run dev`) sin regresiones visuales.
- [ ] `out/robots.txt` y `out/sitemap.xml` tienen el contenido esperado.
- [ ] Recordatorio para el usuario: después de este deploy, enviar `https://alma.techdi.com.ar/sitemap.xml` a Google Search Console (paso manual, fuera de este repo).
