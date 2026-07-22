# ALMA — Landing + Panel de Administración base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js static-export landing page for ALMA (viandas saludables) with 8 content sections, a B2B lead form, and a minimal authenticated admin panel (foundation of the future backoffice) that lets the two founders edit landing text, testimonials, FAQ, and images from the browser without a rebuild.

**Architecture:** Next.js App Router with `output: 'export'` (static HTML/CSS/JS, deployed by manually uploading the `out/` folder to Hostinger). No backend server. Firebase (Auth + Firestore + Storage, client SDK only) provides authentication, the editable-content store, lead capture, and image storage. SEO-critical text (meta tags, hero copy) renders statically at build time; editable content (hero copy/image, testimonials, FAQ, category images) is fetched client-side from Firestore on page load, falling back to bundled defaults so the page never shows a gap.

**Tech Stack:** Next.js 14 (App Router, JavaScript, no TypeScript), CSS Modules, GSAP + `@gsap/react` (ScrollTrigger) for all animation, Firebase JS SDK v10 (Auth, Firestore, Storage), Vitest for unit tests.

## Global Constraints

- JavaScript only (`.jsx`/`.js`), no TypeScript.
- All Firestore collections are prefixed `alma_` (`alma_leads_empresas`, `alma_site_content`, `alma_admins`).
- CSS Modules only — no Tailwind or other utility CSS framework.
- GSAP + `@gsap/react` is the only animation library; do not add Framer Motion or others.
- Firebase client SDK only. No Express/API routes/backend in this plan — that's reserved for the ecommerce sub-project.
- `next.config.mjs` must keep `output: 'export'` working after every task — run `npm run build` before each commit that touches routing/config.
- Copy is in Spanish (es-AR), generic placeholder content per the spec — already finalized in this plan, not left as TODO.
- `firestore.rules` / `storage.rules` are written to local files only. **Never run `firebase deploy` from this plan** — the Firebase project (`pedidos-lett-2`) is shared with another app (LETT); rules must be manually reviewed and merged by the user before deploying.
- Brand palette: `--color-verde-principal: #2E4A2F`, `--color-verde-oliva: #8B9460`, `--color-crema: #F7F4EE`, `--color-beige: #E8E1D5`, `--color-texto: #4B4B4B`, `--color-blanco: #FFFFFF`.
- Fonts: Cormorant Garamond (display/titles), Montserrat (body/UI) — loaded via `next/font/google`.
- Path alias `@/` maps to the project root (configured in `jsconfig.json`).

---

## Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `jsconfig.json`
- Create: `.gitignore` (already exists — verify/extend, do not duplicate entries)
- Create: `.env.example`
- Create: `.env.local` (gitignored — real Firebase values go here)
- Create: `vitest.config.mjs`
- Create: `app/layout.jsx` (minimal placeholder, replaced in Task 2)
- Create: `app/page.jsx` (minimal placeholder, replaced in Task 17)
- Create: `app/globals.css` (empty placeholder, filled in Task 2)

