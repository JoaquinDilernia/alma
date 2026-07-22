const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmpresaLead(data) {
  const errors = {};

  if (!data.empresa || data.empresa.trim().length < 2) {
    errors.empresa = "Ingresá el nombre de la empresa.";
  }

  if (!data.contacto || data.contacto.trim().length < 2) {
    errors.contacto = "Ingresá el nombre de la persona de contacto.";
  }

  if (!data.email || !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = "Ingresá un email válido.";
  }

  const telefonoDigits = (data.telefono || "").replace(/\D/g, "");
  if (telefonoDigits.length < 8) {
    errors.telefono = "Ingresá un teléfono válido.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
