// Modalidades de servicio para empresas. El texto vive en código (no editable
// desde el admin por ahora). El `value` es lo que se guarda en Firestore y se
// valida; el `label` y la `descripcion` son para la UI y el mensaje de WhatsApp.
export const MODALIDADES_EMPRESA = [
  {
    value: "viandas-congeladas",
    label: "Viandas congeladas",
    resumen: "Producción y entrega programada",
    descripcion:
      "Armamos un plan semanal o mensual y lo entregamos listo para freezer. Tu equipo hornea o calienta cuando quiere.",
  },
  {
    value: "comida-caliente",
    label: "Comida caliente del día",
    resumen: "Elaborada y entregada el mismo día",
    descripcion:
      "Cocinamos y entregamos el mismo día, lista para servir. Ideal para almuerzos de oficina.",
  },
];

export const FRECUENCIAS_EMPRESA = ["Diario", "Semanal", "Quincenal", "Mensual", "A definir"];

export function modalidadLabel(value) {
  const m = MODALIDADES_EMPRESA.find((x) => x.value === value);
  return m ? `${m.label} (${m.resumen.toLowerCase()})` : value || "";
}

// Arma el texto plano que se pre-carga en WhatsApp cuando la empresa envía el
// formulario. Función pura para poder testearla.
export function buildEmpresaWhatsappMessage(data) {
  const lineas = [
    "Hola ALMA! Consulta para empresas:",
    "",
    `Empresa: ${data.empresa?.trim() || "-"}`,
    `Contacto: ${data.contacto?.trim() || "-"}`,
    `Email: ${data.email?.trim() || "-"}`,
    `Teléfono: ${data.telefono?.trim() || "-"}`,
    `Modalidad: ${modalidadLabel(data.modalidad)}`,
    `Cantidad de personas: ${data.cantidadPersonas || "-"}`,
    `Frecuencia: ${data.frecuencia || "-"}`,
  ];
  if (data.mensaje?.trim()) {
    lineas.push("", `Qué necesitan: ${data.mensaje.trim()}`);
  }
  return lineas.join("\n");
}

export function buildEmpresaWhatsappHref(numero, data) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(buildEmpresaWhatsappMessage(data))}`;
}
