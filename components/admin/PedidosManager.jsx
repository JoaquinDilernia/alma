"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateDocById } from "@/lib/adminCrud";
import styles from "./PedidosManager.module.css";

const ESTADOS = ["pendiente", "confirmado", "en_preparacion", "entregado", "cancelado"];

export default function PedidosManager() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

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

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Pedidos</h1>

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
          {pedidos.map((pedido) => (
            <Fragment key={pedido.id}>
              <tr className={styles.row} onClick={() => setExpandedId(expandedId === pedido.id ? null : pedido.id)}>
                <td>{pedido.id.slice(0, 8).toUpperCase()}</td>
                <td>{pedido.cliente?.nombre}</td>
                <td>${pedido.total}</td>
                <td>
                  <span className={styles.badge}>{pedido.estado}</span>
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
                      {pedido.items?.map((item) => `${item.cantidad}× ${item.nombre}`).join(", ")}
                    </p>
                    <p>
                      <strong>Subtotal:</strong> ${pedido.subtotal} — <strong>Envío:</strong> ${pedido.costoEnvio}
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
                          {estado}
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
