"use client";
import { useState } from "react";

/** Copia el resumen como texto, o lo comparte si el teléfono lo permite; y permite imprimirlo. */
export function Copiar({ texto }: { texto: string }) {
  const [hecho, setHecho] = useState(false);
  const copiar = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Resumen para el pediatra", text: texto });
      else { await navigator.clipboard.writeText(texto); setHecho(true); setTimeout(() => setHecho(false), 3000); }
    } catch { /* cancelado */ }
  };
  return (
    <>
      <button type="button" className="tz-btn tz-btn-glass text-button" onClick={copiar}>{hecho ? "Copiado" : "Compartir o copiar"}</button>
      <button type="button" className="tz-btn tz-btn-ghost text-button" onClick={() => window.print()}>Imprimir</button>
    </>
  );
}
