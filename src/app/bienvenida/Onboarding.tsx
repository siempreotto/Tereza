"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, CategoryIcon, Icon } from "@/components/tz";
import { Field, RolePicker, Seg, Stepper, ROL_NOMBRE, type RolMiembro } from "@/components/tz/forms";
import { crearHogarYBebe, crearInvitacion } from "@/lib/acciones/hogar";
import { ZONAS, zonaDelDispositivo } from "@/lib/zonas";

const TOTAL = 5;

function Barras({ paso }: { paso: number }) {
  return (
    <div className="tz-stack s8">
      <div className="tz-h s8" role="img" aria-label={`Paso ${paso} de ${TOTAL}`}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i < paso ? "var(--primary)" : "var(--track)" }} />
        ))}
      </div>
      <p className="text-label tz-muted">Paso {paso} de {TOTAL}{paso >= 4 ? " · opcional" : ""}</p>
    </div>
  );
}

type Invitado = { email: string; rol: RolMiembro; enlace: string };

export function Onboarding({ pasoInicial }: { pasoInicial: number }) {
  const router = useRouter();
  const [paso, setPaso] = useState(pasoInicial);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Paso 1: hogar
  const [tuNombre, setTuNombre] = useState("");
  const [hogar, setHogar] = useState("");
  const [zona, setZona] = useState(zonaDelDispositivo);
  const [vol, setVol] = useState<"ml" | "oz">("oz");
  const [peso, setPeso] = useState<"kg" | "lb">("lb");
  const [lon, setLon] = useState<"cm" | "in">("in");
  // Paso 2: bebé
  const [nombre, setNombre] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [prematuro, setPrematuro] = useState<"no" | "si">("no");
  const [semanas, setSemanas] = useState(34);
  const [sexo, setSexo] = useState<"F" | "M">("F");
  // Paso 4: invitar
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<RolMiembro>("cuidador");
  const [invitados, setInvitados] = useState<Invitado[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);

  const guardarHogar = async () => {
    setOcupado(true);
    setError(null);
    const r = await crearHogarYBebe({
      tuNombre, hogar, zona, unidadVolumen: vol, unidadPeso: peso, unidadLongitud: lon,
      bebe: { nombre, fechaNacimiento: nacimiento, semanasGestacion: prematuro === "si" ? semanas : null, sexo },
    });
    setOcupado(false);
    if (!r.ok) return setError(r.error);
    setPaso(3);
  };

  const invitar = async () => {
    setOcupado(true);
    setError(null);
    const r = await crearInvitacion({ email: correo, rol });
    setOcupado(false);
    if (!r.ok) return setError(r.error);
    setInvitados((l) => [...l, { email: r.data.email, rol, enlace: r.data.enlace }]);
    setCorreo("");
  };

  const compartir = async (i: Invitado) => {
    const texto = `Te invito a Tereza para registrar juntos el día del bebé. Entra con ${i.email}:`;
    try {
      if (navigator.share) await navigator.share({ title: "Invitación a Tereza", text: texto, url: i.enlace });
      else {
        await navigator.clipboard.writeText(i.enlace);
        setCopiado(i.enlace);
      }
    } catch {
      /* el usuario cerró el menú de compartir */
    }
  };

  const atras = (n: number) => (
    <button className="tz-iconbtn" type="button" aria-label="Volver" onClick={() => { setError(null); setPaso(n); }}>
      <Icon name="chevron-left" />
    </button>
  );
  const errorMsg = error ? <p role="alert" className="text-body-sm c-danger">{error}</p> : null;

  if (paso === 1)
    return (
      <>
        <Barras paso={1} />
        <div className="tz-stack s8">
          <h1 className="text-title-lg">Tu hogar</h1>
          <p className="text-body tz-muted">Así se llamará el espacio que compartes con quienes cuidan a tu bebé.</p>
        </div>
        <Field label="¿Cómo te llamas?" id="ob-yo" help="Así te verán los demás cuidadores.">
          <input id="ob-yo" className="tz-input" autoComplete="given-name" value={tuNombre} onChange={(e) => setTuNombre(e.target.value)} />
        </Field>
        <Field label="Nombre del hogar" id="ob-h">
          <input id="ob-h" className="tz-input" placeholder="Ej.: Casa de Lucía" value={hogar} onChange={(e) => setHogar(e.target.value)} />
        </Field>
        <Field label="Zona horaria" id="ob-z" help="Las horas como «a las 2» se interpretan con ella.">
          <select id="ob-z" className="tz-input" value={zona} onChange={(e) => setZona(e.target.value)}>
            {ZONAS.map((z) => <option key={z.id} value={z.id}>{z.l}</option>)}
          </select>
        </Field>
        <div className="tz-stack s8">
          <span className="tz-lbl">Unidades</span>
          <div className="tz-h between"><span className="text-body">Biberón</span><Seg label="Biberón" style={{ width: 168 }} value={vol} onChange={setVol} options={[{ v: "ml", l: "ml" }, { v: "oz", l: "oz" }]} /></div>
          <div className="tz-h between"><span className="text-body">Peso</span><Seg label="Peso" style={{ width: 168 }} value={peso} onChange={setPeso} options={[{ v: "kg", l: "kg" }, { v: "lb", l: "lb y oz" }]} /></div>
          <div className="tz-h between"><span className="text-body">Longitud</span><Seg label="Longitud" style={{ width: 168 }} value={lon} onChange={setLon} options={[{ v: "cm", l: "cm" }, { v: "in", l: "in" }]} /></div>
          <span className="tz-help">La temperatura se muestra en °C.</span>
        </div>
        <div className="tz-stack" style={{ marginTop: "auto" }}>
          {errorMsg}
          <Button variant="primary" size="lg" block disabled={!tuNombre.trim() || !hogar.trim()} onClick={() => { setError(null); setPaso(2); }}>Continuar</Button>
        </div>
      </>
    );

  if (paso === 2)
    return (
      <>
        <Barras paso={2} />
        <div className="tz-stack s4">
          <h1 className="text-title-lg">Tu bebé</h1>
          <p className="text-body-sm tz-muted">Solo lo ve tu hogar.</p>
        </div>
        <Field label="Nombre" id="ob-n">
          <input id="ob-n" className="tz-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Fecha de nacimiento" id="ob-b">
          <input id="ob-b" type="date" className="tz-input" max={hoy} value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} />
        </Field>
        <Field label="¿Nació antes de las 37 semanas?" help="Si nació antes, usamos su edad corregida para el crecimiento y las estimaciones hasta los 2 años.">
          <Seg label="Nació antes de las 37 semanas" value={prematuro} onChange={setPrematuro} options={[{ v: "no", l: "No" }, { v: "si", l: "Sí" }]} />
        </Field>
        {prematuro === "si" ? (
          <Field label="Semanas de gestación">
            <Stepper label="una semana" value={semanas} unit="semanas" onDec={() => setSemanas(Math.max(22, semanas - 1))} onInc={() => setSemanas(Math.min(36, semanas + 1))} />
          </Field>
        ) : null}
        <Field label="Curvas de crecimiento" help="Solo sirve para elegir las curvas de la OMS.">
          <Seg label="Curvas de crecimiento" value={sexo} onChange={setSexo} options={[{ v: "F", l: "Niña" }, { v: "M", l: "Niño" }]} />
        </Field>
        <div className="tz-stack" style={{ marginTop: "auto" }}>
          {errorMsg}
          <div className="tz-h s8">
            {atras(1)}
            <Button variant="primary" size="lg" block disabled={!nombre.trim() || !nacimiento || ocupado} onClick={guardarHogar}>{ocupado ? "Guardando…" : "Continuar"}</Button>
          </div>
        </div>
      </>
    );

  if (paso === 3)
    return (
      <>
        <Barras paso={3} />
        <div className="tz-stack s8">
          <CategoryIcon category="sleep" size="lg" />
          <h1 className="text-title-lg">Antes de empezar: sueño seguro</h1>
          <p className="text-body tz-muted">Tres pautas básicas para cada siesta y cada noche.</p>
        </div>
        <ol className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {[
            ["Boca arriba, siempre", "En siestas y en la noche, durante su primer año."],
            ["Superficie firme y plana", "Colchón firme con sábana ajustable, sin inclinarlo."],
            ["Cuna despejada", "Sin almohadas, cobijas sueltas, peluches ni protectores."],
          ].map(([t, d], i) => (
            <li key={t} className="tz-row" style={{ alignItems: "flex-start", padding: 16 }}>
              <span className="tz-avatar sm" aria-hidden>{i + 1}</span>
              <span className="grow"><span className="text-body-strong">{t}</span><span className="text-body-sm tz-muted">{d}</span></span>
            </li>
          ))}
        </ol>
        <p className="text-body-sm tz-muted">Basado en las recomendaciones de la Academia Americana de Pediatría. Si tienes dudas, consulta a tu pediatra.</p>
        <div className="tz-stack" style={{ marginTop: "auto" }}>
          <Button variant="primary" size="lg" block onClick={() => setPaso(4)}>Entendido</Button>
        </div>
      </>
    );

  if (paso === 4)
    return (
      <>
        <div className="tz-h between">
          <div className="grow"><Barras paso={4} /></div>
          <button type="button" className="tz-link" style={{ marginLeft: 16, background: "none", border: 0, cursor: "pointer" }} onClick={() => setPaso(5)}>Saltar</button>
        </div>
        <div className="tz-stack s8">
          <h1 className="text-title-lg">Invita a quien cuida</h1>
          <p className="text-body tz-muted">Cada persona entra con su propia cuenta y ve solo lo que su rol permite. Te damos un enlace para mandárselo por WhatsApp o correo.</p>
        </div>
        <Field label="Correo de la persona" id="ob-m" help="Tiene que entrar con este mismo correo.">
          <input id="ob-m" type="email" inputMode="email" className="tz-input" placeholder="nombre@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Field>
        <Field label="Rol"><RolePicker value={rol} onChange={setRol} /></Field>
        {invitados.length ? (
          <ul className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }} aria-label="Invitaciones creadas">
            {invitados.map((i) => (
              <li key={i.enlace} className="tz-row">
                <span className="grow"><span className="text-body-strong">{i.email}</span><span className="text-body-sm tz-muted">{ROL_NOMBRE[i.rol]} · vence en 7 días</span></span>
                <Button variant="ghost" onClick={() => compartir(i)}>{copiado === i.enlace ? "Copiado" : "Compartir enlace"}</Button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="tz-stack" style={{ marginTop: "auto" }}>
          {errorMsg}
          <Button variant="glass" size="lg" block disabled={!/.+@.+\..+/.test(correo) || ocupado} onClick={invitar}>{ocupado ? "Creando…" : "Crear invitación"}</Button>
          <div className="tz-h s8">{atras(3)}<Button variant="primary" size="lg" block onClick={() => setPaso(5)}>Continuar</Button></div>
        </div>
      </>
    );

  return (
    <>
      <Barras paso={5} />
      <div className="tz-stack s8">
        <h1 className="text-title-lg">Registra hablando con Claude</h1>
        <p className="text-body tz-muted">Muy pronto podrás agregar Tereza como conector en Claude, en la web o en el celular, y escribir como le hablarías a otra persona. Te avisaremos en Más › Conexión con Claude.</p>
      </div>
      <div className="tz-stack s8" aria-label="Ejemplo de conversación">
        <p className="text-body" style={{ alignSelf: "flex-end", maxWidth: "80%", padding: "10px 14px", borderRadius: "18px 18px 4px 18px", background: "var(--primary-soft)", color: "var(--primary-ink)" }}>Tomó 4 oz a las 2 y se durmió a mitad</p>
        <div className="tz-card tz-glass tz-stack s4" style={{ maxWidth: "92%", borderRadius: "18px 18px 18px 4px", padding: "12px 14px" }}>
          <p className="text-body">Guardé: biberón de 4 oz a las 2:00 p.m. e inicié su sueño a las 2:10 p.m.</p>
          <p className="text-body-sm tz-muted">Tomé «las 2» como de la tarde. Si fue de madrugada, dímelo y lo corrijo.</p>
        </div>
      </div>
      <div className="tz-stack" style={{ marginTop: "auto" }}>
        <Button variant="primary" size="lg" block onClick={() => { router.replace("/"); router.refresh(); }}>Listo, ir a Hoy</Button>
      </div>
    </>
  );
}
