"use client";

import { useSiteContent } from "@/lib/useSiteContent";

const SITE_URL = "https://alma.techdi.com.ar";

export default function StructuredData() {
  const content = useSiteContent();
  const instagramHandle = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "alma.viandas";

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ALMA",
    url: SITE_URL,
    logo: `${SITE_URL}/logo/alma-mark.png`,
    sameAs: [`https://instagram.com/${instagramHandle}`],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.pregunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.respuesta,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
