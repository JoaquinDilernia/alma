/**
 * Migración one-off: baja las fotos de producto y guarnición que hoy viven en
 * Firebase Storage, las recomprime (WebP, máx 1000px) y las deja como estáticos
 * en public/images/. Genera los manifiestos lib/imagenes*.js que mapean cada
 * doc de Firestore a su ruta estática.
 *
 * Motivo: servir estas imágenes desde Storage facturaba ~2,4 TB/mes de egress
 * (~USD 233 en agosto 2026). Como estáticos en Hostinger el costo es 0.
 *
 * Uso:  node scripts/migrar-imagenes.mjs [.env.local]
 * Requiere: ffmpeg en el PATH (con libwebp).
 *
 * Es idempotente: se puede correr de nuevo y regenera todo.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const envPath = process.argv[2] || join(ROOT, ".env.local");

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const MAX_WIDTH = 1000;
const QUALITY = 80;
const DIACRITICS = /[̀-ͯ]/g;

function slugify(str) {
  return String(str)
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

async function compressToWebp(sourceUrl, destPath) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`GET ${res.status} ${sourceUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = join(tmpdir(), `alma-migra-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  writeFileSync(tmp, buf);
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y", "-loglevel", "error",
        "-i", tmp,
        "-vf", `scale='min(${MAX_WIDTH},iw)':-2`,
        "-c:v", "libwebp", "-quality", String(QUALITY), "-compression_level", "6",
        destPath,
      ],
      { stdio: ["ignore", "ignore", "inherit"] }
    );
  } finally {
    rmSync(tmp, { force: true });
  }
}

async function dump(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function main() {
  const outDirProductos = join(ROOT, "public/images/productos");
  const outDirGuarniciones = join(ROOT, "public/images/guarniciones");
  mkdirSync(outDirProductos, { recursive: true });
  mkdirSync(outDirGuarniciones, { recursive: true });

  const productos = await dump("alma_productos");
  const guarniciones = await dump("alma_guarniciones");

  const mapProductos = {};
  for (const p of productos) {
    const urls = (p.imagenUrls || []).filter(Boolean);
    if (urls.length === 0) continue;
    const rutas = [];
    for (let i = 0; i < urls.length; i++) {
      const base = slugify(p.nombre) || p.id;
      const name = `${base}${urls.length > 1 ? `-${i}` : ""}.webp`;
      process.stdout.write(`producto   ${p.nombre} -> ${name}\n`);
      await compressToWebp(urls[i], join(outDirProductos, name));
      rutas.push(`/images/productos/${name}`);
    }
    mapProductos[p.id] = rutas;
  }

  const mapGuarniciones = {};
  for (const g of guarniciones) {
    if (!g.imagenUrl) continue;
    const name = `${slugify(g.nombre) || g.id}.webp`;
    process.stdout.write(`guarnicion ${g.nombre} -> ${name}\n`);
    await compressToWebp(g.imagenUrl, join(outDirGuarniciones, name));
    mapGuarniciones[g.id] = `/images/guarniciones/${name}`;
  }

  writeFileSync(
    join(ROOT, "lib/imagenesProductos.js"),
    `// GENERADO por scripts/migrar-imagenes.mjs — NO editar a mano salvo para\n` +
      `// agregar la foto de un producto nuevo:\n` +
      `//   1. Guardá la imagen en public/images/productos/<archivo>.webp\n` +
      `//   2. Agregá acá:  "<idDeFirestore>": ["/images/productos/<archivo>.webp"],\n` +
      `// Las fotos se sirven como estáticos (Hostinger), no desde Firebase Storage.\n\n` +
      `export const imagenesProductos = ${JSON.stringify(mapProductos, null, 2)};\n`
  );
  writeFileSync(
    join(ROOT, "lib/imagenesGuarniciones.js"),
    `// GENERADO por scripts/migrar-imagenes.mjs — NO editar a mano salvo para\n` +
      `// agregar la foto de una guarnición nueva:\n` +
      `//   1. Guardá la imagen en public/images/guarniciones/<archivo>.webp\n` +
      `//   2. Agregá acá:  "<idDeFirestore>": "/images/guarniciones/<archivo>.webp",\n\n` +
      `export const imagenesGuarniciones = ${JSON.stringify(mapGuarniciones, null, 2)};\n`
  );

  process.stdout.write(
    `\nListo: ${Object.keys(mapProductos).length} productos, ${Object.keys(mapGuarniciones).length} guarniciones.\n`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
