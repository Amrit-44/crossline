"use client";

import type { ReactNode } from "react";

/**
 * Reusable hand-drawn doodle primitives. Every decoration in Crossline
 * should come from here so the illustrated world stays consistent.
 */

export function DoodleArrow({
  className = "",
  flip = false,
  label,
}: {
  className?: string;
  flip?: boolean;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 90 40"
      aria-hidden={label ? undefined : "true"}
      role={label ? "img" : undefined}
      aria-label={label}
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 30 Q 30 6, 58 14 T 78 20" />
      <path d="M68 12 L 80 20 L 68 29" />
      <path d="M10 33 Q 26 30, 40 27" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}

export function DoodleStar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M16 4 L 18.6 12.4 L 27.5 12.1 L 20.4 17.4 L 22.9 26 L 16 20.9 L 9.1 26 L 11.6 17.4 L 4.5 12.1 L 13.4 12.4 Z" />
    </svg>
  );
}

export function DoodleCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 60"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    >
      <path d="M8 32 Q 12 10, 60 8 Q 110 7, 113 30 Q 115 52, 62 54 Q 20 55, 9 38" />
      <path d="M14 36 Q 40 50, 80 48" strokeWidth="1.6" opacity="0.55" />
    </svg>
  );
}

export function DoodleUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 12"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M3 8 Q 25 3, 50 6 T 95 6 T 117 7" />
    </svg>
  );
}

export function DoodleScribble({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 30"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M4 20 Q 14 6, 24 18 T 44 16 T 64 18 T 84 14" />
      <path d="M8 24 Q 30 26, 55 23 T 94 24" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

/** Handwritten margin note, e.g. "THINK." or "YOUR MOVE". */
export function DoodleNote({
  children,
  className = "",
  rotate = -3,
}: {
  children: ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`doodle-note pointer-events-none inline-block select-none text-lg leading-none ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/** Section heading in the Crossline editorial voice. */
export function SketchHeading({
  eyebrow,
  title,
  copy,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col ${alignCls}`}>
      {eyebrow && (
        <p className="hand text-xl font-bold uppercase tracking-[0.25em] text-x">{eyebrow}</p>
      )}
      <h2 className="display mt-1 text-4xl sm:text-5xl">{title}</h2>
      <DoodleUnderline className="mt-1 h-3 w-40 text-x" />
      {copy && <p className="mt-3 max-w-md text-base font-semibold text-ink-soft">{copy}</p>}
    </div>
  );
}
