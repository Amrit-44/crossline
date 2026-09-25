interface CrosslineLogoProps {
  /** Rendered height in px (width follows the square aspect ratio). */
  size?: number;
  className?: string;
  /** Above-the-fold placements (header) should load eagerly. */
  priority?: boolean;
  alt?: string;
}

/**
 * The one official Crossline brand mark. Uses the real
 * `/public/crossline-logo.png` asset (optimized 512px variant for UI
 * chrome) with explicit dimensions so there is never layout shift.
 */
export function CrosslineLogo({ size = 40, className = "", priority = false, alt = "Crossline logo" }: CrosslineLogoProps) {
  return (
    // Plain <img> on purpose: the src is a pre-optimized 512px asset and
    // there is no remote image optimizer on Cloudflare Pages — next/image
    // would fail at runtime. Explicit dimensions prevent layout shift.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/crossline-logo-512.png"
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={`inline-block h-auto shrink-0 object-cover ${className}`}
      style={{ aspectRatio: "1 / 1" }}
    />
  );
}
