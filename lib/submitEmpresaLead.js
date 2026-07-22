import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function submitEmpresaLead(data) {
  await addDoc(collection(db, "alma_leads_empresas"), {
    empresa: data.empresa.trim(),
    contacto: data.contacto.trim(),
    email: data.email.trim(),
    telefono: data.telefono.trim(),
    tamanioEquipo: data.tamanioEquipo || "",
    createdAt: serverTimestamp(),
  });
}
