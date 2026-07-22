"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import { useScrollReveal } from "@/lib/useScrollReveal";
import styles from "./Faq.module.css";

export default function Faq() {
  const content = useSiteContent();
  const scopeRef = useScrollReveal(`.${styles.item}`);

  return (
    <section id="faq" ref={scopeRef} className="section">
      <div className="container">
        <p className="sectionLabel">Preguntas frecuentes</p>
        <h2>¿Tenés dudas?</h2>
        <div className={styles.list}>
          {content.faq.map((item) => (
            <details key={item.id} className={styles.item}>
              <summary>{item.pregunta}</summary>
              <p className={styles.respuesta}>{item.respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
