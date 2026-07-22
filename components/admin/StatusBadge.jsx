import styles from "./StatusBadge.module.css";

export const ESTADO_LABELS = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default function StatusBadge({ estado }) {
  return (
    <span className={`${styles.badge} ${styles[estado] || ""}`}>{ESTADO_LABELS[estado] || estado}</span>
  );
}
