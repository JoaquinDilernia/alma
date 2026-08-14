"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateDocById } from "@/lib/adminCrud";
import StatusBadge, { ESTADO_LABELS } from "./StatusBadge";
import { formatGramos } from "@/lib/gramaje";
import styles from "./PedidosManager.module.css";
import shared from "./adminShared.module.css";

const ESTADOS = ["pendiente", "confirmado", "en_preparacion", "entregado", "cancelado"];

export default function PedidosManager() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const q = query(collection(db, "alma_pedidos"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPedidos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setPedidos([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const handleEstadoChange = (pedido, estado) => {
    updateDocById("alma_pedidos", pedido.id, { estado });
  };

  const pedidosFiltrados = busqueda.trim()
    ? pedidos.filter((pedido) => String(pedido.numeroPedido ?? "").includes(busqueda.trim()))
    : pedidos;

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Pedidos</h1>

      <div className={shared.field} style={{ marginBottom: "1rem", maxWidth: "240px" }}>
        <label htmlFor="busquedaPedido">Buscar por número de pedido</label>
        <input
          id="busquedaPedido"
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Ej: 12"
        />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {pedidosFiltrados.map((pedido) => (
            <Fragment key={pedido.id}>
              <tr className={styles.row} onClick={() => setExpandedId(expandedId === pedido.id ? null : pedido.id)}>
                <td>{pedido.numeroPedido ? `#${pedido.numeroPedido}` : "—"}</td>
                <td>{pedido.cliente?.nombre}</td>
                <td>${pedido.total}</td>
                <td>
                  <StatusBadge estado={pedido.estado} />
                </td>
              </tr>
              {expandedId === pedido.id && (
                <tr>
                  <td colSpan={4} className={styles.detalle}>
                    <p>
                      <strong>Contacto:</strong> {pedido.cliente?.telefono} — {pedido.cliente?.email}
                    </p>
                    <p>
                      <strong>Dirección:</strong> {pedido.cliente?.direccion}
                    </p>
                    <p>
                      <strong>Método de pago:</strong> {pedido.metodoPagoElegido}
                    </p>
                    <p>
                      <strong>Ítems:</strong>{" "}
                      {pedido.items
                        ?.map((item) => `${item.cantidad}× ${item.nombre}${item.gramos ? ` (${formatGramos(item.gramos)})` : ""}`)
                        .join(", ")}
                    </p>
                    <p>
                      <strong>Subtotal:</strong> ${pedido.subtotal}
                      {pedido.descuentoCantidadMonto > 0 && (
                        <>
                          {" "}
                          — <strong>Descuento por cantidad ({pedido.descuentoCantidadPorcentaje}%):</strong> -$
                          {pedido.descuentoCantidadMonto}
                        </>
                      )}
                      {(pedido.descuentoMetodoPagoMonto ?? pedido.descuentoMonto) > 0 && (
                        <>
                          {" "}
                          — <strong>Descuento método de pago ({pedido.descuentoPorcentaje}%):</strong> -$
                          {pedido.descuentoMetodoPagoMonto ?? pedido.descuentoMonto}
                        </>
                      )}{" "}
                      — <strong>Envío:</strong> ${pedido.costoEnvio}
                    </p>
                    <label htmlFor={`estado-${pedido.id}`}>
                      <strong>Cambiar estado:</strong>
                    </label>
                    <select
                      id={`estado-${pedido.id}`}
                      className={styles.estadoSelect}
                      value={pedido.estado}
                      onChange={(e) => handleEstadoChange(pedido, e.target.value)}
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {ESTADO_LABELS[estado]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
