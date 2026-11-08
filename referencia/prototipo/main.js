/* Tereza · prototipo — app, navegación y estado */
(function () {
  'use strict';
  const { useState, useEffect, useRef, useCallback } = React;
  const T = window.Tereza, Z = window.TZ;
  const { html, Ctx, SHEETS, Ic, Icon } = window.TZUI;
  const S1 = window.TZS1, S2 = window.TZS2;

  const VIEWS = {
    hoy: [S1.Hoy, 'hoy'], diario: [S1.Diario, 'diario'], evento: [S1.Evento, 'diario'],
    salud: [S2.Salud, 'salud'], crecimiento: [S2.Crecimiento, 'salud'], medicamentos: [S2.Medicamentos, 'salud'], pediatra: [S2.Pediatra, 'salud'],
    visita: [S2.Visita, 'salud'], dudas: [S2.Dudas, 'salud'], resumenPediatra: [S2.ResumenPediatra, 'salud'],
    mas: [S2.Mas, 'mas'], patrones: [S1.Patrones, 'mas'], resumen: [S1.Resumen, 'mas'], bebe: [S2.Bebe, 'mas'], cuidadores: [S2.Cuidadores, 'mas'],
    preferencias: [S2.Preferencias, 'mas'], notificaciones: [S2.Notificaciones, 'mas'], ventanas: [S2.Ventanas, 'mas'], claude: [S2.ClaudeScreen, 'mas'],
    datos: [S2.Datos, 'mas'], pruebas: [S2.Pruebas, 'mas']
  };
  const DOCKED = ['hoy', 'crecimiento', 'evento', 'bebe', 'ventanas'];
  const NAV = [{ key: 'hoy', label: 'Hoy', icon: 'home' }, { key: 'diario', label: 'Diario', icon: 'clock' }, { key: 'salud', label: 'Salud', icon: 'stethoscope' }, { key: 'mas', label: 'Más', icon: 'chart' }];
  const LIMITED_OK = ['hoy', 'mas'];
  const NO_NAV = ['evento', 'bebe', 'ventanas'];

  function inNight(h, now) {
    if (h.night === 'on') return true; if (h.night === 'off') return false;
    const d = new Date(now), m = d.getHours() * 60 + d.getMinutes();
    const [fh, fm] = h.nightFrom.split(':').map(Number), [th, tm] = h.nightTo.split(':').map(Number);
    const f = fh * 60 + fm, t = th * 60 + tm;
    return f > t ? (m >= f || m < t) : (m >= f && m < t);
  }

  function App() {
    const [s, setS] = useState(() => Z.load() || Z.seedState(Date.now()));
    const [now, setNow] = useState(Date.now());
    const [route, setRoute] = useState({ view: 'hoy', params: {} });
    const [sheet, setSheet] = useState(null);
    const [toastS, setToastS] = useState(null);
    const [loading, setLoading] = useState(true);
    const toastTimer = useRef(null);
    const toastAt = useRef(0);
    const [offset, setOffset] = useState(0);
    const offsetRef = useRef(0);
    const [obStep, setObStep] = useState(0);
    const [tour, setTour] = useState(null);
    const tourRef = useRef(null); tourRef.current = tour;
    const stateRef = useRef(s); stateRef.current = s;
    const TS = window.TZTOUR.STEPS;

    useEffect(() => { const t = setInterval(() => setNow(Date.now() + offsetRef.current), 1000); return () => clearInterval(t); }, []);
    useEffect(() => { offsetRef.current = offset; setNow(Date.now() + offset); }, [offset]);
    useEffect(() => { if (!tour) Z.save(s); }, [s, tour]);
    useEffect(() => { if (!loading) return; const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, [loading]);
    useEffect(() => { const k = e => { if (e.key === 'Escape') setSheet(null); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);

    const nightOn = inNight(s.household, now);
    const theme = nightOn ? 'noche' : 'light';
    useEffect(() => { document.body.classList.toggle('is-noche', nightOn); document.documentElement.style.colorScheme = nightOn ? 'dark' : 'light'; }, [nightOn]);

    const me = s.members.find(m => m.id === s.me) || s.members[0] || { role: 'admin' };
    const limited = me.role === 'limitado';

    const update = useCallback(fn => setS(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; }), []);
    const toast = useCallback((msg, undo) => {
      clearTimeout(toastTimer.current);
      toastAt.current = Date.now();
      setToastS({ msg, undo, k: Date.now() });
      toastTimer.current = setTimeout(() => setToastS(null), undo ? 7000 : 4000);
    }, []);
    const addEvent = (e, msg) => {
      if ((e.type === 'sueno' || e.type === 'toma_pecho') && !e.end) {
        const act = s.events.find(x => !x.deleted && x.type === e.type && !x.end);
        if (act) { toast('Ya hay ' + (e.type === 'sueno' ? 'un sueño' : 'una toma') + ' en curso desde las ' + Z.fTime(act.start) + '. No lo dupliqué.'); return; }
      }
      const ev = Object.assign({ id: Z.uid(), end: null, payload: {}, notes: '', by: s.me, source: 'web', deleted: null }, e, s.sim.offline ? { pending: true } : {});
      update(st => { st.events.push(ev); });
      toast((msg || Z.savedText(ev, s.household.units)) + (s.sim.offline ? ' · por enviar' : ''), () => update(st => { st.events = st.events.filter(x => x.id !== ev.id); }));
      return ev;
    };
    const deleteEvent = id => { update(st => { st.events.find(x => x.id === id).deleted = Date.now(); }); toast('Eliminé el registro', () => update(st => { st.events.find(x => x.id === id).deleted = null; })); };
    const go = (view, params) => {
      if (limited && !LIMITED_OK.includes(view)) view = 'hoy';
      setRoute({ view, params: params || {} }); setSheet(null);
      if (Date.now() - toastAt.current > 400) setToastS(null);
      try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
    };
    const openSheet = sh => { setToastS(null); setSheet(Object.assign({ k: Date.now() }, sh)); };
    const closeSheet = () => setSheet(null);
    const toggleNight = () => update(st => { st.household.night = nightOn ? 'off' : 'on'; });
    const finishOnboarding = (d, empty) => {
      if (tourRef.current) {
        const t = tourRef.current;
        d = d || { home: stateRef.current.household.name, units: stateRef.current.household.units, baby: stateRef.current.baby, invites: [] };
        const base = Z.seedState(t.day0 + 6 * Z.HOUR + 5 * Z.MIN, { onboarded: true });
        base.household.name = d.home; base.household.units = d.units; base.household.night = 'auto';
        base.baby = Object.assign({}, d.baby, { birth: base.baby.birth });
        base.invites = d.invites.length ? d.invites : [{ email: 'diego.m@correo.com', role: 'cuidador', at: Date.now() }];
        base.members = base.members.filter(m => m.id !== 'carmen');
        setS(base); setRoute({ view: 'hoy', params: {} });
        return;
      }
      const base = Z.seedState(Date.now(), { onboarded: true });
      base.household.name = d.home; base.household.units = d.units;
      base.baby = d.baby; base.invites = base.invites.concat(d.invites);
      const next = empty ? Object.assign(Z.emptyState(Date.now(), base), { invites: d.invites }) : base;
      setS(next); setRoute({ view: 'hoy', params: {} }); setLoading(true);
    };
    const resetAll = (onboarded, empty) => {
      const fresh = Z.seedState(Date.now(), { onboarded });
      setS(empty ? Z.emptyState(Date.now(), s) : fresh); setRoute({ view: 'hoy', params: {} }); setSheet(null);
    };

    /* ---------- Recorrido guiado ---------- */
    const startTour = () => {
      const day0 = Z.dayStart(Date.now());
      setTour({ i: 0, ready: false, done: false, day0, startReal: Date.now(), saved: stateRef.current, meta: {}, min: false });
      const fresh = Z.seedState(Date.now(), { onboarded: false });
      fresh.members = fresh.members.filter(m => m.id !== 'carmen'); fresh.invites = [];
      setS(fresh); setObStep(0); setOffset(0); setSheet(null); setToastS(null); setRoute({ view: 'hoy', params: {} });
      try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
    };
    const exitTour = () => {
      const t = tourRef.current; setTour(null); setOffset(0); setSheet(null); setToastS(null); setObStep(0);
      setS(t && t.saved && t.saved.onboarded ? t.saved : Z.seedState(Date.now(), { onboarded: true }));
      setRoute({ view: 'hoy', params: {} });
      try { if (location.hash === '#recorrido') history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* nada */ }
    };
    const api = {
      update, go, setObStep, finishOnboarding: () => finishOnboarding(null),
      setClock: ms => setOffset(ms - Date.now()),
      now: () => Date.now() + offsetRef.current,
      T: (d, h, m) => Z.at(Z.addDays(tourRef.current.day0, d), h, m),
      state: () => stateRef.current,
      mark: (k, v) => setTour(t => t && Object.assign({}, t, { meta: Object.assign({}, t.meta, { [k]: v }) }))
    };
    const advance = () => setTour(t => t && Object.assign({}, t, { i: Math.min(t.i + 1, TS.length - 1), ready: false, done: false }));
    useEffect(() => {
      if (!tour || tour.ready) return;
      const st = TS[tour.i];
      setSheet(null);
      if (st.setup) st.setup(api);
      setTour(t => t && Object.assign({}, t, { ready: true }));
    }, [tour && tour.i, tour && tour.ready]);
    useEffect(() => {
      if (!tour || !tour.ready || tour.done) return;
      const st = TS[tour.i];
      if (!st.check) return;
      const c = { s, route, sheet, obStep, now, meta: tour.meta, startReal: tour.startReal, T: api.T };
      let ok = false; try { ok = st.check(c); } catch (e) { ok = false; }
      if (ok) { setTour(t => t && Object.assign({}, t, { done: true })); setTimeout(advance, 900); }
    }, [s, route, sheet, obStep, tour && tour.i, tour && tour.ready]);
    const skipStep = () => { const st = TS[tour.i]; setTour(t => Object.assign({}, t, { done: true })); setSheet(null); if (st.auto) st.auto(api); setTimeout(advance, 600); };
    useEffect(() => {
      document.querySelectorAll('.tz-tour-target').forEach(e => e.classList.remove('tz-tour-target'));
      if (!tour || sheet || tour.done) return;
      const st = TS[tour.i]; if (!st.target) return;
      const el = Array.prototype.slice.call(document.querySelectorAll(st.target)).find(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      if (el) el.classList.add('tz-tour-target');
    });
    useEffect(() => { try { if (location.hash === '#recorrido') startTour(); } catch (e) { /* nada */ } }, []);

    const ctx = { s, now, update, toast, addEvent, deleteEvent, go, openSheet, closeSheet, params: route.params, view: route.view, nightOn, toggleNight, limited, loading: loading && !tour, setLoading, finishOnboarding, resetAll, obStep, setObStep, startTour, touring: !!tour };
    const panel = tour ? html`<${window.TZTOUR.Panel} tour=${tour} step=${tour.i} total=${TS.length} now=${now} compact=${!!sheet} solo=${!s.onboarded}
      onSkip=${skipStep} onNext=${advance} onExit=${exitTour} onRestart=${startTour} onMin=${() => setTour(t => Object.assign({}, t, { min: !t.min }))} />` : null;
    const screenCls = 'tz-screen' + (tour ? (tour.min || sheet ? ' touring-min' : ' touring') : '');

    if (!s.onboarded) {
      return html`<${Ctx.Provider} value=${ctx}><div className=${screenCls} data-theme=${theme}><${S2.Onboarding} />${panel}</div><//>`;
    }

    const entry = VIEWS[route.view] || VIEWS.hoy;
    const Screen = entry[0], tab = entry[1];
    const nav = limited ? NAV.filter(n => LIMITED_OK.includes(n.key)) : NAV;
    const SheetC = sheet ? SHEETS[sheet.type] : null;

    return html`<${Ctx.Provider} value=${ctx}>
      <div className=${screenCls} data-theme=${theme}>
        ${panel}
        <div className="tz-app">
          <aside className="tz-side">
            <p className="tz-logo">Tereza</p>
            <button type="button" className="tz-baby" onClick=${() => !limited && go('bebe')}><span className="tz-avatar">${s.baby.name.charAt(0)}</span><span className="tz-stack" style=${{ gap: 0, textAlign: 'left' }}><span className="text-body-strong">${s.baby.name}</span><span className="text-body-sm tz-muted">${Z.ageText(s.baby.birth, now)}</span></span></button>
            <${T.Button} variant="primary" icon="plus" block=${true} onClick=${() => openSheet({ type: 'add' })}>Registrar<//>
            <nav className="tz-side-nav" aria-label="Principal">
              ${nav.map(n => html`<button key=${n.key} type="button" className=${'tz-side-link' + (tab === n.key ? ' on' : '')} aria-current=${tab === n.key ? 'page' : undefined} style=${{ background: tab === n.key ? undefined : 'transparent', border: 0, cursor: 'pointer', width: '100%' }} onClick=${() => go(n.key)}>${Icon(n.icon, 22)}${n.label}</button>`)}
            </nav>
            <div className="tz-side-foot"><span className="tz-avatar sm">${me.name.charAt(0)}</span><span className="text-body-sm">${me.name} · ${window.TZUI.ROLE_N[me.role]}</span></div>
          </aside>
          <${Screen} key=${route.view + JSON.stringify(route.params)} />
          ${NO_NAV.includes(route.view) ? null : html`<div className="tz-bottom"><${T.BottomNav} items=${nav} active=${tab} addLabel="Registrar" onSelect=${k => go(k)} onAdd=${() => openSheet({ type: 'add' })} /></div>`}
        </div>
        ${SheetC ? html`<${SheetC} key=${sheet.k} sheet=${sheet} />` : null}
        ${toastS && !sheet ? html`<div key=${toastS.k} className=${'tz-toast' + (DOCKED.includes(route.view) ? (NO_NAV.includes(route.view) ? ' mid' : ' high') : '')} role="status" aria-live="polite">
          <p className="text-body grow">${toastS.msg}</p>
          ${toastS.undo ? html`<button className="tz-btn tz-btn-ghost text-button" type="button" onClick=${() => { toastS.undo(); setToastS(null); }}>${Ic('undo', 20)}<span>Deshacer</span></button>` : html`<button className="tz-iconbtn plain" type="button" aria-label="Cerrar aviso" onClick=${() => setToastS(null)}>${Ic('x', 20)}</button>`}
        </div>` : null}
      </div>
    <//>`;
  }

  const root = ReactDOM.createRoot(document.getElementById('app'));
  root.render(html`<${App} />`);
})();
