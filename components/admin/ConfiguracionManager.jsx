"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import shared from "./adminShared.module.css";

export default function ConfiguracionManager() {
  const config = useTiendaConfig();
  const [minimo, setMinimo] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMinimo(String(config.minimoViandas));
  }, [config.minimoViandas]);

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("saving");
    await setDoc(doc(db, "alma_config", "tienda"), { minimoViandas: Number(minimo) || 0 }, { merge: true });
    setStatus("saved");
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Configuración de la tienda</h1>
      <form className={shared.addForm} onSubmit={handleSave}>
        <div className={shared.field}>
          <label htmlFor="minimo-viandas">Mínimo de viandas por pedido</label>
          <input
            id="minimo-viandas"
            type="number"
            min={0}
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <button type="submit" className={shared.addButton}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {status === "saved" && <p style={{ marginTop: "1rem", color: "var(--color-verde-oliva)", fontWeight: 600 }}>Guardado ✓</p>}
      <p style={{ marginTop: "1rem", color: "var(--color-texto)", opacity: 0.7 }}>
        0 = sin mínimo. Se muestra en el catálogo y bloquea el checkout hasta alcanzarlo.
      </p>
    </div>
  );
}
