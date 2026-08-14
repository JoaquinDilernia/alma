export function resolveOpcionesGramaje(producto) {
  const variantes = producto.variantesGramaje || [];
  if (!producto.gramajeBase || variantes.length === 0) return [];
  const base = { gramos: producto.gramajeBase, precio: producto.precio };
  return [base, ...variantes];
}

export function formatGramos(gramos) {
  if (gramos >= 1000) {
    const kg = gramos / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(1)}kg`;
  }
  return `${gramos}gr`;
}
