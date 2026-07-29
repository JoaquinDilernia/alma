"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import shared from "./adminShared.module.css";

export default function ConfiguracionManager() {
  const config = useTiendaConfig();
  const [minimo, setMinimo] = useState("");
  const [envioGratisActivo, setEnvioGratisActivo] = useState(false);
  const [envioGratisDesde, setEnvioGratisDesde] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMinimo(String(config.minimoViandas));
    setEnvioGratisActivo(config.envioGratisActivo);
    setEnvioGratisDesde(String(config.envioGratisDesde));
  }, [config.minimoViandas, config.envioGratisActivo, config.envioGratisDesde]);

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("saving");
    await setDoc(
      doc(db, "alma_config", "tienda"),
      {
        minimoViandas: Number(minimo) || 0,
        envioGratisActivo: !!envioGratisActivo,
        envioGratisDesde: Number(envioGratisDesde) || 0,
      },
      { merge: true }
    );
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
        <div className={shared.field} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label htmlFor="envio-gratis-activo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              id="envio-gratis-activo"
              type="checkbox"
              checked={envioGratisActivo}
              onChange={(e) => setEnvioGratisActivo(e.target.checked)}
            />
            Activar envío gratis
          </label>
        </div>
        <div className={shared.field}>
          <label htmlFor="envio-gratis-desde">A partir de (viandas)</label>
          <input
            id="envio-gratis-desde"
            type="number"
            min={0}
            value={envioGratisDesde}
            onChange={(e) => setEnvioGratisDesde(e.target.value)}
            disabled={!envioGratisActivo}
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
      <p style={{ marginTop: "0.3rem", color: "var(--color-texto)", opacity: 0.7 }}>
        Envío gratis: con el switch activado, el costo de envío pasa a $0 cuando el pedido alcanza la cantidad de viandas indicada.
      </p>
    </div>
  );
}
