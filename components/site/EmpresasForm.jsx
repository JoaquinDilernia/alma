"use client";

import { useState } from "react";
import { validateEmpresaLead } from "@/lib/validateEmpresaLead";
import { submitEmpresaLead } from "@/lib/submitEmpresaLead";
import {
  MODALIDADES_EMPRESA,
  FRECUENCIAS_EMPRESA,
  buildEmpresaWhatsappHref,
} from "@/lib/empresasLead";
import styles from "./EmpresasForm.module.css";

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";
const INITIAL_DATA = {
  empresa: "",
  contacto: "",
  email: "",
  telefono: "",
  cantidadPersonas: "",
  frecuencia: "",
  mensaje: "",
};

export default function EmpresasForm({ modalidad, onModalidadChange }) {
  const [data, setData] = useState(INITIAL_DATA);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | success
  const [waHref, setWaHref] = useState("");

  const handleChange = (field) => (event) => {
    setData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const full = { ...data, modalidad };
    const { valid, errors: validationErrors } = validateEmpresaLead(full);
    setErrors(validationErrors);
    if (!valid) return;

    const href = buildEmpresaWhatsappHref(WHATSAPP, full);
    setWaHref(href);
    // Abrimos WhatsApp dentro del gesto del usuario para que no lo bloquee el navegador.
    window.open(href, "_blank", "noopener");
    setStatus("success");
    setData(INITIAL_DATA);
    // Guardamos una copia en Firestore como respaldo, sin bloquear la UX.
    submitEmpresaLead(full).catch(() => {});
  };

  if (status === "success") {
    return (
      <div className={styles.success}>
        <p>¡Listo! Te abrimos WhatsApp con tu consulta cargada.</p>
        <p>
          Si no se abrió,{" "}
          <a href={waHref} target="_blank" rel="noreferrer" className={styles.successLink}>
            tocá acá para enviarla
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="modalidad">Modalidad</label>
        <select id="modalidad" value={modalidad} onChange={(e) => onModalidadChange(e.target.value)}>
          {MODALIDADES_EMPRESA.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.modalidad && <p className={styles.error}>{errors.modalidad}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="empresa">Empresa</label>
        <input id="empresa" value={data.empresa} onChange={handleChange("empresa")} placeholder="Nombre de tu empresa" />
        {errors.empresa && <p className={styles.error}>{errors.empresa}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="contacto">Contacto</label>
        <input id="contacto" value={data.contacto} onChange={handleChange("contacto")} placeholder="Tu nombre" />
        {errors.contacto && <p className={styles.error}>{errors.contacto}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={data.email} onChange={handleChange("email")} placeholder="vos@empresa.com" />
        {errors.email && <p className={styles.error}>{errors.email}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="telefono">Teléfono</label>
        <input id="telefono" value={data.telefono} onChange={handleChange("telefono")} placeholder="11 1234-5678" />
        {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="cantidadPersonas">Cantidad de personas</label>
        <input
          id="cantidadPersonas"
          type="number"
          min="1"
          inputMode="numeric"
          value={data.cantidadPersonas}
          onChange={handleChange("cantidadPersonas")}
          placeholder="Ej: 25"
        />
        {errors.cantidadPersonas && <p className={styles.error}>{errors.cantidadPersonas}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="frecuencia">Frecuencia del servicio</label>
        <select id="frecuencia" value={data.frecuencia} onChange={handleChange("frecuencia")}>
          <option value="">Seleccioná una opción</option>
          {FRECUENCIAS_EMPRESA.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        {errors.frecuencia && <p className={styles.error}>{errors.frecuencia}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="mensaje">Contanos qué necesitás</label>
        <textarea
          id="mensaje"
          className={styles.textarea}
          value={data.mensaje}
          onChange={handleChange("mensaje")}
          rows={3}
          placeholder="Cantidad de almuerzos, días de la semana, restricciones alimentarias, etc."
        />
      </div>
      <button type="submit" className={styles.submit}>
        Enviar consulta por WhatsApp
      </button>
    </form>
  );
}
