import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { calculateSubtotal } from "./cart";
import { calculateTotal, calculateDiscount } from "./checkout";
import { aggregateStockNeeds } from "./aggregateStock";

export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0, descuentoCantidadPorcentaje = 0 }) {
  const pedidoRef = doc(collection(db, "alma_pedidos"));
  const contadorRef = doc(db, "alma_contadores", "pedidos");
  const needs = aggregateStockNeeds(cart);
  let numeroPedido;

  await runTransaction(db, async (transaction) => {
    const refs = needs.map((n) => doc(db, "alma_productos", n.productoId));
    const [snapshots, contadorSnap] = await Promise.all([
      Promise.all(refs.map((ref) => transaction.get(ref))),
      transaction.get(contadorRef),
    ]);

    snapshots.forEach((snap, index) => {
      const need = needs[index];
      const stockActual = snap.exists() ? snap.data().stock : 0;
      if (stockActual < need.cantidadTotal) {
        throw new Error(`STOCK_INSUFICIENTE:${need.nombre}`);
      }
    });

    snapshots.forEach((snap, index) => {
      transaction.update(refs[index], { stock: snap.data().stock - needs[index].cantidadTotal });
    });

    numeroPedido = contadorSnap.exists() ? contadorSnap.data().ultimoNumero + 1 : 1;
    if (contadorSnap.exists()) {
      transaction.update(contadorRef, { ultimoNumero: numeroPedido });
    } else {
      transaction.set(contadorRef, { ultimoNumero: numeroPedido });
    }

    const subtotal = calculateSubtotal(cart);
    const descuentoCantidadMonto = calculateDiscount(subtotal, descuentoCantidadPorcentaje);
    const subtotalPostCantidad = subtotal - descuentoCantidadMonto;
    const descuentoMetodoPagoMonto = calculateDiscount(subtotalPostCantidad, descuentoPorcentaje);
    const descuentoMonto = descuentoCantidadMonto + descuentoMetodoPagoMonto;
    const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);

    transaction.set(pedidoRef, {
      cliente,
      zonaEnvioId,
      items: cart,
      subtotal,
      descuentoCantidadPorcentaje,
      descuentoCantidadMonto,
      descuentoPorcentaje,
      descuentoMetodoPagoMonto,
      descuentoMonto,
      costoEnvio,
      total,
      metodoPagoElegido: metodoPago,
      estado: "pendiente",
      numeroPedido,
      createdAt: serverTimestamp(),
    });
  });

  return { pedidoId: pedidoRef.id, numeroPedido };
}
