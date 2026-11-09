-- Datos de ejemplo del prototipo: Casa de Lucía (5 meses, a término), Andrea (admin),
-- Diego (cuidador), Abuela Carmen (limitado) y una persona ajena para probar RLS.
-- Usuarios sin contraseña: no pueden iniciar sesión; solo sirven para pruebas. Se pueden borrar con la sección final.
-- Idempotente y sin borrados (el MCP de Supabase pide confirmación ante sentencias destructivas):
-- todo usa ON CONFLICT DO NOTHING y los eventos solo se generan si Lucía aún no tiene.

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000a0d1', 'authenticated', 'authenticated', 'andrea@ejemplo.tereza.test', now(), '{"provider":"email","providers":["email"]}', '{"ejemplo":true}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000d1e9', 'authenticated', 'authenticated', 'diego@ejemplo.tereza.test', now(), '{"provider":"email","providers":["email"]}', '{"ejemplo":true}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000ca31', 'authenticated', 'authenticated', 'carmen@ejemplo.tereza.test', now(), '{"provider":"email","providers":["email"]}', '{"ejemplo":true}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000a7e0', 'authenticated', 'authenticated', 'ajena@ejemplo.tereza.test', now(), '{"provider":"email","providers":["email"]}', '{"ejemplo":true}', now(), now())
on conflict (id) do nothing;

insert into public.households (id, nombre) values
  ('00000000-0000-4000-8000-0000000000a1', 'Casa de Lucía'),
  ('00000000-0000-4000-8000-0000000000a2', 'Hogar ajeno')
on conflict (id) do nothing;
insert into public.household_settings (household_id) values ('00000000-0000-4000-8000-0000000000a1'), ('00000000-0000-4000-8000-0000000000a2')
on conflict (household_id) do nothing;
insert into public.members (household_id, user_id, nombre_visible, rol) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000a0d1', 'Andrea', 'admin'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d1e9', 'Diego', 'cuidador'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000ca31', 'Abuela Carmen', 'limitado'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000a7e0', 'Persona ajena', 'admin')
on conflict (household_id, user_id) do nothing;

-- Lucía nació hace 157 días (5 meses), a término.
insert into public.babies (id, household_id, nombre, fecha_nacimiento, semanas_gestacion, sexo) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'Lucía', ((now() at time zone 'America/Guatemala')::date - 157), 39, 'F'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a2', 'Bebé ajeno', ((now() at time zone 'America/Guatemala')::date - 60), 40, 'M')
on conflict (id) do nothing;

insert into public.medications (id, baby_id, household_id, nombre, indicacion_textual, prescrito_por, inicio, activo) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'Vitamina D en gotas', '1 gota al día', 'Dra. Mónica Herrera', ((now() at time zone 'America/Guatemala')::date - 150), true),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'Acetaminofén en gotas', '0.6 ml si hay fiebre después de las vacunas', 'Dra. Mónica Herrera', ((now() at time zone 'America/Guatemala')::date - 35), false)
on conflict (id) do nothing;

-- Diez días de rutina (como seedState del prototipo, con variación determinista).
-- Lo que aún no pasa no se inserta; si un sueño sigue en curso, queda como temporizador activo.
do $$
declare
  tz text := 'America/Guatemala';
  b uuid := '00000000-0000-4000-8000-0000000000b1';
  andrea uuid := '00000000-0000-4000-8000-00000000a0d1';
  diego uuid := '00000000-0000-4000-8000-00000000d1e9';
  carmen uuid := '00000000-0000-4000-8000-00000000ca31';
  hoy date := (now() at time zone tz)::date;
  k int; d date; j int;
  wake timestamptz; bed timestamptz; nf timestamptz;
  n1 timestamptz; n1e timestamptz; n2 timestamptz; n2e timestamptz; n3 timestamptz; n3e timestamptz;
  oz numeric := 29.5735;
