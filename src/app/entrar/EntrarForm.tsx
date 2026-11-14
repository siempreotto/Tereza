"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tz";
import { supabaseBrowser } from "@/lib/supabase/client";

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function EntrarForm({ next, errorEnlace }: { next: string; errorEnlace: boolean }) {
  const router = useRouter();
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(errorEnlace ? "El enlace ya no sirve (vence en una hora o ya se usó). Pide uno nuevo." : null);

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    const c = correo.trim().toLowerCase();
    if (!CORREO.test(c)) return setError("Revisa el correo: falta la @ o el dominio.");
    setOcupado(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithOtp({
      email: c,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/confirmar?next=${encodeURIComponent(next)}` },
    });
    setOcupado(false);
    if (err) {
      setError(err.status === 429 ? "Mandamos varios correos seguidos. Espera un minuto y vuelve a intentarlo." : "No pudimos mandar el correo. Revisa tu conexión y vuelve a intentarlo.");
      return;
    }
    setPaso("codigo");
  };

  // Google vuelve a /auth/confirmar con ?code (PKCE) y de ahí a donde ibas.
  const google = async () => {
    setOcupado(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/confirmar?next=${encodeURIComponent(next)}` },
    });
    if (err) { setOcupado(false); setError("No pudimos abrir Google. Vuelve a intentarlo o entra con tu correo."); }
  };

  const verificar = async (e: FormEvent) => {
    e.preventDefault();
    const token = codigo.replace(/\D/g, "");
    if (token.length < 6) return setError("El código tiene 6 dígitos.");
    setOcupado(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.verifyOtp({ email: correo.trim().toLowerCase(), token, type: "email" });
    if (err) {
      setOcupado(false);
      setError("Ese código no coincide o ya venció. Revisa el último correo o pide uno nuevo.");
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <>
      <p className="tz-logo" style={{ padding: 0 }}>Tereza</p>
      <div className="tz-stack s16" style={{ marginTop: 24 }}>
        <h1 className="text-display">El día de tu bebé, a un toque.</h1>
        <p className="text-body-lg tz-muted">
          Registra sueño, tomas, pañales y salud con una mano, también a las 3 de la mañana. Comparte con quien cuida y consulta todo desde Claude cuando quieras.
        </p>
      </div>

      {paso === "correo" ? (
        <form className="tz-stack" style={{ marginTop: "auto" }} onSubmit={enviar} noValidate>
          <div className="tz-field">
            <label className="tz-lbl" htmlFor="correo">Tu correo</label>
            <input id="correo" className="tz-input" type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com"
              value={correo} onChange={(e) => setCorreo(e.target.value)} aria-describedby={error ? "entrar-error" : undefined} />
          </div>
          {error ? <p id="entrar-error" role="alert" className="text-body-sm c-danger">{error}</p> : null}
          <Button type="submit" variant="primary" size="lg" block disabled={ocupado}>{ocupado ? "Enviando…" : "Continuar con mi correo"}</Button>
          <Button variant="glass" size="lg" block disabled={ocupado} onClick={google}>Continuar con Google</Button>
        </form>
      ) : (
        <form className="tz-stack" style={{ marginTop: "auto" }} onSubmit={verificar} noValidate>
          <div className="tz-stack s4">
            <h2 className="text-title">Revisa tu correo</h2>
            <p className="text-body tz-muted">Te mandamos un código de 6 dígitos a <strong>{correo.trim().toLowerCase()}</strong>. También puedes tocar el enlace del correo en este mismo teléfono.</p>
          </div>
          <div className="tz-field">
            <label className="tz-lbl" htmlFor="codigo">Código</label>
            <input id="codigo" className="tz-input tz-num" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="123456"
              value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ letterSpacing: "0.3em", fontSize: 22 }} />
          </div>
          {error ? <p role="alert" className="text-body-sm c-danger">{error}</p> : null}
          <Button type="submit" variant="primary" size="lg" block disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar"}</Button>
          <div className="tz-h between">
            <button type="button" className="tz-link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => { setPaso("correo"); setCodigo(""); setError(null); }}>Usar otro correo</button>
            <button type="button" className="tz-link" style={{ background: "none", border: 0, cursor: "pointer" }} disabled={ocupado} onClick={() => enviar()}>Mandar otro código</button>
          </div>
        </form>
      )}
    </>
  );
}
