"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const DEFAULT_CONFIG = { minimoViandas: 0 };

export function useTiendaConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const ref = doc(db, "alma_config", "tienda");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        setConfig({ minimoViandas: Number(data.minimoViandas) || 0 });
      },
      () => setConfig(DEFAULT_CONFIG)
    );
    return unsubscribe;
  }, []);

  return config;
}
