import styles from "./TechDiCredit.module.css";

export default function TechDiCredit() {
  return (
    <p className={styles.credit}>
      Desarrollado por{" "}
      <a href="https://techdi.com.ar" target="_blank" rel="noreferrer">
        TechDi
      </a>
    </p>
  );
}
