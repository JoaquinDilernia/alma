import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadSiteImage(file, path) {
  const storageRef = ref(storage, `alma/site/${path}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
