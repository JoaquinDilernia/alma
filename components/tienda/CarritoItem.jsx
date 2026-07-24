"use client";

import { useCart } from "@/lib/CartProvider";
import { cartLineId } from "@/lib/cart";
import styles from "./CarritoItem.module.css";

export default function CarritoItem({ item }) {
  const { updateCartQuantity, removeFromCart } = useCart();
  const lineId = cartLineId(item);
  const guarniciones = item.guarniciones || [];

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.nombre}>{item.nombre}</span>
        {guarniciones.length > 0 && <span className={styles.guarniciones}>{guarniciones.join(", ")}</span>}
      </div>
      <span>${item.precio}</span>
      <input
        type="number"
        min={1}
        value={item.cantidad}
        onChange={(e) => updateCartQuantity(lineId, Number(e.target.value) || 1)}
        className={styles.cantidad}
      />
      <button type="button" className={styles.quitar} onClick={() => removeFromCart(lineId)}>
        Quitar
      </button>
    </div>
  );
}
