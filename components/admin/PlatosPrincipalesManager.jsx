"use client";

import { useState } from "react";
import { usePlatosPrincipales } from "@/lib/usePlatosPrincipales";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import shared from "./adminShared.module.css";
import styles from "./PlatosPrincipalesManager.module.css";

const COLLECTION = "alma_platos_principales";

export default function PlatosPrincipalesManager() {
  const { platosPrincipales, loading } = usePlatosPrincipales();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioExtra, setPrecioExtra] = useState(0);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precioExtra: Number(precioExtra) || 0,
      imagenUrl: "",
      activa: true,
    });
    setNombre("");
    setDescripcion("");
    setPrecioExtra(0);
  };

  const handleFieldChange = (plato, field, value) => {
    updateDocById(COLLECTION, plato.id, { [field]: value });
  };

  const handleDelete = (plato) => {
    deleteDocById(COLLECTION, plato.id);
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Platos principales</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-texto)" }}>
        Catálogo de platos que se pueden ofrecer dentro de un pack armable. Asignalos a un producto desde su
        formulario de edición.
      </p>

      <div className={styles.list}>
        {platosPrincipales.map((plato) => (
          <div key={plato.id} className={styles.card}>
            {plato.imagenUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plato.imagenUrl}
                alt=""
                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
              />
            )}
            <div className={styles.cardFields}>
              <div className={shared.field}>
                <label htmlFor={`nombre-${plato.id}`}>Nombre</label>
                <input
                  id={`nombre-${plato.id}`}
                  type="text"
                  defaultValue={plato.nombre}
                  onBlur={(e) => handleFieldChange(plato, "nombre", e.target.value)}
                />
              </div>
              <div className={shared.field}>
                <label htmlFor={`descripcion-${plato.id}`}>Descripción</label>
                <input
                  id={`descripcion-${plato.id}`}
                  type="text"
                  defaultValue={plato.descripcion}
                  onBlur={(e) => handleFieldChange(plato, "descripcion", e.target.value)}
                />
              </div>
              <div className={shared.field} style={{ maxWidth: 140 }}>
                <label htmlFor={`precio-${plato.id}`}>Precio extra</label>
                <input
                  id={`precio-${plato.id}`}
                  type="number"
                  min={0}
                  defaultValue={plato.precioExtra}
                  onBlur={(e) => handleFieldChange(plato, "precioExtra", Number(e.target.value) || 0)}
                />
              </div>
              <label className={styles.activaRow}>
                <input
                  type="checkbox"
                  checked={plato.activa}
                  onChange={(e) => handleFieldChange(plato, "activa", e.target.checked)}
                />
                Activo
              </label>
              <button type="button" className={shared.delete} onClick={() => handleDelete(plato)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nuevo-plato-nombre">Nuevo plato</label>
          <input id="nuevo-plato-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={shared.field}>
          <label htmlFor="nuevo-plato-descripcion">Descripción</label>
          <input
            id="nuevo-plato-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div className={shared.field} style={{ maxWidth: 120 }}>
          <label htmlFor="nuevo-plato-precio">Precio extra</label>
          <input
            id="nuevo-plato-precio"
            type="number"
            min={0}
            value={precioExtra}
            onChange={(e) => setPrecioExtra(e.target.value)}
          />
        </div>
        <button type="submit" className={shared.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
