import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function saveSiteContentField(partialContent) {
  const ref = doc(db, "alma_site_content", "landing");
  await setDoc(ref, partialContent, { merge: true });
}
