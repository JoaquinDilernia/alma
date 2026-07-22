"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { addItem, removeItem, updateQuantity, calculateSubtotal } from "./cart";

const CartContext = createContext(null);
const STORAGE_KEY = "alma_cart";

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setCart(JSON.parse(stored));
    } catch (err) {
      // corrupt/unavailable storage — start with an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const value = {
    cart,
    addToCart: (producto, cantidad) => setCart((prev) => addItem(prev, producto, cantidad)),
    removeFromCart: (productoId) => setCart((prev) => removeItem(prev, productoId)),
    updateCartQuantity: (productoId, cantidad) => setCart((prev) => updateQuantity(prev, productoId, cantidad)),
    clearCart: () => setCart([]),
    subtotal: calculateSubtotal(cart),
    itemCount: cart.reduce((n, item) => n + item.cantidad, 0),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
