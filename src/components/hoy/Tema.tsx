"use client";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

const suscribir = () => () => {};
function leerManual(): "auto" | "on" | "off" | null {
  try { const v = localStorage.getItem("tereza.noche"); return v === "on" || v === "off" || v === "auto" ? v : null; } catch { return null; }
}
import { enVentana } from "@/lib/core/tiempo";

type Ctx = { noche: boolean; alternar: () => void; manual: "auto" | "on" | "off" };
const C = createContext<Ctx>({ noche: false, alternar: () => {}, manual: "auto" });
export const useTema = () => useContext(C);

/** Modo noche: automático por horario del hogar (en su zona) o manual (guardado en este dispositivo). */
export function Tema({ modo, desde, hasta, tz, children }: { modo: "auto" | "on" | "off"; desde: string; hasta: string; tz: string; children: ReactNode }) {
  // La preferencia manual de este dispositivo se lee en el primer render del cliente (useSyncExternalStore evita el parpadeo).
  const guardado = useSyncExternalStore(suscribir, leerManual, () => null);
  const [manual, setManual] = useState<"auto" | "on" | "off" | null>(null);
  const efectivo = manual ?? guardado ?? modo;
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const noche = efectivo === "on" ? true : efectivo === "off" ? false : enVentana(tick, desde, hasta, tz);
  useEffect(() => {
    document.documentElement.dataset.theme = noche ? "noche" : "light";
    document.documentElement.style.colorScheme = noche ? "dark" : "light";
  }, [noche]);
  const ctx = useMemo<Ctx>(() => ({
    noche, manual: efectivo,
    alternar: () => {
      const n = noche ? "off" : "on";
      setManual(n);
      try { localStorage.setItem("tereza.noche", n); } catch { /* nada */ }
    },
  }), [noche, efectivo]);
  return <C.Provider value={ctx}><div className="tz-screen" data-theme={noche ? "noche" : "light"}>{children}</div></C.Provider>;
}
