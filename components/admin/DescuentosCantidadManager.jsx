"use client";

import { useState } from "react";
import { useDescuentosCantidad } from "@/lib/useDescuentosCantidad";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import shared from "./adminShared.module.css";
import styles from "./DescuentosCantidadManager.module.css";

const COLLECTION = "alma_descuentos_cantidad";

export default function DescuentosCantidadManager() {
  const { escalones, loading } = useDescuentosCantidad();
  const [cantidadMinima, setCantidadMinima] = useState(0);
  const [porcentaje, setPorcentaje] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!cantidadMinima) return;
    await createDoc(COLLECTION, {
      cantidadMinima: Number(cantidadMinima) || 0,
      porcentaje: Number(porcentaje) || 0,
      activo: true,
    });
    setCantidadMinima(0);
    setPorcentaje(0);
  };

  const handleFieldChange = (escalon, field, value) => {
    updateDocById(COLLECTION, escalon.id, { [field]: value });
  };

  const handleDelete = (escalon) => {
    deleteDocById(COLLECTION, escalon.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Descuentos por cantidad</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-texto)" }}>
        Cada escalón se aplica sobre el total de viandas del pedido. Se usa el escalón activo más alto que el
        cliente alcance; el descuento se aplica primero, y el de método de pago se calcula después sobre lo que
        queda.
      </p>

      <div className={styles.list}>
        {escalones.map((escalon) => (
          <div key={escalon.id} className={styles.card}>
            <div className={shared.field} style={{ maxWidth: 160 }}>
              <label htmlFor={`cantidad-${escalon.id}`}>Viandas mínimas</label>
              <input
                id={`cantidad-${escalon.id}`}
                type="number"
                defaultValue={escalon.cantidadMinima}
                onBlur={(e) => handleFieldChange(escalon, "cantidadMinima", Number(e.target.value))}
              />
            </div>
            <div className={shared.field} style={{ maxWidth: 140 }}>
              <label htmlFor={`porcentaje-${escalon.id}`}>Descuento %</label>
              <input
                id={`porcentaje-${escalon.id}`}
                type="number"
                defaultValue={escalon.porcentaje}
                onBlur={(e) => handleFieldChange(escalon, "porcentaje", Number(e.target.value))}
              />
            </div>
            {escalon.porcentaje > 0 && <span className={styles.badge}>-{escalon.porcentaje}%</span>}
            <label className={styles.activaRow}>
              <input
                type="checkbox"
                defaultChecked={escalon.activo}
                onChange={(e) => handleFieldChange(escalon, "activo", e.target.checked)}
              />
              Activo
            </label>
            <button type="button" className={shared.delete} onClick={() => handleDelete(escalon)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nuevo-escalon-cantidad">Viandas mínimas</label>
          <input
            id="nuevo-escalon-cantidad"
            type="number"
            value={cantidadMinima}
            onChange={(e) => setCantidadMinima(e.target.value)}
            style={{ width: 100 }}
          />
        </div>
        <div className={shared.field}>
          <label htmlFor="nuevo-escalon-porcentaje">Descuento %</label>
          <input
            id="nuevo-escalon-porcentaje"
            type="number"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
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
