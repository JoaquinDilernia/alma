import Catalogo from "@/components/tienda/Catalogo";

export const metadata = {
  title: "Tienda",
  description: "Elegí tus viandas ALMA: individuales o en packs, listas para el freezer.",
};

export default function TiendaPage() {
  return (
    <div className="section">
      <div className="container">
        <p className="sectionLabel">Tienda</p>
        <h1 style={{ marginBottom: "2rem" }}>Nuestras viandas</h1>
        <Catalogo />
      </div>
    </div>
  );
}
