import Link from "next/link";
import Logo from "./Logo";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo variant="isotipo" className={styles.logo} />
          <span className={styles.wordmark}>ALMA</span>
        </div>
        <nav className={styles.links}>
          <a href="#nosotros">Nosotros</a>
          <a href="#producto">Producto</a>
          <a href="#empresas">Empresas</a>
          <a href="#faq">FAQ</a>
          <Link href="/tienda">Tienda</Link>
        </nav>
      </div>
      <div className={`container ${styles.bottom}`}>
        <p>© {new Date().getFullYear()} ALMA — Servicios Gastronómicos. Nutrimos momentos, creamos bienestar.</p>
      </div>
    </footer>
  );
}
