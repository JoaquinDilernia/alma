import styles from "./BarList.module.css";

export default function BarList({ items }) {
  if (items.length === 0) {
    return <p className={styles.vacio}>Sin datos en este período.</p>;
  }

  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <div key={item.label} className={styles.row}>
          <span className={styles.label}>{item.label}</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${(item.value / max) * 100}%`, background: item.color || "var(--color-verde-principal)" }}
            />
          </div>
          <span className={styles.value}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
