import styles from "./ImagePlaceholder.module.css";

export default function ImagePlaceholder({ className = "" }) {
  return (
    <div className={`${styles.placeholder} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/alma-isotipo.svg" alt="" className={styles.mark} />
    </div>
  );
}
