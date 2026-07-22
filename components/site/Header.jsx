"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import styles from "./Header.module.css";

const NAV_LINKS = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#producto", label: "Producto" },
  { href: "#empresas", label: "Empresas" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.solid : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Logo variant="isotipo" className={styles.logo} />
          <span className={styles.wordmark}>ALMA</span>
        </Link>
        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
          <Link href="/tienda" className={styles.navLink}>
            Tienda
          </Link>
        </nav>
        <Link href="/tienda" className={styles.cta}>
          Pedir ahora
        </Link>
      </div>
    </header>
  );
}
