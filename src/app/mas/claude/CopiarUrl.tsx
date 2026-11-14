"use client";
import { useState } from "react";

export function CopiarUrl({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="tz-btn tz-btn-ghost text-button" onClick={() => navigator.clipboard?.writeText(texto).then(() => setOk(true))}>{ok ? "Copiada" : "Copiar"}</button>;
}
