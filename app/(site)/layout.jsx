import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsappButton from "@/components/site/WhatsappButton";
import { CartProvider } from "@/lib/CartProvider";

export default function SiteLayout({ children }) {
  return (
    <CartProvider>
      <Header />
      {children}
      <Footer />
      <WhatsappButton />
    </CartProvider>
  );
}
