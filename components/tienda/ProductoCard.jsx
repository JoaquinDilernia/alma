import Link from "next/link";
import ImagePlaceholder from "@/components/site/ImagePlaceholder";
import styles from "./ProductoCard.module.css";

export default function ProductoCard({ producto }) {
  const sinStock = producto.stock <= 0;

  return (
    <Link
      href={`/tienda/producto?id=${producto.id}`}
      className={`${styles.card} ${sinStock ? styles.sinStock : ""}`}
    >
      <div className={styles.imageWrap}>
        {producto.imagenUrls?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={producto.imagenUrls[0]} alt={producto.nombre} className={styles.image} />
        ) : (
          <ImagePlaceholder className={styles.image} />
        )}
      </div>
      <span className={`${styles.badge} ${sinStock ? styles.badgeSinStock : ""}`}>
        {producto.tipo === "pack" ? "Pack" : sinStock ? "Sin stock" : "Individual"}
      </span>
      <div className={styles.info}>
        <p className={styles.nombre}>{producto.nombre}</p>
        <p className={styles.precio}>${producto.precio}</p>
      </div>
    </Link>
  );
}
