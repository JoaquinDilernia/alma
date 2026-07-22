"use client";

import { useState } from "react";
import { validateImageUpload } from "@/lib/validateImageUpload";
import { uploadSiteImage } from "@/lib/uploadSiteImage";
import styles from "./ImageUploadField.module.css";

export default function ImageUploadField({ label, currentUrl, storagePath, onUploaded }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    setError("");
    const { valid, error: validationError } = validateImageUpload(file);
    if (!valid) {
      setError(validationError);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadSiteImage(file, storagePath);
      onUploaded(url);
    } catch (err) {
      setError("No pudimos subir la imagen. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className={styles.preview} />
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} disabled={uploading} />
      {uploading && <p className={styles.status}>Subiendo...</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
