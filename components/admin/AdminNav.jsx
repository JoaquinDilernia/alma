"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "./AdminNav.module.css";

export default function AdminNav({ role }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <Link href="/admin">Panel</Link>
        <Link href="/admin/contenido">Contenido</Link>
        <Link href="/admin/productos">Productos</Link>
        <Link href="/admin/categorias">Categorías</Link>
        <Link href="/admin/zonas-envio">Envíos</Link>
        <Link href="/admin/pedidos">Pedidos</Link>
        {role === "superadmin" && <Link href="/admin/usuarios">Usuarios</Link>}
      </div>
      <button type="button" className={styles.logout} onClick={() => signOut(auth)}>
        Cerrar sesión
      </button>
    </nav>
  );
}
