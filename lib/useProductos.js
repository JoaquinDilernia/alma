"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { imagenesProductos } from "./imagenesProductos";

export function useProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_productos"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setProductos(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            // Las fotos se sirven como estáticos desde /public (Hostinger), no
            // desde Firebase Storage. La asociación producto→foto vive en
            // lib/imagenesProductos.js, no en Firestore.
            imagenUrls: imagenesProductos[d.id] ?? [],
          }))
        );
        setLoading(false);
      },
      () => {
        setProductos([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { productos, loading };
}
