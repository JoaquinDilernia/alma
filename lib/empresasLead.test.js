import { describe, it, expect } from "vitest";
import {
  buildEmpresaWhatsappMessage,
  buildEmpresaWhatsappHref,
  modalidadLabel,
} from "./empresasLead";

const lead = {
  empresa: "Acme SA",
  contacto: "Juan Pérez",
  email: "juan@acme.com",
  telefono: "11 4444-5555",
  modalidad: "viandas-congeladas",
  cantidadPersonas: "25",
  frecuencia: "Semanal",
  mensaje: "Almuerzos los martes y jueves",
};

describe("modalidadLabel", () => {
  it("expands a known modalidad value", () => {
    expect(modalidadLabel("comida-caliente")).toBe(
      "Comida caliente del día (elaborada y entregada el mismo día)"
    );
  });

  it("returns the raw value when unknown", () => {
    expect(modalidadLabel("xxx")).toBe("xxx");
  });
});

describe("buildEmpresaWhatsappMessage", () => {
  it("includes every field", () => {
    const msg = buildEmpresaWhatsappMessage(lead);
    expect(msg).toContain("Empresa: Acme SA");
    expect(msg).toContain("Contacto: Juan Pérez");
    expect(msg).toContain("Email: juan@acme.com");
    expect(msg).toContain("Teléfono: 11 4444-5555");
    expect(msg).toContain("Modalidad: Viandas congeladas (producción y entrega programada)");
    expect(msg).toContain("Cantidad de personas: 25");
    expect(msg).toContain("Frecuencia: Semanal");
    expect(msg).toContain("Qué necesitan: Almuerzos los martes y jueves");
  });

  it("omits the necesidad line when there is no mensaje", () => {
    const msg = buildEmpresaWhatsappMessage({ ...lead, mensaje: "  " });
    expect(msg).not.toContain("Qué necesitan:");
  });
});

describe("buildEmpresaWhatsappHref", () => {
  it("builds a wa.me url with the encoded message", () => {
    const href = buildEmpresaWhatsappHref("5491135011991", lead);
    expect(href.startsWith("https://wa.me/5491135011991?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1])).toContain("Empresa: Acme SA");
  });
});
