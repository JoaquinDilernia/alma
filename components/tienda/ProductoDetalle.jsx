"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProductos } from "@/lib/useProductos";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useGuarniciones } from "@/lib/useGuarniciones";
import { useCart } from "@/lib/CartProvider";
import GaleriaFotos from "./GaleriaFotos";
import TablaNutricional from "./TablaNutricional";
import RepartoInfo from "./RepartoInfo";
import GuarnicionPicker from "./GuarnicionPicker";
import SeleccionMultiple from "./SeleccionMultiple";
import { usePlatosPrincipales } from "@/lib/usePlatosPrincipales";
import { resolveOpcionesGramaje, formatGramos } from "@/lib/gramaje";
import styles from "./ProductoDetalle.module.css";

export default function ProductoDetalle() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { productos, loading } = useProductos();
  const { zonasEnvio } = useZonasEnvio();
  const { guarniciones: catalogoGuarniciones } = useGuarniciones();
  const { platosPrincipales: catalogoPlatos } = usePlatosPrincipales();
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [guarniciones, setGuarniciones] = useState([]);
  const [platosPrincipales, setPlatosPrincipales] = useState([]);
  const [agregado, setAgregado] = useState(false);
  const [gramajeSeleccionado, setGramajeSeleccionado] = useState(null);

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
  const idsGuarniciones = producto.guarniciones || [];
  const opciones = catalogoGuarniciones.filter((g) => g.activa && idsGuarniciones.includes(g.id));
  const tieneGuarniciones = opciones.length > 0;
  const cantidadViandas = producto.cantidadViandas || 1;
  const opcionesGramaje = resolveOpcionesGramaje(producto);
  const gramajeActivo = gramajeSeleccionado || opcionesGramaje[0] || null;
  const idsPlatosPrincipales = producto.platosPrincipales || [];
  const opcionesPlatos = catalogoPlatos.filter((p) => p.activa && idsPlatosPrincipales.includes(p.id));
  const esPackArmable = opcionesPlatos.length > 0;

  const todasElegidas =
    (!tieneGuarniciones || (guarniciones.length === cantidadViandas && guarniciones.every(Boolean))) &&
    (!esPackArmable || platosPrincipales.length === cantidadViandas);

  const extrasGuarniciones = guarniciones.reduce((sum, nombre) => {
    const g = opciones.find((o) => o.nombre === nombre);
    return sum + (g ? Number(g.precioExtra) || 0 : 0);
  }, 0);
  const extrasPlatos = platosPrincipales.reduce((sum, nombre) => {
    const p = opcionesPlatos.find((o) => o.nombre === nombre);
    return sum + (p ? Number(p.precioExtra) || 0 : 0);
  }, 0);
  const extras = extrasGuarniciones + extrasPlatos;
  const precioEfectivo = (gramajeActivo ? gramajeActivo.precio : producto.precio) + extras;

  const setSlot = (index, nombre) =>
    setGuarniciones((prev) => {
      const next = [...prev];
      next[index] = nombre;
      return next;
    });

  const handleAgregar = () => {
    const elegidas = tieneGuarniciones ? guarniciones.slice(0, cantidadViandas) : [];
    const platosElegidos = esPackArmable ? platosPrincipales.slice(0, cantidadViandas) : [];
    addToCart(producto, Math.min(cantidad, producto.stock), elegidas, precioEfectivo, gramajeActivo?.gramos ?? null, platosElegidos);
    setAgregado(true);
    setGuarniciones([]); // limpiar para poder elegir otra combinación
    setPlatosPrincipales([]);
  };

  return (
    <div className="section">
      <div className="container">
        <div className={styles.grid}>
          <GaleriaFotos imagenUrls={producto.imagenUrls} nombre={producto.nombre} />
          <div>
            <p className="sectionLabel">
              {producto.tipo === "pack" ? "Pack" : "Individual"}
              {producto.sinTacc && <span className={styles.badgeTacc}>Sin TACC</span>}
            </p>
            <h1>{producto.nombre}</h1>
            <p className={styles.precio}>${precioEfectivo}</p>
            <p className={styles.descripcion}>{producto.descripcion}</p>

            {opcionesGramaje.length > 1 && (
              <div className={styles.gramajeSelector}>
                {opcionesGramaje.map((opcion) => (
                  <button
                    type="button"
                    key={opcion.gramos}
                    className={`${styles.gramajeCard} ${gramajeActivo?.gramos === opcion.gramos ? styles.gramajeCardActivo : ""}`}
                    onClick={() => setGramajeSeleccionado(opcion)}
                  >
                    <span className={styles.gramajeLabel}>{formatGramos(opcion.gramos)}</span>
                    <span className={styles.gramajePrecio}>${opcion.precio}</span>
                  </button>
                ))}
              </div>
            )}

            {esPackArmable && !sinStock && (
              <SeleccionMultiple
                titulo="Plato principal"
                opciones={opcionesPlatos}
                seleccionadas={platosPrincipales}
                max={cantidadViandas}
                onChange={setPlatosPrincipales}
              />
            )}

            {esPackArmable && tieneGuarniciones && !sinStock && (
              <SeleccionMultiple
                titulo="Guarniciones"
                opciones={opciones}
                seleccionadas={guarniciones}
                max={cantidadViandas}
                onChange={setGuarniciones}
              />
            )}

            {!esPackArmable && tieneGuarniciones && !sinStock && (
              <GuarnicionPicker slots={cantidadViandas} opciones={opciones} value={guarniciones} onChange={setSlot} />
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
            {esPackArmable ? (
              <>
                {platosPrincipales.length !== cantidadViandas && !sinStock && (
                  <p className={styles.aviso}>
                    Elegí {cantidadViandas} plato{cantidadViandas > 1 ? "s" : ""} principal{cantidadViandas > 1 ? "es" : ""} para continuar.
                  </p>
                )}
                {tieneGuarniciones && guarniciones.length !== cantidadViandas && !sinStock && (
                  <p className={styles.aviso}>
                    Elegí {cantidadViandas} guarnición{cantidadViandas > 1 ? "es" : ""} para continuar.
                  </p>
                )}
              </>
            ) : (
              tieneGuarniciones &&
              !todasElegidas &&
              !sinStock && (
                <p className={styles.aviso}>Elegí {cantidadViandas > 1 ? "todas las guarniciones" : "una guarnición"} para continuar.</p>
              )
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
