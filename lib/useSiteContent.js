"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { defaultSiteContent, mergeSiteContent } from "./siteContent";

export function useSiteContent() {
  const [content, setContent] = useState(defaultSiteContent);

  useEffect(() => {
    const ref = doc(db, "alma_site_content", "landing");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setContent(mergeSiteContent(snapshot.exists() ? snapshot.data() : null));
      },
      () => {
        setContent(defaultSiteContent);
      }
    );
    return unsubscribe;
  }, []);

  return content;
}
