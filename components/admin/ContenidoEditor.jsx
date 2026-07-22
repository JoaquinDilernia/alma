"use client";

import { useEffect, useState } from "react";
import { useSiteContent } from "@/lib/useSiteContent";
import { saveSiteContentField } from "@/lib/saveSiteContentField";
import ImageUploadField from "./ImageUploadField";
import styles from "./ContenidoEditor.module.css";

export default function ContenidoEditor() {
  const remoteContent = useSiteContent();
  const [draft, setDraft] = useState(remoteContent);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setDraft(remoteContent);
  }, [remoteContent]);

  const updateCategoria = (index, patch) => {
    setDraft((prev) => {
      const categorias = prev.producto.categorias.map((cat, i) =>
        i === index ? { ...cat, ...patch } : cat
      );
      return { ...prev, producto: { ...prev.producto, categorias } };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setJustSaved(false);
    try {
      await saveSiteContentField(draft);
      setJustSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <h1 style={{ marginBottom: "1.5rem" }}>Contenido de la landing</h1>

      <section className={styles.block}>
        <h2>Hero</h2>
        <div className={styles.field}>
          <label htmlFor="hero-titulo">Título</label>
          <input
            id="hero-titulo"
            value={draft.hero.titulo}
            onChange={(e) => setDraft((p) => ({ ...p, hero: { ...p.hero, titulo: e.target.value } }))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="hero-bajada">Bajada</label>
          <textarea
            id="hero-bajada"
            value={draft.hero.bajada}
            onChange={(e) => setDraft((p) => ({ ...p, hero: { ...p.hero, bajada: e.target.value } }))}
          />
        </div>
        <ImageUploadField
          label="Imagen de fondo"
          currentUrl={draft.hero.imagenUrl}
          storagePath="hero.jpg"
          onUploaded={(url) => setDraft((p) => ({ ...p, hero: { ...p.hero, imagenUrl: url } }))}
        />
      </section>

      <section className={styles.block}>
        <h2>Nosotros</h2>
        <div className={styles.field}>
          <label htmlFor="nosotros-texto">Texto</label>
          <textarea
            id="nosotros-texto"
            value={draft.nosotros.texto}
            onChange={(e) => setDraft((p) => ({ ...p, nosotros: { texto: e.target.value } }))}
          />
        </div>
      </section>

      <section className={styles.block}>
        <h2>Producto</h2>
        <div className={styles.field}>
          <label htmlFor="producto-texto">Texto</label>
          <textarea
            id="producto-texto"
            value={draft.producto.texto}
            onChange={(e) =>
              setDraft((p) => ({ ...p, producto: { ...p.producto, texto: e.target.value } }))
            }
          />
        </div>
        {draft.producto.categorias.map((categoria, index) => (
          <div key={index} className={styles.categoriaRow}>
            <div className={styles.categoriaNombre}>
              <label htmlFor={`categoria-nombre-${index}`}>Categoría {index + 1}</label>
              <input
                id={`categoria-nombre-${index}`}
                value={categoria.nombre}
                onChange={(e) => updateCategoria(index, { nombre: e.target.value })}
              />
            </div>
            <ImageUploadField
              label="Imagen"
              currentUrl={categoria.imagenUrl}
              storagePath={`categorias/${index}.jpg`}
              onUploaded={(url) => updateCategoria(index, { imagenUrl: url })}
            />
          </div>
        ))}
      </section>

      <section className={styles.block}>
        <h2>Empresas</h2>
        <div className={styles.field}>
          <label htmlFor="empresas-texto">Texto</label>
          <textarea
            id="empresas-texto"
            value={draft.empresas.texto}
            onChange={(e) => setDraft((p) => ({ ...p, empresas: { texto: e.target.value } }))}
          />
        </div>
      </section>

      <button type="submit" className={styles.save} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
      {justSaved && <span className={styles.savedMessage}>Guardado ✓</span>}
    </form>
  );
}
