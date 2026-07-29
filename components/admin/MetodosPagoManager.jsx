"use client";

import { useState } from "react";
import { useMetodosPago } from "@/lib/useMetodosPago";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import shared from "./adminShared.module.css";
import styles from "./MetodosPagoManager.module.css";

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

      <div className={styles.list}>
        {metodosPago.map((metodo) => (
          <div key={metodo.id} className={styles.card}>
            <div className={shared.field}>
              <label htmlFor={`nombre-${metodo.id}`}>Nombre</label>
              <input
                id={`nombre-${metodo.id}`}
                type="text"
                defaultValue={metodo.nombre}
                onBlur={(e) => handleFieldChange(metodo, "nombre", e.target.value)}
              />
            </div>
            <div className={shared.field} style={{ maxWidth: 140 }}>
              <label htmlFor={`descuento-${metodo.id}`}>Descuento %</label>
              <input
                id={`descuento-${metodo.id}`}
                type="number"
                defaultValue={metodo.descuentoPorcentaje}
                onBlur={(e) => handleFieldChange(metodo, "descuentoPorcentaje", Number(e.target.value))}
              />
            </div>
            {metodo.descuentoPorcentaje > 0 && <span className={styles.badge}>-{metodo.descuentoPorcentaje}%</span>}
            <label className={styles.activaRow}>
              <input
                type="checkbox"
                defaultChecked={metodo.activo}
                onChange={(e) => handleFieldChange(metodo, "activo", e.target.checked)}
              />
              Activo
            </label>
            <button type="button" className={shared.delete} onClick={() => handleDelete(metodo)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nuevo-metodo-nombre">Nuevo método</label>
          <input id="nuevo-metodo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={shared.field}>
          <label htmlFor="nuevo-metodo-descuento">Descuento %</label>
          <input
            id="nuevo-metodo-descuento"
            type="number"
            value={descuentoPorcentaje}
            onChange={(e) => setDescuentoPorcentaje(e.target.value)}
            style={{ width: 80 }}
          />
        </div>
        <button type="submit" className={shared.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
