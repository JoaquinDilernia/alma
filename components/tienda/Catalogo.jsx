"use client";

import { useState } from "react";
import { useProductos } from "@/lib/useProductos";
import { useCategorias } from "@/lib/useCategorias";
import CategoriaFiltro from "./CategoriaFiltro";
import ProductoCard from "./ProductoCard";
import styles from "./Catalogo.module.css";

export default function Catalogo() {
  const { productos, loading: loadingProductos } = useProductos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  if (loadingProductos || loadingCategorias) {
    return <p>Cargando catálogo…</p>;
  }

  const categoriasActivas = categorias.filter((c) => c.activa);
  const productosActivos = productos.filter((p) => p.activo);
  const productosFiltrados = categoriaActiva
    ? productosActivos.filter((p) => p.categoriaId === categoriaActiva)
    : productosActivos;

  return (
    <div>
      <CategoriaFiltro categorias={categoriasActivas} activa={categoriaActiva} onChange={setCategoriaActiva} />
      {productosFiltrados.length === 0 ? (
        <p className={styles.empty}>No hay productos en esta categoría por ahora.</p>
      ) : (
        <div className={styles.grid}>
          {productosFiltrados.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
