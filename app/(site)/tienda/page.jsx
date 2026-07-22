import Link from "next/link";
import styles from "./Tienda.module.css";

export const metadata = {
  title: "Tienda",
  description: "La tienda online de ALMA está en camino.",
};

export default function TiendaPage() {
  return (
    <div className={styles.wrap}>
      <p className="sectionLabel">Tienda</p>
      <h1>Muy pronto</h1>
      <p className={styles.texto}>
        Estamos terminando de armar la tienda online de ALMA. Mientras tanto, escribinos por
        WhatsApp y coordinamos tu pedido a mano.
      </p>
      <Link href="/" className={styles.back}>
        Volver al inicio
      </Link>
    </div>
  );
}
