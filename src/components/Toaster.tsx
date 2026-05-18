"use client";

import { useEffect, useState } from "react";

// Lightweight toast system using window CustomEvents.
// Trigger toasts anywhere with: window.dispatchEvent(new CustomEvent("toast", { detail: { message, type }}))
type ToastType = "info" | "success" | "error";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<{ message: string; type?: ToastType }>;
      const id = Date.now() + Math.random();
      const t: Toast = { id, message: ce.detail.message, type: ce.detail.type || "info" };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
    }
    window.addEventListener("toast", handler);
    return () => window.removeEventListener("toast", handler);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md max-w-sm animate-slide-up text-sm
          ${
            t.type === "error"
              ? "bg-red-500/15 border-red-500/30 text-red-100"
              : t.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-100"
                : "bg-white/10 border-white/15 text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function toast(message: string, type: "info" | "success" | "error" = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("toast", { detail: { message, type } }));
}
