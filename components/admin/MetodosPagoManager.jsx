"use client";

import { useState } from "react";
import { useMetodosPago } from "@/lib/useMetodosPago";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./adminShared.module.css";

const COLLECTION = "alma_metodos_pago";

export default function MetodosPagoManager() {
  const { metodosPago, loading } = useMetodosPago();
  const [nombre, setNombre] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, {
      nombre: nombre.trim(),
      descuentoPorcentaje: Number(descuentoPorcentaje) || 0,
      activo: true,
    });
    setNombre("");
    setDescuentoPorcentaje(0);
  };

  const handleFieldChange = (metodo, field, value) => {
    updateDocById(COLLECTION, metodo.id, { [field]: value });
  };

  const handleDelete = (metodo) => {
    deleteDocById(COLLECTION, metodo.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Métodos de pago</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-texto)" }}>
        El % de descuento se aplica sobre el subtotal de productos en el checkout (no sobre el envío).
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descuento</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {metodosPago.map((metodo) => (
            <tr key={metodo.id}>
              <td data-label="Nombre">
                <input
                  type="text"
                  defaultValue={metodo.nombre}
                  onBlur={(e) => handleFieldChange(metodo, "nombre", e.target.value)}
                />
              </td>
              <td data-label="Descuento">
                <input
                  type="number"
                  defaultValue={metodo.descuentoPorcentaje}
                  onBlur={(e) => handleFieldChange(metodo, "descuentoPorcentaje", Number(e.target.value))}
                  style={{ width: 80 }}
                />
                %
              </td>
              <td data-label="Activo">
                <input
                  type="checkbox"
                  defaultChecked={metodo.activo}
                  onChange={(e) => handleFieldChange(metodo, "activo", e.target.checked)}
                />
              </td>
              <td data-label="" className={styles.actions}>
                <button type="button" className={styles.delete} onClick={() => handleDelete(metodo)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label htmlFor="nuevo-metodo-nombre">Nuevo método</label>
          <input id="nuevo-metodo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nuevo-metodo-descuento">Descuento %</label>
          <input
            id="nuevo-metodo-descuento"
            type="number"
            value={descuentoPorcentaje}
            onChange={(e) => setDescuentoPorcentaje(e.target.value)}
            style={{ width: 80 }}
          />
        </div>
        <button type="submit" className={styles.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
