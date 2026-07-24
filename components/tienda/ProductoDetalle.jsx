"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProductos } from "@/lib/useProductos";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useCart } from "@/lib/CartProvider";
import GaleriaFotos from "./GaleriaFotos";
import TablaNutricional from "./TablaNutricional";
import RepartoInfo from "./RepartoInfo";
import styles from "./ProductoDetalle.module.css";

export default function ProductoDetalle() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { productos, loading } = useProductos();
  const { zonasEnvio } = useZonasEnvio();
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [guarniciones, setGuarniciones] = useState([]);
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
  const opciones = producto.guarniciones || [];
  const tieneGuarniciones = opciones.length > 0;
  const cantidadViandas = producto.cantidadViandas || 1;
  const slots = tieneGuarniciones ? Array.from({ length: cantidadViandas }) : [];

  const todasElegidas = !tieneGuarniciones || (guarniciones.length === cantidadViandas && guarniciones.every(Boolean));

  const extras = guarniciones.reduce((sum, nombre) => {
    const g = opciones.find((o) => o.nombre === nombre);
    return sum + (g ? Number(g.precioExtra) || 0 : 0);
  }, 0);
  const precioEfectivo = producto.precio + extras;

  const setSlot = (index, nombre) =>
    setGuarniciones((prev) => {
      const next = [...prev];
      next[index] = nombre;
      return next;
    });

  const handleAgregar = () => {
    const elegidas = tieneGuarniciones ? guarniciones.slice(0, cantidadViandas) : [];
    addToCart(producto, Math.min(cantidad, producto.stock), elegidas, precioEfectivo);
    setAgregado(true);
    setGuarniciones([]); // limpiar para poder elegir otra combinación
  };

  return (
    <div className="section">
      <div className="container">
        <div className={styles.grid}>
          <GaleriaFotos imagenUrls={producto.imagenUrls} nombre={producto.nombre} />
          <div>
            <p className="sectionLabel">{producto.tipo === "pack" ? "Pack" : "Individual"}</p>
            <h1>{producto.nombre}</h1>
            <p className={styles.precio}>${precioEfectivo}</p>
            <p className={styles.descripcion}>{producto.descripcion}</p>

            {tieneGuarniciones && !sinStock && (
              <div className={styles.guarniciones}>
                {slots.map((_, index) => (
                  <div key={index} className={styles.guarnicionField}>
                    <label htmlFor={`guarnicion-${index}`}>
                      {cantidadViandas > 1 ? `Guarnición ${index + 1}` : "Guarnición"}
                    </label>
                    <select
                      id={`guarnicion-${index}`}
                      value={guarniciones[index] || ""}
                      onChange={(e) => setSlot(index, e.target.value)}
                    >
                      <option value="">Elegí una guarnición</option>
                      {opciones.map((o) => (
                        <option key={o.nombre} value={o.nombre}>
                          {o.nombre}
                          {o.precioExtra > 0 ? ` (+$${o.precioExtra})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

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

            <button
              type="button"
              className={styles.agregar}
              onClick={handleAgregar}
              disabled={sinStock || !todasElegidas}
            >
              Agregar al carrito
            </button>
            {tieneGuarniciones && !todasElegidas && !sinStock && (
              <p className={styles.aviso}>Elegí {cantidadViandas > 1 ? "todas las guarniciones" : "una guarnición"} para continuar.</p>
            )}

            {agregado && <p className={styles.confirmacion}>Agregado al carrito ✓</p>}

            <RepartoInfo zonas={zonasEnvio} />
            <TablaNutricional datos={producto.tablaNutricional} />
          </div>
        </div>
      </div>
    </div>
  );
}
