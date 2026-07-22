import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function createDoc(collectionName, data) {
  const ref = await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateDocById(collectionName, id, data) {
  await updateDoc(doc(db, collectionName, id), data);
}

export async function deleteDocById(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}
