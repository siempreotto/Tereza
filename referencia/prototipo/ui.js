/* Tereza · prototipo — piezas compartidas y hojas de registro */
(function () {
  'use strict';
  const { useState, useContext, useMemo } = React;
  const html = htm.bind(React.createElement);
  const T = window.Tereza;
  const Z = window.TZ;
  const Ctx = React.createContext(null);
  const useApp = () => useContext(Ctx);

  const Icon = (name, size) => html`<${T.Icon} name=${name} size=${size || 24} />`;
  const Ic = (cls, size, extra) => html`<span className=${'ic ' + (size ? 's' + size + ' ' : '') + 'ic-' + cls + (extra ? ' ' + extra : '')} aria-hidden="true"></span>`;
  const CAT6 = ['sleep', 'feed', 'diaper', 'growth', 'meds', 'doctor'];

  function CatIcon({ cat, size }) {
    if (CAT6.includes(cat)) return html`<${T.CategoryIcon} category=${cat} size=${size || 'md'} />`;
    const cls = size === 'sm' ? 'tz-icchip sm' : size === 'lg' ? 'tz-icchip lg' : 'tz-icchip';
    if (cat === 'temp') return html`<span className=${cls + ' temp'}>${Ic('thermo', size === 'sm' ? 16 : 22)}</span>`;
    return html`<span className=${cls}>${Ic('note', size === 'sm' ? 16 : 22)}</span>`;
  }

  function EventRow({ e, onClick, showDay }) {
    const { s, now } = useApp();
    const i = Z.evInfo(e, s.household.units, now);
    const who = (s.members.find(m => m.id === e.by) || {}).name || '';
    const ago = e.pending ? 'por enviar' : showDay ? Z.dayLabel(e.start, now) : (i.running ? null : (now - e.start < 6 * Z.HOUR ? Z.fAgo(e.start, now) : null));
    const time = Z.fTime(e.start);
    if (CAT6.includes(i.cat)) {
      return html`<${T.LogCard} category=${i.cat} title=${i.title} detail=${i.detail + (e.source === 'mcp' ? ' · ' + who + ' desde Claude' : '')} time=${time} ago=${ago} running=${!!i.running} onClick=${onClick} />`;
    }
    const Tag = onClick ? 'button' : 'div';
    return html`<${Tag} type=${onClick ? 'button' : undefined} className=${'tz-logcard tz-glass' + (onClick ? ' is-action' : '')} onClick=${onClick}>
      <${CatIcon} cat=${i.cat} />
      <span className="tz-logcard-main"><span className="text-body-strong tz-ink">${i.title}</span><span className="text-body-sm tz-muted">${i.detail}</span></span>
      <span className="tz-logcard-meta"><span className="text-body-strong tz-ink tz-num">${time}</span>${ago ? html`<span className="text-body-sm tz-muted">${ago}</span>` : null}</span>
    <//>`;
  }

  function Seg({ options, value, onChange, label, small, style }) {
    return html`<div className="tz-seg" role="group" aria-label=${label} style=${style}>
      ${options.map(o => html`<button key=${o.v} type="button" className=${value === o.v ? 'on' : ''} aria-pressed=${value === o.v} onClick=${() => onChange(o.v)} style=${small ? { fontSize: '14px', padding: '0 4px' } : null}>${o.l}</button>`)}
    </div>`;
  }
  function Chips({ options, value, onChange, multi }) {
    const isOn = v => multi ? (value || []).includes(v) : value === v;
    const toggle = v => { if (!multi) return onChange(value === v ? null : v); const a = value || []; onChange(a.includes(v) ? a.filter(x => x !== v) : a.concat(v)); };
    return html`<div className="tz-chips">${options.map(o => html`<${T.Chip} key=${o.v} selected=${isOn(o.v)} onClick=${() => toggle(o.v)}>${o.l}<//>`)}</div>`;
  }
  function Field({ label, children, help, id }) {
    return html`<div className="tz-field">${label ? html`<label className="tz-lbl" htmlFor=${id}>${label}</label>` : null}${children}${help ? html`<span className="tz-help">${help}</span>` : null}</div>`;
  }
  function Stepper({ value, unit, alt, onDec, onInc, label }) {
    return html`<div className="tz-stepper">
      <button className="tz-iconbtn" type="button" aria-label=${'Restar ' + label} onClick=${onDec}>${Ic('minus')}</button>
      <span className="val"><span className="text-title-lg tz-num">${value}</span><span className="text-body tz-muted">${unit}${alt ? ' · ' + alt : ''}</span></span>
      <button className="tz-iconbtn" type="button" aria-label=${'Sumar ' + label} onClick=${onInc}>${Icon('plus')}</button>
    </div>`;
  }
  function Switch({ on, onChange, label }) {
    return html`<button type="button" role="switch" aria-checked=${!!on} aria-label=${label} className=${'tz-switch' + (on ? ' on' : '')} onClick=${() => onChange(!on)}></button>`;
  }
  function Check({ on, onClick, label }) {
    return html`<button type="button" className=${'tz-check' + (on ? ' on' : '')} aria-pressed=${!!on} aria-label=${label} onClick=${onClick} style=${on ? null : { background: 'transparent' }}>${on ? Icon('check', 16) : null}</button>`;
  }
  function TimeInput({ id, value, onChange, label }) {
    return html`<input id=${id} className="tz-input tz-num" type="time" value=${Z.toTimeInput(value)} aria-label=${label} onChange=${ev => ev.target.value && onChange(Z.fromTimeInput(value, ev.target.value))} />`;
  }
  function Back({ to, label, always }) {
    const { go } = useApp();
    return html`<button type="button" className=${'tz-back' + (always ? '' : ' m-only')} style=${{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} onClick=${() => go(to)}>${Icon('chevron-left')}${label}</button>`;
  }
  function Alert({ kind, icon, title, children }) {
    return html`<div className=${'tz-alert ' + (kind || '')} role=${kind === '' || kind === undefined ? 'note' : undefined}>
      ${Ic(icon || 'info', 20)}
      <div className="tz-stack s4">${title ? html`<p className="text-body-strong tz-alert-title">${title}</p>` : null}<div className="text-body-sm">${children}</div></div>
    </div>`;
  }

  function Sheet({ label, cat, title, children, onClose, wide }) {
    return html`<${React.Fragment}>
      <div className="tz-scrim" onClick=${onClose}></div>
      <section className="tz-sheet" role="dialog" aria-modal="true" aria-label=${label || title} style=${wide ? { width: undefined } : null}>
        <span className="tz-grab" aria-hidden="true"></span>
        ${title ? html`<div className="tz-sheet-head">
          <div className="tz-h">${cat ? html`<${CatIcon} cat=${cat} />` : null}<h2 className=${title.length > 18 ? 'text-title' : 'text-title-lg'}>${title}</h2></div>
          <button className="tz-iconbtn plain" type="button" aria-label="Cerrar" onClick=${onClose}>${Ic('x')}</button>
        </div>` : null}
        ${children}
      </section>
    <//>`;
  }

  /* ------------ Hojas de registro ------------ */

  function AddSheet() {
    const { closeSheet, openSheet, limited } = useApp();
    const items = [
      { k: 'sueno', l: 'Sueño', cat: 'sleep' }, { k: 'toma', l: 'Toma', cat: 'feed' }, { k: 'panal', l: 'Pañal', cat: 'diaper' },
      { k: 'medicamento', l: 'Medicamento', cat: 'meds', full: true }, { k: 'temperatura', l: 'Temperatura o síntoma', cat: 'temp', full: true },
      { k: 'nota', l: 'Nota', cat: 'note', full: true }, { k: 'medida', l: 'Medida de crecimiento', cat: 'growth', full: true }
    ].filter(i => !limited || !i.full);
    return html`<${Sheet} title="Registrar" onClose=${closeSheet}>
      <div className="tz-grid2">
        ${items.map(i => html`<button key=${i.k} type="button" className="tz-big" onClick=${() => openSheet({ type: i.k })} style=${{ minHeight: '88px' }}>
          <${CatIcon} cat=${i.cat} /><span>${i.l}</span></button>`)}
      </div>
    <//>`;
  }

  function SleepSheet({ sheet }) {
    const { s, now, closeSheet, addEvent } = useApp();
    const [mode, setMode] = useState(sheet.mode || 'now');
    const [start, setStart] = useState(now - 90 * Z.MIN);
    const [end, setEnd] = useState(now - 10 * Z.MIN);
    const [lugar, setLugar] = useState('cuna');
    const [como, setComo] = useState('sola');
    const active = s.events.find(e => !e.deleted && e.type === 'sueno' && !e.end);
    const dur = (end - start) / Z.MIN;
    const save = () => {
      if (mode === 'now') addEvent({ type: 'sueno', start: now, end: null, payload: { lugar, como } }, 'Empezó el sueño a las ' + Z.fTime(now));
      else addEvent({ type: 'sueno', start, end: end < start ? end + Z.DAY : end, payload: { lugar, como } });
      closeSheet();
    };
    return html`<${Sheet} title="Sueño" cat="sleep" onClose=${closeSheet}>
      <${Seg} label="Tipo de registro" value=${mode} onChange=${setMode} options=${[{ v: 'now', l: 'Empezar ahora' }, { v: 'past', l: 'Uno que ya pasó' }]} />
      ${mode === 'now' && active ? html`<${Alert} kind="info" title="Ya hay un sueño en curso">Empezó a las ${Z.fTime(active.start)}. Si guardas, verás ese mismo; no se duplica.<//>` : null}
      ${mode === 'past' ? html`<div className="tz-stack s8">
        <div className="tz-timefield">
          <${Field} label="Se durmió" id="sl-start"><${TimeInput} id="sl-start" label="Se durmió" value=${start} onChange=${setStart} /><//>
          <${Field} label="Despertó" id="sl-end"><${TimeInput} id="sl-end" label="Despertó" value=${end} onChange=${setEnd} /><//>
        </div>
        <p className="tz-help tz-num">${dur > 0 ? 'Duración ' + Z.fDur(dur) : 'Termina al día siguiente · ' + Z.fDur(dur + 1440)}</p>
      </div>` : null}
      <${Field} label="Dónde durmió"><${Chips} value=${lugar} onChange=${v => setLugar(v || 'cuna')} options=${[{ v: 'cuna', l: 'Cuna' }, { v: 'brazos', l: 'Brazos' }, { v: 'carriola', l: 'Carriola' }, { v: 'auto', l: 'Auto' }, { v: 'otro', l: 'Otro' }]} /><//>
      <${Field} label="Cómo se durmió"><${Chips} value=${como} onChange=${v => setComo(v || 'sola')} options=${[{ v: 'sola', l: 'Sola' }, { v: 'arrullo', l: 'Arrullo' }, { v: 'pecho', l: 'Pecho' }, { v: 'biberon', l: 'Biberón' }]} /><//>
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} onClick=${save}>${mode === 'now' ? 'Iniciar sueño' : 'Guardar sueño'}<//></div>
    <//>`;
  }

  function FeedSheet({ sheet }) {
    const { s, now, closeSheet, addEvent, toast } = useApp();
    const u = s.household.units.vol;
    const [tab, setTab] = useState(sheet.tab || 'biberon');
    const [side, setSide] = useState('izq');
    const [pMode, setPMode] = useState('now');
    const [minI, setMinI] = useState(10), [minD, setMinD] = useState(8);
    const [cont, setCont] = useState('materna');
    const step = u === 'oz' ? 0.5 : 10;
    const [vol, setVol] = useState(u === 'oz' ? 4 : 120);
    const [left, setLeft] = useState(0);
    const [time, setTime] = useState(now);
    const [food, setFood] = useState(''); const [qty, setQty] = useState(''); const [reac, setReac] = useState('');
    const [ei, setEi] = useState(u === 'oz' ? 2 : 60), [ed, setEd] = useState(u === 'oz' ? 2 : 60);
    const active = s.events.find(e => !e.deleted && e.type === 'toma_pecho' && !e.end);
    const alt = v => u === 'oz' ? Math.round(v * Z.ML_OZ) + ' ml' : Z.num(v / Z.ML_OZ, 1) + ' oz';
    const save = () => {
      if (tab === 'pecho') {
        if (pMode === 'now') {
          if (active) { toast('Ya hay una toma de pecho en curso desde las ' + Z.fTime(active.start)); closeSheet(); return; }
          addEvent({ type: 'toma_pecho', start: now, end: null, payload: { lado_inicial: side, segIzq: 0, segDer: 0, active: side, since: now } }, 'Empezó la toma con el ' + (side === 'izq' ? 'izquierdo' : 'derecho'));
        } else {
          addEvent({ type: 'toma_pecho', start: time, end: time + (minI + minD) * Z.MIN, payload: { lado_inicial: side, segIzq: minI * 60, segDer: minD * 60 } });
        }
      } else if (tab === 'biberon') addEvent({ type: 'toma_biberon', start: time, payload: { contenido: cont, volumen_ml: Math.round(Z.U.volToMl(vol, u)), sobrante_ml: Math.round(Z.U.volToMl(left, u)) } });
      else if (tab === 'solidos') addEvent({ type: 'toma_solidos', start: time, payload: { alimentos: food || 'Sin detalle', cantidad: qty, reaccion: reac } });
      else addEvent({ type: 'extraccion', start: time, payload: { izq_ml: Math.round(Z.U.volToMl(ei, u)), der_ml: Math.round(Z.U.volToMl(ed, u)) } });
      closeSheet();
    };
    const timeField = html`<${Field} label="Hora" id="fd-time"><${TimeInput} id="fd-time" label="Hora" value=${time} onChange=${setTime} /><//>`;
    return html`<${Sheet} title="Toma" cat="feed" onClose=${closeSheet}>
      <${Seg} small=${true} label="Tipo de toma" value=${tab} onChange=${setTab} options=${[{ v: 'pecho', l: 'Pecho' }, { v: 'biberon', l: 'Biberón' }, { v: 'solidos', l: 'Sólidos' }, { v: 'extraccion', l: 'Extracción' }]} />
      ${tab === 'pecho' ? html`<${React.Fragment}>
        <${Seg} label="Momento" value=${pMode} onChange=${setPMode} options=${[{ v: 'now', l: 'Empezar ahora' }, { v: 'past', l: 'Ya terminó' }]} />
        <${Field} label="Empieza con"><${Seg} label="Lado" value=${side} onChange=${setSide} options=${[{ v: 'izq', l: 'Izquierdo' }, { v: 'der', l: 'Derecho' }]} /><//>
        ${pMode === 'past' ? html`<div className="tz-grid2">
          <${Field} label="Izquierdo"><${Stepper} label="un minuto" value=${minI} unit="min" onDec=${() => setMinI(Math.max(0, minI - 1))} onInc=${() => setMinI(minI + 1)} /><//>
          <${Field} label="Derecho"><${Stepper} label="un minuto" value=${minD} unit="min" onDec=${() => setMinD(Math.max(0, minD - 1))} onInc=${() => setMinD(minD + 1)} /><//>
        </div>${timeField}` : html`<p className="tz-help">El temporizador queda en Hoy: puedes cambiar de lado, pausar y terminar con un toque.</p>`}
      <//>` : null}
      ${tab === 'biberon' ? html`<${React.Fragment}>
        <${Field} label="Qué tomó"><${Chips} value=${cont} onChange=${v => setCont(v || 'materna')} options=${[{ v: 'materna', l: 'Leche materna' }, { v: 'formula', l: 'Fórmula' }, { v: 'mixta', l: 'Mixta' }]} /><//>
        <${Field} label="Cuánto le diste"><${Stepper} label=${u === 'oz' ? 'media onza' : '10 ml'} value=${Z.num(vol, 1)} unit=${u} alt=${alt(vol)} onDec=${() => setVol(Math.max(0, vol - step))} onInc=${() => setVol(vol + step)} /><//>
        <div className="tz-grid2">
          <${Field} label="Sobró"><${Stepper} label="sobrante" value=${Z.num(left, 1)} unit=${u} onDec=${() => setLeft(Math.max(0, left - step))} onInc=${() => setLeft(Math.min(vol, left + step))} /><//>
          ${timeField}
        </div>
      <//>` : null}
      ${tab === 'solidos' ? html`<${React.Fragment}>
        <${Field} label="Qué comió" id="fd-food"><input id="fd-food" className="tz-input" placeholder="Ej.: puré de ayote" value=${food} onChange=${e => setFood(e.target.value)} /><//>
        <div className="tz-grid2">
          <${Field} label="Cantidad" id="fd-qty"><input id="fd-qty" className="tz-input" placeholder="Ej.: 3 cucharaditas" value=${qty} onChange=${e => setQty(e.target.value)} /><//>
          ${timeField}
        </div>
        <${Field} label="¿Alguna reacción? (opcional)" id="fd-reac"><input id="fd-reac" className="tz-input" placeholder="Ej.: ninguna" value=${reac} onChange=${e => setReac(e.target.value)} /><//>
      <//>` : null}
      ${tab === 'extraccion' ? html`<${React.Fragment}>
        <div className="tz-grid2">
          <${Field} label="Izquierdo"><${Stepper} label="volumen izquierdo" value=${Z.num(ei, 1)} unit=${u} onDec=${() => setEi(Math.max(0, ei - step))} onInc=${() => setEi(ei + step)} /><//>
          <${Field} label="Derecho"><${Stepper} label="volumen derecho" value=${Z.num(ed, 1)} unit=${u} onDec=${() => setEd(Math.max(0, ed - step))} onInc=${() => setEd(ed + step)} /><//>
        </div>${timeField}
      <//>` : null}
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} onClick=${save}>${tab === 'pecho' && pMode === 'now' ? 'Empezar toma' : 'Guardar toma'}<//></div>
    <//>`;
  }

  function DiaperSheet() {
    const { now, closeSheet, addEvent } = useApp();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState(null);
    const [color, setColor] = useState(null), [cons, setCons] = useState(null);
    const [time, setTime] = useState(now);
    const payload = k => ({ mojado: k !== 'sucio', sucio: k !== 'mojado', color, consistencia: cons });
    const quick = k => { if (open) { setKind(k); return; } addEvent({ type: 'panal', start: now, payload: payload(k) }); closeSheet(); };
    const saveDetail = () => { addEvent({ type: 'panal', start: time, payload: payload(kind || 'mojado') }); closeSheet(); };
    const tile = (k, label, icon) => html`<button type="button" className=${'tz-big' + (open && kind === k ? ' on' : '')} aria-pressed=${open ? kind === k : undefined} onClick=${() => quick(k)}>${icon}${label}</button>`;
    return html`<${Sheet} title="Pañal" cat="diaper" onClose=${closeSheet}>
      <p className="text-body tz-muted">${open ? 'Elige el tipo y completa lo que quieras.' : 'Un toque lo guarda con la hora de ahora (' + Z.fTime(now) + ').'}</p>
      <div className="tz-grid3">
        ${tile('mojado', 'Mojado', Ic('drop', 22, 'c-diaper'))}
        ${tile('sucio', 'Sucio', Icon('diaper', 22))}
        ${tile('ambos', 'Ambos', html`<span className="tz-h" style=${{ gap: '2px' }}>${Ic('drop', 18, 'c-diaper')}${Icon('diaper', 18)}</span>`)}
      </div>
      <div className="tz-sunken" style=${{ borderRadius: '20px' }}>
        <button className="tz-row" type="button" aria-expanded=${open} onClick=${() => setOpen(!open)}>
          <span className="grow"><span className="text-body-strong">Detalles opcionales</span><span className="text-body-sm tz-muted">Color, consistencia u otra hora</span></span>
          <span className="chev" style=${{ transform: open ? 'rotate(180deg)' : null }}>${Ic('chevdown')}</span>
        </button>
      </div>
      ${open ? html`<${React.Fragment}>
        <${Field} label="Color"><${Chips} value=${color} onChange=${setColor} options=${[{ v: 'amarillo', l: 'Amarillo' }, { v: 'verde', l: 'Verde' }, { v: 'cafe', l: 'Café' }, { v: 'otro', l: 'Otro' }]} /><//>
        <${Field} label="Consistencia"><${Chips} value=${cons} onChange=${setCons} options=${[{ v: 'liquida', l: 'Líquida' }, { v: 'pastosa', l: 'Pastosa' }, { v: 'firme', l: 'Firme' }]} /><//>
        <${Field} label="Hora" id="dp-time"><${TimeInput} id="dp-time" label="Hora" value=${time} onChange=${setTime} /><//>
        <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} disabled=${!kind} onClick=${saveDetail}>Guardar pañal<//></div>
      <//>` : null}
    <//>`;
  }

  function MedSheet({ sheet }) {
    const { s, now, closeSheet, addEvent, update } = useApp();
    const actives = s.meds.filter(m => m.active);
    const [medId, setMedId] = useState(sheet.medId || (actives[0] && actives[0].id) || 'new');
    const [name, setName] = useState(''); const [ind, setInd] = useState('');
    const [qty, setQty] = useState(''); const [via, setVia] = useState('Oral'); const [time, setTime] = useState(now);
    const valid = qty.trim() && (medId !== 'new' || name.trim());
    const save = () => {
      let id = medId, nombre;
      if (medId === 'new') {
        id = Z.uid('m'); nombre = name.trim();
        update(st => { st.meds.push({ id, name: nombre, indication: ind.trim() || qty.trim(), by: '', start: now, active: true }); });
      } else nombre = s.meds.find(m => m.id === medId).name;
      addEvent({ type: 'medicamento', start: time, payload: { medId: id, nombre, cantidad: qty.trim(), via } });
      closeSheet();
    };
    return html`<${Sheet} title="Medicamento" cat="meds" onClose=${closeSheet}>
      <${Field} label="Tratamiento">
        ${actives.map(m => html`<button key=${m.id} className=${'tz-radio' + (medId === m.id ? ' on' : '')} type="button" aria-pressed=${medId === m.id} onClick=${() => setMedId(m.id)}>
          <span className="dot" aria-hidden="true"></span>
          <span className="grow tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">${m.name}</span><span className="text-body-sm tz-muted">Indicación: «${m.indication}»</span></span>
        </button>`)}
        <button className=${'tz-radio' + (medId === 'new' ? ' on' : '')} type="button" aria-pressed=${medId === 'new'} onClick=${() => setMedId('new')}>
          <span className="dot" aria-hidden="true"></span><span className="text-body-strong">Otro tratamiento</span>
        </button>
      <//>
      ${medId === 'new' ? html`<div className="tz-grid2">
        <${Field} label="Nombre" id="md-name"><input id="md-name" className="tz-input" value=${name} onChange=${e => setName(e.target.value)} placeholder="Como aparece en la caja" /><//>
        <${Field} label="Indicación del médico" id="md-ind"><input id="md-ind" className="tz-input" value=${ind} onChange=${e => setInd(e.target.value)} placeholder="Tal como la escribió" /><//>
      </div>` : null}
      <${Field} label="Cantidad que se le dio, tal como la indicó tu pediatra" id="md-qty"><input id="md-qty" className="tz-input" value=${qty} onChange=${e => setQty(e.target.value)} placeholder="Escríbela como viene en la receta" /><//>
      <div className="tz-grid2">
        <${Field} label="Hora" id="md-time"><${TimeInput} id="md-time" label="Hora" value=${time} onChange=${setTime} /><//>
        <${Field} label="Vía" id="md-via"><select id="md-via" className="tz-input" value=${via} onChange=${e => setVia(e.target.value)}>${['Oral', 'Tópica', 'Inhalada', 'Nasal', 'Otra'].map(v => html`<option key=${v}>${v}</option>`)}</select><//>
      </div>
      <${Alert} kind="neutral">Tereza solo registra lo que se le dio. No calcula ni sugiere dosis. Si tienes dudas sobre la cantidad, consulta a tu pediatra o farmacéutico y revisa la etiqueta.<//>
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} disabled=${!valid} onClick=${save}>Guardar medicamento<//></div>
    <//>`;
  }

  function TempSheet({ sheet }) {
    const { s, now, closeSheet, addEvent, go } = useApp();
    const [tab, setTab] = useState(sheet.tab || 'temp');
    const [val, setVal] = useState(37.0);
    const [met, setMet] = useState('axilar');
    const [note, setNote] = useState('');
    const [desc, setDesc] = useState(''); const [sev, setSev] = useState(null);
    const [time, setTime] = useState(now);
    const alarm = tab === 'temp' ? Z.tempAlarm(s, val, time) : null;
    const save = () => {
      if (tab === 'temp') addEvent({ type: 'temperatura', start: time, payload: { valor_c: Math.round(val * 10) / 10, metodo: met }, notes: note });
      else addEvent({ type: 'sintoma', start: time, payload: { descripcion: desc.trim(), severidad: sev } });
      closeSheet();
    };
    return html`<${Sheet} title="Temperatura y síntoma" cat="temp" onClose=${closeSheet}>
      <${Seg} label="Qué vas a registrar" value=${tab} onChange=${setTab} options=${[{ v: 'temp', l: 'Temperatura' }, { v: 'sint', l: 'Síntoma' }]} />
      ${tab === 'temp' ? html`<${React.Fragment}>
        <${Stepper} label="una décima" value=${Z.num(val, 1)} unit="°C" onDec=${() => setVal(Math.max(34, Math.round((val - 0.1) * 10) / 10))} onInc=${() => setVal(Math.min(42, Math.round((val + 0.1) * 10) / 10))} />
        <${Field} label="Cómo la tomaste"><${Chips} value=${met} onChange=${v => setMet(v || 'axilar')} options=${[{ v: 'axilar', l: 'Axilar' }, { v: 'rectal', l: 'Rectal' }, { v: 'frente', l: 'Frente' }, { v: 'oido', l: 'Oído' }]} /><//>
        <div className="tz-grid2">
          <${Field} label="Hora" id="tp-time"><${TimeInput} id="tp-time" label="Hora" value=${time} onChange=${setTime} /><//>
          <${Field} label="Nota (opcional)" id="tp-note"><input id="tp-note" className="tz-input" value=${note} onChange=${e => setNote(e.target.value)} placeholder="Ej.: irritable" /><//>
        </div>
        ${alarm ? html`<div className="tz-alert" role="note">${Ic('alert', 20)}<div className="tz-stack s4">
          <p className="text-body-strong tz-alert-title">${alarm.title}</p><p className="text-body-sm">${alarm.text}</p>
          <button type="button" className="tz-link" style=${{ minHeight: '36px', background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick=${() => { closeSheet(); go('pediatra'); }}>${Ic('phone', 18)}Ver contacto de la pediatra</button>
        </div></div>` : null}
      <//>` : html`<${React.Fragment}>
        <${Field} label="Qué notaste" id="tp-desc"><textarea id="tp-desc" className="tz-input area" value=${desc} onChange=${e => setDesc(e.target.value)} placeholder="Ej.: tos seca desde la tarde"></textarea><//>
        <${Field} label="Qué tan fuerte (opcional)"><${Chips} value=${sev} onChange=${setSev} options=${[{ v: 'leve', l: 'Leve' }, { v: 'moderado', l: 'Moderado' }, { v: 'fuerte', l: 'Fuerte' }]} /><//>
        <${Field} label="Hora" id="tp-time2"><${TimeInput} id="tp-time2" label="Hora" value=${time} onChange=${setTime} /><//>
        <p className="tz-help">Si le cuesta respirar, está muy somnolienta o no logras despertarla, busca atención médica de inmediato.</p>
      <//>`}
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} disabled=${tab === 'sint' && !desc.trim()} onClick=${save}>${tab === 'temp' ? 'Guardar temperatura' : 'Guardar síntoma'}<//></div>
    <//>`;
  }

  function NoteSheet() {
    const { s, now, closeSheet, addEvent, update } = useApp();
    const [text, setText] = useState(''); const [asQ, setAsQ] = useState(false); const [time, setTime] = useState(now);
    const save = () => {
      addEvent({ type: 'nota', start: time, payload: { texto: text.trim() } });
      if (asQ) update(st => { st.questions.push({ id: Z.uid('q'), text: text.trim(), by: st.me, at: Date.now(), resolved: null }); });
      closeSheet();
    };
    return html`<${Sheet} title="Nota" cat="note" onClose=${closeSheet}>
      <${Field} label="Qué quieres recordar" id="nt-text"><textarea id="nt-text" className="tz-input area" value=${text} onChange=${e => setText(e.target.value)} placeholder="Escribe aquí"></textarea><//>
      <button className="tz-row tz-sunken" type="button" style=${{ borderRadius: '20px' }} aria-pressed=${asQ} onClick=${() => setAsQ(!asQ)}>
        <span className=${'tz-check' + (asQ ? ' on' : '')} aria-hidden="true">${asQ ? Icon('check', 16) : null}</span>
        <span className="grow"><span className="text-body-strong">Guardar también como duda para el pediatra</span><span className="text-body-sm tz-muted">Aparecerá en la próxima consulta</span></span>
      </button>
      <${Field} label="Hora" id="nt-time"><${TimeInput} id="nt-time" label="Hora" value=${time} onChange=${setTime} /><//>
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} disabled=${!text.trim()} onClick=${save}>Guardar nota<//></div>
    <//>`;
  }

  function MeasureSheet() {
    const { s, now, closeSheet, update, toast } = useApp();
    const u = s.household.units;
    const [date, setDate] = useState(Z.toDateInput(now));
    const [w, setW] = useState(''); const [l, setL] = useState(''); const [h, setH] = useState('');
    const [origin, setOrigin] = useState('casa');
    const save = () => {
      const at = Z.fromDateInput(date);
      const m = { id: Z.uid('w'), at, origin,
        weightG: w ? Math.round(u.weight === 'lb' ? +w * Z.G_LB : +w * 1000) : null,
        lengthMm: l ? Math.round(u.len === 'in' ? +l * Z.MM_IN : +l * 10) : null,
        headMm: h ? Math.round(u.len === 'in' ? +h * Z.MM_IN : +h * 10) : null };
      update(st => { st.measurements.push(m); });
      const mo = Z.ageMonthsFloat(s.baby.birth, at);
      const parts = [];
      if (m.weightG) parts.push(Z.U.weight(m.weightG, u.weight) + ' (' + Z.pText(Z.percentile(s.baby.sex, 'weight', mo, m.weightG / 1000)) + ')');
      if (m.lengthMm) parts.push(Z.U.len(m.lengthMm, u.len) + ' (' + Z.pText(Z.percentile(s.baby.sex, 'length', mo, m.lengthMm / 10)) + ')');
      if (m.headMm) parts.push('cabeza ' + Z.U.len(m.headMm, u.len));
      toast('Guardé: ' + parts.join(', '), () => update(st => { st.measurements = st.measurements.filter(x => x.id !== m.id); }));
      closeSheet();
    };
    return html`<${Sheet} title="Medida" cat="growth" onClose=${closeSheet}>
      <div className="tz-grid2">
        <${Field} label="Fecha" id="ms-date"><input id="ms-date" type="date" className="tz-input" value=${date} onChange=${e => setDate(e.target.value)} /><//>
        <${Field} label="Dónde"><${Seg} label="Origen" value=${origin} onChange=${setOrigin} options=${[{ v: 'casa', l: 'Casa' }, { v: 'consulta', l: 'Consulta' }]} /><//>
      </div>
      <${Field} label=${'Peso (' + u.weight + ')'} id="ms-w"><input id="ms-w" className="tz-input tz-num" inputMode="decimal" value=${w} onChange=${e => setW(e.target.value.replace(',', '.'))} placeholder=${u.weight === 'lb' ? 'Ej.: 15.4' : 'Ej.: 7.0'} /><//>
      <div className="tz-grid2">
        <${Field} label=${'Longitud (' + u.len + ')'} id="ms-l"><input id="ms-l" className="tz-input tz-num" inputMode="decimal" value=${l} onChange=${e => setL(e.target.value.replace(',', '.'))} placeholder="Opcional" /><//>
        <${Field} label=${'Cabeza (' + u.len + ')'} id="ms-h"><input id="ms-h" className="tz-input tz-num" inputMode="decimal" value=${h} onChange=${e => setH(e.target.value.replace(',', '.'))} placeholder="Opcional" /><//>
      </div>
      <p className="tz-help">Al guardar te mostramos el percentil de la OMS para su edad. Es una comparación, no un diagnóstico.</p>
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} disabled=${!(w || l || h)} onClick=${save}>Guardar medida<//></div>
    <//>`;
  }

  function TreatmentSheet() {
    const { now, closeSheet, update, toast } = useApp();
    const [name, setName] = useState(''), [ind, setInd] = useState(''), [by, setBy] = useState('Dra. Mónica Herrera');
    const save = () => {
      const id = Z.uid('m');
      update(st => { st.meds.push({ id, name: name.trim(), indication: ind.trim(), by: by.trim(), start: now, active: true }); });
      toast('Agregué el tratamiento ' + name.trim(), () => update(st => { st.meds = st.meds.filter(m => m.id !== id); }));
      closeSheet();
    };
    return html`<${Sheet} title="Nuevo tratamiento" cat="meds" onClose=${closeSheet}>
      <${Field} label="Nombre" id="tr-name"><input id="tr-name" className="tz-input" value=${name} onChange=${e => setName(e.target.value)} placeholder="Como aparece en la caja" /><//>
      <${Field} label="Indicación, tal como la escribió el médico" id="tr-ind"><input id="tr-ind" className="tz-input" value=${ind} onChange=${e => setInd(e.target.value)} placeholder="Copia el texto de la receta" /><//>
      <${Field} label="Indicado por" id="tr-by"><input id="tr-by" className="tz-input" value=${by} onChange=${e => setBy(e.target.value)} /><//>
      <${Alert} kind="neutral">Guardamos el texto tal cual. Tereza no interpreta ni calcula dosis.<//>
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} disabled=${!name.trim() || !ind.trim()} onClick=${save}>Agregar tratamiento<//></div>
    <//>`;
  }

  function ApptSheet() {
    const { s, closeSheet, update, toast } = useApp();
    const a = s.nextAppt || { date: Date.now() + 14 * Z.DAY, title: '', doctor: 'Dra. Mónica Herrera' };
    const [date, setDate] = useState(Z.toDateInput(a.date)); const [time, setTime] = useState(Z.toTimeInput(a.date)); const [title, setTitle] = useState(a.title);
    const save = () => {
      const d = Z.fromTimeInput(Z.fromDateInput(date), time);
      update(st => { st.nextAppt = { date: d, title: title.trim() || 'Consulta', doctor: a.doctor }; });
      toast('Guardé la cita del ' + Z.fDate(d).toLowerCase()); closeSheet();
    };
    return html`<${Sheet} title="Próxima cita" cat="doctor" onClose=${closeSheet}>
      <div className="tz-grid2">
        <${Field} label="Fecha" id="ap-d"><input id="ap-d" type="date" className="tz-input" value=${date} onChange=${e => setDate(e.target.value)} /><//>
        <${Field} label="Hora" id="ap-t"><input id="ap-t" type="time" className="tz-input" value=${time} onChange=${e => setTime(e.target.value)} /><//>
      </div>
      <${Field} label="Motivo" id="ap-m"><input id="ap-m" className="tz-input" value=${title} onChange=${e => setTitle(e.target.value)} placeholder="Ej.: control de 6 meses" /><//>
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} onClick=${save}>Guardar cita<//></div>
    <//>`;
  }

  function VisitSheet() {
    const { s, now, closeSheet, update, toast } = useApp();
    const pend = s.questions.filter(q => !q.resolved);
    const [date, setDate] = useState(Z.toDateInput(now)); const [title, setTitle] = useState(s.nextAppt ? s.nextAppt.title : '');
    const [notes, setNotes] = useState(''); const [vac, setVac] = useState(''); const [res, setRes] = useState([]);
    const save = () => {
      const id = Z.uid('v');
      update(st => {
        st.visits.unshift({ id, date: Z.fromDateInput(date), title: title.trim() || 'Consulta', doctor: 'Dra. Mónica Herrera', notes: notes.trim(), vaccines: vac.split(',').map(x => x.trim()).filter(Boolean), attachments: [] });
        st.questions.forEach(q => { if (res.includes(q.id)) q.resolved = id; });
      });
      toast('Guardé la visita', () => update(st => { st.visits = st.visits.filter(v => v.id !== id); st.questions.forEach(q => { if (q.resolved === id) q.resolved = null; }); }));
      closeSheet();
    };
    return html`<${Sheet} title="Nueva visita" cat="doctor" onClose=${closeSheet}>
      <div className="tz-grid2">
        <${Field} label="Fecha" id="vs-d"><input id="vs-d" type="date" className="tz-input" value=${date} onChange=${e => setDate(e.target.value)} /><//>
        <${Field} label="Motivo" id="vs-t"><input id="vs-t" className="tz-input" value=${title} onChange=${e => setTitle(e.target.value)} /><//>
      </div>
      <${Field} label="Notas de la consulta" id="vs-n"><textarea id="vs-n" className="tz-input area" value=${notes} onChange=${e => setNotes(e.target.value)} placeholder="Lo que dijo la pediatra"></textarea><//>
      <${Field} label="Vacunas aplicadas (separadas por coma)" id="vs-v"><input id="vs-v" className="tz-input" value=${vac} onChange=${e => setVac(e.target.value)} placeholder="Ej.: Pentavalente 3.ª dosis" /><//>
      ${pend.length ? html`<${Field} label="Dudas resueltas en esta visita"><div className="tz-list tz-sunken">
        ${pend.map(q => html`<button key=${q.id} type="button" className="tz-row" aria-pressed=${res.includes(q.id)} onClick=${() => setRes(res.includes(q.id) ? res.filter(x => x !== q.id) : res.concat(q.id))}>
          <span className=${'tz-check' + (res.includes(q.id) ? ' on' : '')} aria-hidden="true">${res.includes(q.id) ? Icon('check', 16) : null}</span><span className="grow text-body">${q.text}</span></button>`)}
      </div><//>` : null}
      <div className="tz-sheet-actions"><${T.Button} variant="primary" size="lg" block=${true} onClick=${save}>Guardar visita<//></div>
    <//>`;
  }

  const ROLE_TXT = { admin: 'Todo, incluido invitar y quitar cuidadores', cuidador: 'Registra y ve todo el historial y la salud', limitado: 'Registra tomas, pañales y sueño; ve solo el día de hoy' };
  const ROLE_N = { admin: 'Admin', cuidador: 'Cuidador', limitado: 'Limitado' };
  function RolePicker({ value, onChange }) {
    return html`<div className="tz-stack s8">${['admin', 'cuidador', 'limitado'].map(r => html`<button key=${r} className=${'tz-radio' + (value === r ? ' on' : '')} type="button" aria-pressed=${value === r} onClick=${() => onChange(r)} style=${{ minHeight: '68px' }}>
      <span className="dot" aria-hidden="true"></span><span className="grow tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">${ROLE_N[r]}</span><span className="text-body-sm tz-muted">${ROLE_TXT[r]}</span></span></button>`)}</div>`;
  }
  function InviteSheet() {
    const { closeSheet, update, toast } = useApp();
    const [email, setEmail] = useState(''); const [role, setRole] = useState('cuidador');
    const ok = /.+@.+\..+/.test(email);
    const send = () => { update(st => { st.invites.push({ email: email.trim(), role, at: Date.now() }); }); toast('Invitación enviada a ' + email.trim()); closeSheet(); };
    return html`<${Sheet} title="Invitar a quien cuida" onClose=${closeSheet}>
      <${Field} label="Correo" id="in-mail" help=${email && !ok ? 'Revisa el correo: falta la @ o el dominio.' : null}><input id="in-mail" type="email" className="tz-input" value=${email} onChange=${e => setEmail(e.target.value)} placeholder="nombre@correo.com" /><//>
      <${Field} label="Rol"><${RolePicker} value=${role} onChange=${setRole} /><//>
      <div className="tz-stack">
        <${T.Button} variant="primary" size="lg" block=${true} disabled=${!ok} onClick=${send}>Enviar invitación<//>
        <button className="tz-btn tz-btn-glass tz-btn-block text-button" type="button" onClick=${() => { toast('Enlace copiado (en la app real)'); }}>${Ic('link', 20)}<span>Copiar enlace de invitación</span></button>
      </div>
    <//>`;
  }
  function MemberSheet({ sheet }) {
    const { s, closeSheet, update, toast } = useApp();
    const m = s.members.find(x => x.id === sheet.id);
    const [role, setRole] = useState(m.role);
    const isMe = m.id === s.me;
    return html`<${Sheet} title=${m.name} onClose=${closeSheet}>
      <${Field} label="Rol"><${RolePicker} value=${role} onChange=${setRole} /><//>
      <div className="tz-stack">
        <${T.Button} variant="primary" size="lg" block=${true} onClick=${() => { update(st => { st.members.find(x => x.id === m.id).role = role; }); toast('Cambié el rol de ' + m.name + ' a ' + ROLE_N[role].toLowerCase()); closeSheet(); }}>Guardar rol<//>
        ${isMe ? null : html`<button className="tz-btn tz-btn-ghost tz-btn-block text-button" type="button" style=${{ color: 'var(--danger)' }} onClick=${() => {
          const prev = JSON.parse(JSON.stringify(m));
          update(st => { st.members = st.members.filter(x => x.id !== m.id); });
          toast(m.name + ' ya no tiene acceso', () => update(st => { st.members.push(prev); })); closeSheet();
        }}>${Ic('trash', 20)}<span>Quitar acceso</span></button>`}
      </div>
    <//>`;
  }
  function ConflictSheet({ sheet }) {
    const { s, closeSheet, update, toast } = useApp();
    const e = s.events.find(x => x.id === sheet.id);
    const u = s.household.units.vol;
    const [pick, setPick] = useState('mine');
    if (!e) return null;
    const theirs = { volumen_ml: (e.payload.volumen_ml || 118) + 15, sobrante_ml: 0 };
    return html`<${Sheet} label="Elegir qué versión guardar" onClose=${closeSheet}>
      <div className="tz-stack s8">
        <span className="tz-icchip warning">${Ic('sync', 22)}</span>
        <h2 className="text-title-lg">Diego también cambió este biberón</h2>
        <p className="text-body tz-muted">Lo editó desde Claude hace 2 minutos, mientras tú lo editabas aquí. Elige cuál se queda; la otra queda en el historial del registro.</p>
      </div>
      <div className="tz-stack s8">
        <button className=${'tz-radio' + (pick === 'mine' ? ' on' : '')} type="button" aria-pressed=${pick === 'mine'} onClick=${() => setPick('mine')} style=${{ minHeight: '76px' }}>
          <span className="dot" aria-hidden="true"></span><span className="grow tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">Tu versión</span><span className="text-body tz-num">${Z.U.vol(e.payload.volumen_ml, u)} · sobró ${Z.U.vol(e.payload.sobrante_ml || 0, u)}</span></span></button>
        <button className=${'tz-radio' + (pick === 'theirs' ? ' on' : '')} type="button" aria-pressed=${pick === 'theirs'} onClick=${() => setPick('theirs')} style=${{ minHeight: '76px' }}>
          <span className="dot" aria-hidden="true"></span><span className="grow tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">Versión de Diego</span><span className="text-body tz-num">${Z.U.vol(theirs.volumen_ml, u)} · no sobró nada</span></span></button>
      </div>
      <div className="tz-stack">
        <${T.Button} variant="primary" size="lg" block=${true} onClick=${() => { if (pick === 'theirs') update(st => { Object.assign(st.events.find(x => x.id === e.id).payload, theirs); }); toast(pick === 'theirs' ? 'Guardé la versión de Diego' : 'Guardé tu versión'); closeSheet(); }}>Guardar la que elegí<//>
        <${T.Button} variant="ghost" block=${true} onClick=${closeSheet}>Decidir después<//>
      </div>
    <//>`;
  }
  function DeleteAccountSheet() {
    const { closeSheet, resetAll } = useApp();
    return html`<${Sheet} label="Confirmar eliminación" onClose=${closeSheet}>
      <span className="tz-icchip lg danger">${Ic('trash')}</span>
      <div className="tz-stack s8">
        <h2 className="text-title-lg">¿Eliminar la cuenta y todos los datos?</h2>
        <p className="text-body">Se borrarán para siempre los registros, medidas, visitas y adjuntos del hogar. Los demás cuidadores perderán el acceso. Esto no se puede deshacer.</p>
        <p className="text-body-sm tz-muted">En este prototipo, eliminar te regresa al inicio con datos nuevos de ejemplo.</p>
      </div>
      <div className="tz-stack">
        <button className="tz-btn tz-btn-lg tz-btn-block text-button" type="button" style=${{ background: 'var(--danger)', color: 'var(--surface)' }} onClick=${() => { closeSheet(); resetAll(false); }}>Eliminar para siempre</button>
        <${T.Button} variant="glass" size="lg" block=${true} onClick=${closeSheet}>Cancelar<//>
      </div>
    <//>`;
  }
  function ExportSheet({ sheet }) {
    const { s, closeSheet, toast } = useApp();
    const evs = s.events.filter(e => !e.deleted);
    const text = sheet.fmt === 'csv'
      ? 'tipo,inicio,fin,detalle,registrado_por,origen\n' + evs.slice(-40).map(e => [e.type, new Date(e.start).toISOString(), e.end ? new Date(e.end).toISOString() : '', JSON.stringify(e.payload).replace(/,/g, ';'), e.by, e.source].join(',')).join('\n')
      : JSON.stringify({ hogar: s.household.name, bebe: s.baby.name, eventos: evs.slice(-15) }, null, 2);
    const copy = () => { try { navigator.clipboard.writeText(text).then(() => toast('Copiado'), () => toast('No se pudo copiar; selecciona el texto')); } catch (e) { toast('No se pudo copiar; selecciona el texto'); } };
    return html`<${Sheet} title=${'Exportar ' + sheet.fmt.toUpperCase()} onClose=${closeSheet}>
      <p className="text-body tz-muted">En la app real se descarga el archivo completo (${evs.length} registros). Aquí ves una muestra.</p>
      <pre className="tz-sunken text-body-sm" style=${{ padding: '12px', overflow: 'auto', maxHeight: '260px', margin: 0, whiteSpace: 'pre', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px' }}>${text}</pre>
      <${T.Button} variant="primary" size="lg" block=${true} onClick=${copy}>Copiar muestra<//>
    <//>`;
  }

  const SHEETS = { add: AddSheet, sueno: SleepSheet, toma: FeedSheet, panal: DiaperSheet, medicamento: MedSheet, temperatura: TempSheet, nota: NoteSheet, medida: MeasureSheet, tratamiento: TreatmentSheet, cita: ApptSheet, visita: VisitSheet, invitar: InviteSheet, miembro: MemberSheet, conflicto: ConflictSheet, borrar: DeleteAccountSheet, exportar: ExportSheet };

  window.TZUI = { html, Ctx, useApp, Icon, Ic, CatIcon, EventRow, Seg, Chips, Field, Stepper, Switch, Check, TimeInput, Back, Alert, Sheet, SHEETS, RolePicker, ROLE_N, ROLE_TXT, CAT6 };
})();
