"use client";

import { useCart } from "@/lib/CartProvider";
import styles from "./CarritoItem.module.css";

export default function CarritoItem({ item }) {
  const { updateCartQuantity, removeFromCart } = useCart();

  return (
    <div className={styles.row}>
      <span className={styles.nombre}>{item.nombre}</span>
      <span>${item.precio}</span>
      <input
        type="number"
        min={1}
        value={item.cantidad}
        onChange={(e) => updateCartQuantity(item.productoId, Number(e.target.value) || 1)}
        className={styles.cantidad}
      />
      <button type="button" className={styles.quitar} onClick={() => removeFromCart(item.productoId)}>
        Quitar
      </button>
    </div>
  );
}
