"use client";

import { useState } from "react";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import styles from "./adminShared.module.css";

const COLLECTION = "alma_zonas_envio";

export default function ZonasEnvioManager() {
  const { zonasEnvio, loading } = useZonasEnvio();
  const [nombre, setNombre] = useState("");
  const [costo, setCosto] = useState(0);
  const [dias, setDias] = useState("");
  const [horario, setHorario] = useState("");

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, {
      nombre: nombre.trim(),
      costo: Number(costo) || 0,
      activa: true,
      diasReparto: dias.trim(),
      horarioReparto: horario.trim(),
    });
    setNombre("");
    setCosto(0);
    setDias("");
    setHorario("");
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
            <th>Días de reparto</th>
            <th>Horario</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {zonasEnvio.map((zona) => (
            <tr key={zona.id}>
              <td data-label="Nombre">
                <input
                  type="text"
                  defaultValue={zona.nombre}
                  onBlur={(e) => handleFieldChange(zona, "nombre", e.target.value)}
                />
              </td>
              <td data-label="Costo">
                <input
                  type="number"
                  defaultValue={zona.costo}
                  onBlur={(e) => handleFieldChange(zona, "costo", Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </td>
              <td data-label="Días de reparto">
                <input
                  type="text"
                  defaultValue={zona.diasReparto || ""}
                  onBlur={(e) => handleFieldChange(zona, "diasReparto", e.target.value)}
                  placeholder="Ej. Lunes y Jueves"
                />
              </td>
              <td data-label="Horario">
                <input
                  type="text"
                  defaultValue={zona.horarioReparto || ""}
                  onBlur={(e) => handleFieldChange(zona, "horarioReparto", e.target.value)}
                  placeholder="Ej. 9 a 18 hs"
                />
              </td>
              <td data-label="Activa">
                <input
                  type="checkbox"
                  defaultChecked={zona.activa}
                  onChange={(e) => handleFieldChange(zona, "activa", e.target.checked)}
                />
              </td>
              <td data-label="" className={styles.actions}>
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
        <div className={styles.field}>
          <label htmlFor="nueva-zona-dias">Días de reparto</label>
          <input id="nueva-zona-dias" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Ej. Lunes y Jueves" />
        </div>
        <div className={styles.field}>
          <label htmlFor="nueva-zona-horario">Horario</label>
          <input id="nueva-zona-horario" value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Ej. 9 a 18 hs" />
        </div>
        <button type="submit" className={styles.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
