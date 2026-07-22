import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsappButton from "@/components/site/WhatsappButton";

export default function SiteLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <WhatsappButton />
    </>
  );
}
