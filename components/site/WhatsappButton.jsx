import styles from "./WhatsappButton.module.css";

export default function WhatsappButton() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";
  const message = encodeURIComponent("Hola! Quiero saber más sobre las viandas ALMA.");
  const href = `https://wa.me/${number}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={styles.button}
      aria-label="Escribinos por WhatsApp"
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01A7.94 7.94 0 0 0 20 12.06a7.86 7.86 0 0 0-2.4-5.74Zm-5.55 12.2h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.65.67-2.44-.16-.25a6.6 6.6 0 1 1 12.26-3.36 6.6 6.6 0 0 1-6.66 6.46Zm3.6-4.94c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.2-.5.64-.62.77-.11.13-.23.14-.42.05a5.4 5.4 0 0 1-2.7-2.36c-.2-.35.2-.32.58-1.07.06-.13.03-.24-.02-.34-.05-.1-.44-1.06-.6-1.45-.16-.38-.32-.33-.44-.33h-.38c-.13 0-.34.05-.52.24-.18.2-.68.67-.68 1.62s.7 1.88.8 2.01c.1.13 1.38 2.1 3.34 2.95 1.97.84 1.97.56 2.32.53.36-.03 1.17-.48 1.34-.94.16-.46.16-.85.11-.94-.05-.1-.18-.15-.38-.25Z" />
      </svg>
    </a>
  );
}
