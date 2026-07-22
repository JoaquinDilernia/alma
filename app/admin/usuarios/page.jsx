"use client";

import { useAdminAuth } from "@/lib/useAdminAuth";
import UsuariosManager from "@/components/admin/UsuariosManager";

export default function UsuariosPage() {
  const { adminDoc, loading } = useAdminAuth();

  if (loading) return null;

  if (adminDoc?.role !== "superadmin") {
    return <p>No tenés permiso para ver esta página.</p>;
  }

  return <UsuariosManager />;
}
