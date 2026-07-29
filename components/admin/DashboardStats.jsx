"use client";

import { useState } from "react";
import { usePedidos } from "@/lib/usePedidos";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import {
  filtrarPorRango,
  excluirCancelados,
  calcularResumen,
  rankearProductos,
  contarPorEstado,
  contarPorMetodoPago,
  contarPorZona,
  rangoDesdeAtajo,
} from "@/lib/dashboardStats";
import { ESTADO_LABELS } from "./StatusBadge";
import BarList from "./BarList";
import styles from "./DashboardStats.module.css";

const ESTADO_COLORES = {
  pendiente: "#8a6d1d",
  confirmado: "#1d4d8a",
  en_preparacion: "#5b2d8a",
  entregado: "#1d6b3f",
  cancelado: "#8a2d2d",
};

const ATAJOS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Última semana" },
  { value: "30dias", label: "Últimos 30 días" },
  { value: "personalizado", label: "Personalizado" },
];

export default function DashboardStats() {
  const { pedidos, loading } = usePedidos();
  const { zonasEnvio } = useZonasEnvio();
  const [atajo, setAtajo] = useState("30dias");
  const [desdeInput, setDesdeInput] = useState("");
  const [hastaInput, setHastaInput] = useState("");

  if (loading) return <p>Cargando…</p>;

  let pedidosEnRango;
  if (atajo === "personalizado") {
    const desde = desdeInput ? new Date(`${desdeInput}T00:00:00`) : null;
    const hasta = hastaInput ? new Date(`${hastaInput}T23:59:59.999`) : null;
    pedidosEnRango = desde && hasta && desde <= hasta ? filtrarPorRango(pedidos, { desde, hasta }) : [];
  } else {
    pedidosEnRango = filtrarPorRango(pedidos, rangoDesdeAtajo(atajo, new Date()));
  }

  const pedidosFacturables = excluirCancelados(pedidosEnRango);

  const resumen = calcularResumen(pedidosFacturables);
  const productos = rankearProductos(pedidosFacturables)
    .slice(0, 10)
    .map((p) => ({ label: p.nombre, value: p.cantidad }));
  const porEstado = contarPorEstado(pedidosEnRango);
  const estadoItems = Object.entries(porEstado).map(([estado, cantidad]) => ({
    label: ESTADO_LABELS[estado],
    value: cantidad,
    color: ESTADO_COLORES[estado],
  }));
  const metodoItems = contarPorMetodoPago(pedidosFacturables).map((m) => ({ label: m.label, value: m.cantidad }));
  const zonaItems = contarPorZona(pedidosFacturables).map((z) => ({
    label: zonasEnvio.find((zona) => zona.id === z.zonaEnvioId)?.nombre || "Zona eliminada",
    value: z.cantidad,
  }));

  return (
    <div>
      <div className={styles.rangoSelector}>
        {ATAJOS.map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            className={`${styles.rangoBtn} ${atajo === opcion.value ? styles.rangoBtnActivo : ""}`}
            onClick={() => setAtajo(opcion.value)}
          >
            {opcion.label}
          </button>
        ))}
        {atajo === "personalizado" && (
          <div className={styles.fechasPersonalizadas}>
            <input type="date" value={desdeInput} onChange={(e) => setDesdeInput(e.target.value)} />
            <span>a</span>
            <input type="date" value={hastaInput} onChange={(e) => setHastaInput(e.target.value)} />
          </div>
        )}
      </div>

      <div className={styles.tarjetas}>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Ingresos</span>
          <span className={styles.tarjetaValor}>${resumen.ingresos}</span>
        </div>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Pedidos</span>
          <span className={styles.tarjetaValor}>{resumen.cantidadPedidos}</span>
        </div>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Ticket promedio</span>
          <span className={styles.tarjetaValor}>${Math.round(resumen.ticketPromedio)}</span>
        </div>
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaLabel}>Viandas vendidas</span>
          <span className={styles.tarjetaValor}>{resumen.viandasVendidas}</span>
        </div>
      </div>

      <div className={styles.secciones}>
        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Productos más vendidos</p>
          <BarList items={productos} />
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Pedidos por estado</p>
          <BarList items={estadoItems} />
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Métodos de pago</p>
          <BarList items={metodoItems} />
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionTitulo}>Zonas de envío</p>
          <BarList items={zonaItems} />
        </div>
      </div>
    </div>
  );
}
