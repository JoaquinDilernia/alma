"use client";

import { useState } from "react";
import styles from "./GuarnicionPicker.module.css";

export default function GuarnicionPicker({ slots, opciones, value, onChange }) {
  const [slotAbierto, setSlotAbierto] = useState(null);

  const elegir = (index, opcion) => {
    onChange(index, opcion.nombre);
    setSlotAbierto(null);
  };

  return (
    <div className={styles.picker}>
      {Array.from({ length: slots }).map((_, index) => {
        const nombreElegido = value[index];
        const opcionElegida = opciones.find((o) => o.nombre === nombreElegido);
        return (
          <div key={index} className={styles.slot}>
            <span className={styles.slotLabel}>{slots > 1 ? `Guarnición ${index + 1}` : "Guarnición"}</span>
            <button type="button" className={styles.chip} onClick={() => setSlotAbierto(index)}>
              {opcionElegida ? (
                <>
                  {opcionElegida.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opcionElegida.imagenUrl} alt="" className={styles.chipImg} />
                  ) : (
                    <span className={styles.chipPlaceholder} />
                  )}
                  <span>{opcionElegida.nombre}</span>
                  <span className={styles.cambiar}>Cambiar</span>
                </>
              ) : (
                <span className={styles.chipVacio}>+ Elegí una guarnición</span>
              )}
            </button>
          </div>
        );
      })}

      {slotAbierto !== null && (
        <div className={styles.overlay} onClick={() => setSlotAbierto(null)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <span>Elegí una guarnición</span>
              <button type="button" className={styles.cerrar} onClick={() => setSlotAbierto(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.grid}>
              {opciones.map((opcion) => (
                <button type="button" key={opcion.id} className={styles.card} onClick={() => elegir(slotAbierto, opcion)}>
                  {opcion.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opcion.imagenUrl} alt="" className={styles.cardImg} />
                  ) : (
                    <span className={styles.cardPlaceholder} />
                  )}
                  <span className={styles.cardNombre}>{opcion.nombre}</span>
                  {opcion.precioExtra > 0 && <span className={styles.cardExtra}>+${opcion.precioExtra}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
