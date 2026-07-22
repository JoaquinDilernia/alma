"use client";

import { useState } from "react";
import { useProductos } from "@/lib/useProductos";
import { deleteDocById } from "@/lib/adminCrud";
import ProductoForm from "./ProductoForm";
import styles from "./ProductosManager.module.css";

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

      <button type="button" className={styles.addButton} onClick={() => setEditing("new")}>
        + Nuevo producto
      </button>

      <table className={styles.table}>
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
              <td>
                {producto.imagenUrls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={producto.imagenUrls[0]} alt="" className={styles.thumb} />
                )}
              </td>
              <td>{producto.nombre}</td>
              <td>{producto.tipo}</td>
              <td>${producto.precio}</td>
              <td className={producto.stock <= 0 ? styles.stockBajo : undefined}>{producto.stock}</td>
              <td>{producto.activo ? "Sí" : "No"}</td>
              <td className={styles.actions}>
                <button type="button" className={styles.edit} onClick={() => setEditing(producto)}>
                  Editar
                </button>
                <button type="button" className={styles.delete} onClick={() => handleDelete(producto)}>
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
