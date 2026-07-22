const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImageUpload(file) {
  if (!file) {
    return { valid: false, error: "Seleccioná un archivo." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Formato no soportado. Usá JPG, PNG o WEBP." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "El archivo pesa más de 5MB." };
  }
  return { valid: true, error: null };
}