begin
  if exists (select 1 from public.events where baby_id = b) then
    raise notice 'Lucía ya tiene eventos; no se generan de nuevo';
    return;
  end if;
  for k in reverse 9..0 loop
    d := hoy - k;
    j := ((k * 7919) % 21) - 10;
    bed  := ((d - 1)::timestamp + time '19:25' + make_interval(mins => j)) at time zone tz;
    nf   := (d::timestamp + time '02:50' + make_interval(mins => j)) at time zone tz;
    wake := (d::timestamp + time '06:15' + make_interval(mins => -j)) at time zone tz;
    n1 := wake + make_interval(mins => 105 + j);  n1e := n1 + make_interval(mins => 55 - j);
    n2 := n1e + make_interval(mins => 130 + j);   n2e := n2 + make_interval(mins => 85 + j);
    n3 := n2e + make_interval(mins => 150 - j);   n3e := n3 + make_interval(mins => 40);

    insert into public.events (baby_id, tipo, started_at, ended_at, payload, logged_by, source)
    select b, v.tipo::public.tipo_evento, v.s, case when v.e > now() then null else v.e end, v.p::jsonb, v.por, v.src::public.origen_registro
    from (values
      ('sueno', bed, nf, '{"lugar":"cuna","como_se_durmio":"pecho"}', andrea, 'web'),
      ('toma_pecho', nf, nf + interval '14 min', '{"lado_inicial":"der","segundos_izq":360,"segundos_der":480}', andrea, 'web'),
      ('sueno', nf + interval '18 min', wake, '{"lugar":"cuna","como_se_durmio":"pecho"}', andrea, 'web'),
      ('toma_pecho', wake + interval '5 min', wake + interval '23 min', '{"lado_inicial":"izq","segundos_izq":600,"segundos_der":480}', andrea, 'web'),
      ('panal', wake + interval '30 min', null, '{"mojado":true,"sucio":true}', andrea, 'web'),
      ('medicamento', (d::timestamp + time '07:00' + make_interval(mins => j)) at time zone tz, null,
         '{"medication_id":"00000000-0000-4000-8000-0000000000e1","cantidad_textual":"1 gota","via":"oral"}', andrea, 'web'),
      ('sueno', n1, n1e, '{"lugar":"cuna","como_se_durmio":"solo"}', andrea, 'web'),
      ('toma_biberon', n1e + interval '10 min', null, jsonb_build_object('contenido', 'materna', 'volumen_ml', round(4 * oz), 'sobrante_ml', round(0.5 * oz))::text, diego, 'mcp'),
      ('panal', n1e + interval '25 min', null, '{"mojado":true,"sucio":false}', andrea, 'web'),
      ('sueno', n2, n2e, jsonb_build_object('lugar', case when k % 3 = 0 then 'carriola' else 'cuna' end, 'como_se_durmio', 'arrullo')::text, andrea, 'web'),
      ('toma_pecho', n2e + interval '10 min', n2e + interval '25 min', '{"lado_inicial":"izq","segundos_izq":540,"segundos_der":360}', andrea, 'web'),
      ('panal', n2e + interval '45 min', null, '{"mojado":true,"sucio":false}', case when k % 2 = 1 then carmen else andrea end, 'web'),
      ('sueno', n3, n3e, '{"lugar":"brazos","como_se_durmio":"arrullo"}', andrea, 'web'),
      ('toma_biberon', n3e + interval '20 min', null, jsonb_build_object('contenido', 'formula', 'volumen_ml', round(3.5 * oz), 'sobrante_ml', 0)::text, diego, 'mcp'),
      ('panal', n3e + interval '60 min', null, jsonb_build_object('mojado', true, 'sucio', k % 2 = 0)::text, andrea, 'web'),
      ('toma_pecho', (d::timestamp + time '19:05') at time zone tz, (d::timestamp + time '19:23') at time zone tz, '{"lado_inicial":"der","segundos_izq":480,"segundos_der":600}', andrea, 'web'),
      ('panal', (d::timestamp + time '19:15') at time zone tz, null, '{"mojado":true,"sucio":false}', andrea, 'web')
    ) as v(tipo, s, e, p, por, src)
    where v.s <= now() and (v.e is null or v.e <= now() or v.tipo = 'sueno');
  end loop;

  insert into public.events (baby_id, tipo, started_at, payload, notas, logged_by, source) values
    (b, 'nota', now() - interval '2 days 3 hours', '{"texto":"Se rió a carcajadas cuando la abuela le cantó."}', null, carmen, 'web'),
    (b, 'temperatura', ((hoy - 35)::timestamp + time '21:00') at time zone tz, '{"valor_c":37.8,"metodo":"axilar"}', 'Después de las vacunas', diego, 'web'),
    (b, 'medicamento', ((hoy - 35)::timestamp + time '16:30') at time zone tz,
       '{"medication_id":"00000000-0000-4000-8000-0000000000e2","cantidad_textual":"0.6 ml","via":"oral"}', null, diego, 'web');

  -- Evento del hogar ajeno, para probar que nadie más lo ve.
  insert into public.events (baby_id, tipo, started_at, payload, logged_by) values
    ('00000000-0000-4000-8000-0000000000b2', 'panal', now() - interval '1 hour', '{"mojado":true,"sucio":false}', '00000000-0000-4000-8000-00000000a7e0');
