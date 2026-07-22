"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { useSiteContent } from "@/lib/useSiteContent";
import ImagePlaceholder from "./ImagePlaceholder";
import styles from "./Hero.module.css";

export default function Hero() {
  const content = useSiteContent();
  const rootRef = useRef(null);
  const imageRef = useRef(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(`.${styles.eyebrow}`, { y: 24, opacity: 0, duration: 0.6 })
        .from(`.${styles.titulo}`, { y: 40, opacity: 0, duration: 0.8 }, "-=0.35")
        .from(`.${styles.bajada}`, { y: 24, opacity: 0, duration: 0.6 }, "-=0.45")
        .from(`.${styles.ctas} > *`, { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.3");

      gsap.to(imageRef.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: rootRef }
  );

  return (
    <section id="hero" ref={rootRef} className={styles.hero}>
      <div ref={imageRef} className={styles.imageWrap}>
        {content.hero.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.hero.imagenUrl} alt="" className={styles.image} />
        ) : (
          <ImagePlaceholder className={styles.image} />
        )}
        <div className={styles.overlay} />
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Nutrimos momentos, creamos bienestar</p>
        <h1 className={styles.titulo}>{content.hero.titulo}</h1>
        <p className={styles.bajada}>{content.hero.bajada}</p>
        <div className={styles.ctas}>
          <Link href="/tienda" className={styles.ctaPrimary}>
            Pedir ahora
          </Link>
          <a href="#producto" className={styles.ctaSecondary}>
            Ver cómo funciona
          </a>
        </div>
      </div>
    </section>
  );
}
