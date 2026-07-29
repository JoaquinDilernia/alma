"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useGuarniciones } from "@/lib/useGuarniciones";
import { createDoc, updateDocById, deleteDocById } from "@/lib/adminCrud";
import { collectGuarnicionesUnicas, remapProductoGuarniciones, normalizeNombre } from "@/lib/migrateGuarniciones";
import ImageUploadField from "./ImageUploadField";
import shared from "./adminShared.module.css";
import styles from "./GuarnicionesManager.module.css";

const COLLECTION = "alma_guarniciones";

export default function GuarnicionesManager() {
  const { guarniciones, loading } = useGuarniciones();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioExtra, setPrecioExtra] = useState(0);
  const [migrando, setMigrando] = useState(false);
  const [migracionMsg, setMigracionMsg] = useState("");

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    await createDoc(COLLECTION, {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precioExtra: Number(precioExtra) || 0,
      imagenUrl: "",
      activa: true,
    });
    setNombre("");
    setDescripcion("");
    setPrecioExtra(0);
  };

  const handleFieldChange = (guarnicion, field, value) => {
    updateDocById(COLLECTION, guarnicion.id, { [field]: value });
  };

  const handleDelete = (guarnicion) => {
    deleteDocById(COLLECTION, guarnicion.id);
  };

  const handleMigrar = async () => {
    setMigrando(true);
    setMigracionMsg("");
    try {
      const snapshot = await getDocs(collection(db, "alma_productos"));
      const productos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const unicas = collectGuarnicionesUnicas(productos);

      const nombreToId = {};
      for (const g of unicas) {
        const id = await createDoc(COLLECTION, {
          nombre: g.nombre,
          descripcion: "",
          precioExtra: g.precioExtra,
          imagenUrl: "",
          activa: true,
        });
        nombreToId[normalizeNombre(g.nombre)] = id;
      }

      for (const producto of productos) {
        if (!(producto.guarniciones || []).length) continue;
        const nuevoArray = remapProductoGuarniciones(producto, nombreToId);
        await updateDocById("alma_productos", producto.id, { guarniciones: nuevoArray });
      }

      setMigracionMsg(`Migración completa: ${unicas.length} guarniciones creadas.`);
    } catch (err) {
      setMigracionMsg("Ocurrió un error durante la migración. Revisá la consola.");
    } finally {
      setMigrando(false);
    }
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Guarniciones</h1>

      {guarniciones.length === 0 && (
        <div className={styles.migracion}>
          <p style={{ marginBottom: "0.6rem" }}>
            Todavía no hay guarniciones cargadas. Si ya tenés productos con guarniciones a mano, migralas a esta lista.
          </p>
          <button type="button" className={shared.addButton} onClick={handleMigrar} disabled={migrando}>
            {migrando ? "Migrando..." : "Migrar guarniciones existentes de productos"}
          </button>
          {migracionMsg && <p style={{ marginTop: "0.6rem" }}>{migracionMsg}</p>}
        </div>
      )}

      <div className={styles.list}>
        {guarniciones.map((guarnicion) => (
          <div key={guarnicion.id} className={styles.card}>
            <ImageUploadField
              label="Foto"
              currentUrl={guarnicion.imagenUrl}
              storagePath={`guarniciones/${guarnicion.id}.jpg`}
              onUploaded={(url) => handleFieldChange(guarnicion, "imagenUrl", url)}
            />
            <div className={styles.cardFields}>
              <div className={shared.field}>
                <label htmlFor={`nombre-${guarnicion.id}`}>Nombre</label>
                <input
                  id={`nombre-${guarnicion.id}`}
                  type="text"
                  defaultValue={guarnicion.nombre}
                  onBlur={(e) => handleFieldChange(guarnicion, "nombre", e.target.value)}
                />
              </div>
              <div className={shared.field}>
                <label htmlFor={`descripcion-${guarnicion.id}`}>Descripción</label>
                <input
                  id={`descripcion-${guarnicion.id}`}
                  type="text"
                  defaultValue={guarnicion.descripcion}
                  onBlur={(e) => handleFieldChange(guarnicion, "descripcion", e.target.value)}
                />
              </div>
              <div className={shared.field} style={{ maxWidth: 140 }}>
                <label htmlFor={`precio-${guarnicion.id}`}>Precio extra</label>
                <input
                  id={`precio-${guarnicion.id}`}
                  type="number"
                  min={0}
                  defaultValue={guarnicion.precioExtra}
                  onBlur={(e) => handleFieldChange(guarnicion, "precioExtra", Number(e.target.value) || 0)}
                />
              </div>
              <label className={styles.activaRow}>
                <input
                  type="checkbox"
                  checked={guarnicion.activa}
                  onChange={(e) => handleFieldChange(guarnicion, "activa", e.target.checked)}
                />
                Activa
              </label>
              <button type="button" className={shared.delete} onClick={() => handleDelete(guarnicion)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className={shared.addForm} onSubmit={handleAdd}>
        <div className={shared.field}>
          <label htmlFor="nueva-guarnicion-nombre">Nueva guarnición</label>
          <input id="nueva-guarnicion-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className={shared.field}>
          <label htmlFor="nueva-guarnicion-descripcion">Descripción</label>
          <input
            id="nueva-guarnicion-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div className={shared.field} style={{ maxWidth: 120 }}>
          <label htmlFor="nueva-guarnicion-precio">Precio extra</label>
          <input
            id="nueva-guarnicion-precio"
            type="number"
            min={0}
            value={precioExtra}
            onChange={(e) => setPrecioExtra(e.target.value)}
          />
        </div>
        <button type="submit" className={shared.addButton}>
          + Agregar
        </button>
      </form>
    </div>
  );
}
