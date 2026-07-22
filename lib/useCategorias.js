"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_categorias"), orderBy("orden"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCategorias(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setCategorias([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { categorias, loading };
}
