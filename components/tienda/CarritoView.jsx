"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import { calculateTotal, validateMinimoViandas } from "@/lib/checkout";
import CarritoItem from "./CarritoItem";
import RepartoInfo from "./RepartoInfo";
import styles from "./CarritoView.module.css";

export default function CarritoView() {
  const { cart, subtotal, viandaCount } = useCart();
  const { zonasEnvio, loading } = useZonasEnvio();
  const { minimoViandas } = useTiendaConfig();
  const [zonaId, setZonaId] = useState("");

  const zonasActivas = zonasEnvio.filter((z) => z.activa);

  useEffect(() => {
    if (!zonaId && zonasActivas.length > 0) {
      setZonaId(zonasActivas[0].id);
    }
  }, [zonasActivas, zonaId]);

  if (cart.length === 0) {
    return (
      <div className={styles.empty}>
        <h1>Tu carrito está vacío</h1>
        <p style={{ margin: "1rem 0" }}>Todavía no agregaste ninguna vianda.</p>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const zonaSeleccionada = zonasActivas.find((z) => z.id === zonaId);
  const costoEnvio = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const total = calculateTotal(subtotal, costoEnvio);
  const { valid: minimoOk, faltan } = validateMinimoViandas(cart, minimoViandas);
  const progreso = minimoViandas > 0 ? Math.min(100, Math.round((viandaCount / minimoViandas) * 100)) : 100;

  return (
    <div>
      {minimoViandas > 0 && (
        <div className={styles.minimo}>
          <div className={styles.minimoLabel}>
            <span>{viandaCount} de {minimoViandas} viandas</span>
            {!minimoOk && <span className={styles.faltan}>Te faltan {faltan} para el mínimo</span>}
            {minimoOk && <span className={styles.listo}>¡Mínimo alcanzado! ✓</span>}
          </div>
          <div className={styles.barra}>
            <div className={styles.barraFill} style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}

      {cart.map((item) => (
        <CarritoItem key={`${item.productoId}::${(item.guarniciones || []).join("|")}`} item={item} />
      ))}

      <div className={styles.zona}>
        <label htmlFor="zona-envio">Zona de envío</label>
        {loading ? (
          <p>Cargando zonas…</p>
        ) : (
          <select id="zona-envio" value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
            {zonasActivas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre} — ${zona.costo}
              </option>
            ))}
          </select>
        )}
      </div>

      {zonaSeleccionada && <RepartoInfo zona={zonaSeleccionada} />}

      <div className={styles.totales}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>${subtotal}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Envío</span>
          <span>${costoEnvio}</span>
        </div>
        <div className={`${styles.totalRow} ${styles.totalFinal}`}>
          <span>Total</span>
          <span>${total}</span>
        </div>
      </div>

      {minimoOk ? (
        <Link href={`/tienda/checkout?zona=${zonaId}`} className={styles.continuar}>
          Continuar al checkout
        </Link>
      ) : (
        <button type="button" className={styles.continuar} disabled aria-disabled="true">
          Agregá {faltan} vianda{faltan === 1 ? "" : "s"} más
        </button>
      )}
    </div>
  );
}
