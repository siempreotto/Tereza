-- Tereza · RPC para alta de hogar, invitaciones y estadísticas compartidas por la web y el MCP.

-- Crear hogar: hogar + ajustes + quien lo crea como admin, en una transacción.
create or replace function public.crear_hogar(
  p_nombre text,
  p_nombre_visible text,
  p_zona_horaria text default 'America/Guatemala',
  p_unidad_volumen text default 'oz',
  p_unidad_peso text default 'lb',
  p_unidad_longitud text default 'in'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_h uuid;
begin
  if v_uid is null then raise exception 'Necesitas iniciar sesión' using errcode = '42501'; end if;
  insert into public.households (nombre) values (p_nombre) returning id into v_h;
  insert into public.household_settings (household_id, zona_horaria, unidad_volumen, unidad_peso, unidad_longitud)
    values (v_h, p_zona_horaria, p_unidad_volumen, p_unidad_peso, p_unidad_longitud);
  insert into public.members (household_id, user_id, nombre_visible, rol) values (v_h, v_uid, p_nombre_visible, 'admin');
  return v_h;
end $$;

-- Crear invitación (solo admin). Devuelve el token una sola vez; se guarda solo su hash.
create or replace function public.crear_invitacion(p_household uuid, p_email text, p_rol public.rol_miembro)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not private.es_admin(p_household) then raise exception 'Solo quien administra el hogar puede invitar' using errcode = '42501'; end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Revisa el correo: falta la @ o el dominio' using errcode = '22023'; end if;
  insert into public.invites (household_id, email, rol, token_hash, creada_por)
    values (p_household, lower(p_email), p_rol, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid());
  return v_token;
end $$;

-- Aceptar invitación: el correo de la sesión debe coincidir con el invitado.
create or replace function public.aceptar_invitacion(p_token text, p_nombre_visible text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invites;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión' using errcode = '42501'; end if;
  select * into v_inv from public.invites
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found then raise exception 'La invitación no existe o ya no es válida' using errcode = 'P0002'; end if;
  if v_inv.aceptada_en is not null then raise exception 'Esta invitación ya se usó' using errcode = '22023'; end if;
  if v_inv.vence_en < now() then raise exception 'La invitación venció; pide una nueva' using errcode = '22023'; end if;
  if v_inv.email::text <> v_email then raise exception 'La invitación es para otro correo' using errcode = '42501'; end if;
  insert into public.members (household_id, user_id, nombre_visible, rol)
    values (v_inv.household_id, auth.uid(), p_nombre_visible, v_inv.rol)
    on conflict (household_id, user_id) do update set rol = excluded.rol;
  update public.invites set aceptada_en = now(), aceptada_por = auth.uid() where id = v_inv.id;
  return v_inv.household_id;
end $$;

-- Edad en meses (corregida hasta los 24 meses si nació antes de las 37 semanas).
create or replace function public.edad_meses(p_baby uuid, p_en timestamptz default now(), p_corregida boolean default true)
returns numeric
language sql stable set search_path = '' as $$
  with b as (select fecha_nacimiento, semanas_gestacion from public.babies where id = p_baby),
  real as (select (extract(epoch from p_en - (b.fecha_nacimiento::timestamp at time zone 'UTC')) / 86400.0 / 30.4375)::numeric as m, b.semanas_gestacion from b)
  select case
    when p_corregida and real.semanas_gestacion is not null and real.semanas_gestacion < 37
         and real.m - ((40 - real.semanas_gestacion) * 7 / 30.4375) < 24
      then greatest(0, real.m - ((40 - real.semanas_gestacion) * 7 / 30.4375))
    else greatest(0, real.m)
  end from real;
$$;

-- Referencia de sueño por edad (AASM/AAP; NSF orientativa antes de 4 meses). Horas en 24 h.
create or replace function public.referencia_sueno(p_meses numeric)
returns jsonb language sql immutable set search_path = '' as $$
  select case
    when p_meses < 4 then jsonb_build_object('min_h', 14, 'max_h', 17, 'texto', 'Referencia orientativa por edad: 14 a 17 h')
    when p_meses < 12 then jsonb_build_object('min_h', 12, 'max_h', 16, 'texto', 'Referencia por edad: 12 a 16 h')
    else jsonb_build_object('min_h', 11, 'max_h', 14, 'texto', 'Referencia por edad: 11 a 14 h')
  end;
$$;

-- ¿Un sueño que empieza en este instante es de noche según la ventana del hogar?
create or replace function public.es_sueno_nocturno(p_inicio timestamptz, p_tz text, p_desde time, p_hasta time)
returns boolean language sql immutable set search_path = '' as $$
  select case when p_desde > p_hasta
    then (p_inicio at time zone p_tz)::time >= p_desde or (p_inicio at time zone p_tz)::time < p_hasta
    else (p_inicio at time zone p_tz)::time >= p_desde and (p_inicio at time zone p_tz)::time < p_hasta
  end;
$$;

-- Sueño por día local (cortado a medianoche en la zona del hogar): total, noche, siestas.
create or replace function public.sueno_por_dia(p_baby uuid, p_desde date, p_hasta date)
returns table (fecha date, total_min numeric, noche_min numeric, siestas_min numeric, n_siestas int)
language sql stable set search_path = '' as $$
  with cfg as (
    select s.zona_horaria tz, s.sueno_noche_desde nd, s.sueno_noche_hasta nh
    from public.babies b join public.household_settings s on s.household_id = b.household_id
    where b.id = p_baby
  ),
  dias as (
    select d::date fecha, (d::date::timestamp at time zone cfg.tz) ini, ((d::date + 1)::timestamp at time zone cfg.tz) fin
    from cfg, generate_series(p_desde, p_hasta, interval '1 day') d
  ),
  suenos as (
    select e.started_at ini, coalesce(e.ended_at, now()) fin,
           public.es_sueno_nocturno(e.started_at, cfg.tz, cfg.nd, cfg.nh) noche
    from public.events e, cfg
    where e.baby_id = p_baby and e.tipo = 'sueno' and e.eliminado_en is null
      and e.started_at < (select max(fin) from dias) and coalesce(e.ended_at, now()) > (select min(ini) from dias)
  ),
  cruce as (
    select d.fecha, s.noche, s.ini >= d.ini and s.ini < d.fin as empieza_hoy,
           greatest(0, extract(epoch from least(s.fin, d.fin) - greatest(s.ini, d.ini)) / 60.0)::numeric m
    from dias d join suenos s on s.ini < d.fin and s.fin > d.ini
  )
  select d.fecha,
         round(coalesce(sum(c.m), 0), 1),
         round(coalesce(sum(c.m) filter (where c.noche), 0), 1),
         round(coalesce(sum(c.m) filter (where not c.noche), 0), 1),
         (count(*) filter (where not c.noche and c.empieza_hoy))::int
  from dias d left join cruce c on c.fecha = d.fecha
  group by d.fecha order by d.fecha;
$$;

-- Estadísticas del período [p_desde, p_hasta] (fechas locales, ambas incluidas).
-- Los promedios por día cuentan solo días con algún registro, como en el prototipo.
create or replace function public.estadisticas_periodo(p_baby uuid, p_desde date, p_hasta date)
returns jsonb
language sql stable set search_path = '' as $$
  with cfg as (
    select s.zona_horaria tz from public.babies b join public.household_settings s on s.household_id = b.household_id where b.id = p_baby
  ),
  rango as (
    select (p_desde::timestamp at time zone cfg.tz) ini, ((p_hasta + 1)::timestamp at time zone cfg.tz) fin, cfg.tz from cfg
  ),
  ev as (
    select e.* , (e.started_at at time zone r.tz)::date dia
    from public.events e, rango r
    where e.baby_id = p_baby and e.eliminado_en is null and e.started_at >= r.ini and e.started_at < r.fin
  ),
  dias_reg as (select distinct dia from ev),
  n as (select greatest(1, count(*))::numeric n, count(*)::int real from dias_reg),
  sp as (select * from public.sueno_por_dia(p_baby, p_desde, p_hasta) s where s.fecha in (select dia from dias_reg)),
  pecho as (select * from ev where tipo = 'toma_pecho' and ended_at is not null),
  bib as (select * from ev where tipo = 'toma_biberon'),
  pan as (select * from ev where tipo = 'panal')
  select jsonb_build_object(
    'desde', p_desde, 'hasta', p_hasta,
    'dias_con_registros', (select real from n),
    'sueno', jsonb_build_object(
      'total_prom_min', round(coalesce((select sum(total_min) from sp), 0) / (select n from n), 0),
      'noche_prom_min', round(coalesce((select sum(noche_min) from sp), 0) / (select n from n), 0),
      'siestas_prom_min', round(coalesce((select sum(siestas_min) from sp), 0) / (select n from n), 0),
      'n_siestas_prom', round(coalesce((select sum(n_siestas) from sp), 0) / (select n from n), 1)
    ),
    'tomas', jsonb_build_object(
      'por_dia', round(((select count(*) from pecho) + (select count(*) from bib) + (select count(*) from ev where tipo = 'toma_solidos')) / (select n from n), 1),
      'pecho_n', (select count(*) from pecho),
      'pecho_min_izq_prom', round(coalesce((select avg((payload ->> 'segundos_izq')::numeric) from pecho), 0) / 60, 0),
      'pecho_min_der_prom', round(coalesce((select avg((payload ->> 'segundos_der')::numeric) from pecho), 0) / 60, 0),
      'biberon_n', (select count(*) from bib),
      'biberon_ml_total', round(coalesce((select sum((payload ->> 'volumen_ml')::numeric - coalesce((payload ->> 'sobrante_ml')::numeric, 0)) from bib), 0), 0),
      'biberon_ml_prom', round(coalesce((select avg((payload ->> 'volumen_ml')::numeric) from bib), 0), 0),
      'solidos_n', (select count(*) from ev where tipo = 'toma_solidos')
    ),
    'panales', jsonb_build_object(
      'mojados', (select count(*) from pan where (payload ->> 'mojado')::boolean),
      'sucios', (select count(*) from pan where (payload ->> 'sucio')::boolean),
      'mojados_por_dia', round((select count(*) from pan where (payload ->> 'mojado')::boolean) / (select n from n), 1),
      'sucios_por_dia', round((select count(*) from pan where (payload ->> 'sucio')::boolean) / (select n from n), 1)
    ),
    'medicamentos', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', m.nombre, 'veces', x.c) order by x.c desc)
      from (select payload ->> 'medication_id' mid, count(*) c from ev where tipo = 'medicamento' group by 1) x
      join public.medications m on m.id::text = x.mid), '[]'::jsonb),
    'temperaturas', coalesce((
      select jsonb_agg(jsonb_build_object('valor_c', (payload ->> 'valor_c')::numeric, 'at', started_at) order by started_at)
      from ev where tipo = 'temperatura'), '[]'::jsonb)
  );
