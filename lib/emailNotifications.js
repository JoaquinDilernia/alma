import emailjs from "@emailjs/browser";
import { formatGramos } from "./gramaje";

export function buildOrderEmailParams({
  cliente,
  items,
  subtotal,
  descuentoCantidadPorcentaje = 0,
  descuentoCantidadMonto = 0,
  descuentoMetodoPagoMonto = 0,
  descuentoMonto,
  descuentoPorcentaje,
  costoEnvio,
  total,
  metodoPagoElegido,
  numeroPedido,
}) {
  const itemsDetalle = items
    .map((item) => {
      const gramos = item.gramos ? ` ${formatGramos(item.gramos)}` : "";
      const guarniciones = (item.guarniciones || []).length ? ` (${item.guarniciones.join(", ")})` : "";
      return `${item.cantidad}x ${item.nombre}${gramos}${guarniciones} — $${item.precio * item.cantidad}`;
    })
    .join("\n");

  return {
    numero_pedido: numeroPedido,
    descuento_cantidad_porcentaje: descuentoCantidadPorcentaje,
    descuento_cantidad_monto: descuentoCantidadMonto,
    cliente_nombre: cliente.nombre,
    cliente_email: cliente.email,
    cliente_telefono: cliente.telefono,
    cliente_direccion: cliente.direccion,
    items_detalle: itemsDetalle,
    subtotal,
    descuento_monto: descuentoMonto,
    descuento_porcentaje: descuentoPorcentaje,
    descuento_metodo_pago_monto: descuentoMetodoPagoMonto,
    costo_envio: costoEnvio,
    total,
    metodo_pago: metodoPagoElegido,
  };
}

export async function sendOrderConfirmationEmail(params) {
  return emailjs.send(
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
    params,
    { publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY }
  );
}
