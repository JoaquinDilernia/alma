"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import CartIcon from "@/components/tienda/CartIcon";
import styles from "./Header.module.css";

const NAV_LINKS = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#producto", label: "Producto" },
  { href: "#empresas", label: "Empresas" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

export default function Header() {
  const pathname = usePathname();
  const hasDarkHero = pathname === "/";
  const [scrolled, setScrolled] = useState(!hasDarkHero);

  useEffect(() => {
    if (!hasDarkHero) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasDarkHero]);

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
        <div className={styles.actions}>
          <CartIcon />
          <Link href="/tienda" className={styles.cta}>
            Pedir ahora
          </Link>
        </div>
      </div>
    </header>
  );
}
