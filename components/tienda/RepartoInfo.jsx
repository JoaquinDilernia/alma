"use client";

import styles from "./RepartoInfo.module.css";

function hasInfo(z) {
  return Boolean((z.diasReparto && z.diasReparto.trim()) || (z.horarioReparto && z.horarioReparto.trim()));
}

function ZonaLinea({ z, mostrarNombre }) {
  const partes = [z.diasReparto, z.horarioReparto].filter((p) => p && p.trim());
  return (
    <p className={styles.linea}>
      {mostrarNombre && <span className={styles.zonaNombre}>{z.nombre}: </span>}
      {partes.join(" · ")}
    </p>
  );
}

export default function RepartoInfo({ zona, zonas }) {
  if (zona) {
    if (!hasInfo(zona)) return null;
    return (
      <div className={styles.box}>
        <p className={styles.titulo}>Reparto</p>
        <ZonaLinea z={zona} mostrarNombre={false} />
      </div>
    );
  }

  const conInfo = (zonas || []).filter((z) => z.activa && hasInfo(z));
  if (conInfo.length === 0) return null;
  return (
    <div className={styles.box}>
      <p className={styles.titulo}>Días y horarios de reparto</p>
      {conInfo.map((z) => (
        <ZonaLinea key={z.id} z={z} mostrarNombre />
      ))}
    </div>
  );
}
