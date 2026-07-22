"use client";

import styles from "./ListManager.module.css";

function newTestimonio() {
  return { id: `t-${Date.now()}`, autor: "", texto: "", fotoUrl: null };
}

export default function TestimoniosManager({ testimonios, onChange }) {
  const update = (index, patch) => {
    onChange(testimonios.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const remove = (index) => {
    onChange(testimonios.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...testimonios, newTestimonio()]);
  };

  return (
    <div>
      {testimonios.map((testimonio, index) => (
        <div key={testimonio.id} className={styles.item}>
          <label htmlFor={`testimonio-autor-${index}`}>Autor</label>
          <input
            id={`testimonio-autor-${index}`}
            value={testimonio.autor}
            onChange={(e) => update(index, { autor: e.target.value })}
          />
          <label htmlFor={`testimonio-texto-${index}`}>Texto</label>
          <textarea
            id={`testimonio-texto-${index}`}
            value={testimonio.texto}
            onChange={(e) => update(index, { texto: e.target.value })}
          />
          <button type="button" className={styles.remove} onClick={() => remove(index)}>
            Eliminar
          </button>
        </div>
      ))}
      <button type="button" className={styles.add} onClick={add}>
        + Agregar testimonio
      </button>
    </div>
  );
}
