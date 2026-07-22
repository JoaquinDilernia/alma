"use client";

import { useState } from "react";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./CategoriasManager.module.css";

const COLLECTION = "alma_zonas_envio";

export default function ZonasEnvioManager() {
  const { zonasEnvio, loading } = useZonasEnvio();
  const [nombre, setNombre] = useState("");
  const [costo, setCosto] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, { nombre: nombre.trim(), costo: Number(costo) || 0, activa: true });
    setNombre("");
    setCosto(0);
  };

  const handleFieldChange = (zona, field, value) => {
    updateDocById(COLLECTION, zona.id, { [field]: value });
  };

  const handleDelete = (zona) => {
    deleteDocById(COLLECTION, zona.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Zonas de envío</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Costo</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {zonasEnvio.map((zona) => (
            <tr key={zona.id}>
              <td>
                <input
                  type="text"
                  defaultValue={zona.nombre}
                  onBlur={(e) => handleFieldChange(zona, "nombre", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  defaultValue={zona.costo}
                  onBlur={(e) => handleFieldChange(zona, "costo", Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  defaultChecked={zona.activa}
                  onChange={(e) => handleFieldChange(zona, "activa", e.target.checked)}
                />
              </td>
              <td className={styles.actions}>
                <button type="button" className={styles.delete} onClick={() => handleDelete(zona)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label htmlFor="nueva-zona-nombre">Nueva zona</label>
          <input id="nueva-zona-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nueva-zona-costo">Costo</label>
          <input
            id="nueva-zona-costo"
            type="number"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            style={{ width: 100 }}
          />
        </div>
        <button type="submit" className={styles.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
