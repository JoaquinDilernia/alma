"use client";

import { useState } from "react";
import ImagePlaceholder from "@/components/site/ImagePlaceholder";
import styles from "./GaleriaFotos.module.css";

export default function GaleriaFotos({ imagenUrls = [], nombre }) {
  const [activa, setActiva] = useState(0);

  if (imagenUrls.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.principal}>
          <ImagePlaceholder className={styles.principalImg} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.principal}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagenUrls[activa]} alt={nombre} className={styles.principalImg} />
      </div>
      {imagenUrls.length > 1 && (
        <div className={styles.miniaturas}>
          {imagenUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              className={`${styles.miniatura} ${index === activa ? styles.miniaturaActiva : ""}`}
              onClick={() => setActiva(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={styles.miniaturaImg} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
