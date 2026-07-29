"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useGuarniciones() {
  const [guarniciones, setGuarniciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alma_guarniciones"), orderBy("nombre"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGuarniciones(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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
