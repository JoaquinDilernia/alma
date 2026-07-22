"use client";

import { useState } from "react";
import { validateEmpresaLead } from "@/lib/validateEmpresaLead";
import { submitEmpresaLead } from "@/lib/submitEmpresaLead";
import styles from "./EmpresasForm.module.css";

const INITIAL_DATA = { empresa: "", contacto: "", email: "", telefono: "", tamanioEquipo: "" };

export default function EmpresasForm() {
  const [data, setData] = useState(INITIAL_DATA);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const handleChange = (field) => (event) => {
    setData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { valid, errors: validationErrors } = validateEmpresaLead(data);
    setErrors(validationErrors);
    if (!valid) return;

    setStatus("submitting");
    try {
      await submitEmpresaLead(data);
      setStatus("success");
      setData(INITIAL_DATA);
    } catch (err) {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p className={styles.success}>
        ¡Gracias! Ya recibimos tus datos, te vamos a contactar a la brevedad.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
        <label htmlFor="tamanioEquipo">Tamaño aproximado del equipo</label>
        <select id="tamanioEquipo" value={data.tamanioEquipo} onChange={handleChange("tamanioEquipo")}>
          <option value="">Seleccioná una opción</option>
          <option value="1-10">1 a 10 personas</option>
          <option value="10-50">10 a 50 personas</option>
          <option value="50+">Más de 50 personas</option>
        </select>
      </div>
      <button type="submit" className={styles.submit} disabled={status === "submitting"}>
        {status === "submitting" ? "Enviando..." : "Quiero sumar mi empresa"}
      </button>
      {status === "error" && (
        <p className={styles.formError}>
          No pudimos enviar tu consulta. Revisá tu conexión e intentá de nuevo.
        </p>
      )}
    </form>
  );
}
