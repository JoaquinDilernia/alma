import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://alma.techdi.com.ar"),
  title: {
    default: "ALMA — Viandas saludables 100% caseras",
    template: "%s | ALMA",
  },
  description:
    "Viandas saludables congeladas, 100% caseras y sin conservantes. Pedí, guardá en el freezer y horneá cuando quieras.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
