"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import shared from "./adminShared.module.css";
import styles from "./ConfiguracionManager.module.css";

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
      <form onSubmit={handleSave}>
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Pedido mínimo</p>
          <div className={shared.field} style={{ maxWidth: 200 }}>
            <label htmlFor="minimo-viandas">Mínimo de viandas por pedido</label>
            <input
              id="minimo-viandas"
              type="number"
              min={0}
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
            />
          </div>
          <p className={styles.hint}>0 = sin mínimo. Se muestra en el catálogo y bloquea el checkout hasta alcanzarlo.</p>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Envío gratis</p>
          <label htmlFor="envio-gratis-activo" className={styles.toggleRow}>
            <input
              id="envio-gratis-activo"
              type="checkbox"
              checked={envioGratisActivo}
              onChange={(e) => setEnvioGratisActivo(e.target.checked)}
            />
            Activar envío gratis
          </label>
          <div className={shared.field} style={{ maxWidth: 200 }}>
            <label htmlFor="envio-gratis-desde">A partir de (viandas)</label>
            <input
              id="envio-gratis-desde"
              type="number"
              min={0}
              value={envioGratisDesde}
              onChange={(e) => setEnvioGratisDesde(e.target.value)}
              disabled={!envioGratisActivo}
            />
          </div>
          <p className={styles.hint}>
            Con el switch activado, el costo de envío pasa a $0 cuando el pedido alcanza la cantidad de viandas indicada.
          </p>
        </div>

        <button type="submit" className={shared.addButton}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {status === "saved" && <p style={{ marginTop: "1rem", color: "var(--color-verde-oliva)", fontWeight: 600 }}>Guardado ✓</p>}
    </div>
  );
}
