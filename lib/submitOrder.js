import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { calculateSubtotal } from "./cart";
import { calculateTotal, calculateDiscount } from "./checkout";
import { aggregateStockNeeds } from "./aggregateStock";

export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago, descuentoPorcentaje = 0 }) {
  const pedidoRef = doc(collection(db, "alma_pedidos"));
  const needs = aggregateStockNeeds(cart);

  await runTransaction(db, async (transaction) => {
    const refs = needs.map((n) => doc(db, "alma_productos", n.productoId));
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));

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

    const subtotal = calculateSubtotal(cart);
    const descuentoMonto = calculateDiscount(subtotal, descuentoPorcentaje);
    const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);

    transaction.set(pedidoRef, {
      cliente,
      zonaEnvioId,
      items: cart,
      subtotal,
      descuentoPorcentaje,
      descuentoMonto,
      costoEnvio,
      total,
      metodoPagoElegido: metodoPago,
      estado: "pendiente",
      createdAt: serverTimestamp(),
    });
  });

  return pedidoRef.id;
}
