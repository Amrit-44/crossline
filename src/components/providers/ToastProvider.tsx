"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastTone = "info" | "success" | "error";
interface Toast { id: number; message: string; tone: ToastTone }

interface ToastContextValue { show: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 3200;

const TONE_STYLES: Record<ToastTone, string> = {
  info: "border-ink",
  success: "border-success",
  error: "border-error",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.filter((t) => t.message !== message), { id, message, tone }].slice(-3));
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="toast-stack pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`card-flat animate-toast-in bg-surface px-4 py-2.5 text-sm font-extrabold shadow-float ${TONE_STYLES[toast.tone]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
