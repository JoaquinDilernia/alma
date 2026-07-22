"use client";

import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import styles from "./CartIcon.module.css";

export default function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link href="/tienda/carrito" className={styles.link} aria-label="Ver carrito">
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M7 4h-2l-.94 2H2v2h1.06l3.16 7.59-1.18 2.13c-.51.94.16 2.28 1.25 2.28h11.71v-2h-11.71l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.24-6.97h-15.11l-.94-2h16.05v-2h-17.63zM7 20a2 2 0 1 0 0.001 4.001 2 2 0 0 0 -0.001 -4.001zm10 0a2 2 0 1 0 0.001 4.001 2 2 0 0 0 -0.001 -4.001z" />
      </svg>
      {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
    </Link>
  );
}
