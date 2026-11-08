/* Tereza · prototipo — recorrido guiado: el día a día de Andrea, de la instalación a la consulta */
(function () {
  'use strict';
  const Z = window.TZ;
  const { html, Ic, Icon } = window.TZUI;
  const ML = Z.ML_OZ;

  const liveEv = s => s.events.filter(e => !e.deleted);
  const active = (s, type) => liveEv(s).find(e => e.type === type && !e.end);
  const mk = (type, start, end, payload, by, source) => ({ id: Z.uid('t'), type, start, end: end || null, payload: payload || {}, notes: '', by: by || 'andrea', source: source || 'web', deleted: null });
  const endActive = (st, type, at) => { const e = st.events.find(x => !x.deleted && x.type === type && !x.end); if (e) { if (type === 'toma_pecho') { e.payload.segIzq = (e.payload.segIzq || 0) + Math.round((at - (e.payload.since || e.start)) / 1000); e.payload.active = null; e.payload.since = null; } e.end = at; } };

  /* Cada paso: capítulo, título, texto, pista corta (para cuando hay una hoja abierta),
     target (qué resaltar), setup (prepara la escena), check (se cumple cuando el usuario lo hace),
     auto (lo que pasa si el usuario toca «Hacer por mí»). */
  const STEPS = [
    { ch: 'Primeros minutos', title: 'Andrea abre Tereza por primera vez', text: 'Lucía tiene 5 meses y Andrea acaba de instalar la app en su teléfono. Toca «Continuar con Google».', hint: 'Toca «Continuar con Google»', target: '.tz-main.solo .tz-btn-primary', setup: a => a.setClock(a.T(-1, 17, 30)), check: c => c.obStep >= 1, auto: a => a.setObStep(1) },
    { ch: 'Primeros minutos', title: 'Crea el hogar', text: 'Nombre del hogar, zona horaria de Guatemala y las unidades de casa: onzas para el biberón y libras para el peso. Toca «Continuar».', hint: 'Toca «Continuar»', target: '.tz-main.solo .tz-btn-primary', check: c => c.obStep >= 2, auto: a => a.setObStep(2) },
    { ch: 'Primeros minutos', title: 'El perfil de Lucía', text: 'Con la fecha de nacimiento y las semanas de gestación, Tereza calcula su edad (y la corregida si nació antes). Toca «Continuar».', hint: 'Toca «Continuar»', target: '.tz-main.solo .tz-btn-primary', check: c => c.obStep >= 3, auto: a => a.setObStep(3) },
    { ch: 'Primeros minutos', title: 'Sueño seguro', text: 'Antes de registrar nada, las tres pautas básicas para dormir. Léelas y toca «Entendido».', hint: 'Toca «Entendido»', target: '.tz-main.solo .tz-btn-primary', check: c => c.obStep >= 4, auto: a => a.setObStep(4) },
    { ch: 'Primeros minutos', title: 'Invita a Diego', text: 'Escribe un correo para Diego, deja el rol «Cuidador» y toca «Agregar invitación». Después, «Continuar».', hint: 'Agrega la invitación y toca «Continuar»', target: '#ob-m', check: c => c.obStep >= 5, auto: a => a.setObStep(5) },
    { ch: 'Primeros minutos', title: 'Claude, para después', text: 'Conectar Claude es opcional; Andrea lo hará más tarde. Toca «Listo, ir a Hoy».', hint: 'Toca «Listo, ir a Hoy»', target: '.tz-main.solo .tz-btn-primary', check: c => c.s.onboarded, auto: a => a.finishOnboarding() },

    { ch: 'Primer día', clock: [0, 6, 20], title: 'Lucía se despierta', text: 'Son las 6:20 a.m. Lo primero que ves es el estado: duerme desde la madrugada. Toca «Despertó» con el pulgar.', hint: 'Toca «Despertó»', target: '.tz-dock .tz-btn-primary',
      setup: a => { a.setClock(a.T(0, 6, 20)); a.update(st => { if (!active(st, 'sueno')) { const last = liveEv(st).filter(e => e.type === 'sueno').sort((x, y) => y.start - x.start)[0]; if (last) last.end = null; } }); a.go('hoy'); },
      check: c => !active(c.s, 'sueno'), auto: a => a.update(st => endActive(st, 'sueno', a.now())) },
    { ch: 'Primer día', title: 'Primera toma del día', text: 'Toca «Toma», elige «Pecho» y luego «Empezar toma». El temporizador se queda en Hoy.', hint: '«Pecho» → «Empezar toma»', target: '.tz-quick-btn:nth-child(2)',
      check: c => !!active(c.s, 'toma_pecho'), auto: a => a.update(st => { st.events.push(mk('toma_pecho', a.now(), null, { lado_inicial: 'izq', segIzq: 0, segDer: 0, active: 'izq', since: a.now() })); }) },
    { ch: 'Primer día', title: 'Cambia de lado y termina', text: 'Toca el recuadro «Derecho» para cambiar de lado y después «Terminar toma». Si algo sale mal, el aviso trae «Deshacer».', hint: 'Toca «Derecho» y luego «Terminar toma»', target: '.tz-dock .tz-btn-primary',
      check: c => !active(c.s, 'toma_pecho') && liveEv(c.s).some(e => e.type === 'toma_pecho' && e.end && e.start >= c.T(0, 6, 0)), auto: a => a.update(st => endActive(st, 'toma_pecho', a.now() + 14 * Z.MIN)) },
    { ch: 'Primer día', title: 'Cambio de pañal', text: 'Toca «Pañal» y luego «Ambos». Un solo toque lo guarda con la hora.', hint: 'Toca «Ambos»', target: '.tz-quick-btn:nth-child(3)',
      check: c => liveEv(c.s).some(e => e.type === 'panal' && e.start >= c.T(0, 6, 0)), auto: a => a.update(st => { st.events.push(mk('panal', a.now(), null, { mojado: true, sucio: true })); }) },
    { ch: 'Primer día', clock: [0, 8, 5], title: '¿Cuándo será la siesta?', text: 'Son las 8:05 a.m. La estimación usa su edad y sus últimos días; no es una regla. Toca «¿Por qué esta franja?» para ver de dónde sale.', hint: 'Lee la estimación', target: '.tz-card button[aria-expanded]', manual: true,
      setup: a => { a.setClock(a.T(0, 8, 5)); a.go('hoy'); } },
    { ch: 'Primer día', title: 'Inicia la siesta', text: 'Lucía se durmió en la cuna. Toca «Iniciar sueño»: un solo toque, sin formulario.', hint: 'Toca «Iniciar sueño»', target: '.tz-quick-btn:nth-child(1)',
      check: c => !!active(c.s, 'sueno'), auto: a => a.update(st => { st.events.push(mk('sueno', a.now(), null, { lugar: 'cuna', como: 'sola' })); }) },
    { ch: 'Primer día', clock: [0, 9, 0], title: 'Despierta de la siesta', text: 'Son las 9:00 a.m. Toca «Despertó» y mira en el aviso cuánto durmió.', hint: 'Toca «Despertó»', target: '.tz-dock .tz-btn-primary',
      setup: a => { a.setClock(a.T(0, 9, 0)); a.go('hoy'); }, check: c => !active(c.s, 'sueno'), auto: a => a.update(st => endActive(st, 'sueno', a.now())) },

    { ch: 'Diego desde Claude', clock: [0, 12, 40], title: 'Diego registró desde Claude', text: 'Andrea estuvo en reuniones. A las 12:25 Diego le escribió a Claude «le di 4 onzas de leche materna». Ya aparece en Hoy: ábrelo en la lista.', hint: 'Abre el biberón de Diego', target: '.tz-list .tz-logcard',
      setup: a => { a.setClock(a.T(0, 12, 40)); a.update(st => {
        st.events.push(mk('toma_pecho', a.T(0, 9, 10), a.T(0, 9, 26), { lado_inicial: 'der', segIzq: 7 * 60, segDer: 9 * 60 }, 'andrea'));
        st.events.push(mk('panal', a.T(0, 10, 15), null, { mojado: true, sucio: false }, 'diego'));
        st.events.push(mk('sueno', a.T(0, 10, 50), a.T(0, 12, 5), { lugar: 'carriola', como: 'arrullo' }, 'diego', 'mcp'));
        st.events.push(mk('toma_biberon', a.T(0, 12, 25), null, { contenido: 'materna', volumen_ml: Math.round(4 * ML), sobrante_ml: 0 }, 'diego', 'mcp'));
      }); a.go('hoy'); },
      check: c => c.route.view === 'evento', auto: a => { const e = liveEv(a.state()).filter(x => x.type === 'toma_biberon').sort((x, y) => y.start - x.start)[0]; if (e) a.go('evento', { id: e.id, from: 'hoy' }); } },
    { ch: 'Diego desde Claude', title: 'Quién y desde dónde', text: 'Cada registro guarda quién lo hizo y si fue desde la app o desde Claude. Diego olvidó lo que sobró: súbelo a 0.5 oz y toca «Guardar cambios».', hint: 'Corrige «Sobró» y guarda', target: '.tz-dock .tz-btn-primary',
      check: c => c.route.view !== 'evento', auto: a => { a.update(st => { const e = st.events.filter(x => !x.deleted && x.type === 'toma_biberon').sort((x, y) => y.start - x.start)[0]; if (e) e.payload.sobrante_ml = Math.round(0.5 * ML); }); a.go('hoy'); } },

    { ch: 'La primera noche', clock: [1, 3, 5], title: '3:05 a.m.: Lucía llora', text: 'El día siguió y Lucía se durmió a las 7:30 p.m. Mira la pantalla: el modo noche se activó solo, sin blanco ni brillo. Toca «Despertó».', hint: 'Toca «Despertó»', target: '.tz-dock .tz-btn-primary',
      setup: a => { a.update(st => {
        endActive(st, 'sueno', a.T(0, 12, 41)); endActive(st, 'toma_pecho', a.T(0, 12, 41));
        const add = (t, h1, m1, h2, m2, p, by, src) => st.events.push(mk(t, a.T(0, h1, m1), h2 == null ? null : a.T(0, h2, m2), p, by, src));
        add('toma_pecho', 13, 0, 13, 15, { lado_inicial: 'izq', segIzq: 8 * 60, segDer: 7 * 60 });
        add('panal', 13, 30, null, null, { mojado: true, sucio: false }, 'carmen');
        add('sueno', 15, 10, 15, 50, { lugar: 'brazos', como: 'arrullo' }, 'carmen');
        add('toma_biberon', 16, 20, null, null, { contenido: 'formula', volumen_ml: Math.round(3.5 * ML), sobrante_ml: 0 }, 'diego', 'mcp');
        add('panal', 17, 10, null, null, { mojado: true, sucio: true }, 'diego');
        add('toma_pecho', 19, 5, 19, 22, { lado_inicial: 'der', segIzq: 8 * 60, segDer: 9 * 60 });
        add('panal', 19, 15, null, null, { mojado: true, sucio: false });
        st.events.push(mk('sueno', a.T(0, 19, 30), null, { lugar: 'cuna', como: 'pecho' }));
        st.household.night = 'auto';
      }); a.setClock(a.T(1, 3, 5)); a.go('hoy'); },
      check: c => !active(c.s, 'sueno'), auto: a => a.update(st => endActive(st, 'sueno', a.now())) },
    { ch: 'La primera noche', title: 'Toma de madrugada', text: 'Con una mano: «Toma» → «Pecho» → «Empezar toma». Cuando termine, «Terminar toma».', hint: '«Pecho» → «Empezar toma», luego «Terminar toma»', target: '.tz-quick-btn:nth-child(2)',
      check: c => !active(c.s, 'toma_pecho') && liveEv(c.s).some(e => e.type === 'toma_pecho' && e.end && e.start >= c.T(1, 2, 0)),
      auto: a => a.update(st => { endActive(st, 'toma_pecho', a.now()); if (!liveEv(st).some(e => e.type === 'toma_pecho' && e.start >= a.T(1, 2, 0))) st.events.push(mk('toma_pecho', a.now(), a.now() + 15 * Z.MIN, { lado_inicial: 'izq', segIzq: 8 * 60, segDer: 7 * 60 })); }) },
    { ch: 'La primera noche', title: 'De vuelta a dormir', text: 'Toca «Iniciar sueño» y deja el teléfono. Todo quedó registrado sin encender la luz.', hint: 'Toca «Iniciar sueño»', target: '.tz-quick-btn:nth-child(1)',
      check: c => !!active(c.s, 'sueno'), auto: a => a.update(st => { st.events.push(mk('sueno', a.now(), null, { lugar: 'cuna', como: 'pecho' })); }) },

    { ch: 'Un día con fiebre', clock: [1, 9, 40], title: 'Lucía se siente caliente', text: 'Son las 9:40 a.m. Toca «+», elige «Temperatura o síntoma», súbela a 38.2 °C y guarda. Fíjate en la nota que aparece al pasar de 38 °C.', hint: 'Sube a 38.2 °C y guarda', target: '.tz-fab, .tz-side .tz-btn-primary',
      setup: a => { a.update(st => {
        endActive(st, 'sueno', a.T(1, 6, 10)); endActive(st, 'toma_pecho', a.T(1, 3, 20));
        st.events.push(mk('toma_pecho', a.T(1, 6, 15), a.T(1, 6, 33), { lado_inicial: 'der', segIzq: 8 * 60, segDer: 10 * 60 }));
        st.events.push(mk('panal', a.T(1, 6, 40), null, { mojado: true, sucio: false }));
        st.events.push(mk('sueno', a.T(1, 8, 0), a.T(1, 8, 50), { lugar: 'cuna', como: 'sola' }));
      }); a.setClock(a.T(1, 9, 40)); a.go('hoy'); },
      check: c => liveEv(c.s).some(e => e.type === 'temperatura' && e.payload.valor_c >= 38 && e.start >= c.T(1, 0, 0)),
      auto: a => a.update(st => { st.events.push(mk('temperatura', a.now(), null, { valor_c: 38.2, metodo: 'axilar' })); }) },
    { ch: 'Un día con fiebre', title: 'Anota una duda para la pediatra', text: 'Ve a «Salud», toca «Ver todas» en Dudas para la consulta, escribe tu pregunta (por ejemplo, sobre la fiebre) y agrégala.', hint: 'Salud › Dudas › escribe y agrega', target: '.tz-nav .tz-nav-item:nth-child(4), .tz-side-nav button:nth-child(3)',
      check: c => c.s.questions.some(q => !q.resolved && q.at >= c.startReal),
      auto: a => a.update(st => { st.questions.push({ id: Z.uid('q'), text: 'Tuvo 38.2 °C un día. ¿Cuándo debemos llamarte?', by: 'andrea', at: Date.now(), resolved: null }); }) },

    { ch: 'Día de consulta', clock: [2, 8, 0], title: 'Antes de salir: los patrones', text: 'Es el día de la consulta. Ve a «Más» › «Patrones de sueño»: cuándo durmió cada día y si está dentro de la referencia por edad.', hint: 'Más › Patrones de sueño', target: '.tz-nav .tz-nav-item:nth-child(5), .tz-side-nav button:nth-child(4)',
      setup: a => { a.update(st => {
        endActive(st, 'sueno', a.T(1, 9, 41)); endActive(st, 'toma_pecho', a.T(1, 9, 41));
        const add = (t, d1, h1, m1, d2, h2, m2, p, by, src) => st.events.push(mk(t, a.T(d1, h1, m1), d2 == null ? null : a.T(d2, h2, m2), p, by, src));
        add('toma_pecho', 1, 9, 45, 1, 10, 2, { lado_inicial: 'izq', segIzq: 9 * 60, segDer: 8 * 60 });
        add('sueno', 1, 10, 50, 1, 12, 10, { lugar: 'cuna', como: 'pecho' });
        add('toma_biberon', 1, 12, 30, null, 0, 0, { contenido: 'materna', volumen_ml: Math.round(3.5 * ML), sobrante_ml: Math.round(0.5 * ML) }, 'diego', 'mcp');
        add('temperatura', 1, 13, 30, null, 0, 0, { valor_c: 37.4, metodo: 'axilar' });
        add('panal', 1, 13, 0, null, 0, 0, { mojado: true, sucio: false });
        add('sueno', 1, 15, 0, 1, 15, 45, { lugar: 'brazos', como: 'arrullo' }, 'carmen');
        add('toma_pecho', 1, 16, 10, 1, 16, 25, { lado_inicial: 'der', segIzq: 7 * 60, segDer: 8 * 60 });
        add('panal', 1, 17, 0, null, 0, 0, { mojado: true, sucio: true }, 'diego');
        add('toma_pecho', 1, 19, 5, 1, 19, 22, { lado_inicial: 'izq', segIzq: 9 * 60, segDer: 8 * 60 });
        add('panal', 1, 19, 15, null, 0, 0, { mojado: true, sucio: false });
        add('sueno', 1, 19, 30, 2, 2, 50, { lugar: 'cuna', como: 'pecho' });
        add('toma_pecho', 2, 2, 50, 2, 3, 4, { lado_inicial: 'der', segIzq: 6 * 60, segDer: 8 * 60 });
        add('sueno', 2, 3, 10, 2, 6, 15, { lugar: 'cuna', como: 'pecho' });
        add('toma_pecho', 2, 6, 20, 2, 6, 38, { lado_inicial: 'izq', segIzq: 10 * 60, segDer: 8 * 60 });
        add('panal', 2, 6, 45, null, 0, 0, { mojado: true, sucio: true });
        add('medicamento', 2, 7, 0, null, 0, 0, { medId: 'm1', nombre: 'Vitamina D en gotas', cantidad: '1 gota', via: 'Oral' });
        st.household.night = 'auto';
      }); a.setClock(a.T(2, 8, 0)); a.go('hoy'); },
      check: c => c.route.view === 'patrones', auto: a => a.go('patrones') },
    { ch: 'Día de consulta', title: 'El resumen para la pediatra', text: 'Ve a «Salud» y toca «Resumen». Crecimiento, sueño, tomas, medicamentos, la fiebre y tus dudas, en una sola hoja que puedes copiar o compartir.', hint: 'Salud › Resumen', target: '.tz-nav .tz-nav-item:nth-child(4), .tz-side-nav button:nth-child(3)',
      check: c => c.route.view === 'resumenPediatra', auto: a => a.go('resumenPediatra') },
    { ch: 'Día de consulta', clock: [2, 10, 15], title: 'Registra el peso de la consulta', text: 'La pediatra pesó a Lucía. Toca «+» › «Medida de crecimiento», elige «Consulta», escribe 15.8 y guarda. El aviso te dice su percentil.', hint: 'Escribe 15.8 y guarda', target: '.tz-fab, .tz-side .tz-btn-primary',
      setup: a => { a.update(st => { if (!st.events.some(e => !e.deleted && e.type === 'sueno' && e.start >= a.T(2, 7, 0))) { st.events.push(mk('sueno', a.T(2, 8, 20), a.T(2, 9, 20), { lugar: 'carriola', como: 'arrullo' })); st.events.push(mk('toma_pecho', a.T(2, 9, 25), a.T(2, 9, 40), { lado_inicial: 'der', segIzq: 7 * 60, segDer: 8 * 60 })); } }); a.setClock(a.T(2, 10, 15)); a.mark('m', a.state().measurements.length); },
      check: c => c.s.measurements.length > (c.meta.m || 0),
      auto: a => a.update(st => { st.measurements.push({ id: Z.uid('w'), at: a.now(), weightG: Math.round(15.8 * Z.G_LB), lengthMm: null, headMm: null, origin: 'consulta' }); }) },
    { ch: 'Día de consulta', title: 'Invita a la abuela Carmen', text: 'Ve a «Más» › «Cuidadores y roles» › «Invitar», escribe un correo y elige «Limitado»: solo podrá registrar tomas, pañales y sueño, y ver el día de hoy.', hint: 'Invitar con rol «Limitado»', target: '.tz-nav .tz-nav-item:nth-child(5), .tz-side-nav button:nth-child(4)',
      check: c => c.s.invites.some(i => i.role === 'limitado' && i.at >= c.startReal),
      auto: a => a.update(st => { st.invites.push({ email: 'carmen@correo.com', role: 'limitado', at: Date.now() }); }) },
    { ch: 'Día de consulta', title: 'Así lo verá la abuela', text: 'Esta es la vista de Carmen con el rol limitado: el estado de Lucía, el registro rápido y lo de hoy. Nada de salud ni días anteriores.', hint: 'Vista de la abuela Carmen', manual: true,
      setup: a => { a.update(st => { if (!st.members.some(m => m.id === 'carmen')) st.members.push({ id: 'carmen', name: 'Abuela Carmen', role: 'limitado', claude: false }); st.me = 'carmen'; }); a.go('hoy'); } },
    { ch: 'Fin', title: 'Recorriste el día a día de Andrea', text: 'Alta, registros de un toque, lo que llega desde Claude, una noche a las 3 a.m., un día con fiebre y la consulta. Puedes repetir el recorrido o seguir usando la app libremente.', final: true,
      setup: a => { a.update(st => { st.me = 'andrea'; }); a.go('hoy'); } }
  ];

  function Panel({ tour, step, total, onSkip, onNext, onExit, onRestart, onMin, now, compact, solo }) {
    const st = STEPS[step];
    const ref = React.useRef(null);
    React.useLayoutEffect(() => {
      const el = ref.current; if (!el) return;
      const set = () => { try { document.documentElement.style.setProperty('--tour-h', el.offsetHeight + 'px'); } catch (e) { /* nada */ } };
      set();
      if (window.ResizeObserver) { const ro = new ResizeObserver(set); ro.observe(el); return () => ro.disconnect(); }
    });
    const n = step + 1;
    if (tour.min) return html`<button ref=${ref} type="button" className=${'tz-tour min' + (solo ? ' solo' : '')} onClick=${onMin} aria-label="Mostrar el recorrido guiado">
      <span className="tz-tour-dot" aria-hidden="true"></span><span className="text-label">Paso ${n} de ${total}</span><span className="text-body-sm grow" style=${{ textAlign: 'left' }}>${st.hint || st.title}</span>${Ic('chevdown', 18)}</button>`;
    if (compact) return html`<div ref=${ref} className=${'tz-tour min' + (solo ? ' solo' : '')} role="status"><span className="tz-tour-dot" aria-hidden="true"></span><span className="text-label">Paso ${n}</span><span className="text-body-sm grow">${tour.done ? 'Hecho' : (st.hint || st.title)}</span></div>`;
    return html`<section ref=${ref} className=${'tz-tour' + (solo ? ' solo' : '')} aria-label="Recorrido guiado" aria-live="polite">
      <div className="tz-h between" style=${{ gap: '8px' }}>
        <span className="text-label c-primary">${st.ch}${step >= 6 && !st.final ? ' · Día ' + (Math.round((Z.dayStart(now) - tour.day0) / Z.DAY) + 1) + ' · ' + Z.fTime(now) : ''}</span>
        <span className="tz-h s8">
          <button type="button" className="tz-iconbtn plain" style=${{ width: '36px', height: '36px' }} aria-label="Minimizar el recorrido" onClick=${onMin}>${Ic('minus', 18)}</button>
          <button type="button" className="tz-iconbtn plain" style=${{ width: '36px', height: '36px' }} aria-label="Salir del recorrido" onClick=${onExit}>${Ic('x', 18)}</button>
        </span>
      </div>
      <div style=${{ height: '4px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }} aria-hidden="true"><div style=${{ width: (n / total * 100) + '%', height: '100%', background: 'var(--primary)' }}></div></div>
      <p className="text-body-strong" style=${{ fontSize: '17px' }}>${tour.done ? html`<span className="c-growth" style=${{ marginRight: '6px' }}>${Icon('check', 18)}</span>` : null}${st.title}</p>
      <p className="text-body-sm">${st.text}</p>
      <div className="tz-h between">
        <span className="text-caption tz-muted">Paso ${n} de ${total}</span>
        ${st.final ? html`<span className="tz-h s8"><button type="button" className="tz-btn tz-btn-ghost text-button" style=${{ minHeight: '40px', padding: '0 12px' }} onClick=${onRestart}>Repetir</button><button type="button" className="tz-btn tz-btn-primary text-button" style=${{ minHeight: '40px' }} onClick=${onExit}>Usar la app</button></span>`
          : st.manual ? html`<button type="button" className="tz-btn tz-btn-primary text-button" style=${{ minHeight: '40px' }} onClick=${onNext}>Siguiente</button>`
          : html`<button type="button" className="tz-btn tz-btn-ghost text-button" style=${{ minHeight: '40px', padding: '0 12px' }} onClick=${onSkip} disabled=${tour.done}>Hacerlo por mí</button>`}
      </div>
    </section>`;
  }

  window.TZTOUR = { STEPS, Panel, mk };
})();
