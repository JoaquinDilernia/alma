export function addItem(cart, product, cantidad = 1) {
  const existing = cart.find((item) => item.productoId === product.id);
  if (existing) {
    return cart.map((item) =>
      item.productoId === product.id ? { ...item, cantidad: item.cantidad + cantidad } : item
    );
  }
  return [...cart, { productoId: product.id, nombre: product.nombre, precio: product.precio, cantidad }];
}

export function removeItem(cart, productoId) {
  return cart.filter((item) => item.productoId !== productoId);
}

export function updateQuantity(cart, productoId, cantidad) {
  if (cantidad <= 0) return removeItem(cart, productoId);
  return cart.map((item) => (item.productoId === productoId ? { ...item, cantidad } : item));
}

export function calculateSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}
