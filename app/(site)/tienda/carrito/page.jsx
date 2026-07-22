import CarritoView from "@/components/tienda/CarritoView";

export const metadata = {
  title: "Carrito",
};

export default function CarritoPage() {
  return (
    <div className="section">
      <div className="container">
        <p className="sectionLabel">Carrito</p>
        <h1 style={{ marginBottom: "2rem" }}>Tu pedido</h1>
        <CarritoView />
      </div>
    </div>
  );
}
