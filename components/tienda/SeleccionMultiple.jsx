"use client";

import { contarSeleccion, agregarSeleccion, quitarSeleccion } from "@/lib/seleccionMultiple";
import styles from "./SeleccionMultiple.module.css";

export default function SeleccionMultiple({ titulo, opciones, seleccionadas, max, onChange }) {
  const conteos = contarSeleccion(seleccionadas);
  const total = seleccionadas.length;

  return (
    <div className={styles.contenedor}>
      <p className={styles.titulo}>
        {titulo} ({total} de {max} elegidos)
      </p>
      <div className={styles.lista}>
        {opciones.map((opcion) => {
          const cantidad = conteos[opcion.nombre] || 0;
          return (
            <div key={opcion.id} className={styles.fila}>
              {opcion.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opcion.imagenUrl} alt="" className={styles.thumb} />
              ) : (
                <span className={styles.thumbPlaceholder} />
              )}
              <span className={styles.nombre}>
                {opcion.nombre}
                {opcion.precioExtra > 0 && <span className={styles.extra}> +${opcion.precioExtra}</span>}
              </span>
              <div className={styles.stepper}>
                <button
                  type="button"
                  onClick={() => onChange(quitarSeleccion(seleccionadas, opcion.nombre))}
                  disabled={cantidad === 0}
                  aria-label={`Quitar ${opcion.nombre}`}
                >
                  −
                </button>
                <span className={styles.cantidad}>{cantidad}</span>
                <button
                  type="button"
                  onClick={() => onChange(agregarSeleccion(seleccionadas, opcion.nombre, max))}
                  disabled={total >= max}
                  aria-label={`Agregar ${opcion.nombre}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
