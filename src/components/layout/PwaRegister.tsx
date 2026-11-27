"use client";

import { useEffect } from "react";

/** Registra el Service Worker de la PWA en navegadores compatibles. */
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registro silencioso: la app sigue operando normalmente si falla
      });
    }
  }, []);

  return null;
}
