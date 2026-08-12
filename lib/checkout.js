import { countViandas } from "./cart";

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

export function validateMinimoViandas(cart, minimoViandas) {
  const total = countViandas(cart);
  const faltan = Math.max(0, (minimoViandas || 0) - total);
  return { valid: (minimoViandas || 0) <= 0 || total >= minimoViandas, faltan };
}

export function resolveEnvioGratis(cart, config) {
  const total = countViandas(cart);
  const activo = !!config?.envioGratisActivo;
  const desde = Number(config?.envioGratisDesde) || 0;
  const aplica = activo && desde > 0 && total >= desde;
  const faltan = activo && desde > 0 ? Math.max(0, desde - total) : 0;
  return { aplica, faltan, desde };
}

export function resolveDescuentoCantidad(cart, escalones) {
  const total = countViandas(cart);
  const activos = (escalones || [])
    .filter((e) => e.activo)
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima);

  const alcanzado = [...activos].reverse().find((e) => e.cantidadMinima <= total);
  const siguiente = activos.find((e) => e.cantidadMinima > total);

  return {
    porcentaje: alcanzado ? alcanzado.porcentaje : 0,
    siguienteCantidad: siguiente ? siguiente.cantidadMinima : null,
    siguientePorcentaje: siguiente ? siguiente.porcentaje : null,
    faltanParaSiguiente: siguiente ? siguiente.cantidadMinima - total : 0,
  };
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
