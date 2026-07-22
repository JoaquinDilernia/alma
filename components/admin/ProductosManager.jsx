"use client";

import { useState } from "react";
import { useProductos } from "@/lib/useProductos";
import { deleteDocById } from "@/lib/adminCrud";
import ProductoForm from "./ProductoForm";
import shared from "./adminShared.module.css";
import styles from "./ProductosManager.module.css";

const STOCK_BAJO_UMBRAL = 5;

export default function ProductosManager() {
  const { productos, loading } = useProductos();
  const [editing, setEditing] = useState(null); // null | "new" | producto
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (producto) => {
    if (confirmDeleteId !== producto.id) {
      setConfirmDeleteId(producto.id);
      return;
    }
    await deleteDocById("alma_productos", producto.id);
    setConfirmDeleteId(null);
  };

  if (loading) return <p>Cargando…</p>;

  if (editing) {
    return (
      <div>
        <h1 style={{ marginBottom: "1.5rem" }}>{editing === "new" ? "Nuevo producto" : "Editar producto"}</h1>
        <ProductoForm producto={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Productos</h1>

      <button
        type="button"
        className={shared.addButton}
        style={{ marginBottom: "1.5rem" }}
        onClick={() => setEditing("new")}
      >
        + Nuevo producto
      </button>

      <table className={shared.table}>
        <thead>
          <tr>
            <th></th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => (
            <tr key={producto.id}>
              <td data-label="">
                {producto.imagenUrls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={producto.imagenUrls[0]} alt="" className={styles.thumb} />
                )}
              </td>
              <td data-label="Nombre">{producto.nombre}</td>
              <td data-label="Tipo">{producto.tipo}</td>
              <td data-label="Precio">${producto.precio}</td>
              <td data-label="Stock">
                <div className={styles.stockCell}>
                  <span>{producto.stock}</span>
                  {producto.stock <= 0 ? (
                    <span className={`${styles.stockBadge} ${styles.stockBadgeSinStock}`}>Sin stock</span>
                  ) : producto.stock <= STOCK_BAJO_UMBRAL ? (
                    <span className={`${styles.stockBadge} ${styles.stockBadgeBajo}`}>Stock bajo</span>
                  ) : null}
                </div>
              </td>
              <td data-label="Activo">{producto.activo ? "Sí" : "No"}</td>
              <td data-label="" className={shared.actions}>
                <button type="button" className={shared.edit} onClick={() => setEditing(producto)}>
                  Editar
                </button>
                <button type="button" className={shared.delete} onClick={() => handleDelete(producto)}>
                  {confirmDeleteId === producto.id ? "¿Confirmar?" : "Eliminar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
