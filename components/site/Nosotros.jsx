"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import { useScrollReveal } from "@/lib/useScrollReveal";
import styles from "./Nosotros.module.css";

const PILARES = [
  { label: "Alimentación consciente", icon: "🌱" },
  { label: "Cocina artesanal", icon: "👨‍🍳" },
  { label: "Conservación premium", icon: "❄️" },
  { label: "Bienestar y practicidad", icon: "💚" },
];

export default function Nosotros() {
  const content = useSiteContent();
  const scopeRef = useScrollReveal(`.${styles.pilar}`);

  return (
    <section id="nosotros" ref={scopeRef} className="section">
      <div className={`container ${styles.wrap}`}>
        <p className="sectionLabel">Nosotros</p>
        <h2>Cocinamos como en casa</h2>
        <p className={styles.texto}>{content.nosotros.texto}</p>
        <div className={styles.pilares}>
          {PILARES.map((pilar) => (
            <div key={pilar.label} className={styles.pilar}>
              <span className={styles.icono} aria-hidden="true">
                {pilar.icon}
              </span>
              <span className={styles.pilarLabel}>{pilar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
