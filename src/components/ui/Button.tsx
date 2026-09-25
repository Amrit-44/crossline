"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, PointerEvent, ReactNode } from "react";
import { useSettings } from "@/components/providers/SettingsProvider";

export type ButtonVariant = "play" | "red" | "blue" | "gold" | "neutral" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-7 text-lg",
  xl: "min-h-16 px-10 text-2xl tracking-wide",
};

const classes = (variant: ButtonVariant, size: ButtonSize, extra?: string) =>
  `btn btn-${variant} ${SIZE_CLASSES[size]} ${extra ?? ""}`;

/** Lets the CSS highlight follow the pointer (cheap: two custom properties). */
function trackPointer(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  silent?: boolean;
  children: ReactNode;
}

export function Button({ variant = "neutral", size = "md", className, silent, onClick, children, ...rest }: ButtonProps) {
  const { play } = useSettings();
  return (
    <button
      type="button"
      className={classes(variant, size, className)}
      onPointerMove={trackPointer}
      onClick={(event) => {
        if (!silent) play("click");
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function LinkButton({ href, variant = "neutral", size = "md", className, children, ...rest }: LinkButtonProps) {
  const { play } = useSettings();
  return (
    <Link
      href={href}
      className={classes(variant, size, className)}
      onPointerMove={trackPointer}
      onClick={() => play("click")}
      {...rest}
    >
      {children}
    </Link>
  );
}
