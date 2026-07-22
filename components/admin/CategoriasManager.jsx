"use client";

import { useState } from "react";
import { useCategorias } from "@/lib/useCategorias";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./adminShared.module.css";

const COLLECTION = "alma_categorias";

export default function CategoriasManager() {
  const { categorias, loading } = useCategorias();
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, { nombre: nombre.trim(), orden: Number(orden) || 0, activa: true });
    setNombre("");
    setOrden(0);
  };

  const handleFieldChange = (categoria, field, value) => {
    updateDocById(COLLECTION, categoria.id, { [field]: value });
  };

  const handleDelete = (categoria) => {
    deleteDocById(COLLECTION, categoria.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Categorías</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Orden</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((categoria) => (
            <tr key={categoria.id}>
              <td data-label="Nombre">
                <input
                  type="text"
                  defaultValue={categoria.nombre}
                  onBlur={(e) => handleFieldChange(categoria, "nombre", e.target.value)}
                />
              </td>
              <td data-label="Orden">
                <input
                  type="number"
                  defaultValue={categoria.orden}
                  onBlur={(e) => handleFieldChange(categoria, "orden", Number(e.target.value))}
                  style={{ width: 70 }}
                />
              </td>
              <td data-label="Activa">
                <input
                  type="checkbox"
                  defaultChecked={categoria.activa}
                  onChange={(e) => handleFieldChange(categoria, "activa", e.target.checked)}
                />
              </td>
              <td data-label="" className={styles.actions}>
                <button type="button" className={styles.delete} onClick={() => handleDelete(categoria)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label htmlFor="nueva-categoria-nombre">Nueva categoría</label>
          <input id="nueva-categoria-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nueva-categoria-orden">Orden</label>
          <input
            id="nueva-categoria-orden"
            type="number"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            style={{ width: 70 }}
          />
        </div>
        <button type="submit" className={styles.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
