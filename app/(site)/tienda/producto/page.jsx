import { Suspense } from "react";
import ProductoDetalle from "@/components/tienda/ProductoDetalle";

export const metadata = {
  title: "Producto",
};

export default function ProductoPage() {
  return (
    <Suspense fallback={<p style={{ padding: "4rem 0", textAlign: "center" }}>Cargando…</p>}>
      <ProductoDetalle />
    </Suspense>
  );
}