$$;

-- Comparación de dos períodos: diferencias absolutas y en % del sueño, tomas y pañales.
create or replace function public.comparar_periodos(p_baby uuid, p_a_desde date, p_a_hasta date, p_b_desde date, p_b_hasta date)
returns jsonb
language sql stable set search_path = '' as $$
  with a as (select public.estadisticas_periodo(p_baby, p_a_desde, p_a_hasta) j),
       b as (select public.estadisticas_periodo(p_baby, p_b_desde, p_b_hasta) j),
       campos(grupo, campo) as (values
         ('sueno', 'total_prom_min'), ('sueno', 'noche_prom_min'), ('sueno', 'siestas_prom_min'), ('sueno', 'n_siestas_prom'),
         ('tomas', 'por_dia'), ('tomas', 'biberon_ml_prom'), ('panales', 'mojados_por_dia'), ('panales', 'sucios_por_dia'))
  select jsonb_build_object(
    'actual', a.j, 'anterior', b.j,
    'diferencias', (select jsonb_object_agg(c.grupo || '.' || c.campo, jsonb_build_object(
        'abs', round((a.j -> c.grupo ->> c.campo)::numeric - (b.j -> c.grupo ->> c.campo)::numeric, 1),
        'pct', case when (b.j -> c.grupo ->> c.campo)::numeric = 0 then null
               else round(((a.j -> c.grupo ->> c.campo)::numeric / (b.j -> c.grupo ->> c.campo)::numeric - 1) * 100, 0) end))
      from campos c)
  ) from a, b;
$$;

revoke execute on function public.crear_hogar, public.crear_invitacion, public.aceptar_invitacion from public, anon;
grant execute on function public.crear_hogar, public.crear_invitacion, public.aceptar_invitacion to authenticated;
revoke execute on function public.sueno_por_dia, public.estadisticas_periodo, public.comparar_periodos, public.edad_meses from public, anon;
grant execute on function public.sueno_por_dia, public.estadisticas_periodo, public.comparar_periodos, public.edad_meses to authenticated;
