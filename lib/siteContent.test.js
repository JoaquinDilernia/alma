import { describe, it, expect } from "vitest";
import { mergeSiteContent, defaultSiteContent } from "./siteContent";

describe("mergeSiteContent", () => {
  it("returns defaults when remote is null", () => {
    expect(mergeSiteContent(null)).toEqual(defaultSiteContent);
  });

  it("returns defaults when remote is undefined", () => {
    expect(mergeSiteContent(undefined)).toEqual(defaultSiteContent);
  });

  it("prefers a non-empty remote hero title over the default", () => {
    const result = mergeSiteContent({ hero: { titulo: "Nuevo titulo" } });
    expect(result.hero.titulo).toBe("Nuevo titulo");
    expect(result.hero.bajada).toBe(defaultSiteContent.hero.bajada);
  });

  it("falls back to default hero title when remote value is an empty string", () => {
    const result = mergeSiteContent({ hero: { titulo: "   " } });
    expect(result.hero.titulo).toBe(defaultSiteContent.hero.titulo);
  });

  it("uses remote categorias only when the array is non-empty", () => {
    const result = mergeSiteContent({ producto: { categorias: [] } });
    expect(result.producto.categorias).toEqual(defaultSiteContent.producto.categorias);
  });

  it("always uses the code hero image, ignoring any remote value", () => {
    const result = mergeSiteContent({ hero: { imagenUrl: "https://firebasestorage.googleapis.com/x.jpg" } });
    expect(result.hero.imagenUrl).toBe(defaultSiteContent.hero.imagenUrl);
  });

  it("keeps remote categoria names but forces the code image by position", () => {
    const result = mergeSiteContent({
      producto: {
        categorias: [
          { nombre: "Renombrada", imagenUrl: "https://firebasestorage.googleapis.com/x.jpg" },
        ],
      },
    });
    expect(result.producto.categorias[0].nombre).toBe("Renombrada");
    expect(result.producto.categorias[0].imagenUrl).toBe(
      defaultSiteContent.producto.categorias[0].imagenUrl
    );
  });

  it("uses remote testimonios when provided", () => {
    const remoteTestimonios = [{ id: "x1", autor: "Ana", texto: "Buenísimo", fotoUrl: null }];
    const result = mergeSiteContent({ testimonios: remoteTestimonios });
    expect(result.testimonios).toEqual(remoteTestimonios);
  });

  it("uses default faq when remote faq is missing", () => {
    const result = mergeSiteContent({});
    expect(result.faq).toEqual(defaultSiteContent.faq);
  });
});
