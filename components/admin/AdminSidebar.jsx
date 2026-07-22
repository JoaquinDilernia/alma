"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "@/components/site/Logo";
import TechDiCredit from "@/components/site/TechDiCredit";
import styles from "./AdminSidebar.module.css";

const ICONS = {
  panel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  contenido: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  productos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 7l9-4 9 4" />
    </svg>
  ),
  categorias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  ),
  envios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="14" height="11" rx="1" />
      <path d="M15 9h4l3 4v4h-7z" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
    </svg>
  ),
  metodosPago: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  pedidos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  ),
  usuarios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M23 20c0-2.8-2-5-5-5.5" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { href: "/admin", label: "Panel", icon: ICONS.panel },
  { href: "/admin/contenido", label: "Contenido", icon: ICONS.contenido },
  { href: "/admin/productos", label: "Productos", icon: ICONS.productos },
  { href: "/admin/categorias", label: "Categorías", icon: ICONS.categorias },
  { href: "/admin/zonas-envio", label: "Envíos", icon: ICONS.envios },
  { href: "/admin/metodos-pago", label: "Métodos de pago", icon: ICONS.metodosPago },
  { href: "/admin/pedidos", label: "Pedidos", icon: ICONS.pedidos },
];

const USUARIOS_ITEM = { href: "/admin/usuarios", label: "Usuarios", icon: ICONS.usuarios };

export default function AdminSidebar({ role, userEmail }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = role === "superadmin" ? [...NAV_ITEMS, USUARIOS_ITEM] : NAV_ITEMS;

  const isActive = (href) =>
    href === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href);

  return (
    <>
      <div className={styles.mobileBar}>
        <button type="button" className={styles.menuButton} onClick={() => setOpen(true)} aria-label="Abrir menú">
          {ICONS.menu}
        </button>
        <span className={styles.mobileBrand}>ALMA Admin</span>
        <span style={{ width: 24 }} />
      </div>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <button type="button" className={styles.closeButton} onClick={() => setOpen(false)} aria-label="Cerrar menú">
          {ICONS.close}
        </button>
        <div className={styles.brand}>
          <Logo variant="isotipo" className={styles.brandLogo} />
          <span className={styles.brandName}>ALMA</span>
        </div>
        <nav className={styles.nav}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${isActive(item.href) ? styles.linkActive : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.footer}>
          {userEmail && <p className={styles.userEmail}>{userEmail}</p>}
          <button type="button" className={styles.logoutButton} onClick={() => signOut(auth)}>
            {ICONS.logout}
            Cerrar sesión
          </button>
          <TechDiCredit />
        </div>
      </aside>
    </>
  );
}
