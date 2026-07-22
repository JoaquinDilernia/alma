import { describe, it, expect } from "vitest";
import { validateEmpresaLead } from "./validateEmpresaLead";

const validData = {
  empresa: "Acme SA",
  contacto: "Juan Pérez",
  email: "juan@acme.com",
  telefono: "11 4444-5555",
  tamanioEquipo: "10-20",
};

describe("validateEmpresaLead", () => {
  it("accepts fully valid data", () => {
    expect(validateEmpresaLead(validData)).toEqual({ valid: true, errors: {} });
  });

  it("rejects a missing empresa name", () => {
    const result = validateEmpresaLead({ ...validData, empresa: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.empresa).toBeDefined();
  });

  it("rejects a missing contacto name", () => {
    const result = validateEmpresaLead({ ...validData, contacto: " " });
    expect(result.valid).toBe(false);
    expect(result.errors.contacto).toBeDefined();
  });

  it("rejects an invalid email", () => {
    const result = validateEmpresaLead({ ...validData, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("rejects a phone number that is too short", () => {
    const result = validateEmpresaLead({ ...validData, telefono: "123" });
    expect(result.valid).toBe(false);
    expect(result.errors.telefono).toBeDefined();
  });

  it("accepts a phone number with formatting characters as long as enough digits are present", () => {
    const result = validateEmpresaLead({ ...validData, telefono: "(011) 4444-5555" });
    expect(result.valid).toBe(true);
  });

  it("does not require tamanioEquipo", () => {
    const { tamanioEquipo, ...rest } = validData;
    const result = validateEmpresaLead(rest);
    expect(result.valid).toBe(true);
  });
});
