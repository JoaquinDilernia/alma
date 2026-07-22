"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export function useAdminAuth() {
  const [state, setState] = useState({ user: null, adminDoc: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, adminDoc: null, loading: false });
        return;
      }
      const snapshot = await getDoc(doc(db, "alma_admins", user.uid));
      setState({
        user,
        adminDoc: snapshot.exists() ? snapshot.data() : null,
        loading: false,
      });
    });
    return unsubscribe;
  }, []);

  return state;
}
