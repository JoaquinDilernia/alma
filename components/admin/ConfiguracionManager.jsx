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
  const [descuentosCantidad, setDescuentosCantidad] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMinimo(String(config.minimoViandas));
    setEnvioGratisActivo(config.envioGratisActivo);
    setEnvioGratisDesde(String(config.envioGratisDesde));
    setDescuentosCantidad(config.descuentosCantidad);
  }, [config.minimoViandas, config.envioGratisActivo, config.envioGratisDesde, config.descuentosCantidad]);

  const updateEscalon = (index, field, value) => {
    setDescuentosCantidad((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const removeEscalon = (index) => {
    setDescuentosCantidad((prev) => prev.filter((_, i) => i !== index));
  };

  const addEscalon = () => {
    setDescuentosCantidad((prev) => [...prev, { cantidadMinima: 0, porcentaje: 0, activo: true }]);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("saving");
    await setDoc(
      doc(db, "alma_config", "tienda"),
      {
        minimoViandas: Number(minimo) || 0,
        envioGratisActivo: !!envioGratisActivo,
        envioGratisDesde: Number(envioGratisDesde) || 0,
        descuentosCantidad: descuentosCantidad.map((e) => ({
          cantidadMinima: Number(e.cantidadMinima) || 0,
          porcentaje: Number(e.porcentaje) || 0,
          activo: !!e.activo,
        })),
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

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Descuento por cantidad</p>
          <p className={styles.hint} style={{ marginBottom: "var(--space-sm)", marginTop: 0 }}>
            Se aplica el escalón activo más alto que el pedido alcance, sobre el subtotal — antes del descuento por
            método de pago, no sumado a él.
          </p>
          {descuentosCantidad.map((escalon, index) => (
            <div key={index} className={styles.escalonRow}>
              <div className={shared.field} style={{ maxWidth: 140 }}>
                <label htmlFor={`escalon-cantidad-${index}`}>Viandas mínimas</label>
                <input
                  id={`escalon-cantidad-${index}`}
                  type="number"
                  min={0}
                  value={escalon.cantidadMinima}
                  onChange={(e) => updateEscalon(index, "cantidadMinima", e.target.value)}
                />
              </div>
              <div className={shared.field} style={{ maxWidth: 120 }}>
                <label htmlFor={`escalon-porcentaje-${index}`}>Descuento %</label>
                <input
                  id={`escalon-porcentaje-${index}`}
                  type="number"
                  min={0}
                  value={escalon.porcentaje}
                  onChange={(e) => updateEscalon(index, "porcentaje", e.target.value)}
                />
              </div>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={escalon.activo}
                  onChange={(e) => updateEscalon(index, "activo", e.target.checked)}
                />
                Activo
              </label>
              <button type="button" className={shared.delete} onClick={() => removeEscalon(index)}>
                Eliminar
              </button>
            </div>
          ))}
          <button type="button" className={shared.edit} onClick={addEscalon}>
            + Agregar escalón
          </button>
        </div>

        <button type="submit" className={shared.addButton}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {status === "saved" && <p style={{ marginTop: "1rem", color: "var(--color-verde-oliva)", fontWeight: 600 }}>Guardado ✓</p>}
    </div>
  );
}
