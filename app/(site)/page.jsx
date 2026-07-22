import Hero from "@/components/site/Hero";
import Nosotros from "@/components/site/Nosotros";
import Producto from "@/components/site/Producto";
import Empresas from "@/components/site/Empresas";
import Testimonios from "@/components/site/Testimonios";
import Faq from "@/components/site/Faq";
import Contacto from "@/components/site/Contacto";

export const metadata = {
  description:
    "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
  openGraph: {
    title: "ALMA — Viandas saludables 100% caseras",
    description:
      "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
    images: [
      "https://images.unsplash.com/photo-1569420077790-afb136b3bb8c?w=1200&q=80&auto=format&fit=crop",
    ],
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Nosotros />
      <Producto />
      <Empresas />
      <Testimonios />
      <Faq />
      <Contacto />
    </>
  );
}
