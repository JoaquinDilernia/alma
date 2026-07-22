"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProductos } from "@/lib/useProductos";
import { useCart } from "@/lib/CartProvider";
import GaleriaFotos from "./GaleriaFotos";
import TablaNutricional from "./TablaNutricional";
import styles from "./ProductoDetalle.module.css";

export default function ProductoDetalle() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { productos, loading } = useProductos();
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  if (loading) return <p style={{ padding: "4rem 0", textAlign: "center" }}>Cargando…</p>;

  const producto = productos.find((p) => p.id === id && p.activo);

  if (!producto) {
    return (
      <div className={styles.notFound}>
        <h1>Producto no encontrado</h1>
        <p style={{ margin: "1rem 0" }}>Puede que ya no esté disponible.</p>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const sinStock = producto.stock <= 0;

  const handleAgregar = () => {
    addToCart(producto, Math.min(cantidad, producto.stock));
    setAgregado(true);
  };

  return (
    <div className="section">
      <div className="container">
        <div className={styles.grid}>
          <GaleriaFotos imagenUrls={producto.imagenUrls} nombre={producto.nombre} />
          <div>
            <p className="sectionLabel">{producto.tipo === "pack" ? "Pack" : "Individual"}</p>
            <h1>{producto.nombre}</h1>
            <p className={styles.precio}>${producto.precio}</p>
            <p className={styles.descripcion}>{producto.descripcion}</p>

            {sinStock ? (
              <p className={styles.sinStock}>Sin stock por el momento.</p>
            ) : (
              <div className={styles.cantidadRow}>
                <label htmlFor="cantidad">Cantidad</label>
                <input
                  id="cantidad"
                  type="number"
                  min={1}
                  max={producto.stock}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Math.min(producto.stock, Number(e.target.value) || 1)))}
                />
              </div>
            )}

            <button type="button" className={styles.agregar} onClick={handleAgregar} disabled={sinStock}>
              Agregar al carrito
            </button>

            {agregado && <p className={styles.confirmacion}>Agregado al carrito ✓</p>}

            <TablaNutricional datos={producto.tablaNutricional} />
          </div>
        </div>
      </div>
    </div>
  );
}
