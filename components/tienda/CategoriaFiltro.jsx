import styles from "./CategoriaFiltro.module.css";

export default function CategoriaFiltro({ categorias, activa, onChange }) {
  return (
    <div className={styles.filtro}>
      <button
        type="button"
        className={`${styles.tab} ${activa === null ? styles.tabActive : ""}`}
        onClick={() => onChange(null)}
      >
        Todas
      </button>
      {categorias.map((categoria) => (
        <button
          key={categoria.id}
          type="button"
          className={`${styles.tab} ${activa === categoria.id ? styles.tabActive : ""}`}
          onClick={() => onChange(categoria.id)}
        >
          {categoria.nombre}
        </button>
      ))}
    </div>
  );
}
