import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { calculateSubtotal } from "./cart";
import { calculateTotal } from "./checkout";

export async function submitOrder({ cart, cliente, zonaEnvioId, costoEnvio, metodoPago }) {
  const pedidoRef = doc(collection(db, "alma_pedidos"));

  await runTransaction(db, async (transaction) => {
    const productRefs = cart.map((item) => doc(db, "alma_productos", item.productoId));
    const snapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

    snapshots.forEach((snap, index) => {
      const item = cart[index];
      const stockActual = snap.exists() ? snap.data().stock : 0;
      if (stockActual < item.cantidad) {
        throw new Error(`STOCK_INSUFICIENTE:${item.nombre}`);
      }
    });

    snapshots.forEach((snap, index) => {
      const item = cart[index];
      transaction.update(productRefs[index], { stock: snap.data().stock - item.cantidad });
    });

    const subtotal = calculateSubtotal(cart);
    const total = calculateTotal(subtotal, costoEnvio);

    transaction.set(pedidoRef, {
      cliente,
      zonaEnvioId,
      items: cart,
      subtotal,
      costoEnvio,
      total,
      metodoPagoElegido: metodoPago,
      estado: "pendiente",
      createdAt: serverTimestamp(),
    });
  });

  return pedidoRef.id;
}
