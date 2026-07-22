import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "./firebase";

export async function createAdminUser({ email, password, role = "admin" }) {
  const secondaryApp = initializeApp(firebaseConfig, `admin-creation-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, "alma_admins", credential.user.uid), {
      uid: credential.user.uid,
      email,
      role,
      createdAt: new Date().toISOString(),
    });
    return credential.user.uid;
  } finally {
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
  }
}