**Interfaces:**
- Produces: a working `npm run dev`, `npm run build`, `npm run test` pipeline that every later task builds on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "alma",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "firebase": "^10.12.5",
    "gsap": "^3.12.5",
    "@gsap/react": "^2.1.1"
  },
  "devDependencies": {
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 3: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

`images.unoptimized: true` is required because static export has no server to run Next's image optimizer.

- [ ] **Step 4: Create `jsconfig.json`**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 5: Create `.env.example`**

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_WHATSAPP_NUMBER=5491100000000
NEXT_PUBLIC_INSTAGRAM_HANDLE=alma.viandas
```

- [ ] **Step 6: Create `.env.local` (real values, gitignored)**

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAfs5Jxhk0TgsIhSeKpgJ-w6xMkUSGE4Zc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pedidos-lett-2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pedidos-lett-2
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pedidos-lett-2.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=459720672669
NEXT_PUBLIC_FIREBASE_APP_ID=1:459720672669:web:71b5979cce50dcb1219b74
NEXT_PUBLIC_WHATSAPP_NUMBER=5491100000000
NEXT_PUBLIC_INSTAGRAM_HANDLE=alma.viandas
```

Note: `NEXT_PUBLIC_WHATSAPP_NUMBER` is a placeholder — replace with the real ALMA WhatsApp Business number before going live.

- [ ] **Step 7: Verify `.gitignore` covers `.env.local`**

Confirm `.gitignore` (created in the brainstorming phase) already lists `.env.local` — it does. No changes needed.

- [ ] **Step 8: Create `vitest.config.mjs`**

```js
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.js"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 9: Create placeholder `app/layout.jsx`**

```jsx
export const metadata = {
  title: "ALMA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Create placeholder `app/page.jsx`**

```jsx
export default function HomePage() {
  return <p>ALMA — en construcción</p>;
}
```

- [ ] **Step 11: Create empty `app/globals.css`**

```css
/* filled in Task 2 */
```

- [ ] **Step 12: Verify dev server runs**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`, page shows "ALMA — en construcción" with no console errors. Stop the server after verifying (Ctrl+C).

- [ ] **Step 13: Verify build works**

Run: `npm run build`
Expected: build succeeds, `out/` folder created containing `index.html`.

- [ ] **Step 14: Verify test runner works**

Run: `npm test`
Expected: "No test files found" (or passes with 0 tests) — no errors.

- [ ] **Step 15: Commit**

```bash
git add package.json package-lock.json next.config.mjs jsconfig.json .env.example vitest.config.mjs app/layout.jsx app/page.jsx app/globals.css .gitignore
git commit -m "chore: scaffold Next.js project with static export, Vitest"
```

(`.env.local` is gitignored and must NOT be committed.)

---

## Task 2: Design tokens, fonts, base layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.jsx`

**Interfaces:**
- Produces: CSS custom properties (`--color-*`, `--font-*`, `--space-*`, `--container-max`) usable by every component from here on; `--font-cormorant` and `--font-montserrat` CSS variables from `next/font`.

- [ ] **Step 1: Write `app/globals.css`**

```css
:root {
  --color-verde-principal: #2e4a2f;
  --color-verde-oliva: #8b9460;
  --color-crema: #f7f4ee;
  --color-beige: #e8e1d5;
  --color-texto: #4b4b4b;
  --color-blanco: #ffffff;

  --font-display: var(--font-cormorant), Georgia, serif;
  --font-body: var(--font-montserrat), Arial, sans-serif;

  --container-max: 1200px;
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 2rem;
  --space-lg: 4rem;
  --space-xl: 8rem;
  --radius: 4px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-crema);
  color: var(--color-texto);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  color: var(--color-verde-principal);
  line-height: 1.15;
  font-weight: 600;
}

h1 {
  font-size: clamp(2.5rem, 5vw, 4.5rem);
}

h2 {
  font-size: clamp(2rem, 3.5vw, 3rem);
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  display: block;
}

.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--space-md);
}

.section {
  padding: var(--space-xl) 0;
}

.sectionLabel {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.8rem;
  color: var(--color-verde-oliva);
  font-weight: 600;
}
```

Note: `.container`, `.section`, `.sectionLabel` are global utility classes (not CSS Modules) intentionally, since every section needs the same container/rhythm — keeps section components DRY.

- [ ] **Step 2: Write `app/layout.jsx`**

```jsx
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  title: {
    default: "ALMA — Viandas saludables 100% caseras",
    template: "%s | ALMA",
  },
  description:
    "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: background is crema (`#F7F4EE`), body text renders in Montserrat. Inspect an `<h1>`-tag element (none exists yet, this is just a base check) — no console errors, no font-loading errors in Network tab.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.jsx
git commit -m "feat: add brand design tokens, fonts, base layout"
```

---

## Task 3: Brand SVG assets + Logo component

**Files:**
- Create: `public/logo/alma-isotipo.svg`
- Create: `public/logo/alma-logotipo.svg`
- Create: `components/site/Logo.jsx`

**Interfaces:**
- Produces: `<Logo variant="isotipo" | "logotipo" className={...} />`, used by Header (Task 7) and Footer (Task 15).

- [ ] **Step 1: Create `public/logo/alma-isotipo.svg`**

Vector recreation of the circular mark (ring with 3 fading dots, serif "A", chef hat, olive leaves) in brand colors:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
  <circle cx="100" cy="100" r="78" stroke="#2E4A2F" stroke-width="2.5"/>
  <circle cx="163" cy="55" r="2.6" fill="#2E4A2F"/>
  <circle cx="172" cy="64" r="2.2" fill="#4F6B45"/>
  <circle cx="179" cy="74" r="1.8" fill="#8B9460"/>
  <text x="100" y="120" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="96" font-weight="600" fill="#2E4A2F">A</text>
  <path d="M62 126c14-3 25-13 25-13s-7 16-23 23c-10 4-25 2-25 2s9-9 23-12z" fill="#8B9460"/>
  <path d="M41 137c13 0 27 6 27 6s-14 11-28 9c-9-1-18-9-18-9s9-6 19-6z" fill="#6E8151"/>
  <path d="M31 150c11-2 25 2 25 2s-11 9-23 9c-8 0-17-5-17-5s6-4 15-6z" fill="#8B9460"/>
  <path d="M117 152c0-14 10-25 24-25s24 11 24 25c0 7-3 11-3 11h-42s-3-4-3-11z" fill="none" stroke="#2E4A2F" stroke-width="2.5"/>
  <path d="M120 163h42v6a4 4 0 0 1-4 4h-34a4 4 0 0 1-4-4v-6z" fill="none" stroke="#2E4A2F" stroke-width="2.5"/>
</svg>
```

- [ ] **Step 2: Create `public/logo/alma-logotipo.svg`**

Full lockup: isotipo above the "ALMA" wordmark, subtitle, and tagline:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 600" fill="none">
  <g transform="translate(110, 30) scale(1)">
    <circle cx="100" cy="100" r="78" stroke="#2E4A2F" stroke-width="2.5"/>
    <circle cx="163" cy="55" r="2.6" fill="#2E4A2F"/>
    <circle cx="172" cy="64" r="2.2" fill="#4F6B45"/>
    <circle cx="179" cy="74" r="1.8" fill="#8B9460"/>
    <text x="100" y="120" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="96" font-weight="600" fill="#2E4A2F">A</text>
    <path d="M62 126c14-3 25-13 25-13s-7 16-23 23c-10 4-25 2-25 2s9-9 23-12z" fill="#8B9460"/>
    <path d="M41 137c13 0 27 6 27 6s-14 11-28 9c-9-1-18-9-18-9s9-6 19-6z" fill="#6E8151"/>
    <path d="M31 150c11-2 25 2 25 2s-11 9-23 9c-8 0-17-5-17-5s6-4 15-6z" fill="#8B9460"/>
    <path d="M117 152c0-14 10-25 24-25s24 11 24 25c0 7-3 11-3 11h-42s-3-4-3-11z" fill="none" stroke="#2E4A2F" stroke-width="2.5"/>
    <path d="M120 163h42v6a4 4 0 0 1-4 4h-34a4 4 0 0 1-4-4v-6z" fill="none" stroke="#2E4A2F" stroke-width="2.5"/>
  </g>
  <text x="210" y="450" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="70" font-weight="600" letter-spacing="10" fill="#2E4A2F">ALMA</text>
  <text x="210" y="485" text-anchor="middle" font-family="'Montserrat', Arial, sans-serif" font-size="15" letter-spacing="4" fill="#2E4A2F">SERVICIOS GASTRONOMICOS</text>
  <text x="210" y="525" text-anchor="middle" font-family="'Montserrat', Arial, sans-serif" font-size="12" letter-spacing="2" fill="#8B9460">NUTRIMOS MOMENTOS, CREAMOS BIENESTAR</text>
</svg>
```

- [ ] **Step 3: Create `components/site/Logo.jsx`**

```jsx
export default function Logo({ variant = "isotipo", className = "" }) {
  const src = variant === "isotipo" ? "/logo/alma-isotipo.svg" : "/logo/alma-logotipo.svg";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="ALMA" className={className} />;
}
```

- [ ] **Step 4: Verify visually**

Temporarily render `<Logo variant="logotipo" />` in `app/page.jsx`, run `npm run dev`, confirm it renders as a recognizable green circular mark + "ALMA" wordmark on the crema background. Remove the temporary render afterward (page.jsx keeps its Task 1 placeholder content until Task 17).

- [ ] **Step 5: Commit**

```bash
git add public/logo/alma-isotipo.svg public/logo/alma-logotipo.svg components/site/Logo.jsx
git commit -m "feat: add brand SVG logo assets and Logo component"
```

---

## Task 4: Firebase client init

**Files:**
- Create: `lib/firebase.js`
- Create: `lib/gsap.js`

**Interfaces:**
- Produces: `auth`, `db`, `storage`, `firebaseApp`, `firebaseConfig` exports from `lib/firebase.js`; `gsap`, `ScrollTrigger` exports from `lib/gsap.js` (ScrollTrigger pre-registered).

- [ ] **Step 1: Create `lib/firebase.js`**

```js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
```

- [ ] **Step 2: Create `lib/gsap.js`**

```js
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
```

- [ ] **Step 3: Verify Firebase initializes without error**

Temporarily add `import { db } from "@/lib/firebase"; console.log(db);` at the top of `app/page.jsx`, run `npm run dev`, confirm no error in terminal or browser console (a Firestore instance object logs). Remove the temporary import/log afterward.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase.js lib/gsap.js
git commit -m "feat: add Firebase client init and shared GSAP config"
```

---

## Task 5: Site content model (defaults + merge logic + hook)

**Files:**
- Create: `lib/siteContent.js`
- Create: `lib/siteContent.test.js`
- Create: `lib/useSiteContent.js`

**Interfaces:**
- Consumes: `db` from `lib/firebase.js`.
- Produces: `defaultSiteContent` (object), `mergeSiteContent(remote, defaults?)` (pure function), `useSiteContent()` (React hook returning the merged content object) — used by every section component from Task 8 onward.

- [ ] **Step 1: Write the failing test for `mergeSiteContent`**

```js
// lib/siteContent.test.js
import { describe, it, expect } from "vitest";
import { mergeSiteContent, defaultSiteContent } from "./siteContent";

describe("mergeSiteContent", () => {
  it("returns defaults when remote is null", () => {
    expect(mergeSiteContent(null)).toEqual(defaultSiteContent);
  });

  it("returns defaults when remote is undefined", () => {
    expect(mergeSiteContent(undefined)).toEqual(defaultSiteContent);
  });

  it("prefers a non-empty remote hero title over the default", () => {
    const result = mergeSiteContent({ hero: { titulo: "Nuevo titulo" } });
    expect(result.hero.titulo).toBe("Nuevo titulo");
    expect(result.hero.bajada).toBe(defaultSiteContent.hero.bajada);
  });

  it("falls back to default hero title when remote value is an empty string", () => {
    const result = mergeSiteContent({ hero: { titulo: "   " } });
    expect(result.hero.titulo).toBe(defaultSiteContent.hero.titulo);
  });

  it("uses remote categorias only when the array is non-empty", () => {
    const result = mergeSiteContent({ producto: { categorias: [] } });
    expect(result.producto.categorias).toEqual(defaultSiteContent.producto.categorias);
  });

  it("uses remote testimonios when provided", () => {
    const remoteTestimonios = [{ id: "x1", autor: "Ana", texto: "Buenísimo", fotoUrl: null }];
    const result = mergeSiteContent({ testimonios: remoteTestimonios });
    expect(result.testimonios).toEqual(remoteTestimonios);
  });

  it("uses default faq when remote faq is missing", () => {
    const result = mergeSiteContent({});
    expect(result.faq).toEqual(defaultSiteContent.faq);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `lib/siteContent.js` does not exist yet / `mergeSiteContent` is not defined.

- [ ] **Step 3: Write `lib/siteContent.js`**

```js
export const defaultSiteContent = {
  hero: {
    titulo: "Comida real, sin vueltas",
    bajada:
      "Viandas 100% caseras, sin conservantes, listas para el horno. Cociná menos, comé mejor.",
    imagenUrl:
      "https://images.unsplash.com/photo-1569420077790-afb136b3bb8c?w=1800&q=80&auto=format&fit=crop",
  },
  nosotros: {
    texto:
      "En ALMA cocinamos como en casa: ingredientes reales, porciones pensadas para vos y cero conservantes. Cada vianda se prepara de forma artesanal y pasa a conservación premium para llegar a tu mesa igual de rica que recién hecha.",
  },
  producto: {
    texto:
      "Elegís tus viandas, las guardás en el freezer y las horneás cuando las vayas a comer. Así de simple.",
    categorias: [
      {
        nombre: "Clásicas",
        imagenUrl:
          "https://images.unsplash.com/photo-1632852576480-c10a8e19496a?w=900&q=80&auto=format&fit=crop",
      },
      {
        nombre: "Fitness",
        imagenUrl:
          "https://images.unsplash.com/photo-1668838289210-e7665d947145?w=900&q=80&auto=format&fit=crop",
      },
      {
        nombre: "Veggie",
        imagenUrl:
          "https://images.unsplash.com/photo-1543353071-c953d88f7033?w=900&q=80&auto=format&fit=crop",
      },
      {
        nombre: "Kids",
        imagenUrl:
          "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?w=900&q=80&auto=format&fit=crop",
      },
    ],
  },
  empresas: {
    texto:
      "Llevamos ALMA a tu oficina: pedidos con horario de corte, entrega puntual y el mismo estándar casero de siempre para todo tu equipo.",
  },
  testimonios: [
    {
      id: "t1",
      autor: "Julia R.",
      texto: "Dejé de improvisar el almuerzo entre reuniones. Pido mi semana de viandas y listo.",
      fotoUrl: null,
    },
    {
      id: "t2",
      autor: "Nico M.",
      texto: "Se nota que no llevan conservantes, tienen gusto a comida de casa.",
      fotoUrl: null,
    },
    {
      id: "t3",
      autor: "Caro P.",
      texto: "Las fitness me salvaron la rutina, quedan riquísimas incluso recalentadas.",
      fotoUrl: null,
    },
  ],
  faq: [
    {
      id: "f1",
      pregunta: "¿Cuánto duran en el freezer?",
      respuesta: "Hasta 3 meses conservadas a -18°C sin perder sabor ni textura.",
    },
    {
      id: "f2",
      pregunta: "¿Cómo las cocino?",
      respuesta:
        "Directo del freezer al horno, sin descongelar. Cada vianda trae el tiempo y la temperatura sugerida.",
    },
    {
      id: "f3",
      pregunta: "¿En qué zonas entregan?",
      respuesta: "Por ahora entregamos en CABA y GBA. Estamos sumando zonas todo el tiempo.",
    },
    {
      id: "f4",
      pregunta: "¿Qué medios de pago aceptan?",
      respuesta: "Tarjetas de crédito/débito, transferencia y Mercado Pago.",
    },
  ],
};

function pickText(remoteValue, defaultValue) {
  return typeof remoteValue === "string" && remoteValue.trim() !== "" ? remoteValue : defaultValue;
}

export function mergeSiteContent(remote, defaults = defaultSiteContent) {
  if (!remote || typeof remote !== "object") return defaults;

  return {
    hero: {
      titulo: pickText(remote.hero?.titulo, defaults.hero.titulo),
      bajada: pickText(remote.hero?.bajada, defaults.hero.bajada),
      imagenUrl: pickText(remote.hero?.imagenUrl, defaults.hero.imagenUrl),
    },
    nosotros: {
      texto: pickText(remote.nosotros?.texto, defaults.nosotros.texto),
    },
    producto: {
      texto: pickText(remote.producto?.texto, defaults.producto.texto),
      categorias:
        Array.isArray(remote.producto?.categorias) && remote.producto.categorias.length > 0
          ? remote.producto.categorias
          : defaults.producto.categorias,
    },
    empresas: {
      texto: pickText(remote.empresas?.texto, defaults.empresas.texto),
    },
    testimonios:
      Array.isArray(remote.testimonios) && remote.testimonios.length > 0
        ? remote.testimonios
        : defaults.testimonios,
    faq: Array.isArray(remote.faq) && remote.faq.length > 0 ? remote.faq : defaults.faq,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Write `lib/useSiteContent.js`**

```js
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { defaultSiteContent, mergeSiteContent } from "./siteContent";

export function useSiteContent() {
  const [content, setContent] = useState(defaultSiteContent);

  useEffect(() => {
    const ref = doc(db, "alma_site_content", "landing");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setContent(mergeSiteContent(snapshot.exists() ? snapshot.data() : null));
      },
      () => {
        setContent(defaultSiteContent);
      }
    );
    return unsubscribe;
  }, []);

  return content;
}
```

`onSnapshot` (not a one-time `getDoc`) is used deliberately: while the admin has the content editor open in another tab, the landing preview updates live without a manual refresh.

- [ ] **Step 6: Commit**

```bash
git add lib/siteContent.js lib/siteContent.test.js lib/useSiteContent.js
git commit -m "feat: add site content defaults, merge logic (tested), and useSiteContent hook"
```

---

## Task 6: ImagePlaceholder component

**Files:**
- Create: `components/site/ImagePlaceholder.jsx`
- Create: `components/site/ImagePlaceholder.module.css`

**Interfaces:**
- Produces: `<ImagePlaceholder className={...} />` — brand-colored fallback shown only if an image URL is ever empty (defensive; in practice `defaultSiteContent` always has a value).

- [ ] **Step 1: Write `components/site/ImagePlaceholder.module.css`**

```css
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--color-beige), var(--color-verde-oliva));
}

.mark {
  width: 30%;
  opacity: 0.35;
}
```

- [ ] **Step 2: Write `components/site/ImagePlaceholder.jsx`**

```jsx
import styles from "./ImagePlaceholder.module.css";

export default function ImagePlaceholder({ className = "" }) {
  return (
    <div className={`${styles.placeholder} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/alma-isotipo.svg" alt="" className={styles.mark} />
    </div>
  );
}
```

- [ ] **Step 3: Verify visually**

Temporarily render `<ImagePlaceholder className="test-ph" />` with an inline `style={{width: 300, height: 200}}` wrapper in `app/page.jsx`; confirm a green/beige gradient box with a faint isotipo mark appears. Remove afterward.

- [ ] **Step 4: Commit**

```bash
git add components/site/ImagePlaceholder.jsx components/site/ImagePlaceholder.module.css
git commit -m "feat: add brand-gradient ImagePlaceholder fallback component"
```

---

## Task 7: Reusable scroll-reveal hook + Header/Nav

**Files:**
- Create: `lib/useScrollReveal.js`
- Create: `components/site/Header.jsx`
- Create: `components/site/Header.module.css`

**Interfaces:**
- Produces: `useScrollReveal(selector, options?)` (returns a ref to attach to the section root) — reused by Nosotros (Task 9), Testimonios (Task 13), Faq (Task 14). `<Header />` — no props.

- [ ] **Step 1: Write `lib/useScrollReveal.js`**

```js
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "./gsap";

export function useScrollReveal(selector, options = {}) {
  const scopeRef = useRef(null);

  useGSAP(
    () => {
      gsap.from(selector, {
        y: 32,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: scopeRef.current,
          start: "top 80%",
        },
        ...options,
      });
    },
    { scope: scopeRef }
  );

  return scopeRef;
}
```

- [ ] **Step 2: Write `components/site/Header.module.css`**

```css
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: transparent;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.solid {
  background: var(--color-crema);
  box-shadow: 0 2px 12px rgba(46, 74, 47, 0.08);
}

.inner {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.logoLink {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.logo {
  width: 40px;
  height: 40px;
}

.wordmark {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--color-verde-principal);
  letter-spacing: 0.08em;
}

.nav {
  display: none;
  align-items: center;
  gap: var(--space-md);
}

@media (min-width: 860px) {
  .nav {
    display: flex;
  }
}

.navLink {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-texto);
}

.navLink:hover {
  color: var(--color-verde-principal);
}

.cta {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.65rem 1.4rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.cta:hover {
  background: #24391f;
}
```

- [ ] **Step 3: Write `components/site/Header.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import styles from "./Header.module.css";

const NAV_LINKS = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#producto", label: "Producto" },
  { href: "#empresas", label: "Empresas" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.solid : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Logo variant="isotipo" className={styles.logo} />
          <span className={styles.wordmark}>ALMA</span>
        </Link>
        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
          <Link href="/tienda" className={styles.navLink}>
            Tienda
          </Link>
        </nav>
        <Link href="/tienda" className={styles.cta}>
          Pedir ahora
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Verify visually**

Temporarily render `<Header />` at the top of `app/page.jsx`, run `npm run dev`. Confirm: header is transparent at the top, becomes solid crema with a shadow after scrolling 40px, nav links are visible above 860px width, "Pedir ahora" links to `/tienda` (will 404 until Task 16 — that's expected for now). Remove the temporary render afterward.

- [ ] **Step 5: Commit**

```bash
git add lib/useScrollReveal.js components/site/Header.jsx components/site/Header.module.css
git commit -m "feat: add useScrollReveal hook and Header/Nav component"
```

---

## Task 8: Hero section

**Files:**
- Create: `components/site/Hero.jsx`
- Create: `components/site/Hero.module.css`

**Interfaces:**
- Consumes: `useSiteContent()` from `lib/useSiteContent.js`, `ImagePlaceholder` from Task 6, `gsap` from `lib/gsap.js`.
- Produces: `<Hero />` — no props, self-contained section with `id="hero"`.

- [ ] **Step 1: Write `components/site/Hero.module.css`**

```css
.hero {
  position: relative;
  height: 100vh;
  min-height: 640px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.imageWrap {
  position: absolute;
  inset: -10% 0 -10% 0;
  z-index: 0;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(46, 74, 47, 0.15) 0%, rgba(46, 74, 47, 0.65) 100%);
}

.content {
  position: relative;
  z-index: 1;
  color: var(--color-blanco);
  max-width: var(--container-max);
  margin: 0 auto;
  width: 100%;
  padding: 0 var(--space-md) var(--space-xl);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  color: var(--color-beige);
}

.titulo {
  color: var(--color-blanco);
  max-width: 14ch;
  margin-bottom: var(--space-sm);
}

.bajada {
  max-width: 42ch;
  font-size: 1.1rem;
  margin-bottom: var(--space-md);
}

.ctas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.ctaPrimary {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.9rem 1.8rem;
  border-radius: var(--radius);
  font-weight: 600;
}

.ctaPrimary:hover {
  background: #24391f;
}

.ctaSecondary {
  border: 1.5px solid var(--color-blanco);
  color: var(--color-blanco);
  padding: 0.9rem 1.8rem;
  border-radius: var(--radius);
  font-weight: 600;
}

.ctaSecondary:hover {
  background: rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 2: Write `components/site/Hero.jsx`**

```jsx
"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { useSiteContent } from "@/lib/useSiteContent";
import ImagePlaceholder from "./ImagePlaceholder";
import styles from "./Hero.module.css";

export default function Hero() {
  const content = useSiteContent();
  const rootRef = useRef(null);
  const imageRef = useRef(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(`.${styles.eyebrow}`, { y: 24, opacity: 0, duration: 0.6 })
        .from(`.${styles.titulo}`, { y: 40, opacity: 0, duration: 0.8 }, "-=0.35")
        .from(`.${styles.bajada}`, { y: 24, opacity: 0, duration: 0.6 }, "-=0.45")
        .from(`.${styles.ctas} > *`, { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.3");

      gsap.to(imageRef.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: rootRef }
  );

  return (
    <section id="hero" ref={rootRef} className={styles.hero}>
      <div ref={imageRef} className={styles.imageWrap}>
        {content.hero.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.hero.imagenUrl} alt="" className={styles.image} />
        ) : (
          <ImagePlaceholder className={styles.image} />
        )}
        <div className={styles.overlay} />
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Nutrimos momentos, creamos bienestar</p>
        <h1 className={styles.titulo}>{content.hero.titulo}</h1>
        <p className={styles.bajada}>{content.hero.bajada}</p>
        <div className={styles.ctas}>
          <Link href="/tienda" className={styles.ctaPrimary}>
            Pedir ahora
          </Link>
          <a href="#producto" className={styles.ctaSecondary}>
            Ver cómo funciona
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify visually**

Temporarily render `<Hero />` in `app/page.jsx`, run `npm run dev`. Confirm: full-viewport hero with the meal-prep stock photo, dark overlay, white title/subtitle text staggering in on load, subtle parallax on the image while scrolling past it, both CTA buttons visible. Remove the temporary render afterward.

- [ ] **Step 4: Commit**

```bash
git add components/site/Hero.jsx components/site/Hero.module.css
git commit -m "feat: add Hero section with GSAP intro animation and parallax"
```

---

## Task 9: Nosotros section

**Files:**
- Create: `components/site/Nosotros.jsx`
- Create: `components/site/Nosotros.module.css`

**Interfaces:**
- Consumes: `useSiteContent()`, `useScrollReveal()` from Task 7.
- Produces: `<Nosotros />`, section `id="nosotros"`.

- [ ] **Step 1: Write `components/site/Nosotros.module.css`**

```css
.wrap {
  text-align: center;
}

.texto {
  max-width: 60ch;
  margin: var(--space-sm) auto var(--space-lg);
  font-size: 1.1rem;
}

.pilares {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

@media (min-width: 760px) {
  .pilares {
    grid-template-columns: repeat(4, 1fr);
  }
}

.pilar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.icono {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-beige);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-verde-principal);
}

.pilarLabel {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-verde-principal);
}
```

- [ ] **Step 2: Write `components/site/Nosotros.jsx`**

```jsx
"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import { useScrollReveal } from "@/lib/useScrollReveal";
import styles from "./Nosotros.module.css";

const PILARES = [
  { label: "Alimentación consciente", icon: "🌱" },
  { label: "Cocina artesanal", icon: "👨‍🍳" },
  { label: "Conservación premium", icon: "❄️" },
  { label: "Bienestar y practicidad", icon: "💚" },
];

export default function Nosotros() {
  const content = useSiteContent();
  const scopeRef = useScrollReveal(`.${styles.pilar}`);

  return (
    <section id="nosotros" ref={scopeRef} className="section">
      <div className={`container ${styles.wrap}`}>
        <p className="sectionLabel">Nosotros</p>
        <h2>Cocinamos como en casa</h2>
        <p className={styles.texto}>{content.nosotros.texto}</p>
        <div className={styles.pilares}>
          {PILARES.map((pilar) => (
            <div key={pilar.label} className={styles.pilar}>
              <span className={styles.icono} aria-hidden="true">
                {pilar.icon}
              </span>
              <span className={styles.pilarLabel}>{pilar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Note: `className="container"` / `className="section"` reference the global utility classes from `app/globals.css` (Task 2), combined with the module class via template literal where both are needed.

- [ ] **Step 3: Verify visually**

Temporarily render `<Nosotros />` under `<Hero />` in `app/page.jsx`. Scroll to the section and confirm the 4 pilares fade/slide up with a stagger as they enter the viewport. Remove the temporary render afterward.

- [ ] **Step 4: Commit**

```bash
git add components/site/Nosotros.jsx components/site/Nosotros.module.css
git commit -m "feat: add Nosotros section with stagger scroll reveal"
```

---

## Task 10: Producto / Cómo funciona section

**Files:**
- Create: `components/site/Producto.jsx`
- Create: `components/site/Producto.module.css`

**Interfaces:**
- Consumes: `useSiteContent()`, `ImagePlaceholder`, `gsap`/`useGSAP`.
- Produces: `<Producto />`, section `id="producto"`.

- [ ] **Step 1: Write `components/site/Producto.module.css`**

```css
.texto {
  max-width: 55ch;
  margin: var(--space-sm) 0 var(--space-lg);
  font-size: 1.1rem;
}

.pasos {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

@media (max-width: 760px) {
  .pasos {
    grid-template-columns: 1fr;
  }
}

.paso {
  padding: var(--space-md);
  background: var(--color-blanco);
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.pasoNumero {
  font-family: var(--font-display);
  font-size: 2.5rem;
  color: var(--color-verde-oliva);
  margin-bottom: var(--space-xs);
}

.pasoTitulo {
  font-weight: 600;
  color: var(--color-verde-principal);
  margin-bottom: var(--space-xs);
}

.categorias {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

@media (min-width: 760px) {
  .categorias {
    grid-template-columns: repeat(4, 1fr);
  }
}

.categoria {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius);
  overflow: hidden;
}

.categoriaImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.categoriaOverlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(46, 74, 47, 0.85) 100%);
}

.categoriaNombre {
  position: absolute;
  bottom: var(--space-sm);
  left: var(--space-sm);
  color: var(--color-blanco);
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 600;
}
```

- [ ] **Step 2: Write `components/site/Producto.jsx`**

```jsx
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { useSiteContent } from "@/lib/useSiteContent";
import ImagePlaceholder from "./ImagePlaceholder";
import styles from "./Producto.module.css";

const PASOS = [
  { numero: "01", titulo: "Elegís", texto: "Armá tu pack de viandas de la semana." },
  { numero: "02", titulo: "Preparamos", texto: "Cocinamos y congelamos frescas, sin conservantes." },
  { numero: "03", titulo: "Recibís", texto: "Te llegan listas para guardar en el freezer." },
  { numero: "04", titulo: "Horneás", texto: "Del freezer al horno. Sin descongelar, sin vueltas." },
];

export default function Producto() {
  const content = useSiteContent();
  const pasosRef = useRef(null);

  useGSAP(
    () => {
      gsap.from(`.${styles.paso}`, {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: pasosRef.current,
          start: "top 75%",
        },
      });

      gsap.from(`.${styles.categoria}`, {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: `.${styles.categorias}`,
          start: "top 80%",
        },
      });
    },
    { scope: pasosRef }
  );

  return (
    <section id="producto" className="section">
      <div className="container">
        <p className="sectionLabel">Producto</p>
        <h2>Cómo funciona</h2>
        <p className={styles.texto}>{content.producto.texto}</p>

        <div ref={pasosRef} className={styles.pasos}>
          {PASOS.map((paso) => (
            <div key={paso.numero} className={styles.paso}>
              <p className={styles.pasoNumero}>{paso.numero}</p>
              <p className={styles.pasoTitulo}>{paso.titulo}</p>
              <p>{paso.texto}</p>
            </div>
          ))}
        </div>

        <div className={styles.categorias}>
          {content.producto.categorias.map((categoria) => (
            <div key={categoria.nombre} className={styles.categoria}>
              {categoria.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={categoria.imagenUrl} alt={categoria.nombre} className={styles.categoriaImg} />
              ) : (
                <ImagePlaceholder className={styles.categoriaImg} />
              )}
              <div className={styles.categoriaOverlay} />
              <p className={styles.categoriaNombre}>{categoria.nombre}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Note: the spec's original idea of *pinning* the steps was simplified to a stagger-reveal grid — pinning 4 steps one-at-a-time reads well in a tall vertical layout but fights a 4-column grid on desktop. The stagger-in-grid keeps the "dinámico/bold" motion feel without a layout that fights itself. Flag this simplification for the user during review; pinning can be added later if they want a more theatrical version.

- [ ] **Step 3: Verify visually**

Temporarily render `<Producto />` under `<Nosotros />` in `app/page.jsx`. Confirm the 4 pasos and 4 categoria cards (with their stock photos) animate in on scroll. Remove the temporary render afterward.

- [ ] **Step 4: Commit**

```bash
git add components/site/Producto.jsx components/site/Producto.module.css
git commit -m "feat: add Producto section with pasos and categorias"
```

---

## Task 11: Lead validation logic (TDD)

**Files:**
- Create: `lib/validateEmpresaLead.js`
- Create: `lib/validateEmpresaLead.test.js`

**Interfaces:**
- Produces: `validateEmpresaLead(data)` → `{ valid: boolean, errors: { [field]: string } }`. Consumed by `EmpresasForm` in Task 12.

- [ ] **Step 1: Write the failing tests**

```js
// lib/validateEmpresaLead.test.js
import { describe, it, expect } from "vitest";
import { validateEmpresaLead } from "./validateEmpresaLead";

const validData = {
  empresa: "Acme SA",
  contacto: "Juan Pérez",
  email: "juan@acme.com",
  telefono: "11 4444-5555",
  tamanioEquipo: "10-20",
};

describe("validateEmpresaLead", () => {
  it("accepts fully valid data", () => {
    expect(validateEmpresaLead(validData)).toEqual({ valid: true, errors: {} });
  });

  it("rejects a missing empresa name", () => {
    const result = validateEmpresaLead({ ...validData, empresa: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.empresa).toBeDefined();
  });

  it("rejects a missing contacto name", () => {
    const result = validateEmpresaLead({ ...validData, contacto: " " });
    expect(result.valid).toBe(false);
    expect(result.errors.contacto).toBeDefined();
  });

  it("rejects an invalid email", () => {
    const result = validateEmpresaLead({ ...validData, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("rejects a phone number that is too short", () => {
    const result = validateEmpresaLead({ ...validData, telefono: "123" });
    expect(result.valid).toBe(false);
    expect(result.errors.telefono).toBeDefined();
  });

  it("accepts a phone number with formatting characters as long as enough digits are present", () => {
    const result = validateEmpresaLead({ ...validData, telefono: "(011) 4444-5555" });
    expect(result.valid).toBe(true);
  });

  it("does not require tamanioEquipo", () => {
    const { tamanioEquipo, ...rest } = validData;
    const result = validateEmpresaLead(rest);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/validateEmpresaLead.js` does not exist.

- [ ] **Step 3: Write `lib/validateEmpresaLead.js`**

```js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmpresaLead(data) {
  const errors = {};

  if (!data.empresa || data.empresa.trim().length < 2) {
    errors.empresa = "Ingresá el nombre de la empresa.";
  }

  if (!data.contacto || data.contacto.trim().length < 2) {
    errors.contacto = "Ingresá el nombre de la persona de contacto.";
  }

  if (!data.email || !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = "Ingresá un email válido.";
  }

  const telefonoDigits = (data.telefono || "").replace(/\D/g, "");
  if (telefonoDigits.length < 8) {
    errors.telefono = "Ingresá un teléfono válido.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/validateEmpresaLead.js lib/validateEmpresaLead.test.js
git commit -m "feat: add validateEmpresaLead with unit tests"
```

---

## Task 12: Empresas section + lead form

**Files:**
- Create: `lib/submitEmpresaLead.js`
- Create: `components/site/EmpresasForm.jsx`
- Create: `components/site/EmpresasForm.module.css`
- Create: `components/site/Empresas.jsx`
- Create: `components/site/Empresas.module.css`

**Interfaces:**
- Consumes: `validateEmpresaLead` (Task 11), `db` from `lib/firebase.js`, `useSiteContent()`.
- Produces: `<Empresas />`, section `id="empresas"`.

- [ ] **Step 1: Write `lib/submitEmpresaLead.js`**

```js
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function submitEmpresaLead(data) {
  await addDoc(collection(db, "alma_leads_empresas"), {
    empresa: data.empresa.trim(),
    contacto: data.contacto.trim(),
    email: data.email.trim(),
    telefono: data.telefono.trim(),
    tamanioEquipo: data.tamanioEquipo || "",
    createdAt: serverTimestamp(),
  });
}
```

- [ ] **Step 2: Write `components/site/EmpresasForm.module.css`**

```css
.form {
  display: grid;
  gap: var(--space-sm);
  max-width: 420px;
}

.field label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: var(--color-crema);
}

.field input,
.field select {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(247, 244, 238, 0.35);
  background: rgba(247, 244, 238, 0.08);
  color: var(--color-blanco);
  font-family: var(--font-body);
}

.field input::placeholder {
  color: rgba(247, 244, 238, 0.5);
}

.error {
  color: #e8b4a0;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.submit {
  background: var(--color-blanco);
  color: var(--color-verde-principal);
  padding: 0.9rem 1.6rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
  margin-top: var(--space-xs);
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  color: var(--color-blanco);
  font-weight: 600;
}

.formError {
  color: #e8b4a0;
}
```

- [ ] **Step 3: Write `components/site/EmpresasForm.jsx`**

```jsx
"use client";

import { useState } from "react";
import { validateEmpresaLead } from "@/lib/validateEmpresaLead";
import { submitEmpresaLead } from "@/lib/submitEmpresaLead";
import styles from "./EmpresasForm.module.css";

const INITIAL_DATA = { empresa: "", contacto: "", email: "", telefono: "", tamanioEquipo: "" };

export default function EmpresasForm() {
  const [data, setData] = useState(INITIAL_DATA);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const handleChange = (field) => (event) => {
    setData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { valid, errors: validationErrors } = validateEmpresaLead(data);
    setErrors(validationErrors);
    if (!valid) return;

    setStatus("submitting");
    try {
      await submitEmpresaLead(data);
      setStatus("success");
      setData(INITIAL_DATA);
    } catch (err) {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p className={styles.success}>
        ¡Gracias! Ya recibimos tus datos, te vamos a contactar a la brevedad.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="empresa">Empresa</label>
        <input id="empresa" value={data.empresa} onChange={handleChange("empresa")} placeholder="Nombre de tu empresa" />
        {errors.empresa && <p className={styles.error}>{errors.empresa}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="contacto">Contacto</label>
        <input id="contacto" value={data.contacto} onChange={handleChange("contacto")} placeholder="Tu nombre" />
        {errors.contacto && <p className={styles.error}>{errors.contacto}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={data.email} onChange={handleChange("email")} placeholder="vos@empresa.com" />
        {errors.email && <p className={styles.error}>{errors.email}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="telefono">Teléfono</label>
        <input id="telefono" value={data.telefono} onChange={handleChange("telefono")} placeholder="11 1234-5678" />
        {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="tamanioEquipo">Tamaño aproximado del equipo</label>
        <select id="tamanioEquipo" value={data.tamanioEquipo} onChange={handleChange("tamanioEquipo")}>
          <option value="">Seleccioná una opción</option>
          <option value="1-10">1 a 10 personas</option>
          <option value="10-50">10 a 50 personas</option>
          <option value="50+">Más de 50 personas</option>
        </select>
      </div>
      <button type="submit" className={styles.submit} disabled={status === "submitting"}>
        {status === "submitting" ? "Enviando..." : "Quiero sumar mi empresa"}
      </button>
      {status === "error" && (
        <p className={styles.formError}>
          No pudimos enviar tu consulta. Revisá tu conexión e intentá de nuevo.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Write `components/site/Empresas.module.css`**

```css
.section {
  background: var(--color-verde-principal);
  color: var(--color-crema);
}

.section h2 {
  color: var(--color-blanco);
}

.badge {
  display: inline-block;
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-sm);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
  align-items: start;
}

@media (min-width: 860px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

.texto {
  max-width: 46ch;
  font-size: 1.1rem;
  margin: var(--space-sm) 0;
}
```

- [ ] **Step 5: Write `components/site/Empresas.jsx`**

```jsx
"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import EmpresasForm from "./EmpresasForm";
import styles from "./Empresas.module.css";

export default function Empresas() {
  const content = useSiteContent();

  return (
    <section id="empresas" className={`section ${styles.section}`}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <span className={styles.badge}>Línea pendiente de lanzamiento</span>
            <h2>ALMA para empresas</h2>
            <p className={styles.texto}>{content.empresas.texto}</p>
          </div>
          <div>
            <EmpresasForm />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Verify manually**

Temporarily render `<Empresas />` in `app/page.jsx`, run `npm run dev`. Fill the form with invalid data (empty fields, bad email) and confirm inline errors appear per field without submitting. Fill it with valid data and submit; confirm the success message replaces the form. Open the Firebase Console → Firestore → `pedidos-lett-2` project and confirm a new document appeared in `alma_leads_empresas` with the submitted fields and a `createdAt` timestamp. Remove the temporary render afterward.

- [ ] **Step 7: Commit**

```bash
git add lib/submitEmpresaLead.js components/site/EmpresasForm.jsx components/site/EmpresasForm.module.css components/site/Empresas.jsx components/site/Empresas.module.css
git commit -m "feat: add Empresas section with validated lead form writing to Firestore"
```

---

## Task 13: Testimonios section

**Files:**
- Create: `components/site/Testimonios.jsx`
- Create: `components/site/Testimonios.module.css`

**Interfaces:**
- Consumes: `useSiteContent()`, `useScrollReveal()`.
- Produces: `<Testimonios />`, section `id="testimonios"`.

- [ ] **Step 1: Write `components/site/Testimonios.module.css`**

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

@media (min-width: 760px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.card {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
}

.texto {
  font-style: italic;
  margin-bottom: var(--space-sm);
}

.autor {
  font-weight: 700;
  color: var(--color-verde-principal);
}
```

- [ ] **Step 2: Write `components/site/Testimonios.jsx`**

```jsx
"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import { useScrollReveal } from "@/lib/useScrollReveal";
import styles from "./Testimonios.module.css";

export default function Testimonios() {
  const content = useSiteContent();
  const scopeRef = useScrollReveal(`.${styles.card}`);

  return (
    <section id="testimonios" ref={scopeRef} className="section">
      <div className="container">
        <p className="sectionLabel">Testimonios</p>
        <h2>Lo que dicen quienes ya piden ALMA</h2>
        <div className={styles.grid}>
          {content.testimonios.map((testimonio) => (
            <div key={testimonio.id} className={styles.card}>
              <p className={styles.texto}>&ldquo;{testimonio.texto}&rdquo;</p>
              <p className={styles.autor}>{testimonio.autor}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify visually**

Temporarily render `<Testimonios />` in `app/page.jsx`, confirm the 3 default testimonial cards render in a 3-column grid on desktop / stacked on mobile, and fade/stagger in on scroll. Remove the temporary render afterward.

- [ ] **Step 4: Commit**

```bash
git add components/site/Testimonios.jsx components/site/Testimonios.module.css
git commit -m "feat: add Testimonios section"
```

---

## Task 14: FAQ section

**Files:**
- Create: `components/site/Faq.jsx`
- Create: `components/site/Faq.module.css`

**Interfaces:**
- Consumes: `useSiteContent()`, `useScrollReveal()`.
- Produces: `<Faq />`, section `id="faq"`.

- [ ] **Step 1: Write `components/site/Faq.module.css`**

```css
.list {
  margin-top: var(--space-md);
  max-width: 760px;
}

.item {
  border-bottom: 1px solid var(--color-beige);
}

.item summary {
  cursor: pointer;
  padding: var(--space-sm) 0;
  font-weight: 600;
  color: var(--color-verde-principal);
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item summary::-webkit-details-marker {
  display: none;
}

.item summary::after {
  content: "+";
  font-size: 1.4rem;
  color: var(--color-verde-oliva);
  transition: transform 0.2s ease;
}

.item[open] summary::after {
  transform: rotate(45deg);
}

.respuesta {
  padding-bottom: var(--space-sm);
  max-width: 60ch;
}
```

- [ ] **Step 2: Write `components/site/Faq.jsx`**

```jsx
"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import { useScrollReveal } from "@/lib/useScrollReveal";
import styles from "./Faq.module.css";

export default function Faq() {
  const content = useSiteContent();
  const scopeRef = useScrollReveal(`.${styles.item}`);

  return (
    <section id="faq" ref={scopeRef} className="section">
      <div className="container">
        <p className="sectionLabel">Preguntas frecuentes</p>
        <h2>¿Tenés dudas?</h2>
        <div className={styles.list}>
          {content.faq.map((item) => (
            <details key={item.id} className={styles.item}>
              <summary>{item.pregunta}</summary>
              <p className={styles.respuesta}>{item.respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Native `<details>`/`<summary>` is used instead of a hand-rolled accordion — it's fully accessible and keyboard-operable by default, with no extra JS needed for the expand/collapse behavior itself (GSAP only handles the entrance reveal).

- [ ] **Step 3: Verify visually**

Temporarily render `<Faq />` in `app/page.jsx`. Confirm each question expands/collapses on click, and the `+` icon rotates 45° into a `×` when open. Remove the temporary render afterward.

- [ ] **Step 4: Commit**

```bash
git add components/site/Faq.jsx components/site/Faq.module.css
git commit -m "feat: add FAQ accordion section"
```

---

## Task 15: Contacto section + Footer

**Files:**
- Create: `components/site/Contacto.jsx`
- Create: `components/site/Contacto.module.css`
- Create: `components/site/Footer.jsx`
- Create: `components/site/Footer.module.css`

**Interfaces:**
- Consumes: `Logo` (Task 3).
- Produces: `<Contacto />` (`id="contacto"`), `<Footer />`.

- [ ] **Step 1: Write `components/site/Contacto.module.css`**

```css
.section {
  background: var(--color-beige);
  text-align: center;
}

.texto {
  max-width: 50ch;
  margin: var(--space-sm) auto var(--space-md);
  font-size: 1.1rem;
}

.ctas {
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.ctaPrimary {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.9rem 1.8rem;
  border-radius: var(--radius);
  font-weight: 600;
}

.ctaPrimary:hover {
  background: #24391f;
}

.ctaSecondary {
  border: 1.5px solid var(--color-verde-principal);
  color: var(--color-verde-principal);
  padding: 0.9rem 1.8rem;
  border-radius: var(--radius);
  font-weight: 600;
}
```

- [ ] **Step 2: Write `components/site/Contacto.jsx`**

```jsx
import Link from "next/link";
import styles from "./Contacto.module.css";

export default function Contacto() {
  const instagramHandle = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "alma.viandas";

  return (
    <section id="contacto" className={`section ${styles.section}`}>
      <div className="container">
        <p className="sectionLabel">Contacto</p>
        <h2>Sumate a ALMA</h2>
        <p className={styles.texto}>
          Pedí tus viandas de la semana o seguinos en Instagram para ver las novedades.
        </p>
        <div className={styles.ctas}>
          <Link href="/tienda" className={styles.ctaPrimary}>
            Pedir ahora
          </Link>
          <a
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank"
            rel="noreferrer"
            className={styles.ctaSecondary}
          >
            @{instagramHandle}
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write `components/site/Footer.module.css`**

```css
.footer {
  background: var(--color-verde-principal);
  color: var(--color-crema);
  padding: var(--space-lg) 0 var(--space-md);
}

.inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

@media (min-width: 760px) {
  .inner {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.logo {
  width: 36px;
  height: 36px;
}

.wordmark {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
}

.links {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.links a:hover {
  color: var(--color-blanco);
}

.bottom {
  margin-top: var(--space-lg);
  padding-top: var(--space-sm);
  border-top: 1px solid rgba(247, 244, 238, 0.15);
  font-size: 0.8rem;
  opacity: 0.7;
}
```

- [ ] **Step 4: Write `components/site/Footer.jsx`**

```jsx
import Link from "next/link";
import Logo from "./Logo";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo variant="isotipo" className={styles.logo} />
          <span className={styles.wordmark}>ALMA</span>
        </div>
        <nav className={styles.links}>
          <a href="#nosotros">Nosotros</a>
          <a href="#producto">Producto</a>
          <a href="#empresas">Empresas</a>
          <a href="#faq">FAQ</a>
          <Link href="/tienda">Tienda</Link>
        </nav>
      </div>
      <div className={`container ${styles.bottom}`}>
        <p>© {new Date().getFullYear()} ALMA — Servicios Gastronómicos. Nutrimos momentos, creamos bienestar.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Verify visually**

Temporarily render `<Contacto />` then `<Footer />` at the end of `app/page.jsx`. Confirm the Instagram link opens `instagram.com/alma.viandas` in a new tab, footer nav anchors scroll to the right sections. Remove the temporary render afterward.

- [ ] **Step 6: Commit**

```bash
git add components/site/Contacto.jsx components/site/Contacto.module.css components/site/Footer.jsx components/site/Footer.module.css
git commit -m "feat: add Contacto section and Footer"
```

---

## Task 16: WhatsApp floating button

**Files:**
- Create: `components/site/WhatsappButton.jsx`
- Create: `components/site/WhatsappButton.module.css`

**Interfaces:**
- Produces: `<WhatsappButton />` — no props, fixed-position, reads `NEXT_PUBLIC_WHATSAPP_NUMBER`.

- [ ] **Step 1: Write `components/site/WhatsappButton.module.css`**

```css
.button {
  position: fixed;
  bottom: var(--space-md);
  right: var(--space-md);
  z-index: 60;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #25d366;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}

.button:hover {
  transform: scale(1.08);
}

.icon {
  width: 28px;
  height: 28px;
  fill: var(--color-blanco);
}
```

- [ ] **Step 2: Write `components/site/WhatsappButton.jsx`**

```jsx
import styles from "./WhatsappButton.module.css";

export default function WhatsappButton() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";
  const message = encodeURIComponent("Hola! Quiero saber más sobre las viandas ALMA.");
  const href = `https://wa.me/${number}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={styles.button}
      aria-label="Escribinos por WhatsApp"
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01A7.94 7.94 0 0 0 20 12.06a7.86 7.86 0 0 0-2.4-5.74Zm-5.55 12.2h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.65.67-2.44-.16-.25a6.6 6.6 0 1 1 12.26-3.36 6.6 6.6 0 0 1-6.66 6.46Zm3.6-4.94c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.2-.5.64-.62.77-.11.13-.23.14-.42.05a5.4 5.4 0 0 1-2.7-2.36c-.2-.35.2-.32.58-1.07.06-.13.03-.24-.02-.34-.05-.1-.44-1.06-.6-1.45-.16-.38-.32-.33-.44-.33h-.38c-.13 0-.34.05-.52.24-.18.2-.68.67-.68 1.62s.7 1.88.8 2.01c.1.13 1.38 2.1 3.34 2.95 1.97.84 1.97.56 2.32.53.36-.03 1.17-.48 1.34-.94.16-.46.16-.85.11-.94-.05-.1-.18-.15-.38-.25Z" />
      </svg>
    </a>
  );
}
```

- [ ] **Step 3: Verify visually**

Temporarily render `<WhatsappButton />` in `app/page.jsx`. Confirm a green circular WhatsApp icon fixed at bottom-right, clicking it opens `wa.me/5491100000000` with the pre-filled message in a new tab. Remove the temporary render afterward.

- [ ] **Step 4: Commit**

```bash
git add components/site/WhatsappButton.jsx components/site/WhatsappButton.module.css
git commit -m "feat: add floating WhatsApp support button"
```

---

## Task 17: Route groups, home page assembly, /tienda placeholder, SEO metadata

**Files:**
- Create: `app/(site)/layout.jsx`
- Move+modify: `app/page.jsx` → `app/(site)/page.jsx`
- Create: `app/(site)/tienda/page.jsx`
- Create: `app/(site)/tienda/Tienda.module.css`
- Modify: `app/layout.jsx` (remove any temporary verification code left over from earlier tasks)

**Interfaces:**
- Produces: the fully assembled public site at `/` and `/tienda`.

- [ ] **Step 1: Delete the old root `app/page.jsx`**

Run: `rm "app/page.jsx"`

- [ ] **Step 2: Create `app/(site)/layout.jsx`**

```jsx
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsappButton from "@/components/site/WhatsappButton";

export default function SiteLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <WhatsappButton />
    </>
  );
}
```

- [ ] **Step 3: Create `app/(site)/page.jsx`**

```jsx
import Hero from "@/components/site/Hero";
import Nosotros from "@/components/site/Nosotros";
import Producto from "@/components/site/Producto";
import Empresas from "@/components/site/Empresas";
import Testimonios from "@/components/site/Testimonios";
import Faq from "@/components/site/Faq";
import Contacto from "@/components/site/Contacto";

export const metadata = {
  title: "ALMA — Viandas saludables 100% caseras",
  description:
    "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
  openGraph: {
    title: "ALMA — Viandas saludables 100% caseras",
    description:
      "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
    images: [
      "https://images.unsplash.com/photo-1569420077790-afb136b3bb8c?w=1200&q=80&auto=format&fit=crop",
    ],
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Nosotros />
      <Producto />
      <Empresas />
      <Testimonios />
      <Faq />
      <Contacto />
    </>
  );
}
```

- [ ] **Step 4: Write `app/(site)/tienda/Tienda.module.css`**

```css
.wrap {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-xl) var(--space-md);
}

.texto {
  max-width: 46ch;
  margin: var(--space-sm) 0 var(--space-md);
}

.back {
  color: var(--color-verde-principal);
  font-weight: 600;
  text-decoration: underline;
}
```

- [ ] **Step 5: Write `app/(site)/tienda/page.jsx`**

```jsx
import Link from "next/link";
import styles from "./Tienda.module.css";

export const metadata = {
  title: "Tienda",
  description: "La tienda online de ALMA está en camino.",
};

export default function TiendaPage() {
  return (
    <div className={styles.wrap}>
      <p className="sectionLabel">Tienda</p>
      <h1>Muy pronto</h1>
      <p className={styles.texto}>
        Estamos terminando de armar la tienda online de ALMA. Mientras tanto, escribinos por
        WhatsApp y coordinamos tu pedido a mano.
      </p>
      <Link href="/" className={styles.back}>
        Volver al inicio
      </Link>
    </div>
  );
}
```

- [ ] **Step 6: Simplify `app/layout.jsx`**

Confirm no temporary verification code (console.log imports, test renders) from earlier tasks remains in `app/layout.jsx`. It should match exactly the version written in Task 2, Step 2.

- [ ] **Step 7: Verify full build**

Run: `npm run build`
Expected: build succeeds, `out/index.html` and `out/tienda/index.html` both exist.

Run: `npm run dev`, open `http://localhost:3000`.
Expected: all 7 home sections render in order (Hero → Nosotros → Producto → Empresas → Testimonios → Faq → Contacto) wrapped by Header/Footer/WhatsappButton, header nav anchors scroll correctly, "Pedir ahora" and "Tienda" links navigate to `/tienda`, which shows the "Muy pronto" placeholder with a working "Volver al inicio" link.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: assemble home page and /tienda route with route-group layout and SEO metadata"
```

---

## Task 18: Admin auth foundation (hook, guard, login)

**Files:**
- Create: `lib/useAdminAuth.js`
- Create: `components/admin/AdminNav.jsx`
- Create: `components/admin/AdminNav.module.css`
- Create: `components/admin/AdminGuard.jsx`
- Create: `components/admin/AdminGuard.module.css`
- Create: `components/admin/LoginForm.jsx`
- Create: `components/admin/LoginForm.module.css`
- Create: `app/admin/layout.jsx`
- Create: `app/admin/login/page.jsx`

**Interfaces:**
- Consumes: `auth`, `db` from `lib/firebase.js`.
- Produces: `useAdminAuth()` → `{ user, adminDoc, loading }`; `<AdminGuard>{children}</AdminGuard>`; `<LoginForm />`.

- [ ] **Step 1: Write `lib/useAdminAuth.js`**

```js
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export function useAdminAuth() {
  const [state, setState] = useState({ user: null, adminDoc: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, adminDoc: null, loading: false });
        return;
      }
      const snapshot = await getDoc(doc(db, "alma_admins", user.uid));
      setState({
        user,
        adminDoc: snapshot.exists() ? snapshot.data() : null,
        loading: false,
      });
    });
    return unsubscribe;
  }, []);

  return state;
}
```

- [ ] **Step 2: Write `components/admin/AdminNav.module.css`**

```css
.nav {
  background: var(--color-verde-principal);
  color: var(--color-crema);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.links {
  display: flex;
  gap: var(--space-md);
}

.links a {
  font-weight: 600;
  font-size: 0.9rem;
}

.links a:hover {
  color: var(--color-blanco);
}

.logout {
  background: transparent;
  border: 1px solid rgba(247, 244, 238, 0.4);
  color: var(--color-crema);
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  cursor: pointer;
}

.logout:hover {
  background: rgba(247, 244, 238, 0.1);
}
```

- [ ] **Step 3: Write `components/admin/AdminNav.jsx`**

```jsx
"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "./AdminNav.module.css";

export default function AdminNav({ role }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <Link href="/admin">Panel</Link>
        <Link href="/admin/contenido">Contenido</Link>
        {role === "superadmin" && <Link href="/admin/usuarios">Usuarios</Link>}
      </div>
      <button type="button" className={styles.logout} onClick={() => signOut(auth)}>
        Cerrar sesión
      </button>
    </nav>
  );
}
```

- [ ] **Step 4: Write `components/admin/AdminGuard.module.css`**

```css
.loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-verde-principal);
}

.shell {
  min-height: 100vh;
  background: var(--color-crema);
}

.main {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-lg) var(--space-md);
}
```

- [ ] **Step 5: Write `components/admin/AdminGuard.jsx`**

```jsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/useAdminAuth";
import AdminNav from "./AdminNav";
import styles from "./AdminGuard.module.css";

export default function AdminGuard({ children }) {
  const { user, adminDoc, loading } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/admin/login";
  const isAllowed = Boolean(user && adminDoc);

  useEffect(() => {
    if (loading) return;
    if (!isAllowed && !isLoginRoute) {
      router.replace("/admin/login");
    }
    if (isAllowed && isLoginRoute) {
      router.replace("/admin");
    }
  }, [loading, isAllowed, isLoginRoute, router]);

  if (loading) {
    return <div className={styles.loading}>Cargando…</div>;
  }

  if (isLoginRoute) {
    return isAllowed ? null : children;
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className={styles.shell}>
      <AdminNav role={adminDoc.role} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Write `components/admin/LoginForm.module.css`**

```css
.wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-crema);
}

.card {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-lg);
  width: 100%;
  max-width: 360px;
}

.field {
  margin-bottom: var(--space-sm);
}

.field label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.field input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
  font-family: var(--font-body);
}

.submit {
  width: 100%;
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.8rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
  margin-top: var(--space-xs);
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #b3452f;
  font-size: 0.85rem;
  margin-top: var(--space-sm);
}
```

- [ ] **Step 7: Write `components/admin/LoginForm.jsx`**

```jsx
"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 style={{ marginBottom: "1.5rem" }}>Panel ALMA</h1>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Write `app/admin/layout.jsx`**

```jsx
import AdminGuard from "@/components/admin/AdminGuard";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <AdminGuard>{children}</AdminGuard>;
}
```

- [ ] **Step 9: Write `app/admin/login/page.jsx`**

```jsx
"use client";

import LoginForm from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 10: Bootstrap the first superadmin (manual, one-time, documented here for the executing agent to relay to the user — this step itself is performed by the user in the Firebase Console, not by code)**

1. Firebase Console → `pedidos-lett-2` → Authentication → Users → Add user → enter the founders' real email + a password.
2. Copy the generated User UID.
3. Firestore → Data → start collection `alma_admins` → document ID = that UID → fields: `uid` (string, same UID), `email` (string, same email), `role` (string, `superadmin`), `createdAt` (string, today's ISO date).

This is a one-time manual setup step — flag it to the user rather than attempting it from this plan (it requires their real email/password and Firebase Console access).

- [ ] **Step 11: Verify manually**

Run `npm run dev`, visit `http://localhost:3000/admin` — expect an immediate redirect to `/admin/login` (no `app/admin/page.jsx` exists yet, that's Task 19; a 404 after the redirect attempt is expected and will resolve once Task 19 lands). Log in with the bootstrapped superadmin credentials from Step 10; confirm no "credenciales inválidas" error. Log in with a wrong password; confirm the error message shows.

- [ ] **Step 12: Commit**

```bash
git add lib/useAdminAuth.js components/admin/AdminNav.jsx components/admin/AdminNav.module.css components/admin/AdminGuard.jsx components/admin/AdminGuard.module.css components/admin/LoginForm.jsx components/admin/LoginForm.module.css app/admin/layout.jsx app/admin/login/page.jsx
git commit -m "feat: add admin auth foundation (useAdminAuth, AdminGuard, login)"
```

---

## Task 19: Admin dashboard shell

**Files:**
- Create: `app/admin/page.jsx`

**Interfaces:**
- Consumes: `useAdminAuth()`.
- Produces: the `/admin` landing page reached after login.

- [ ] **Step 1: Write `app/admin/page.jsx`**

```jsx
"use client";

import Link from "next/link";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function AdminHomePage() {
  const { adminDoc } = useAdminAuth();

  return (
    <div>
      <h1>Hola{adminDoc?.email ? `, ${adminDoc.email}` : ""}</h1>
      <p style={{ margin: "1rem 0 2rem" }}>
        Desde acá gestionás el contenido editable de la landing de ALMA.
      </p>
      <p>
        <Link href="/admin/contenido" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Ir a Contenido de la landing →
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Run `npm run dev`, visit `/admin` while logged out — confirm redirect to `/admin/login`. Log in — confirm redirect to `/admin` showing "Hola, [email]" and the link to Contenido.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.jsx
git commit -m "feat: add admin dashboard landing page"
```

---

## Task 20: Image upload validation (TDD) + Storage upload + save-field helper

**Files:**
- Create: `lib/validateImageUpload.js`
- Create: `lib/validateImageUpload.test.js`
- Create: `lib/uploadSiteImage.js`
- Create: `lib/saveSiteContentField.js`

**Interfaces:**
- Produces: `validateImageUpload(file)` → `{ valid, error }`; `uploadSiteImage(file, path)` → `Promise<downloadUrl>`; `saveSiteContentField(partialContent)` → `Promise<void>` (merges into `alma_site_content/landing`).

- [ ] **Step 1: Write the failing tests**

```js
// lib/validateImageUpload.test.js
import { describe, it, expect } from "vitest";
import { validateImageUpload } from "./validateImageUpload";

function makeFile({ type = "image/jpeg", size = 1024 } = {}) {
  return { type, size };
}

describe("validateImageUpload", () => {
  it("rejects when no file is given", () => {
    const result = validateImageUpload(null);
    expect(result.valid).toBe(false);
  });

  it("accepts a valid jpeg under the size limit", () => {
    const result = validateImageUpload(makeFile({ type: "image/jpeg", size: 2 * 1024 * 1024 }));
    expect(result).toEqual({ valid: true, error: null });
  });

  it("accepts png and webp", () => {
    expect(validateImageUpload(makeFile({ type: "image/png" })).valid).toBe(true);
    expect(validateImageUpload(makeFile({ type: "image/webp" })).valid).toBe(true);
  });

  it("rejects unsupported file types", () => {
    const result = validateImageUpload(makeFile({ type: "application/pdf" }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/formato/i);
  });

  it("rejects files over 5MB", () => {
    const result = validateImageUpload(makeFile({ size: 6 * 1024 * 1024 }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/5MB/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/validateImageUpload.js` does not exist.

- [ ] **Step 3: Write `lib/validateImageUpload.js`**

```js
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImageUpload(file) {
  if (!file) {
    return { valid: false, error: "Seleccioná un archivo." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Formato no soportado. Usá JPG, PNG o WEBP." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "El archivo pesa más de 5MB." };
  }
  return { valid: true, error: null };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Write `lib/uploadSiteImage.js`**

```js
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadSiteImage(file, path) {
  const storageRef = ref(storage, `alma/site/${path}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
```

- [ ] **Step 6: Write `lib/saveSiteContentField.js`**

```js
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function saveSiteContentField(partialContent) {
  const ref = doc(db, "alma_site_content", "landing");
  await setDoc(ref, partialContent, { merge: true });
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validateImageUpload.js lib/validateImageUpload.test.js lib/uploadSiteImage.js lib/saveSiteContentField.js
git commit -m "feat: add image upload validation (tested), Storage upload and content save helpers"
```

---

## Task 21: Admin content editor (texts + images)

**Files:**
- Create: `components/admin/ImageUploadField.jsx`
- Create: `components/admin/ImageUploadField.module.css`
- Create: `components/admin/ContenidoEditor.jsx`
- Create: `components/admin/ContenidoEditor.module.css`
- Create: `app/admin/contenido/page.jsx`

**Interfaces:**
- Consumes: `useSiteContent()`, `validateImageUpload`, `uploadSiteImage`, `saveSiteContentField`.
- Produces: `<ImageUploadField currentUrl label onUploaded />`, `<ContenidoEditor />` rendering the text fields for hero/nosotros/producto/empresas and category images (testimonios/FAQ are added in Task 22).

- [ ] **Step 1: Write `components/admin/ImageUploadField.module.css`**

```css
.field {
  margin-bottom: var(--space-md);
}

.label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.preview {
  width: 160px;
  height: 110px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: var(--space-xs);
  display: block;
}

.error {
  color: #b3452f;
  font-size: 0.85rem;
  margin-top: 0.3rem;
}

.status {
  font-size: 0.85rem;
  color: var(--color-verde-oliva);
  margin-top: 0.3rem;
}
```

- [ ] **Step 2: Write `components/admin/ImageUploadField.jsx`**

```jsx
"use client";

import { useState } from "react";
import { validateImageUpload } from "@/lib/validateImageUpload";
import { uploadSiteImage } from "@/lib/uploadSiteImage";
import styles from "./ImageUploadField.module.css";

export default function ImageUploadField({ label, currentUrl, storagePath, onUploaded }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    setError("");
    const { valid, error: validationError } = validateImageUpload(file);
    if (!valid) {
      setError(validationError);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadSiteImage(file, storagePath);
      onUploaded(url);
    } catch (err) {
      setError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className={styles.preview} />
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} disabled={uploading} />
      {uploading && <p className={styles.status}>Subiendo...</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Write `components/admin/ContenidoEditor.module.css`**

```css
.block {
  background: var(--color-blanco);
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.block h2 {
  margin-bottom: var(--space-sm);
}

.field {
  margin-bottom: var(--space-sm);
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.field input,
.field textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
  font-family: var(--font-body);
}

.field textarea {
  min-height: 100px;
  resize: vertical;
}

.categoriaRow {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
  border-top: 1px solid var(--color-beige);
  padding-top: var(--space-sm);
  margin-top: var(--space-sm);
}

.categoriaRow:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.categoriaNombre {
  flex: 1;
}

.save {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.8rem 1.6rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
}

.save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.savedMessage {
  color: var(--color-verde-oliva);
  font-weight: 600;
  margin-left: var(--space-sm);
}
```

- [ ] **Step 4: Write `components/admin/ContenidoEditor.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import { useSiteContent } from "@/lib/useSiteContent";
import { saveSiteContentField } from "@/lib/saveSiteContentField";
import ImageUploadField from "./ImageUploadField";
import styles from "./ContenidoEditor.module.css";

export default function ContenidoEditor() {
  const remoteContent = useSiteContent();
  const [draft, setDraft] = useState(remoteContent);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setDraft(remoteContent);
  }, [remoteContent]);

  const updateCategoria = (index, patch) => {
    setDraft((prev) => {
      const categorias = prev.producto.categorias.map((cat, i) =>
        i === index ? { ...cat, ...patch } : cat
      );
      return { ...prev, producto: { ...prev.producto, categorias } };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setJustSaved(false);
    try {
      await saveSiteContentField(draft);
      setJustSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <h1 style={{ marginBottom: "1.5rem" }}>Contenido de la landing</h1>

      <section className={styles.block}>
        <h2>Hero</h2>
        <div className={styles.field}>
          <label htmlFor="hero-titulo">Título</label>
          <input
            id="hero-titulo"
            value={draft.hero.titulo}
            onChange={(e) => setDraft((p) => ({ ...p, hero: { ...p.hero, titulo: e.target.value } }))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="hero-bajada">Bajada</label>
          <textarea
            id="hero-bajada"
            value={draft.hero.bajada}
            onChange={(e) => setDraft((p) => ({ ...p, hero: { ...p.hero, bajada: e.target.value } }))}
          />
        </div>
        <ImageUploadField
          label="Imagen de fondo"
          currentUrl={draft.hero.imagenUrl}
          storagePath="hero.jpg"
          onUploaded={(url) => setDraft((p) => ({ ...p, hero: { ...p.hero, imagenUrl: url } }))}
        />
      </section>

      <section className={styles.block}>
        <h2>Nosotros</h2>
        <div className={styles.field}>
          <label htmlFor="nosotros-texto">Texto</label>
          <textarea
            id="nosotros-texto"
            value={draft.nosotros.texto}
            onChange={(e) => setDraft((p) => ({ ...p, nosotros: { texto: e.target.value } }))}
          />
        </div>
      </section>

      <section className={styles.block}>
        <h2>Producto</h2>
        <div className={styles.field}>
          <label htmlFor="producto-texto">Texto</label>
          <textarea
            id="producto-texto"
            value={draft.producto.texto}
            onChange={(e) =>
              setDraft((p) => ({ ...p, producto: { ...p.producto, texto: e.target.value } }))
            }
          />
        </div>
        {draft.producto.categorias.map((categoria, index) => (
          <div key={index} className={styles.categoriaRow}>
            <div className={styles.categoriaNombre}>
              <label htmlFor={`categoria-nombre-${index}`}>Categoría {index + 1}</label>
              <input
                id={`categoria-nombre-${index}`}
                value={categoria.nombre}
                onChange={(e) => updateCategoria(index, { nombre: e.target.value })}
              />
            </div>
            <ImageUploadField
              label="Imagen"
              currentUrl={categoria.imagenUrl}
              storagePath={`categorias/${index}.jpg`}
              onUploaded={(url) => updateCategoria(index, { imagenUrl: url })}
            />
          </div>
        ))}
      </section>

      <section className={styles.block}>
        <h2>Empresas</h2>
        <div className={styles.field}>
          <label htmlFor="empresas-texto">Texto</label>
          <textarea
            id="empresas-texto"
            value={draft.empresas.texto}
            onChange={(e) => setDraft((p) => ({ ...p, empresas: { texto: e.target.value } }))}
          />
        </div>
      </section>

      <button type="submit" className={styles.save} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
      {justSaved && <span className={styles.savedMessage}>Guardado ✓</span>}
    </form>
  );
}
```

- [ ] **Step 5: Write `app/admin/contenido/page.jsx`**

```jsx
"use client";

import ContenidoEditor from "@/components/admin/ContenidoEditor";

export default function ContenidoPage() {
  return <ContenidoEditor />;
}
```

- [ ] **Step 6: Verify manually**

Run `npm run dev`, log in to `/admin`, go to Contenido. Change the hero título, save, confirm "Guardado ✓" appears. Open `/` in another tab (or reload it) and confirm the new título shows. Upload a new image for a category (any small JPG on your machine), confirm the preview updates and, after saving, the landing's category image updates too.

- [ ] **Step 7: Commit**

```bash
git add components/admin/ImageUploadField.jsx components/admin/ImageUploadField.module.css components/admin/ContenidoEditor.jsx components/admin/ContenidoEditor.module.css app/admin/contenido/page.jsx
git commit -m "feat: add admin content editor for hero/nosotros/producto/empresas text and images"
```

---

## Task 22: Admin Testimonios & FAQ managers

**Files:**
- Create: `components/admin/TestimoniosManager.jsx`
- Create: `components/admin/FaqManager.jsx`
- Create: `components/admin/ListManager.module.css` (shared styles for both managers)
- Modify: `components/admin/ContenidoEditor.jsx` (render both managers)

**Interfaces:**
- Consumes: `saveSiteContentField`.
- Produces: `<TestimoniosManager testimonios draft onChange />`, `<FaqManager faq onChange />` — both fully self-contained CRUD lists that call `onChange(newArray)` so the parent `ContenidoEditor` can include them in the same save.

- [ ] **Step 1: Write `components/admin/ListManager.module.css`**

```css
.item {
  border: 1px solid var(--color-beige);
  border-radius: var(--radius);
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.item input,
.item textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
  font-family: var(--font-body);
  margin-bottom: var(--space-xs);
}

.remove {
  background: transparent;
  border: 1px solid #b3452f;
  color: #b3452f;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  cursor: pointer;
}

.add {
  background: var(--color-verde-oliva);
  color: var(--color-blanco);
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
  margin-top: var(--space-xs);
}
```

- [ ] **Step 2: Write `components/admin/TestimoniosManager.jsx`**

```jsx
"use client";

import styles from "./ListManager.module.css";

function newTestimonio() {
  return { id: `t-${Date.now()}`, autor: "", texto: "", fotoUrl: null };
}

export default function TestimoniosManager({ testimonios, onChange }) {
  const update = (index, patch) => {
    onChange(testimonios.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const remove = (index) => {
    onChange(testimonios.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...testimonios, newTestimonio()]);
  };

  return (
    <div>
      {testimonios.map((testimonio, index) => (
        <div key={testimonio.id} className={styles.item}>
          <label htmlFor={`testimonio-autor-${index}`}>Autor</label>
          <input
            id={`testimonio-autor-${index}`}
            value={testimonio.autor}
            onChange={(e) => update(index, { autor: e.target.value })}
          />
          <label htmlFor={`testimonio-texto-${index}`}>Texto</label>
          <textarea
            id={`testimonio-texto-${index}`}
            value={testimonio.texto}
            onChange={(e) => update(index, { texto: e.target.value })}
          />
          <button type="button" className={styles.remove} onClick={() => remove(index)}>
            Eliminar
          </button>
        </div>
      ))}
      <button type="button" className={styles.add} onClick={add}>
        + Agregar testimonio
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/admin/FaqManager.jsx`**

```jsx
"use client";

import styles from "./ListManager.module.css";

function newFaqItem() {
  return { id: `f-${Date.now()}`, pregunta: "", respuesta: "" };
}

export default function FaqManager({ faq, onChange }) {
  const update = (index, patch) => {
    onChange(faq.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index) => {
    onChange(faq.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...faq, newFaqItem()]);
  };

  return (
    <div>
      {faq.map((item, index) => (
        <div key={item.id} className={styles.item}>
          <label htmlFor={`faq-pregunta-${index}`}>Pregunta</label>
          <input
            id={`faq-pregunta-${index}`}
            value={item.pregunta}
            onChange={(e) => update(index, { pregunta: e.target.value })}
          />
          <label htmlFor={`faq-respuesta-${index}`}>Respuesta</label>
          <textarea
            id={`faq-respuesta-${index}`}
            value={item.respuesta}
            onChange={(e) => update(index, { respuesta: e.target.value })}
          />
          <button type="button" className={styles.remove} onClick={() => remove(index)}>
            Eliminar
          </button>
        </div>
      ))}
      <button type="button" className={styles.add} onClick={add}>
        + Agregar pregunta
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Modify `components/admin/ContenidoEditor.jsx` to render both managers**

Add these imports at the top:

```jsx
import TestimoniosManager from "./TestimoniosManager";
import FaqManager from "./FaqManager";
```

Add these two `<section>` blocks right before the closing `<button type="submit" ...>` line (after the "Empresas" section, before the save button):

```jsx
      <section className={styles.block}>
        <h2>Testimonios</h2>
        <TestimoniosManager
          testimonios={draft.testimonios}
          onChange={(testimonios) => setDraft((p) => ({ ...p, testimonios }))}
        />
      </section>

      <section className={styles.block}>
        <h2>Preguntas frecuentes</h2>
        <FaqManager faq={draft.faq} onChange={(faq) => setDraft((p) => ({ ...p, faq }))} />
      </section>
```

- [ ] **Step 5: Verify manually**

In `/admin/contenido`, add a new testimonio, fill it in, save. Reload `/` and confirm it appears in the Testimonios section. Delete a FAQ item, save, confirm it disappears from the landing FAQ.

- [ ] **Step 6: Commit**

```bash
git add components/admin/TestimoniosManager.jsx components/admin/FaqManager.jsx components/admin/ListManager.module.css components/admin/ContenidoEditor.jsx
git commit -m "feat: add Testimonios and FAQ CRUD managers to the content editor"
```

---

## Task 23: Admin Usuarios (superadmin only)

**Files:**
- Create: `lib/createAdminUser.js`
- Create: `components/admin/UsuariosManager.jsx`
- Create: `components/admin/UsuariosManager.module.css`
- Create: `app/admin/usuarios/page.jsx`

**Interfaces:**
- Consumes: `firebaseConfig` and `db` from `lib/firebase.js`, `useAdminAuth()`.
- Produces: `createAdminUser({ email, password, role })` → `Promise<uid>`; `<UsuariosManager />`.

- [ ] **Step 1: Write `lib/createAdminUser.js`**

```js
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "./firebase";

export async function createAdminUser({ email, password, role = "admin" }) {
  const secondaryApp = initializeApp(firebaseConfig, `admin-creation-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, "alma_admins", credential.user.uid), {
      uid: credential.user.uid,
      email,
      role,
      createdAt: new Date().toISOString(),
    });
    return credential.user.uid;
  } finally {
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
  }
}
```

This uses a temporary secondary Firebase App instance so `createUserWithEmailAndPassword` doesn't sign the current superadmin out of their own session (a known side effect of that call on the primary app instance) — the secondary app is discarded right after.

- [ ] **Step 2: Write `components/admin/UsuariosManager.module.css`**

```css
.form {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: var(--space-lg);
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
  font-size: 0.85rem;
}

.field input {
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-beige);
}

.submit {
  background: var(--color-verde-principal);
  color: var(--color-blanco);
  padding: 0.7rem 1.4rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  text-align: left;
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--color-beige);
}

.message {
  margin-bottom: var(--space-sm);
  font-weight: 600;
}

.messageError {
  color: #b3452f;
}

.messageSuccess {
  color: var(--color-verde-oliva);
}
```

- [ ] **Step 3: Write `components/admin/UsuariosManager.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createAdminUser } from "@/lib/createAdminUser";
import styles from "./UsuariosManager.module.css";

export default function UsuariosManager() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = async () => {
    const snapshot = await getDocs(collection(db, "alma_admins"));
    setAdmins(snapshot.docs.map((d) => d.data()));
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await createAdminUser({ email, password, role: "admin" });
      setMessage({ type: "success", text: `Usuario ${email} creado correctamente.` });
      setEmail("");
      setPassword("");
      await loadAdmins();
    } catch (err) {
      setMessage({ type: "error", text: "No pudimos crear el usuario. Revisá los datos e intentá de nuevo." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Usuarios del panel</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="new-admin-email">Email</label>
          <input
            id="new-admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-admin-password">Contraseña temporal</label>
          <input
            id="new-admin-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Creando..." : "Crear usuario admin"}
        </button>
      </form>

      {message && (
        <p className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}>
          {message.text}
        </p>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.uid}>
              <td>{admin.email}</td>
              <td>{admin.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Write `app/admin/usuarios/page.jsx`**

```jsx
"use client";

import { useAdminAuth } from "@/lib/useAdminAuth";
import UsuariosManager from "@/components/admin/UsuariosManager";

export default function UsuariosPage() {
  const { adminDoc, loading } = useAdminAuth();

  if (loading) return null;

  if (adminDoc?.role !== "superadmin") {
    return <p>No tenés permiso para ver esta página.</p>;
  }

  return <UsuariosManager />;
}
```

Note: `AdminNav` (Task 18) already hides the "Usuarios" link for non-superadmins, but this page-level check is what actually enforces it if someone navigates to the URL directly — the link being hidden is a convenience, not the security boundary (the real boundary is the Firestore security rule from Task 24, which blocks non-superadmins from writing to `alma_admins` regardless of what the UI shows).

- [ ] **Step 5: Verify manually**

Logged in as the superadmin, go to `/admin/usuarios`, create a second admin user (any test email/password), confirm it appears in the table and the success message shows. Log out, log in as that new admin, confirm `/admin/usuarios` shows "No tenés permiso..." and the "Usuarios" link doesn't appear in the nav. Confirm the superadmin's own session was not affected by creating the new user (still logged in as superadmin throughout Step 3 of Task 18's earlier verification, before switching accounts here).

- [ ] **Step 6: Commit**

```bash
git add lib/createAdminUser.js components/admin/UsuariosManager.jsx components/admin/UsuariosManager.module.css app/admin/usuarios/page.jsx
git commit -m "feat: add superadmin-only Usuarios management page"
```

---

## Task 24: Firestore/Storage security rules, setup docs, final build verification

**Files:**
- Create: `firestore.rules`
- Create: `storage.rules`
- Create: `SETUP.md`
- Modify: `README.md`

**Interfaces:**
- Produces: local rules files (not deployed by this plan) and setup documentation for the user.

- [ ] **Step 1: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /alma_site_content/{document} {
      allow read: if true;
      allow write: if request.auth != null &&
        exists(/databases/$(database)/documents/alma_admins/$(request.auth.uid));
    }

    match /alma_admins/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/alma_admins/$(request.auth.uid)).data.role == 'superadmin';
    }

    match /alma_leads_empresas/{document} {
      allow create: if true;
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/alma_admins/$(request.auth.uid));
      allow update, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Write `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /alma/site/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

- [ ] **Step 3: Write `SETUP.md`**

```markdown
# ALMA — Setup

## Requisitos
- Node.js 20+
- Acceso a la consola de Firebase del proyecto `pedidos-lett-2`

## Desarrollo local

1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar con los valores reales de Firebase (pedirlos si no los tenés a mano).
3. `npm run dev` → http://localhost:3000

## Bootstrap del primer usuario admin (una sola vez)

1. Firebase Console → proyecto `pedidos-lett-2` → Authentication → Users → Add user. Cargar el email y contraseña reales del primer superadmin.
2. Copiar el UID generado.
3. Firestore → Data → crear colección `alma_admins` → documento con ID = ese UID → campos:
   - `uid`: el mismo UID (string)
   - `email`: el mismo email (string)
   - `role`: `superadmin` (string)
   - `createdAt`: fecha de hoy en formato ISO (string)
4. Ir a `/admin/login` en el sitio y entrar con esas credenciales. Desde `/admin/usuarios` ya se pueden crear el resto de los usuarios admin sin volver a tocar la consola de Firebase.

## Reglas de seguridad (Firestore y Storage)

**Importante:** el proyecto de Firebase es compartido con otra app (LETT). Antes de aplicar `firestore.rules` o `storage.rules`:

1. Abrir Firebase Console → Firestore/Storage → pestaña "Rules" y copiar las reglas actuales que ya están en producción.
2. Fusionar manualmente esas reglas con el contenido de `firestore.rules` / `storage.rules` de este repo (agregar los bloques `alma_*` / `alma/site/*` sin borrar los bloques existentes de la otra app).
3. Recién ahí pegar el resultado combinado en la consola y publicar. No usar `firebase deploy` con los archivos de este repo tal cual, porque sobrescribirían las reglas de la otra app.

## Deploy de la landing (Hostinger)

1. `npm run build` → genera la carpeta `out/`.
2. Subir el contenido de `out/` por el File Manager o FTP de Hostinger a la carpeta pública del dominio.
3. Los cambios de contenido (textos, testimonios, FAQ, imágenes) hechos desde `/admin/contenido` **no requieren repetir este paso** — se leen en vivo desde Firestore/Storage. Solo hace falta repetir el build+upload si se cambia código (nuevas secciones, textos fijos, etc).

## WhatsApp e Instagram

Reemplazar en `.env.local` (y en Hostinger, si se define de otra forma en producción):
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: número real de WhatsApp Business de ALMA, formato `54911XXXXXXXX`.
- `NEXT_PUBLIC_INSTAGRAM_HANDLE`: usuario real de Instagram, sin `@`.
```

- [ ] **Step 4: Modify `README.md`**

Add a line pointing to the new setup doc. Read the current `README.md` first, then apply this change:

```markdown
Specs de diseño de cada sub-proyecto en `docs/superpowers/specs/`.

Para levantar el proyecto localmente, crear el primer usuario admin y deployar, ver [`SETUP.md`](./SETUP.md).
```

- [ ] **Step 5: Final full verification**

Run: `npm test`
Expected: PASS — all unit tests green (siteContent, validateEmpresaLead, validateImageUpload).

Run: `npm run build`
Expected: succeeds, `out/` contains `index.html`, `tienda/index.html`, `admin/index.html`, `admin/login/index.html`, `admin/contenido/index.html`, `admin/usuarios/index.html`.

Run: `npm run dev` and manually walk through the QA checklist from the spec:
- All 8 public sections render in order with correct content and animations.
- B2B form validates and writes to Firestore.
- WhatsApp button opens the correct link.
- `/tienda` shows the placeholder.
- `/admin/login` → wrong credentials show an error, correct credentials log in.
- `/admin/contenido` → editing a text field and uploading an image both persist and show on the public landing after reload.
- `/admin/usuarios` → only visible/usable for the superadmin role.
- Run a Lighthouse audit (Chrome DevTools → Lighthouse) against the built `out/` site (e.g., via `npx serve out` then auditing `http://localhost:3000`) — confirm Performance, SEO, and Accessibility scores are in the green range; address any flagged issue that's cheap to fix (missing `alt` text, color contrast, etc.) before considering the sub-project done.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules storage.rules SETUP.md README.md
git commit -m "docs: add Firestore/Storage rules (local only) and setup/deploy documentation"
```

- [ ] **Step 7: Push everything**

```bash
git push
```

---

## Plan self-review notes

- **Spec coverage:** every section from the spec's "Estructura de secciones" has a task (7–17); the admin panel section maps to Tasks 18–23; SEO/OG is covered in Task 17; error handling items map to Tasks 12 (form errors), 18 (login errors), 5/8 (content fallback), 21 (upload validation); security rules and the shared-project caution are covered in Task 24; testing scope (Vitest for validation logic only) is covered in Tasks 5, 11, 20.
- **Deviation flagged during planning:** Task 10 (Producto) uses a stagger-reveal grid instead of the spec's "pinning" idea for the steps — noted inline in that task as something to revisit with the user if they want a more theatrical scroll-jacked version later.
- **Images:** the spec's fallback-to-placeholder behavior and the initial real stock photos are both implemented — `defaultSiteContent` (Task 5) ships with real, verified Unsplash URLs; `ImagePlaceholder` (Task 6) is the defensive fallback for the (normally unreachable) case of a genuinely empty image field.
