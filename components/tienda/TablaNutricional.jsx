import styles from "./TablaNutricional.module.css";

export default function TablaNutricional({ datos }) {
  if (!datos) return null;

  const filas = [
    { label: "Calorías", valor: datos.calorias, unidad: "kcal" },
    { label: "Proteínas", valor: datos.proteinas, unidad: "g" },
    { label: "Carbohidratos", valor: datos.carbohidratos, unidad: "g" },
    { label: "Grasas", valor: datos.grasas, unidad: "g" },
  ].filter((fila) => fila.valor !== "" && fila.valor != null);

  if (filas.length === 0) return null;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th colSpan={2}>Tabla nutricional (por porción)</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.label}>
            <td>{fila.label}</td>
            <td>
              {fila.valor} {fila.unidad}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
