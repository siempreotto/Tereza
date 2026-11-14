"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Aviso = { msg: string; deshacer?: () => void | Promise<void>; k: number };
type Ctx = { avisar: (msg: string, deshacer?: () => void | Promise<void>) => void; cerrar: () => void };
const C = createContext<Ctx>({ avisar: () => {}, cerrar: () => {} });
export const useAviso = () => useContext(C);

/** «Guardé: …» con Deshacer: 7 s si hay deshacer, 4 s si no. Deshacer en vez de confirmar. */
export function Avisos({ children, alto }: { children: ReactNode; alto?: boolean }) {
  const [a, setA] = useState<Aviso | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cerrar = useCallback(() => { if (timer.current) clearTimeout(timer.current); setA(null); }, []);
  const avisar = useCallback((msg: string, deshacer?: () => void | Promise<void>) => {
    if (timer.current) clearTimeout(timer.current);
    setA({ msg, deshacer, k: Date.now() });
    timer.current = setTimeout(() => setA(null), deshacer ? 7000 : 4000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <C.Provider value={{ avisar, cerrar }}>
      {children}
      {a ? (
        <div key={a.k} className={`tz-toast${alto ? " high" : ""}`} role="status" aria-live="polite">
          <p className="text-body grow">{a.msg}</p>
          {a.deshacer ? (
            <button className="tz-btn tz-btn-ghost text-button" type="button" onClick={async () => { const f = a.deshacer!; cerrar(); await f(); }}>Deshacer</button>
          ) : (
            <button className="tz-iconbtn plain" type="button" aria-label="Cerrar aviso" onClick={cerrar}>×</button>
          )}
        </div>
      ) : null}
    </C.Provider>
  );
}
