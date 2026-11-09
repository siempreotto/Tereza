-- Pruebas de RLS por rol sobre los datos de ejemplo (supabase/seed/ejemplo.sql).
-- Corre todo en un bloque y termina SIEMPRE con raise exception: nada queda guardado.
-- El mensaje final trae el resumen: «RLS OK n/n» o la lista de fallas.
do $$
declare
  andrea constant uuid := '00000000-0000-4000-8000-00000000a0d1';
  diego  constant uuid := '00000000-0000-4000-8000-00000000d1e9';
  carmen constant uuid := '00000000-0000-4000-8000-00000000ca31';
  ajena  constant uuid := '00000000-0000-4000-8000-00000000a7e0';
  hogar  constant uuid := '00000000-0000-4000-8000-0000000000a1';
  lucia  constant uuid := '00000000-0000-4000-8000-0000000000b1';
  fallas text[] := '{}';
  total int := 0;
  n int; v_err text;
begin
  -- ============ Persona ajena ============
  perform set_config('request.jwt.claims', json_build_object('sub', ajena, 'role', 'authenticated', 'email', 'ajena@ejemplo.tereza.test')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.events where household_id = hogar;          total := total + 1; if n <> 0 then fallas := fallas || ('ajena ve eventos de Lucía: ' || n); end if;
  select count(*) into n from public.babies where id = lucia;                     total := total + 1; if n <> 0 then fallas := fallas || 'ajena ve a Lucía'::text; end if;
  select count(*) into n from public.members where household_id = hogar;          total := total + 1; if n <> 0 then fallas := fallas || 'ajena ve miembros de Casa de Lucía'::text; end if;
  select count(*) into n from public.measurements;                                 total := total + 1; if n <> 0 then fallas := fallas || 'ajena ve medidas'::text; end if;
  begin
    insert into public.events (baby_id, tipo, started_at, payload) values (lucia, 'panal', now(), '{"mojado":true,"sucio":false}');
    total := total + 1; fallas := fallas || 'ajena pudo registrar en Lucía'::text;
  exception when insufficient_privilege or check_violation then total := total + 1;
    when others then total := total + 1; get stacked diagnostics v_err = message_text;
      if v_err not like '%row-level security%' then fallas := fallas || ('ajena insert error inesperado: ' || v_err); end if;
  end;
  execute 'reset role';

  -- ============ Abuela Carmen (limitado) ============
  perform set_config('request.jwt.claims', json_build_object('sub', carmen, 'role', 'authenticated', 'email', 'carmen@ejemplo.tereza.test')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.babies where id = lucia;                     total := total + 1; if n <> 1 then fallas := fallas || 'limitado no ve a Lucía'::text; end if;
  select count(*) into n from public.events where tipo in ('medicamento', 'temperatura', 'nota', 'sintoma'); total := total + 1; if n <> 0 then fallas := fallas || ('limitado ve tipos de salud: ' || n); end if;
  select count(*) into n from public.events where started_at < private.hoy_inicio(hogar) and ended_at is not null; total := total + 1; if n <> 0 then fallas := fallas || ('limitado ve días anteriores: ' || n); end if;
  select count(*) into n from public.events where started_at >= private.hoy_inicio(hogar) or ended_at is null; total := total + 1; if n = 0 then fallas := fallas || 'limitado no ve lo de hoy'::text; end if;
  select count(*) into n from public.medications;                                  total := total + 1; if n <> 0 then fallas := fallas || 'limitado ve medicamentos'::text; end if;
  select count(*) into n from public.visits;                                       total := total + 1; if n <> 0 then fallas := fallas || 'limitado ve visitas'::text; end if;
  select count(*) into n from public.measurements;                                 total := total + 1; if n <> 0 then fallas := fallas || 'limitado ve medidas'::text; end if;
  select count(*) into n from public.questions;                                    total := total + 1; if n <> 0 then fallas := fallas || 'limitado ve dudas'::text; end if;
  select count(*) into n from public.next_appointments;                            total := total + 1; if n <> 0 then fallas := fallas || 'limitado ve la próxima cita'::text; end if;
  select count(*) into n from public.event_revisions;                              total := total + 1; if n <> 0 then fallas := fallas || 'limitado ve revisiones'::text; end if;
  select count(*) into n from public.invites;                                      total := total + 1; if n <> 0 then fallas := fallas || 'limitado ve invitaciones'::text; end if;
  -- Puede registrar un pañal…
  begin
    insert into public.events (baby_id, tipo, started_at, payload, logged_by) values (lucia, 'panal', now(), '{"mojado":true,"sucio":false}', carmen);
    total := total + 1;
  exception when others then total := total + 1; get stacked diagnostics v_err = message_text; fallas := fallas || ('limitado no pudo registrar pañal: ' || v_err); end;
  -- …pero no temperatura ni medicamento.
  begin
    insert into public.events (baby_id, tipo, started_at, payload, logged_by) values (lucia, 'temperatura', now(), '{"valor_c":37.5}', carmen);
    total := total + 1; fallas := fallas || 'limitado pudo registrar temperatura'::text;
  exception when others then total := total + 1; end;
  begin
    insert into public.events (baby_id, tipo, started_at, payload, logged_by) values (lucia, 'medicamento', now(), '{"medication_id":"00000000-0000-4000-8000-0000000000e1","cantidad_textual":"1 gota"}', carmen);
    total := total + 1; fallas := fallas || 'limitado pudo registrar medicamento'::text;
  exception when others then total := total + 1; end;
  -- No puede firmar como otra persona.
  begin
    insert into public.events (baby_id, tipo, started_at, payload, logged_by) values (lucia, 'panal', now(), '{"mojado":true,"sucio":false}', andrea);
    total := total + 1; fallas := fallas || 'limitado pudo registrar a nombre de Andrea'::text;
  exception when others then total := total + 1; end;
  -- Cambiar ajustes: el update no afecta filas.
  update public.household_settings set unidad_volumen = 'ml' where household_id = hogar;
  get diagnostics n = row_count;                                                   total := total + 1; if n <> 0 then fallas := fallas || 'limitado cambió ajustes'::text; end if;
  -- Invitar: debe fallar.
  begin
    perform public.crear_invitacion(hogar, 'otra@ejemplo.tereza.test', 'cuidador');
    total := total + 1; fallas := fallas || 'limitado pudo invitar'::text;
  exception when others then total := total + 1; end;
  execute 'reset role';

  -- ============ Diego (cuidador) ============
  perform set_config('request.jwt.claims', json_build_object('sub', diego, 'role', 'authenticated', 'email', 'diego@ejemplo.tereza.test')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.events where household_id = hogar;          total := total + 1; if n < 100 then fallas := fallas || ('cuidador ve pocos eventos: ' || n); end if;
  select count(*) into n from public.measurements;                                 total := total + 1; if n <> 5 then fallas := fallas || ('cuidador ve medidas: ' || n); end if;
  select count(*) into n from public.medications;                                  total := total + 1; if n <> 2 then fallas := fallas || ('cuidador ve tratamientos: ' || n); end if;
  select count(*) into n from public.events where household_id <> hogar;          total := total + 1; if n <> 0 then fallas := fallas || 'cuidador ve otro hogar'::text; end if;
  update public.household_settings set unidad_volumen = 'ml' where household_id = hogar;
  get diagnostics n = row_count;                                                   total := total + 1; if n <> 0 then fallas := fallas || 'cuidador cambió ajustes del hogar'::text; end if;
  update public.members set rol = 'admin' where household_id = hogar and user_id = diego;
  get diagnostics n = row_count;                                                   total := total + 1; if n <> 0 then fallas := fallas || 'cuidador se subió a admin'::text; end if;
  -- Puede registrar temperatura y una duda.
  begin
    insert into public.events (baby_id, tipo, started_at, payload, logged_by) values (lucia, 'temperatura', now(), '{"valor_c":37.2,"metodo":"axilar"}', diego);
    insert into public.questions (baby_id, household_id, texto, creada_por) values (lucia, hogar, '¿Prueba?', diego);
    total := total + 1;
  exception when others then total := total + 1; get stacked diagnostics v_err = message_text; fallas := fallas || ('cuidador no pudo registrar salud: ' || v_err); end;
  -- Un solo temporizador de sueño activo: ya hay uno en el ejemplo.
  begin
    insert into public.events (baby_id, tipo, started_at, payload, logged_by) values (lucia, 'sueno', now(), '{}', diego);
    total := total + 1;
    if (select count(*) from public.events where baby_id = lucia and tipo = 'sueno' and ended_at is null and eliminado_en is null) > 1 then
      fallas := fallas || 'se permitieron dos sueños activos'::text;
    end if;
  exception when unique_violation then total := total + 1; end;
  -- Payload inválido se rechaza.
  begin
    insert into public.events (baby_id, tipo, started_at, payload, logged_by) values (lucia, 'toma_biberon', now(), '{"volumen_ml":"mucho"}', diego);
    total := total + 1; fallas := fallas || 'payload inválido aceptado'::text;
  exception when check_violation then total := total + 1; end;
  -- Editar un evento sube la versión y deja revisión; no puede cambiar quién lo registró.
  declare v_id uuid; v_ver int; v_rev int; v_src text;
  begin
    select id into v_id from public.events where baby_id = lucia and tipo = 'toma_biberon' order by started_at desc limit 1;
    update public.events set payload = payload || '{"sobrante_ml":15}', logged_by = diego, source = 'web' where id = v_id;
    select version, source::text into v_ver, v_src from public.events where id = v_id;
    select count(*) into v_rev from public.event_revisions where event_id = v_id;
    total := total + 1;
    if v_ver < 2 or v_rev < 1 then fallas := fallas || 'la edición no versionó'::text; end if;
    -- el biberón de ejemplo lo registró Diego desde Claude: el origen no debe cambiar
    if v_src <> 'mcp' then fallas := fallas || 'la edición cambió el origen del registro'::text; end if;
  end;
  execute 'reset role';

  -- ============ Andrea (admin) ============
  perform set_config('request.jwt.claims', json_build_object('sub', andrea, 'role', 'authenticated', 'email', 'andrea@ejemplo.tereza.test')::text, true);
  execute 'set local role authenticated';
  update public.household_settings set unidad_volumen = 'ml' where household_id = hogar;
  get diagnostics n = row_count;                                                   total := total + 1; if n <> 1 then fallas := fallas || 'admin no pudo cambiar ajustes'::text; end if;
  declare v_token text;
  begin
    v_token := public.crear_invitacion(hogar, 'nueva@ejemplo.tereza.test', 'limitado');
    total := total + 1;
    if length(v_token) < 40 then fallas := fallas || 'token de invitación corto'::text; end if;
    if exists (select 1 from public.invites where token_hash = v_token) then fallas := fallas || 'el token se guardó en claro'::text; end if;
  exception when others then total := total + 1; get stacked diagnostics v_err = message_text; fallas := fallas || ('admin no pudo invitar: ' || v_err); end;
  select count(*) into n from public.households;                                   total := total + 1; if n <> 1 then fallas := fallas || ('admin ve hogares: ' || n); end if;
  execute 'reset role';

  if array_length(fallas, 1) is null then
    raise exception 'RLS OK %/%', total, total;
  else
    raise exception 'RLS FALLAS (% de %): %', array_length(fallas, 1), total, array_to_string(fallas, ' | ');
  end if;
end $$;
