"use client";

import { Fragment, useState } from "react";
import { useEmpresasLeads } from "@/lib/useEmpresasLeads";
import { modalidadLabel } from "@/lib/empresasLead";
import styles from "./EmpresasLeadsManager.module.css";

function formatFecha(createdAt) {
  const date = createdAt?.toDate?.();
  if (!date) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function telHref(telefono) {
  const digits = (telefono || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export default function EmpresasLeadsManager() {
  const { leads, loading } = useEmpresasLeads();
  const [expandedId, setExpandedId] = useState(null);

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Consultas de empresas</h1>

      {leads.length === 0 ? (
        <p style={{ opacity: 0.7 }}>Todavía no hay consultas de empresas.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Contacto</th>
              <th>Modalidad</th>
              <th>Personas</th>
              <th>Frecuencia</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const wa = telHref(lead.telefono);
              return (
                <Fragment key={lead.id}>
                  <tr
                    className={styles.row}
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  >
                    <td data-label="Empresa">{lead.empresa || "—"}</td>
                    <td data-label="Contacto">{lead.contacto || "—"}</td>
                    <td data-label="Modalidad">{modalidadLabel(lead.modalidad)}</td>
                    <td data-label="Personas">{lead.cantidadPersonas || "—"}</td>
                    <td data-label="Frecuencia">{lead.frecuencia || "—"}</td>
                    <td data-label="Fecha">{formatFecha(lead.createdAt)}</td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr>
                      <td colSpan={6} className={styles.detalle}>
                        {lead.mensaje ? (
                          <p>
                            <strong>Qué necesitan:</strong> {lead.mensaje}
                          </p>
                        ) : (
                          <p style={{ opacity: 0.7 }}>Sin detalle adicional.</p>
                        )}
                        <p>
                          <strong>Email:</strong>{" "}
                          <a href={`mailto:${lead.email}`}>{lead.email || "—"}</a>
                        </p>
                        <p>
                          <strong>Teléfono:</strong> {lead.telefono || "—"}
                          {wa && (
                            <>
                              {" — "}
                              <a href={wa} target="_blank" rel="noreferrer">
                                Abrir WhatsApp
                              </a>
                            </>
                          )}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
