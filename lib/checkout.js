const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function calculateTotal(subtotal, costoEnvio) {
  return subtotal + costoEnvio;
}

export function calculateDiscount(subtotal, descuentoPorcentaje) {
  return subtotal * ((descuentoPorcentaje || 0) / 100);
}

export function validateCheckoutForm(data) {
  const errors = {};

  if (!data.nombre || data.nombre.trim().length < 2) {
    errors.nombre = "Ingresá tu nombre.";
  }
  if (!data.telefono || data.telefono.replace(/\D/g, "").length < 8) {
    errors.telefono = "Ingresá un teléfono válido.";
  }
  if (!data.email || !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = "Ingresá un email válido.";
  }
  if (!data.direccion || data.direccion.trim().length < 5) {
    errors.direccion = "Ingresá tu dirección.";
  }
  if (!data.zonaEnvioId) {
    errors.zonaEnvioId = "Elegí una zona de envío.";
  }
  if (!data.metodoPago) {
    errors.metodoPago = "Elegí un método de pago.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStockAvailability(cart, stockMap) {
  const errors = {};

  for (const item of cart) {
    const disponible = stockMap[item.productoId] ?? 0;
    if (disponible < item.cantidad) {
      errors[item.productoId] = `Quedan solo ${disponible} unidades de ${item.nombre}.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
