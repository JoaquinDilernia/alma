"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { useSiteContent } from "@/lib/useSiteContent";
import ImagePlaceholder from "./ImagePlaceholder";
import styles from "./Producto.module.css";

const PASOS = [
  { numero: "01", titulo: "Elegís", texto: "Armá tu pack de viandas de la semana." },
  { numero: "02", titulo: "Preparamos", texto: "Cocinamos y congelamos frescas, sin conservantes." },
  { numero: "03", titulo: "Recibís", texto: "Te llegan listas para guardar en el freezer." },
  { numero: "04", titulo: "Horneás", texto: "Del freezer al horno. Sin descongelar, sin vueltas." },
];

export default function Producto() {
  const content = useSiteContent();
  const pasosRef = useRef(null);

  useGSAP(
    () => {
      gsap.from(`.${styles.paso}`, {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: pasosRef.current,
          start: "top 75%",
        },
      });

      gsap.from(`.${styles.categoria}`, {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: `.${styles.categorias}`,
          start: "top 80%",
        },
      });
    },
    { scope: pasosRef }
  );

  return (
    <section id="producto" className="section">
      <div className="container">
        <p className="sectionLabel">Producto</p>
        <h2>Cómo funciona</h2>
        <p className={styles.texto}>{content.producto.texto}</p>

        <div ref={pasosRef} className={styles.pasos}>
          {PASOS.map((paso) => (
            <div key={paso.numero} className={styles.paso}>
              <p className={styles.pasoNumero}>{paso.numero}</p>
              <p className={styles.pasoTitulo}>{paso.titulo}</p>
              <p>{paso.texto}</p>
            </div>
          ))}
        </div>

        <div className={styles.categorias}>
          {content.producto.categorias.map((categoria) => (
            <div key={categoria.nombre} className={styles.categoria}>
              {categoria.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={categoria.imagenUrl} alt={categoria.nombre} className={styles.categoriaImg} />
              ) : (
                <ImagePlaceholder className={styles.categoriaImg} />
              )}
              <div className={styles.categoriaOverlay} />
              <p className={styles.categoriaNombre}>{categoria.nombre}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
