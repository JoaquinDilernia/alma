export default function Logo({ variant = "isotipo", className = "" }) {
  const src = variant === "isotipo" ? "/logo/alma-isotipo.svg" : "/logo/alma-logotipo.svg";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="ALMA" className={className} />;
}
