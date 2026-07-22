"use client";

import { useSiteContent } from "@/lib/useSiteContent";
import EmpresasForm from "./EmpresasForm";
import styles from "./Empresas.module.css";

export default function Empresas() {
  const content = useSiteContent();

  return (
    <section id="empresas" className={`section ${styles.section}`}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <span className={styles.badge}>Línea pendiente de lanzamiento</span>
            <h2>ALMA para empresas</h2>
            <p className={styles.texto}>{content.empresas.texto}</p>
          </div>
          <div>
            <EmpresasForm />
          </div>
        </div>
      </div>
    </section>
  );
}
