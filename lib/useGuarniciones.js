"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { imagenesGuarniciones } from "./imagenesGuarniciones";

export function useGuarniciones() {
  const [guarniciones, setGuarniciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_guarniciones"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGuarniciones(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            // Foto servida como estático desde /public (ver lib/imagenesGuarniciones.js).
            imagenUrl: imagenesGuarniciones[d.id] ?? "",
          }))
        );
        setLoading(false);
      },
      () => {
        setGuarniciones([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { guarniciones, loading };
}
