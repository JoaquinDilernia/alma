"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import { useScrollReveal } from "@/lib/useScrollReveal";
import styles from "./Testimonios.module.css";

export default function Testimonios() {
  const content = useSiteContent();
  const scopeRef = useScrollReveal(`.${styles.card}`);

  return (
    <section id="testimonios" ref={scopeRef} className="section">
      <div className="container">
        <p className="sectionLabel">Testimonios</p>
        <h2>Lo que dicen quienes ya piden ALMA</h2>
        <div className={styles.grid}>
          {content.testimonios.map((testimonio) => (
            <div key={testimonio.id} className={styles.card}>
              <p className={styles.texto}>&ldquo;{testimonio.texto}&rdquo;</p>
              <p className={styles.autor}>{testimonio.autor}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
