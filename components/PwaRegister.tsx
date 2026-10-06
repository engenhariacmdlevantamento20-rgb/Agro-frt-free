"use client";
import { useEffect } from "react";

/** Registra o service worker (casca do app e página offline). */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
