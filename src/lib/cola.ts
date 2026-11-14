"use client";
// Cola offline: crear eventos y cerrar temporizadores sin red. Vive en este dispositivo (localStorage) y se
// reenvía al volver la conexión. Cada creación lleva client_op_id, así el reenvío nunca duplica.
import type { RegistrarInput } from "@/lib/acciones/eventos";

export type OpCola =
  | { id: string; kind: "registrar"; userId: string; creadaEn: number; input: RegistrarInput }
  | { id: string; kind: "terminar"; userId: string; creadaEn: number; input: { babyId: string; tipo: "sueno" | "toma_pecho" | "extraccion"; fin: string; payload?: Record<string, unknown>; notas?: string | null } };

const CLAVE = "tereza:cola";
const EVENTO = "tereza:cola-cambio";

export function leerCola(): OpCola[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as OpCola[]; } catch { return []; }
}
function guardar(l: OpCola[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* sin almacenamiento: se pierde al cerrar */ }
  window.dispatchEvent(new Event(EVENTO));
}
export const encolar = (op: OpCola) => guardar([...leerCola(), op]);
export const quitar = (id: string) => guardar(leerCola().filter((o) => o.id !== id));
export const vaciarCola = () => guardar([]);

export function suscribirCola(fn: () => void) {
  window.addEventListener(EVENTO, fn);
  window.addEventListener("storage", fn);
  return () => { window.removeEventListener(EVENTO, fn); window.removeEventListener("storage", fn); };
}

/** ¿El fallo fue por falta de red (y no un error de validación del servidor)? */
export function esErrorDeRed(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const m = e instanceof Error ? e.message : String(e);
  return /fetch|network|Failed to|Load failed|NetworkError|conexi/i.test(m);
}

export const nuevoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`.replace(/\./g, ""));
