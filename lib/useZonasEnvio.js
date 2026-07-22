"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useZonasEnvio() {
  const [zonasEnvio, setZonasEnvio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_zonas_envio"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setZonasEnvio(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setZonasEnvio([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { zonasEnvio, loading };
}
