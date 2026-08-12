"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useDescuentosCantidad() {
  const [escalones, setEscalones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_descuentos_cantidad"), orderBy("cantidadMinima"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEscalones(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setEscalones([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { escalones, loading };
}
