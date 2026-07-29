export function normalizeNombre(nombre) {
  return (nombre || "").trim().toLowerCase();
}

export function collectGuarnicionesUnicas(productos) {
  const vistos = new Map();
  for (const producto of productos) {
    for (const g of producto.guarniciones || []) {
      const clave = normalizeNombre(g.nombre);
      if (!clave || vistos.has(clave)) continue;
      vistos.set(clave, { nombre: g.nombre.trim(), precioExtra: Number(g.precioExtra) || 0 });
    }
  }
  return Array.from(vistos.values());
}

export function remapProductoGuarniciones(producto, nombreToId) {
  return (producto.guarniciones || [])
    .map((g) => nombreToId[normalizeNombre(g.nombre)])
    .filter(Boolean);
}