end $$;

insert into public.visits (id, baby_id, household_id, fecha, pediatra, motivo, notas, vacunas) values
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '35 days', 'Dra. Mónica Herrera', 'Control de 4 meses',
   'Va muy bien. Seguir con lactancia y vitamina D. Hablar de sólidos en el control de 6 meses.',
   '["Pentavalente · 2.ª dosis","Polio · 2.ª dosis","Rotavirus · 2.ª dosis","Neumococo · 2.ª dosis"]'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '96 days', 'Dra. Mónica Herrera', 'Control de 2 meses',
   'Crecimiento adecuado. Primera dosis de vacunas.',
   '["Pentavalente · 1.ª dosis","Polio · 1.ª dosis","Rotavirus · 1.ª dosis","Neumococo · 1.ª dosis"]'),
  ('00000000-0000-4000-8000-0000000000f0', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '150 days', 'Dra. Mónica Herrera', 'Control de recién nacida',
   'Primera visita. Lactancia bien establecida.', '[]')
on conflict (id) do nothing;

insert into public.measurements (id, baby_id, household_id, medido_en, peso_g, longitud_mm, perimetro_cefalico_mm, origen, logged_by) values
  ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '157 days', 3250, 495, 340, 'nacimiento', '00000000-0000-4000-8000-00000000a0d1'),
  ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '150 days', 3380, null, null, 'consulta', '00000000-0000-4000-8000-00000000a0d1'),
  ('00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '96 days', 5200, 572, 383, 'consulta', '00000000-0000-4000-8000-00000000a0d1'),
  ('00000000-0000-4000-8000-00000000c004', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '35 days', 6400, 620, 405, 'consulta', '00000000-0000-4000-8000-00000000a0d1'),
  ('00000000-0000-4000-8000-00000000c005', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() - interval '6 days', 6900, null, null, 'casa', '00000000-0000-4000-8000-00000000a0d1')
on conflict (id) do nothing;

insert into public.next_appointments (baby_id, household_id, fecha, titulo, pediatra) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', now() + interval '26 days', 'Control de 6 meses', 'Dra. Mónica Herrera')
on conflict (baby_id) do nothing;

insert into public.questions (id, baby_id, household_id, texto, creada_por, source, creada_en, resuelta_en_visita_id) values
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', '¿Cuándo y cómo empezar con los sólidos?', '00000000-0000-4000-8000-00000000a0d1', 'web', now() - interval '3 days', null),
  ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'Se despierta más de noche desde hace dos semanas. ¿Es esperable a esta edad?', '00000000-0000-4000-8000-00000000d1e9', 'mcp', now() - interval '2 days', null),
  ('00000000-0000-4000-8000-00000000d003', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', '¿Puede usar bloqueador solar?', '00000000-0000-4000-8000-00000000a0d1', 'web', now() - interval '1 day', null),
  ('00000000-0000-4000-8000-00000000d004', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', '¿Cuánta vitamina D le damos?', '00000000-0000-4000-8000-00000000a0d1', 'web', now() - interval '40 days', '00000000-0000-4000-8000-0000000000f4')
on conflict (id) do nothing;

-- Para borrar todo el ejemplo (antes de cargar datos reales; pide confirmación):
--   delete from public.households where id in ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000a2');
--   delete from auth.users where email like '%@ejemplo.tereza.test';
