"use client";

import { useAdminAuth } from "@/lib/useAdminAuth";
import DashboardStats from "@/components/admin/DashboardStats";

export default function AdminHomePage() {
  const { adminDoc } = useAdminAuth();

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Hola{adminDoc?.email ? `, ${adminDoc.email}` : ""}</h1>
      <DashboardStats />
    </div>
  );
}
