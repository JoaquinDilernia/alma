"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useMetodosPago() {
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_metodos_pago"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMetodosPago(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        setMetodosPago([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { metodosPago, loading };
}
