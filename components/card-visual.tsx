import type { CSSProperties } from "react";

type Props = {
  src?: string;
  alt: string;
  emoji?: string;
  className?: string;
  style?: CSSProperties;
  size?: number;
};

export function CardVisual({ src, alt, emoji, className = "", style, size = 72 }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ width: size, height: size * 1.45, objectFit: "cover", borderRadius: 16, boxShadow: "0 18px 40px rgba(0,0,0,.35)", border: "1px solid rgba(245,213,110,.25)", ...style }}
      />
    );
  }
  return <div className={className} style={style}>{emoji ?? "🃏"}</div>;
}
