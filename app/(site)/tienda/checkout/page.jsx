import { Suspense } from "react";
import CheckoutForm from "@/components/tienda/CheckoutForm";

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="section">
      <div className="container">
        <Suspense fallback={<p style={{ textAlign: "center" }}>Cargando…</p>}>
          <CheckoutForm />
        </Suspense>
      </div>
    </div>
  );
}
