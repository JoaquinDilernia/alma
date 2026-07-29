function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

export function filtrarPorRango(pedidos, { desde, hasta }) {
  return pedidos.filter((p) => {
    const fecha = toDate(p.createdAt);
    if (!fecha) return false;
    return fecha >= desde && fecha <= hasta;
  });
}

export function excluirCancelados(pedidos) {
  return pedidos.filter((p) => p.estado !== "cancelado");
}

export function calcularResumen(pedidos) {
  const ingresos = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
  const cantidadPedidos = pedidos.length;
  const ticketPromedio = cantidadPedidos > 0 ? ingresos / cantidadPedidos : 0;
  const viandasVendidas = pedidos.reduce(
    (sum, p) => sum + (p.items || []).reduce((s, item) => s + (item.cantidadViandas || 1) * item.cantidad, 0),
    0
  );
  return { ingresos, cantidadPedidos, ticketPromedio, viandasVendidas };
}

export function rankearProductos(pedidos) {
  const conteo = new Map();
  for (const pedido of pedidos) {
    for (const item of pedido.items || []) {
      conteo.set(item.nombre, (conteo.get(item.nombre) || 0) + item.cantidad);
    }
  }
  return Array.from(conteo.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

const ESTADOS = ["pendiente", "confirmado", "en_preparacion", "entregado", "cancelado"];

export function contarPorEstado(pedidos) {
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  for (const pedido of pedidos) {
    if (conteo[pedido.estado] !== undefined) conteo[pedido.estado] += 1;
  }
  return conteo;
}

export function contarPorMetodoPago(pedidos) {
  const conteo = new Map();
  for (const pedido of pedidos) {
    const label = pedido.metodoPagoElegido || "Sin especificar";
    conteo.set(label, (conteo.get(label) || 0) + 1);
  }
  return Array.from(conteo.entries())
    .map(([label, cantidad]) => ({ label, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function contarPorZona(pedidos) {
  const conteo = new Map();
  for (const pedido of pedidos) {
    const zonaEnvioId = pedido.zonaEnvioId || "sin-zona";
    conteo.set(zonaEnvioId, (conteo.get(zonaEnvioId) || 0) + 1);
  }
  return Array.from(conteo.entries())
    .map(([zonaEnvioId, cantidad]) => ({ zonaEnvioId, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function rangoDesdeAtajo(atajo, hoy) {
  const hasta = new Date(hoy);
  hasta.setHours(23, 59, 59, 999);
  const desde = new Date(hoy);
  desde.setHours(0, 0, 0, 0);
  if (atajo === "semana") {
    desde.setDate(desde.getDate() - 6);
  } else if (atajo === "30dias") {
    desde.setDate(desde.getDate() - 29);
  }
  return { desde, hasta };
}
