"use client";

import Link from "next/link";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function AdminHomePage() {
  const { adminDoc } = useAdminAuth();

  return (
    <div>
      <h1>Hola{adminDoc?.email ? `, ${adminDoc.email}` : ""}</h1>
      <p style={{ margin: "1rem 0 2rem" }}>
        Desde acá gestionás el contenido editable de la landing de ALMA.
      </p>
      <p>
        <Link href="/admin/contenido" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Ir a Contenido de la landing →
        </Link>
      </p>
    </div>
  );
}
