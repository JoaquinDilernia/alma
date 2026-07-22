import Link from "next/link";
import styles from "./Contacto.module.css";

export default function Contacto() {
  const instagramHandle = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "alma.viandas";

  return (
    <section id="contacto" className={`section ${styles.section}`}>
      <div className="container">
        <p className="sectionLabel">Contacto</p>
        <h2>Sumate a ALMA</h2>
        <p className={styles.texto}>
          Pedí tus viandas de la semana o seguinos en Instagram para ver las novedades.
        </p>
        <div className={styles.ctas}>
          <Link href="/tienda" className={styles.ctaPrimary}>
            Pedir ahora
          </Link>
          <a
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank"
            rel="noreferrer"
            className={styles.ctaSecondary}
          >
            @{instagramHandle}
          </a>
        </div>
      </div>
    </section>
  );
}
