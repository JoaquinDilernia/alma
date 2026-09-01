"use client";

import { useRef, useState } from "react";
import { useSiteContent } from "@/lib/useSiteContent";
import { MODALIDADES_EMPRESA } from "@/lib/empresasLead";
import EmpresasForm from "./EmpresasForm";
import styles from "./Empresas.module.css";

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";
const WHATSAPP_MSG = encodeURIComponent("Hola ALMA! Quiero consultar por el servicio para empresas.");

export default function Empresas() {
  const content = useSiteContent();
  const [modalidad, setModalidad] = useState(MODALIDADES_EMPRESA[0].value);
  const formRef = useRef(null);

  const elegirModalidad = (value) => {
    setModalidad(value);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="empresas" className={`section ${styles.section}`}>
      <div className="container">
        <div className={styles.header}>
          <h2>ALMA para empresas</h2>
          <p className={styles.texto}>{content.empresas.texto}</p>
        </div>

        <div className={styles.modalidades}>
          {MODALIDADES_EMPRESA.map((m) => (
            <article key={m.value} className={styles.card}>
              <h3 className={styles.cardTitulo}>{m.label}</h3>
              <p className={styles.cardResumen}>{m.resumen}</p>
              <p className={styles.cardDesc}>{m.descripcion}</p>
              <button type="button" className={styles.cardCta} onClick={() => elegirModalidad(m.value)}>
                Pedir cotización
              </button>
            </article>
          ))}
        </div>

        <a
          className={styles.whatsapp}
          href={`https://wa.me/${WHATSAPP}?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noreferrer"
        >
          O escribinos directo por WhatsApp
        </a>

        <div ref={formRef} className={styles.formWrap}>
          <h3 className={styles.formTitulo}>Contanos qué necesitás y te armamos una propuesta</h3>
          <EmpresasForm modalidad={modalidad} onModalidadChange={setModalidad} />
        </div>
      </div>
    </section>
  );
}
