export const defaultSiteContent = {
  hero: {
    titulo: "Comida real, sin vueltas",
    bajada:
      "Viandas 100% caseras, sin conservantes, listas para el horno. Cociná menos, comé mejor.",
    imagenUrl: "/images/hero.webp",
  },
  nosotros: {
    texto:
      "En ALMA cocinamos como en casa: ingredientes reales, porciones pensadas para vos y cero conservantes. Cada vianda se prepara de forma artesanal y pasa a conservación premium para llegar a tu mesa igual de rica que recién hecha.",
  },
  producto: {
    texto:
      "Elegís tus viandas, las guardás en el freezer y las horneás cuando las vayas a comer. Así de simple.",
    categorias: [
      { nombre: "Clásicas", imagenUrl: "/images/categorias/0.jpg" },
      { nombre: "Fitness", imagenUrl: "/images/categorias/1.jpg" },
      { nombre: "Veggie", imagenUrl: "/images/categorias/2.jpg" },
      { nombre: "Kids", imagenUrl: "/images/categorias/3.jpg" },
    ],
  },
  empresas: {
    texto:
      "Llevamos ALMA a tu oficina: pedidos con horario de corte, entrega puntual y el mismo estándar casero de siempre para todo tu equipo.",
  },
  testimonios: [
    {
      id: "t1",
      autor: "Julia R.",
      texto: "Dejé de improvisar el almuerzo entre reuniones. Pido mi semana de viandas y listo.",
      fotoUrl: null,
    },
    {
      id: "t2",
      autor: "Nico M.",
      texto: "Se nota que no llevan conservantes, tienen gusto a comida de casa.",
      fotoUrl: null,
    },
    {
      id: "t3",
      autor: "Caro P.",
      texto: "Las fitness me salvaron la rutina, quedan riquísimas incluso recalentadas.",
      fotoUrl: null,
    },
  ],
  faq: [
    {
      id: "f1",
      pregunta: "¿Cuánto duran en el freezer?",
      respuesta: "Hasta 3 meses conservadas a -18°C sin perder sabor ni textura.",
    },
    {
      id: "f2",
      pregunta: "¿Cómo las cocino?",
      respuesta:
        "Directo del freezer al horno, sin descongelar. Cada vianda trae el tiempo y la temperatura sugerida.",
    },
    {
      id: "f3",
      pregunta: "¿En qué zonas entregan?",
      respuesta: "Por ahora entregamos en CABA y GBA. Estamos sumando zonas todo el tiempo.",
    },
    {
      id: "f4",
      pregunta: "¿Qué medios de pago aceptan?",
      respuesta: "Tarjetas de crédito/débito, transferencia y Mercado Pago.",
    },
  ],
};

function pickText(remoteValue, defaultValue) {
  return typeof remoteValue === "string" && remoteValue.trim() !== "" ? remoteValue : defaultValue;
}

export function mergeSiteContent(remote, defaults = defaultSiteContent) {
  if (!remote || typeof remote !== "object") return defaults;

  return {
    hero: {
      titulo: pickText(remote.hero?.titulo, defaults.hero.titulo),
      bajada: pickText(remote.hero?.bajada, defaults.hero.bajada),
      // Las imágenes salen siempre de código (ver /public/images). No son
      // editables desde el admin: así descartamos URLs viejas de Storage.
      imagenUrl: defaults.hero.imagenUrl,
    },
    nosotros: {
      texto: pickText(remote.nosotros?.texto, defaults.nosotros.texto),
    },
    producto: {
      texto: pickText(remote.producto?.texto, defaults.producto.texto),
      categorias:
        Array.isArray(remote.producto?.categorias) && remote.producto.categorias.length > 0
          ? remote.producto.categorias.map((cat, i) => ({
              ...cat,
              imagenUrl: defaults.producto.categorias[i]?.imagenUrl ?? null,
            }))
          : defaults.producto.categorias,
    },
    empresas: {
      texto: pickText(remote.empresas?.texto, defaults.empresas.texto),
    },
    testimonios:
      Array.isArray(remote.testimonios) && remote.testimonios.length > 0
        ? remote.testimonios
        : defaults.testimonios,
    faq: Array.isArray(remote.faq) && remote.faq.length > 0 ? remote.faq : defaults.faq,
  };
}
