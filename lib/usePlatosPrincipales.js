"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function usePlatosPrincipales() {
  const [platosPrincipales, setPlatosPrincipales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_platos_principales"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPlatosPrincipales(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setPlatosPrincipales([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { platosPrincipales, loading };
}
