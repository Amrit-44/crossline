"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
  labelledBy?: string;
  /** When true, the backdrop and Escape do nothing (e.g. blocking result). */
  persistent?: boolean;
}

export function Modal({ open, onClose, title, children, persistent }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])");
    (focusable ?? panel)?.focus();
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !persistent) onClose?.();
      if (event.key === "Tab" && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])")).filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose, persistent]);

  if (!open) return null;

  return (
    <div
      className="modal-wrap fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (!persistent && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="modal-panel card animate-pop-in w-full max-w-md p-6 outline-none sm:p-8"
      >
        {children}
      </div>
    </div>
  );
}
