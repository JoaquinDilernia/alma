export function cartLineId(item) {
  return `${item.productoId}::${(item.guarniciones || []).join("|")}`;
}

export function addItem(cart, product, cantidad = 1, guarniciones = [], precioEfectivo = product.precio) {
  const nuevo = {
    productoId: product.id,
    nombre: product.nombre,
    cantidadViandas: product.cantidadViandas || 1,
    guarniciones,
    precio: precioEfectivo,
    cantidad,
  };
  const lineId = cartLineId(nuevo);
  const existing = cart.find((item) => cartLineId(item) === lineId);
  if (existing) {
    return cart.map((item) =>
      cartLineId(item) === lineId ? { ...item, cantidad: item.cantidad + cantidad } : item
    );
  }
  return [...cart, nuevo];
}

export function removeItem(cart, lineId) {
  return cart.filter((item) => cartLineId(item) !== lineId);
}

export function updateQuantity(cart, lineId, cantidad) {
  if (cantidad <= 0) return removeItem(cart, lineId);
  return cart.map((item) => (cartLineId(item) === lineId ? { ...item, cantidad } : item));
}

export function calculateSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

export function countViandas(cart) {
  return cart.reduce((sum, item) => sum + (item.cantidadViandas || 1) * item.cantidad, 0);
}
