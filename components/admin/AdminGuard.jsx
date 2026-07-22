"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/useAdminAuth";
import AdminSidebar from "./AdminSidebar";
import styles from "./AdminGuard.module.css";

export default function AdminGuard({ children }) {
  const { user, adminDoc, loading } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname.replace(/\/$/, "") === "/admin/login";
  const isAllowed = Boolean(user && adminDoc);

  useEffect(() => {
    if (loading) return;
    if (!isAllowed && !isLoginRoute) {
      router.replace("/admin/login");
    }
    if (isAllowed && isLoginRoute) {
      router.replace("/admin");
    }
  }, [loading, isAllowed, isLoginRoute, router]);

  if (loading) {
    return <div className={styles.loading}>Cargando…</div>;
  }

  if (isLoginRoute) {
    return isAllowed ? null : children;
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className={styles.shell}>
      <AdminSidebar role={adminDoc.role} userEmail={user.email} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
