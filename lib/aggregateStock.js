export function aggregateStockNeeds(cart) {
  const map = new Map();
  for (const item of cart) {
    const prev = map.get(item.productoId);
    if (prev) {
      prev.cantidadTotal += item.cantidad;
    } else {
      map.set(item.productoId, { productoId: item.productoId, cantidadTotal: item.cantidad, nombre: item.nombre });
    }
  }
  return [...map.values()];
}
