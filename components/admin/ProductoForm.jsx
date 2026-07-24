"use client";

import { useState } from "react";
import { doc, collection, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCategorias } from "@/lib/useCategorias";
import { updateDocById } from "@/lib/adminCrud";
import ImageUploadField from "./ImageUploadField";
import styles from "./ProductoForm.module.css";

const EMPTY = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoriaId: "",
  tipo: "individual",
  stock: 0,
  cantidadViandas: 1,
  guarniciones: [],
  imagenUrls: ["", "", ""],
  tablaNutricional: { calorias: "", proteinas: "", carbohidratos: "", grasas: "" },
  activo: true,
};

export default function ProductoForm({ producto, onDone }) {
  const { categorias } = useCategorias();
  const [draft, setDraft] = useState(producto ? { ...EMPTY, ...producto } : EMPTY);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(producto);

  const updateField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));
  const updateNutricion = (field, value) =>
    setDraft((prev) => ({ ...prev, tablaNutricional: { ...prev.tablaNutricional, [field]: value } }));
  const updateFoto = (index, url) =>
    setDraft((prev) => {
      const imagenUrls = [...prev.imagenUrls];
      imagenUrls[index] = url;
      return { ...prev, imagenUrls };
    });
  const addGuarnicion = () =>
    setDraft((prev) => ({ ...prev, guarniciones: [...(prev.guarniciones || []), { nombre: "", precioExtra: 0 }] }));
  const updateGuarnicion = (index, field, value) =>
    setDraft((prev) => {
      const guarniciones = [...prev.guarniciones];
      guarniciones[index] = { ...guarniciones[index], [field]: value };
      return { ...prev, guarniciones };
    });
  const removeGuarnicion = (index) =>
    setDraft((prev) => ({ ...prev, guarniciones: prev.guarniciones.filter((_, i) => i !== index) }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...draft,
      precio: Number(draft.precio) || 0,
      stock: Number(draft.stock) || 0,
      cantidadViandas: Math.max(1, Number(draft.cantidadViandas) || 1),
      guarniciones: (draft.guarniciones || [])
        .filter((g) => g.nombre.trim())
        .map((g) => ({ nombre: g.nombre.trim(), precioExtra: Number(g.precioExtra) || 0 })),
      imagenUrls: draft.imagenUrls.filter(Boolean),
    };
    try {
      if (isEditing) {
        await updateDocById("alma_productos", producto.id, payload);
      } else {
        const ref = doc(collection(db, "alma_productos"));
        await setDoc(ref, payload);
      }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Datos básicos</p>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="producto-nombre">Nombre</label>
            <input
              id="producto-nombre"
              value={draft.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="producto-precio">Precio</label>
            <input
              id="producto-precio"
              type="number"
              value={draft.precio}
              onChange={(e) => updateField("precio", e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.field} style={{ marginBottom: "1rem" }}>
          <label htmlFor="producto-descripcion">Descripción</label>
          <textarea
            id="producto-descripcion"
            value={draft.descripcion}
            onChange={(e) => updateField("descripcion", e.target.value)}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="producto-categoria">Categoría</label>
            <select
              id="producto-categoria"
              value={draft.categoriaId}
              onChange={(e) => updateField("categoriaId", e.target.value)}
              required
            >
              <option value="">Seleccioná una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="producto-tipo">Tipo</label>
            <select id="producto-tipo" value={draft.tipo} onChange={(e) => updateField("tipo", e.target.value)}>
              <option value="individual">Individual</option>
              <option value="pack">Pack</option>
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="producto-stock">Stock</label>
            <input
              id="producto-stock"
              type="number"
              value={draft.stock}
              onChange={(e) => updateField("stock", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="producto-viandas">Cantidad de viandas</label>
            <input
              id="producto-viandas"
              type="number"
              min={1}
              value={draft.cantidadViandas}
              onChange={(e) => updateField("cantidadViandas", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Fotos</p>
        <div className={styles.fotos}>
          {[0, 1, 2].map((index) => (
            <ImageUploadField
              key={index}
              label={`Foto ${index + 1}`}
              currentUrl={draft.imagenUrls[index]}
              storagePath={`productos/${draft.nombre || "nuevo"}-${index}.jpg`}
              onUploaded={(url) => updateFoto(index, url)}
            />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Guarniciones</p>
        <p style={{ marginBottom: "0.8rem", opacity: 0.7, fontSize: "0.9rem" }}>
          Si cargás guarniciones, el cliente elige una por vianda (según la cantidad de viandas). El extra suma al precio.
        </p>
        {(draft.guarniciones || []).map((g, index) => (
          <div key={index} className={styles.guarnicionRow}>
            <input
              type="text"
              placeholder="Nombre (ej. Puré)"
              value={g.nombre}
              onChange={(e) => updateGuarnicion(index, "nombre", e.target.value)}
            />
            <input
              type="number"
              placeholder="Extra $"
              value={g.precioExtra}
              onChange={(e) => updateGuarnicion(index, "precioExtra", e.target.value)}
              style={{ width: 110 }}
            />
            <button type="button" className={styles.removeGuarnicion} onClick={() => removeGuarnicion(index)}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className={styles.addGuarnicion} onClick={addGuarnicion}>
          + Agregar guarnición
        </button>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Tabla nutricional (por porción)</p>
        <div className={styles.nutricion}>
          <div className={styles.field}>
            <label htmlFor="nutricion-calorias">Calorías</label>
            <input
              id="nutricion-calorias"
              value={draft.tablaNutricional.calorias}
              onChange={(e) => updateNutricion("calorias", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nutricion-proteinas">Proteínas (g)</label>
            <input
              id="nutricion-proteinas"
              value={draft.tablaNutricional.proteinas}
              onChange={(e) => updateNutricion("proteinas", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nutricion-carbohidratos">Carbohidratos (g)</label>
            <input
              id="nutricion-carbohidratos"
              value={draft.tablaNutricional.carbohidratos}
              onChange={(e) => updateNutricion("carbohidratos", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nutricion-grasas">Grasas (g)</label>
            <input
              id="nutricion-grasas"
              value={draft.tablaNutricional.grasas}
              onChange={(e) => updateNutricion("grasas", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Estado</p>
        <div className={styles.checkboxRow}>
          <input
            id="producto-activo"
            type="checkbox"
            checked={draft.activo}
            onChange={(e) => updateField("activo", e.target.checked)}
          />
          <label htmlFor="producto-activo">Activo (visible en la tienda)</label>
        </div>
      </div>

      <div className={styles.buttons}>
        <button type="submit" className={styles.save} disabled={saving}>
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
        </button>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
