"use client";

import styles from "./ListManager.module.css";

function newFaqItem() {
  return { id: `f-${Date.now()}`, pregunta: "", respuesta: "" };
}

export default function FaqManager({ faq, onChange }) {
  const update = (index, patch) => {
    onChange(faq.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index) => {
    onChange(faq.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...faq, newFaqItem()]);
  };

  return (
    <div>
      {faq.map((item, index) => (
        <div key={item.id} className={styles.item}>
          <label htmlFor={`faq-pregunta-${index}`}>Pregunta</label>
          <input
            id={`faq-pregunta-${index}`}
            value={item.pregunta}
            onChange={(e) => update(index, { pregunta: e.target.value })}
          />
          <label htmlFor={`faq-respuesta-${index}`}>Respuesta</label>
          <textarea
            id={`faq-respuesta-${index}`}
            value={item.respuesta}
            onChange={(e) => update(index, { respuesta: e.target.value })}
          />
          <button type="button" className={styles.remove} onClick={() => remove(index)}>
            Eliminar
          </button>
        </div>
      ))}
      <button type="button" className={styles.add} onClick={add}>
        + Agregar pregunta
      </button>
    </div>
  );
}
