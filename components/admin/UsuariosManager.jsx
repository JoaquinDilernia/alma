"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createAdminUser } from "@/lib/createAdminUser";
import styles from "./UsuariosManager.module.css";

export default function UsuariosManager() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = async () => {
    const snapshot = await getDocs(collection(db, "alma_admins"));
    setAdmins(snapshot.docs.map((d) => d.data()));
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await createAdminUser({ email, password, role: "admin" });
      setMessage({ type: "success", text: `Usuario ${email} creado correctamente.` });
      setEmail("");
      setPassword("");
      await loadAdmins();
    } catch (err) {
      setMessage({ type: "error", text: "No pudimos crear el usuario. Revisá los datos e intentá de nuevo." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Usuarios del panel</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="new-admin-email">Email</label>
          <input
            id="new-admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-admin-password">Contraseña temporal</label>
          <input
            id="new-admin-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Creando..." : "Crear usuario admin"}
        </button>
      </form>

      {message && (
        <p className={`${styles.message} ${message.type === "error" ? styles.messageError : styles.messageSuccess}`}>
          {message.text}
        </p>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.uid}>
              <td>{admin.email}</td>
              <td>{admin.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
